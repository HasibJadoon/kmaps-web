import type { Router } from '../../../shared/src/router';
import {
  ok, created, noContent, notFound, badRequest, unauthorized, forbidden,
} from '../../../shared/src/response';
import type { StudioEnv } from '../env';
import {
  EpisodeRepo, EPISODE_FORMATS, EPISODE_STATUSES, SECTION_TYPES, PARTICIPANT_ROLES,
  type EpisodePatch, type SectionPatch, type PointPatch,
  type TemplateStructure,
} from '../repositories/episode.repo';
import { TemplateRepo } from '../repositories/template.repo';
import { actorRef } from '../auth';
import { resolveUserByEmail } from '../core-client';

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

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
    return isObj(parsed) ? (parsed as TemplateStructure) : {};
  } catch {
    return {};
  }
}

const BLANK_STRUCTURE: TemplateStructure = {
  participants: [{ role: 'host', display_name: 'Host' }],
  sections: [{ type: 'intro', heading: 'Intro', points: [{ text: '', speaker_role: 'host' }] }],
};

export function episodeRoutes(router: Router<StudioEnv>) {

  router.get('/st/episodes', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');

    const series = new URL(req.url).searchParams.get('series');
    const repo = new EpisodeRepo(env.DB_ST);
    const rows = series
      ? await repo.listSeriesEpisodes(user, series)
      : await repo.listEpisodes(user);
    return ok(rows);
  });

  router.post('/st/episodes', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJson(req);
    if (!isObj(body)) return badRequest('Request body must be a JSON object');

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
      title,
      format,
      template_ref: templateRef,

      ecosystem: trimmedString(body['ecosystem']) ?? null,
      series_ref: trimmedString(body['series_ref']) ?? null,
      session_no: numberOrNull(body['session_no']),
      output_kind: trimmedString(body['output_kind']) ?? null,
      source_ref: trimmedString(body['source_ref']) ?? null,
    });
    await repo.applyStructure(episode.id, structure);

    const aggregate = await repo.findAggregate(episode.id);
    const host = aggregate?.participants[0];
    if (host && !host.core_user_ref) {
      await repo.patchParticipant(host.id, { core_user_ref: user });
      host.core_user_ref = user;
    }
    return created(aggregate);
  });

  router.get('/st/episodes/:id', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const repo = new EpisodeRepo(env.DB_ST);
    const episode = await repo.findEpisode(id);
    if (!episode) return notFound(`episode ${id}`);
    if (episode.core_user_ref !== user) return forbidden('Not your episode');
    return ok(await repo.findAggregate(id));
  });

  router.patch('/st/episodes/:id', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJson(req);
    if (!isObj(body)) return badRequest('Request body must be a JSON object');

    const repo = new EpisodeRepo(env.DB_ST);
    const episode = await repo.findEpisode(id);
    if (!episode) return notFound(`episode ${id}`);
    if (episode.core_user_ref !== user) return forbidden('Not your episode');

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
    if (episode.core_user_ref !== user) return forbidden('Not your episode');
    await repo.deleteEpisode(id);
    return noContent();
  });

  router.post('/st/episodes/:id/participants', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJson(req);
    if (!isObj(body)) return badRequest('Request body must be a JSON object');

    const repo = new EpisodeRepo(env.DB_ST);
    const episode = await repo.findEpisode(id);
    if (!episode) return notFound(`episode ${id}`);
    if (episode.core_user_ref !== user) return forbidden('Not your episode');

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
    const body = await readJson(req);
    if (!isObj(body)) return badRequest('Request body must be a JSON object');

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

  router.delete('/st/participants/:id', async (_req, env, { id }) => {
    const deleted = await new EpisodeRepo(env.DB_ST).deleteParticipant(id);
    return deleted ? noContent() : notFound(`participant ${id}`);
  });

  router.post('/st/episodes/:id/sections', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJson(req);
    if (!isObj(body)) return badRequest('Request body must be a JSON object');

    const repo = new EpisodeRepo(env.DB_ST);
    const episode = await repo.findEpisode(id);
    if (!episode) return notFound(`episode ${id}`);
    if (episode.core_user_ref !== user) return forbidden('Not your episode');

    const heading = trimmedString(body['heading']) || 'Section';
    const type = trimmedString(body['type']);
    if (type !== undefined && !(SECTION_TYPES as readonly string[]).includes(type)) {
      return badRequest(`type must be one of: ${SECTION_TYPES.join(', ')}`);
    }
    return created(await repo.createSection(id, {
      heading, type,

      overlay_kind: trimmedString(body['overlay_kind']) ?? null,
      d1_query: trimmedString(body['d1_query']) ?? null,
    }));
  });

  router.patch('/st/sections/:id', async (req, env, { id }) => {
    const body = await readJson(req);
    if (!isObj(body)) return badRequest('Request body must be a JSON object');

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

  router.delete('/st/sections/:id', async (_req, env, { id }) => {
    const deleted = await new EpisodeRepo(env.DB_ST).deleteSection(id);
    return deleted ? noContent() : notFound(`section ${id}`);
  });

  router.post('/st/sections/:id/points', async (req, env, { id }) => {
    const body = await readJson(req);
    if (!isObj(body)) return badRequest('Request body must be a JSON object');

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
    const body = await readJson(req);
    if (!isObj(body)) return badRequest('Request body must be a JSON object');

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

  router.delete('/st/points/:id', async (_req, env, { id }) => {
    const deleted = await new EpisodeRepo(env.DB_ST).deletePoint(id);
    return deleted ? noContent() : notFound(`talking point ${id}`);
  });
}
