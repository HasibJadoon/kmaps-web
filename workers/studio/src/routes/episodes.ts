import type { Router } from '../../../shared/src/router';
import {
  ok, created, noContent, notFound, badRequest, conflict, unauthorized, forbidden, err,
} from '../../../shared/src/response';
import Anthropic from '@anthropic-ai/sdk';
import { brainstorm, cardPayload, TutorError, type PassageBrief } from '../tutor';
import { buildHub } from '../episode/hub';
import { stepViews } from '../episode/steps';
import { phaseFor } from '../episode/phases';
import { focusOf } from '../episode/focus';
import { NEEDS_TEXT, RESOURCE_KEYS, resource } from '../episode/resources';
import { PARTS, publishView, type Part } from '../episode/publish';
import { loadReading } from '../episode/reading';
import { groupTranslations, type QrTranslationRow } from '../episode/translations';
import { splitTitle } from '../episode/text';
import { doneCard, rankSprints, sprintCard, type SprintCard } from '../episode/sprints';
import type { EpisodeCtx } from '../episode/context';
import { isSchemaRecord, readJsonBody } from '../../../shared/src/validate';
import type { StudioEnv } from '../env';
import {
  EpisodeRepo, EPISODE_FORMATS, EPISODE_STATUSES, SECTION_TYPES, PARTICIPANT_ROLES,
  EPISODE_PHASES, PHASE_STATES,
  type EpisodePatch, type SectionPatch, type PointPatch,
  type TemplateStructure,
  structureVars,
} from '../repositories/episode.repo';
import { TemplateRepo } from '../repositories/template.repo';
import { actorRef, workspaceRef } from '../auth';
import {
  membershipsFor,
  workspaceIds,
  isMember,
  canManage,
  resolveUserByEmail,
} from '../core-client';

function trimmedString(v: unknown): string | undefined {
  return typeof v === 'string' ? v.trim() : undefined;
}

function numberOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function overlayJson(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'object') return JSON.stringify(v);
  return null;
}

function subsJson(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v.trim() || null;
  if (Array.isArray(v)) {
    const items = v
      .filter((x): x is string => typeof x === 'string')
      .map((x) => x.trim())
      .filter(Boolean);
    return items.length ? JSON.stringify(items) : null;
  }
  return null;
}

function parseStructure(raw: string): TemplateStructure {
  try {
    const parsed = JSON.parse(raw);
    return isSchemaRecord(parsed) ? (parsed as TemplateStructure) : {};
  } catch {
    return {};
  }
}

const BLANK_STRUCTURE: TemplateStructure = {
  participants: [{ role: 'host', display_name: 'Host' }],
  sections: [{ type: 'intro', heading: 'Intro', points: [{ text: '', speaker_role: 'host' }] }],
};

/// Authorisation for one episode.
///
/// A row that carries a workspace is governed by membership of it: any member
/// may read, owners and admins may write, and the row's own author may write
/// their own. A row with no workspace predates them and stays owner-only.
/// Editing a participant, section or point is editing its episode: the same write check as the
/// episode's own routes. `find` loads the child; a missing child answers 404.
async function denyChild(
  env: StudioEnv,
  req: Request,
  child: { episode_ref: string } | null,
  what: string,
): Promise<Response | null> {
  const user = actorRef(req);
  if (!user) return unauthorized('Authenticated user required');
  if (!child) return notFound(what);
  const episode = await new EpisodeRepo(env.DB_ST).findEpisode(child.episode_ref);
  if (!episode) return notFound(`episode ${child.episode_ref}`);
  return deny(env, req, user, episode, 'write');
}

async function deny(
  env: StudioEnv,
  req: Request,
  user: string,
  episode: { core_user_ref: string; core_ws_ref: string | null },
  mode: 'read' | 'write',
): Promise<Response | null> {
  const ws = episode.core_ws_ref;
  if (!ws) {
    return episode.core_user_ref === user ? null : forbidden('Not your episode');
  }
  const rows = await membershipsFor(env, req, user);
  const allowed =
    mode === 'read'
      ? isMember(rows, ws)
      : canManage(rows, ws) || episode.core_user_ref === user;
  return allowed
    ? null
    : forbidden(
        mode === 'read'
          ? 'That episode belongs to a workspace you are not a member of'
          : 'You need an owner or admin role in this workspace to change that',
      );
}

export function episodeRoutes(router: Router<StudioEnv>) {

  /// Claude as brainstorm tutor: propose ideas and talking points for the
  /// episode's passage. Suggests only — nothing is written here; the app
  /// adds the ideas the people accept through the section and point routes.
  router.post('/st/episodes/:id/brainstorm', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJsonBody(req);
    const focus = isSchemaRecord(body) ? trimmedString(body['focus']) || undefined : undefined;

    const repo = new EpisodeRepo(env.DB_ST);
    const episode = await repo.findAggregate(id);
    if (!episode) return notFound(`episode ${id}`);
    const gate = await deny(env, req, user, episode, 'write');
    if (gate) return gate;

    const vars = structureVars(episode.source_ref);
    if (vars.surah === undefined) return badRequest('This episode is not bound to a passage');
    if (!env.ANTHROPIC_API_KEY) return err('tutor_unavailable', 'The brainstorm tutor is not configured', 503);

    const qr = await env.QR.fetch('https://km-quran/qr/internal/passage-brief', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ surah: vars.surah, from: vars.from, to: vars.to }),
    }).catch(() => null);
    const qrBody = qr && qr.ok ? await qr.json<{ data?: PassageBrief & { ok?: boolean } }>().catch(() => null) : null;
    const brief = qrBody?.data;
    if (!brief?.ok || !brief.ayahs.length) {
      return err('passage_unavailable', 'Could not read the passage from QR', 502);
    }

    const people = episode.participants;
    const first = people[0], second = people[1] ?? people[0];
    const existing = episode.sections
      .filter((s) => s.overlay_kind === 'talk_card')
      .map((s) => ({ heading: s.heading, points: s.points.map((p) => p.text).filter(Boolean) }));

    let result;
    try {
      result = await brainstorm(env, {
        brief,
        episodeTitle: episode.title,
        speakers: [first?.display_name ?? 'the host', second?.display_name ?? 'the guest'],
        existing,
        focus,
      });
    } catch (e) {
      if (e instanceof TutorError) return err('tutor_failed', e.message, 502);
      if (e instanceof Anthropic.RateLimitError) return err('tutor_busy', 'The tutor is busy — try again shortly', 503);
      if (e instanceof Anthropic.APIError) return err('tutor_failed', 'The tutor could not be reached', 502);
      throw e;
    }

    return ok({
      span: brief.span,
      ideas: result.ideas.map((idea) => ({
        heading: idea.heading,
        why: idea.why,
        points: idea.points.map((p) => {
          const who = p.speaker === 'second' ? second : first;
          return {
            speaker_ref: who?.id ?? null,
            speaker_name: who?.display_name ?? null,
            cue: p.cue,
            overlay_json: { kind: 'talk_card', ...cardPayload(p.card), topic: idea.heading },
          };
        }),
      })),
    });
  });

  router.get('/st/episodes', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');

    const series = new URL(req.url).searchParams.get('series');
    const repo = new EpisodeRepo(env.DB_ST);
    const wsIds = workspaceIds(await membershipsFor(env, req, user));
    const rows = series
      ? await repo.listSeriesEpisodes(user, series, wsIds)
      : await repo.listEpisodes(user, wsIds);
    const plans = await repo.checklistFor(rows);
    return ok(rows.map((r) => (plans.has(r.id) ? { ...r, checklist: plans.get(r.id) } : r)));
  });

  /// Tick or untick one step of the series' checklist (Reading · Questions ·
  /// Video, or whatever the series row names). No dates: the checklist is
  /// done in its own time.
  router.patch('/st/episodes/:id/steps/:key', async (req, env, { id, key }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJsonBody(req);
    if (!isSchemaRecord(body) || typeof body['done'] !== 'boolean') {
      return badRequest('Body must be {"done": true|false}');
    }

    const repo = new EpisodeRepo(env.DB_ST);
    const episode = await repo.findEpisode(id);
    if (!episode) return notFound(`episode ${id}`);
    const gate = await deny(env, req, user, episode, 'write');
    if (gate) return gate;

    const res = await repo.setStep(id, key, body['done']);
    if (res === 'no_step') return badRequest(`step ${key} is not on this series' checklist`);
    if (res === 'queued') return conflict('This episode waits its turn: finish and record the active one first');
    return ok(await repo.findAggregate(id));
  });

  /// Time studied on a step's screen — the app sends it when the screen closes (owner 2026-11-17: "no log, capture
  /// study time, the user just studies"). Body {"seconds": n}. Any episode can be studied, queued ones too.
  router.post('/st/episodes/:id/study/:key', async (req, env, { id, key }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJsonBody(req);
    const secs = isSchemaRecord(body) ? body['seconds'] : null;
    if (typeof secs !== 'number' || !Number.isFinite(secs) || secs <= 0) return badRequest('Body must be {"seconds": n > 0}');
    const repo = new EpisodeRepo(env.DB_ST);
    const episode = await repo.findEpisode(id);
    if (!episode) return notFound(`episode ${id}`);
    const gate = await deny(env, req, user, episode, 'write');
    if (gate) return gate;
    const res = await repo.addStudy(id, key, secs);
    if (res === 'no_step') return badRequest(`step ${key} is not on this series' plan`);
    if (!res) return notFound(`episode ${id}`);
    const got = await episodeCtx(env, req, id, false);
    return 'error' in got ? got.error : ok(buildHub(got.ctx, got.seriesMeta));
  });

  router.post('/st/episodes', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJsonBody(req);
    if (!isSchemaRecord(body)) return badRequest('Request body must be a JSON object');

    const title = trimmedString(body['title']) || '';
    if (!title) return badRequest('title is required');

    const repo = new EpisodeRepo(env.DB_ST);
    const templateRef = trimmedString(body['template_ref']) || null;
    let format = trimmedString(body['format']);
    let structure: TemplateStructure = BLANK_STRUCTURE;

    if (templateRef) {
      const template = await new TemplateRepo(env.DB_ST).findById(templateRef);
      if (!template) return badRequest('template_ref does not match a known template');
      structure = parseStructure(template.structure_json);
      format = format || template.format;
    }

    format = format || 'podcast';
    if (!(EPISODE_FORMATS as readonly string[]).includes(format)) {
      return badRequest(`format must be one of: ${EPISODE_FORMATS.join(', ')}`);
    }

    const episode = await repo.createEpisode({
      core_user_ref: user,
      core_ws_ref: trimmedString(body['core_ws_ref']) ?? workspaceRef(req),
      title,
      format,
      template_ref: templateRef,

      ecosystem: trimmedString(body['ecosystem']) ?? null,
      series_ref: trimmedString(body['series_ref']) ?? null,
      session_no: numberOrNull(body['session_no']),
      output_kind: trimmedString(body['output_kind']) ?? null,
      source_ref: trimmedString(body['source_ref']) ?? null,
    });
    await repo.applyStructure(episode.id, structure, structureVars(episode.source_ref));

    const aggregate = await repo.findAggregate(episode.id);
    const host = aggregate?.participants[0];
    if (host && !host.core_user_ref) {
      await repo.patchParticipant(host.id, { core_user_ref: user });
      host.core_user_ref = user;
    }
    return created(aggregate);
  });

  /// One Do Zāwiya episode as the room's sprint picture: `/hub` is the ring and the tiles only; each step
  /// (`/phase/:key`) and each resource (`/resource/:key`) is its own screen with its own data; `/publish` is what
  /// goes out to YouTube. See src/episode/.
  /// The phone's sprint cards: one per planner series, its episode in hand, the one being studied first.
  router.get('/st/sprints', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const repo = new EpisodeRepo(env.DB_ST);
    const now = new Date();
    const cards: SprintCard[] = [];
    for (const ser of await repo.plannerSeries()) {
      if (await deny(env, req, user, ser, 'read')) continue;
      const series = await repo.seriesChecklists(ser.id, now);
      if (!series) continue;
      const order = series.order.map((e) => ({ ...e, state: series.all.get(e.id)?.state ?? null }));
      const active = [...series.all.entries()].find(([, c]) => c.state === 'active');
      if (!active) {
        if (series.all.size && [...series.all.values()].every((c) => c.state === 'done')) cards.push(doneCard(ser, series.title, series.meta, order));
        continue;
      }
      const [id, checklist] = active;
      const ep = await repo.findEpisode(id);
      if (!ep) continue;
      let meta: Record<string, unknown> = {};
      try { meta = JSON.parse(ep.meta_json ?? '{}') ?? {}; } catch { /* keep {} */ }
      cards.push(sprintCard({
        id, title: ep.title, session_no: ep.session_no, series_title: series.title, meta, plan: series.plan, checklist,
        siblings: [...series.all.values()], series_order: [], participants: [], sections: [], slides: null, reading: null, now,
      }, series.meta, order));
    }
    return ok({ cards: rankSprints(cards) });
  });

  router.get('/st/episodes/:id/hub', async (req, env, { id }) => {
    const got = await episodeCtx(env, req, id, false);
    return 'error' in got ? got.error : ok(buildHub(got.ctx, got.seriesMeta));
  });

  router.get('/st/episodes/:id/phase/:key', async (req, env, { id, key }) => {
    const got = await episodeCtx(env, req, id, true);
    if ('error' in got) return got.error;
    const step = stepViews(got.ctx).find((s) => s.key === key || s.phase === key);
    if (!step) return notFound(`step ${key} on episode ${id}`);
    const phase = phaseFor(step.phase);
    return ok({ id, title: splitTitle(got.ctx.title).en, step, focus: focusOf(got.ctx), ...phase.build(got.ctx) });
  });

  /// Every translation of one āyah ("40:3"), grouped by language — the phase screens' tap-an-āyah sheet.
  router.get('/st/ayah/:key/translations', async (req, env, { key }) => {
    if (!actorRef(req)) return unauthorized('Authenticated user required');
    const m = String(key).match(/^(\d{1,3}):(\d{1,3})$/);
    if (!m || Number(m[1]) < 1 || Number(m[1]) > 114) return badRequest('āyah key must look like 40:3');
    const res = await env.QR.fetch(`https://km-quran/qr/translations?surah=${m[1]}&ayah=${m[2]}&named=1`).catch(() => null);
    const body = res && res.ok ? await res.json<{ data?: QrTranslationRow[] }>().catch(() => null) : null;
    if (!body?.data) return err('upstream', 'Could not read the translations', 502);
    const groups = groupTranslations(body.data);
    return ok({ key, cite: `${m[1]}:${m[2]}`, total: groups.reduce((n, g) => n + g.items.length, 0), groups });
  });

  router.get('/st/episodes/:id/resource/:key', async (req, env, { id, key }) => {
    if (!(RESOURCE_KEYS as readonly string[]).includes(key)) return badRequest(`resource must be one of: ${RESOURCE_KEYS.join(', ')}`);
    const got = await episodeCtx(env, req, id, NEEDS_TEXT.has(key));
    if ('error' in got) return got.error;
    const data = resource(got.ctx, key);
    return data ? ok({ id, key, ...data }) : notFound(`resource ${key} on episode ${id}`);
  });

  router.get('/st/episodes/:id/publish', async (req, env, { id }) => {
    const got = await episodeCtx(env, req, id, false);
    return 'error' in got ? got.error : ok({ id, ...publishView(got.ctx) });
  });

  /// Tick one item of the Before-filming list (or take it back): {"done": true|false}.
  router.patch('/st/episodes/:id/prep/:item', async (req, env, { id, item }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJsonBody(req);
    if (!isSchemaRecord(body) || typeof body['done'] !== 'boolean') return badRequest('Body must be {"done": true|false}');
    const repo = new EpisodeRepo(env.DB_ST);
    const episode = await repo.findEpisode(id);
    if (!episode) return notFound(`episode ${id}`);
    const gate = await deny(env, req, user, episode, 'write');
    if (gate) return gate;
    const row = await repo.setPrep(id, item, body['done']);
    if (row === 'no_item') return badRequest(`${item} is not on this episode's list`);
    return row ? ok({ ok: true }) : notFound(`episode ${id}`);
  });

  /// Log one part as out on YouTube (or take it back): {"done": true, "url"?: "https://youtu.be/…"}.
  router.patch('/st/episodes/:id/publish/:part', async (req, env, { id, part }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    if (!(PARTS as string[]).includes(part)) return badRequest(`part must be one of: ${PARTS.join(', ')}`);
    const body = await readJsonBody(req);
    if (!isSchemaRecord(body) || typeof body['done'] !== 'boolean') return badRequest('Body must be {"done": true|false, "url"?: string}');
    const repo = new EpisodeRepo(env.DB_ST);
    const episode = await repo.findEpisode(id);
    if (!episode) return notFound(`episode ${id}`);
    const gate = await deny(env, req, user, episode, 'write');
    if (gate) return gate;
    const url = typeof body['url'] === 'string' && /^https:\/\//.test(body['url']) ? body['url'] : null;
    const row = await repo.setPublished(id, part as Part, body['done'], url);
    return row ? ok({ ok: true }) : notFound(`episode ${id}`);
  });

  router.get('/st/episodes/:id', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const repo = new EpisodeRepo(env.DB_ST);
    const episode = await repo.findEpisode(id);
    if (!episode) return notFound(`episode ${id}`);
    const gate = await deny(env, req, user, episode, 'read');
    if (gate) return gate;
    return ok(await repo.findAggregate(id));
  });

  /// The planner's own write: the schedule and the review note.
  ///
  /// Separate from PATCH /st/episodes/:id because meta_json is one blob — the
  /// app would have to send the whole thing back and would drop any key it
  /// does not model. Here the caller names only the fields it is changing.
  const PLAN_KEYS = ['week', 'due_at', 'shoot_at', 'publish_at', 'review'] as const;

  /// "I am working on this one." Stamped when a studio opens the episode, so
  /// every surface — this Mac, another Mac, the planner on the phone — agrees
  /// about what is active without anything having to be cleared.
  /// Log a phase: mark it done, or write what was learned doing it.
  ///
  /// Each phase keeps its own note, so what went wrong on the shoot is not
  /// filed with what was decided in the cut. Completing one starts the next,
  /// and `status` is re-derived from the phases rather than set separately.
  router.patch('/st/episodes/:id/phases/:phase', async (req, env, { id, phase }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJsonBody(req);
    if (!isSchemaRecord(body)) return badRequest('Request body must be a JSON object');

    if (!(EPISODE_PHASES as readonly string[]).includes(phase)) {
      return badRequest(`phase must be one of: ${EPISODE_PHASES.join(', ')}`);
    }

    const repo = new EpisodeRepo(env.DB_ST);
    const episode = await repo.findEpisode(id);
    if (!episode) return notFound(`episode ${id}`);
    const gate = await deny(env, req, user, episode, 'write');
    if (gate) return gate;

    const patch: { state?: string; notes_md?: string | null } = {};
    if (body['state'] !== undefined) {
      const state = trimmedString(body['state']) || '';
      if (!(PHASE_STATES as readonly string[]).includes(state)) {
        return badRequest(`state must be one of: ${PHASE_STATES.join(', ')}`);
      }
      patch.state = state;
    }
    if (body['notes_md'] !== undefined) {
      patch.notes_md = body['notes_md'] === null ? null : (trimmedString(body['notes_md']) ?? null);
    }
    if (!Object.keys(patch).length) return badRequest('Name a state or notes_md');

    await repo.patchPhase(id, phase, patch, user);
    return ok(await repo.findAggregate(id));
  });

  router.post('/st/episodes/:id/opened', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const repo = new EpisodeRepo(env.DB_ST);
    const episode = await repo.findEpisode(id);
    if (!episode) return notFound(`episode ${id}`);
    const gate = await deny(env, req, user, episode, 'read');
    if (gate) return gate;
    return ok(await repo.markOpened(id));
  });

  router.patch('/st/episodes/:id/plan', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJsonBody(req);
    if (!isSchemaRecord(body)) return badRequest('Request body must be a JSON object');

    const repo = new EpisodeRepo(env.DB_ST);
    const episode = await repo.findEpisode(id);
    if (!episode) return notFound(`episode ${id}`);
    const gate = await deny(env, req, user, episode, 'write');
    if (gate) return gate;

    const fields: Record<string, string | null> = {};
    for (const key of PLAN_KEYS) {
      if (body[key] === undefined) continue;
      if (body[key] === null) { fields[key] = null; continue; }
      const value = trimmedString(body[key]);
      // An empty string clears the field rather than storing "".
      fields[key] = value ?? null;
    }
    if (!Object.keys(fields).length) {
      return badRequest(`Name at least one of: ${PLAN_KEYS.join(', ')}`);
    }

    await repo.patchPlan(id, fields);
    return ok(await repo.findAggregate(id));
  });

  router.patch('/st/episodes/:id', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJsonBody(req);
    if (!isSchemaRecord(body)) return badRequest('Request body must be a JSON object');

    const repo = new EpisodeRepo(env.DB_ST);
    const episode = await repo.findEpisode(id);
    if (!episode) return notFound(`episode ${id}`);
    const gate = await deny(env, req, user, episode, 'write');
    if (gate) return gate;

    const patch: EpisodePatch = {};
    if (body['title'] !== undefined) {
      const title = trimmedString(body['title']);
      if (!title) return badRequest('title must be a non-empty string');
      patch.title = title;
    }
    if (body['format'] !== undefined) {
      const format = trimmedString(body['format']) || '';
      if (!(EPISODE_FORMATS as readonly string[]).includes(format)) {
        return badRequest(`format must be one of: ${EPISODE_FORMATS.join(', ')}`);
      }
      patch.format = format;
    }
    if (body['status'] !== undefined) {
      const status = trimmedString(body['status']) || '';
      if (!(EPISODE_STATUSES as readonly string[]).includes(status)) {
        return badRequest(`status must be one of: ${EPISODE_STATUSES.join(', ')}`);
      }
      patch.status = status;
    }
    for (const key of ['ecosystem', 'series_ref', 'output_kind', 'source_ref'] as const) {
      if (body[key] !== undefined) patch[key] = trimmedString(body[key]) ?? null;
    }
    if (body['session_no'] !== undefined) patch.session_no = numberOrNull(body['session_no']);
    return ok(await repo.patchEpisode(id, patch));
  });

  router.delete('/st/episodes/:id', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const repo = new EpisodeRepo(env.DB_ST);
    const episode = await repo.findEpisode(id);
    if (!episode) return notFound(`episode ${id}`);
    const gate = await deny(env, req, user, episode, 'write');
    if (gate) return gate;
    await repo.deleteEpisode(id);
    return noContent();
  });

  router.post('/st/episodes/:id/participants', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJsonBody(req);
    if (!isSchemaRecord(body)) return badRequest('Request body must be a JSON object');

    const repo = new EpisodeRepo(env.DB_ST);
    const episode = await repo.findEpisode(id);
    if (!episode) return notFound(`episode ${id}`);
    const gate = await deny(env, req, user, episode, 'write');
    if (gate) return gate;

    const role = trimmedString(body['role']);
    if (role !== undefined && !(PARTICIPANT_ROLES as readonly string[]).includes(role)) {
      return badRequest(`role must be one of: ${PARTICIPANT_ROLES.join(', ')}`);
    }
    const color = trimmedString(body['color']);

    let displayName = trimmedString(body['display_name']) || '';
    let coreUserRef: string | null = null;
    const email = trimmedString(body['email']) || '';
    if (email) {
      const account = await resolveUserByEmail(env, email);
      if (!account) return badRequest(`No account found for ${email}`);
      coreUserRef = account.id;
      if (!displayName) displayName = account.display_name;
    }
    if (!displayName) return badRequest('display_name or email is required');

    return created(await repo.createParticipant(id, {
      display_name: displayName,
      role,
      color,
      core_user_ref: coreUserRef,
    }));
  });

  router.patch('/st/participants/:id', async (req, env, { id }) => {
    const gate = await denyChild(env, req, await new EpisodeRepo(env.DB_ST).findParticipant(id), `participant ${id}`);
    if (gate) return gate;
    const body = await readJsonBody(req);
    if (!isSchemaRecord(body)) return badRequest('Request body must be a JSON object');

    const patch: {
      display_name?: string; color?: string; role?: string; seq?: number;
      core_user_ref?: string | null;
    } = {};
    if (body['display_name'] !== undefined) {
      const name = trimmedString(body['display_name']);
      if (!name) return badRequest('display_name must be a non-empty string');
      patch.display_name = name;
    }
    if (body['color'] !== undefined) {
      const color = trimmedString(body['color']);
      if (!color) return badRequest('color must be a non-empty string');
      patch.color = color;
    }
    if (body['role'] !== undefined) {
      const role = trimmedString(body['role']) || '';
      if (!(PARTICIPANT_ROLES as readonly string[]).includes(role)) {
        return badRequest(`role must be one of: ${PARTICIPANT_ROLES.join(', ')}`);
      }
      patch.role = role;
    }
    if (typeof body['seq'] === 'number') patch.seq = body['seq'];

    if (body['email'] !== undefined) {
      const email = trimmedString(body['email']) || '';
      if (!email) {
        patch.core_user_ref = null;
      } else {
        const account = await resolveUserByEmail(env, email);
        if (!account) return badRequest(`No account found for ${email}`);
        patch.core_user_ref = account.id;
        if (body['display_name'] === undefined) patch.display_name = account.display_name;
      }
    }

    const row = await new EpisodeRepo(env.DB_ST).patchParticipant(id, patch);
    return row ? ok(row) : notFound(`participant ${id}`);
  });

  router.delete('/st/participants/:id', async (req, env, { id }) => {
    const gate = await denyChild(env, req, await new EpisodeRepo(env.DB_ST).findParticipant(id), `participant ${id}`);
    if (gate) return gate;
    const deleted = await new EpisodeRepo(env.DB_ST).deleteParticipant(id);
    return deleted ? noContent() : notFound(`participant ${id}`);
  });

  router.post('/st/episodes/:id/sections', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJsonBody(req);
    if (!isSchemaRecord(body)) return badRequest('Request body must be a JSON object');

    const repo = new EpisodeRepo(env.DB_ST);
    const episode = await repo.findEpisode(id);
    if (!episode) return notFound(`episode ${id}`);
    const gate = await deny(env, req, user, episode, 'write');
    if (gate) return gate;

    const heading = trimmedString(body['heading']) || 'Section';
    const type = trimmedString(body['type']);
    if (type !== undefined && !(SECTION_TYPES as readonly string[]).includes(type)) {
      return badRequest(`type must be one of: ${SECTION_TYPES.join(', ')}`);
    }
    return created(await repo.createSection(id, {
      heading, type,

      overlay_kind: trimmedString(body['overlay_kind']) ?? null,
      group_key: trimmedString(body['group_key']) ?? null,
      group_label: trimmedString(body['group_label']) ?? null,
    }));
  });

  router.patch('/st/sections/:id', async (req, env, { id }) => {
    const gate = await denyChild(env, req, await new EpisodeRepo(env.DB_ST).findSection(id), `section ${id}`);
    if (gate) return gate;
    const body = await readJsonBody(req);
    if (!isSchemaRecord(body)) return badRequest('Request body must be a JSON object');

    const patch: SectionPatch = {};
    if (body['heading'] !== undefined) {
      const heading = trimmedString(body['heading']);
      if (!heading) return badRequest('heading must be a non-empty string');
      patch.heading = heading;
    }
    if (body['type'] !== undefined) {
      const type = trimmedString(body['type']) || '';
      if (!(SECTION_TYPES as readonly string[]).includes(type)) {
        return badRequest(`type must be one of: ${SECTION_TYPES.join(', ')}`);
      }
      patch.type = type;
    }
    if (typeof body['seq'] === 'number') patch.seq = body['seq'];

    const row = await new EpisodeRepo(env.DB_ST).patchSection(id, patch);
    return row ? ok(row) : notFound(`section ${id}`);
  });

  router.delete('/st/sections/:id', async (req, env, { id }) => {
    const gate = await denyChild(env, req, await new EpisodeRepo(env.DB_ST).findSection(id), `section ${id}`);
    if (gate) return gate;
    const deleted = await new EpisodeRepo(env.DB_ST).deleteSection(id);
    return deleted ? noContent() : notFound(`section ${id}`);
  });

  router.post('/st/sections/:id/points', async (req, env, { id }) => {
    const gate = await denyChild(env, req, await new EpisodeRepo(env.DB_ST).findSection(id), `section ${id}`);
    if (gate) return gate;
    const body = await readJsonBody(req);
    if (!isSchemaRecord(body)) return badRequest('Request body must be a JSON object');

    const repo = new EpisodeRepo(env.DB_ST);
    const section = await repo.findSection(id);
    if (!section) return notFound(`section ${id}`);

    const text = typeof body['text'] === 'string' ? body['text'] : '';
    const speakerRef = trimmedString(body['speaker_ref']) || null;
    const estSeconds = typeof body['est_seconds'] === 'number' ? body['est_seconds'] : null;
    const bridge = typeof body['bridge'] === 'string' ? body['bridge'] : null;

    return created(await repo.createPoint(id, section.episode_ref, {
      text,
      speaker_ref: speakerRef,
      est_seconds: estSeconds,
      bridge,
      overlay_json: overlayJson(body['overlay_json']),
      subs_json: subsJson(body['subs'] ?? body['subs_json']),
    }));
  });

  router.patch('/st/points/:id', async (req, env, { id }) => {
    const gate = await denyChild(env, req, await new EpisodeRepo(env.DB_ST).findPoint(id), `point ${id}`);
    if (gate) return gate;
    const body = await readJsonBody(req);
    if (!isSchemaRecord(body)) return badRequest('Request body must be a JSON object');

    const patch: PointPatch = {};
    if (body['text'] !== undefined) {
      patch.text = typeof body['text'] === 'string' ? body['text'] : '';
    }
    if ('speaker_ref' in body) {
      const value = body['speaker_ref'];
      if (value === null) patch.speaker_ref = null;
      else if (typeof value === 'string') patch.speaker_ref = value.trim() || null;
      else return badRequest('speaker_ref must be a string or null');
    }
    if ('est_seconds' in body) {
      const value = body['est_seconds'];
      if (value === null) patch.est_seconds = null;
      else if (typeof value === 'number') patch.est_seconds = value;
      else return badRequest('est_seconds must be a number or null');
    }
    if ('bridge' in body) {
      const value = body['bridge'];
      if (value === null) patch.bridge = null;
      else if (typeof value === 'string') patch.bridge = value;
      else return badRequest('bridge must be a string or null');
    }
    if ('overlay_json' in body) patch.overlay_json = overlayJson(body['overlay_json']);
    if ('subs' in body || 'subs_json' in body) {
      patch.subs_json = subsJson(body['subs'] ?? body['subs_json']);
    }
    if (typeof body['seq'] === 'number') patch.seq = body['seq'];

    const row = await new EpisodeRepo(env.DB_ST).patchPoint(id, patch);
    return row ? ok(row) : notFound(`talking point ${id}`);
  });

  router.delete('/st/points/:id', async (req, env, { id }) => {
    const gate = await denyChild(env, req, await new EpisodeRepo(env.DB_ST).findPoint(id), `point ${id}`);
    if (gate) return gate;
    const deleted = await new EpisodeRepo(env.DB_ST).deletePoint(id);
    return deleted ? noContent() : notFound(`talking point ${id}`);
  });
}

/// Everything one episode screen is built from, gathered once (the selected text only when the screen shows it).
async function episodeCtx(env: StudioEnv, req: Request, id: string, withText: boolean):
  Promise<{ ctx: EpisodeCtx; seriesMeta: Record<string, unknown> } | { error: Response }> {
  const user = actorRef(req);
  if (!user) return { error: unauthorized('Authenticated user required') };
  const repo = new EpisodeRepo(env.DB_ST);
  const episode = await repo.findEpisode(id);
  if (!episode) return { error: notFound(`episode ${id}`) };
  const gate = await deny(env, req, user, episode, 'read');
  if (gate) return { error: gate };
  if (!episode.series_ref) return { error: badRequest('This episode is not on a series planner') };
  const now = new Date();
  const [agg, series, slides] = await Promise.all([
    repo.findAggregate(id), repo.seriesChecklists(episode.series_ref, now), repo.slidesFor(id),
  ]);
  const checklist = series?.all.get(id);
  if (!agg || !series || !checklist) return { error: badRequest('This episode is not on a series planner') };
  let meta: Record<string, unknown> = {};
  try { meta = JSON.parse(episode.meta_json ?? '{}') ?? {}; } catch { /* keep {} */ }
  const reading = withText ? await loadReading(env, meta) : null;
  return {
    seriesMeta: series.meta,
    ctx: {
      id, title: episode.title, session_no: episode.session_no, series_title: series.title, meta,
      plan: series.plan, checklist, siblings: [...series.all.values()],
      series_order: series.order.map((e) => ({ ...e, state: series.all.get(e.id)?.state ?? null })),
      series_meta: series.meta,
      participants: agg.participants.map((p) => ({ id: p.id, display_name: p.display_name, color: p.color, role: p.role, seq: p.seq })),
      sections: agg.sections.map((s) => ({ heading: s.heading, type: s.type,
        points: s.points.map((pt) => ({ text: pt.text, speaker_ref: pt.speaker_ref })) })),
      slides, reading, now,
    },
  };
}
