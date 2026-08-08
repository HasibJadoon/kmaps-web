// ─── /core/srs/* — the one spaced-repetition engine ──────────────────────────
//
// One store, one scheduler, one log, for every subject. A card is anchored by
// (module, resource_type, resource_ref), so an Arabic root, a Qurʾān āyah and a
// Worldview concept are the same kind of row and come off the same due queue.
//
//   GET    /core/srs/decks                 — the learner's decks
//   POST   /core/srs/decks                 — make one
//   DELETE /core/srs/decks/:id
//   GET    /core/srs/decks/:id/cards
//   POST   /core/srs/cards                 — enrol a resource (idempotent)
//   GET    /core/srs/cards/:id
//   DELETE /core/srs/cards/:id
//   POST   /core/srs/cards/:id/grade       — answer, schedule, log
//   GET    /core/srs/review                — the unified due queue
//   GET    /core/srs/stats                 — counts by state and by module
//   GET    /core/srs/params                — the scheduler's own report card
//   POST   /core/srs/params/optimize       — fit the weights to this learner
//
// Scheduling happens here, never on a client: the server owns the card, the log
// and the parameters, so two devices cannot disagree about when a card is due.

import type { Router } from '../../../shared/src/router';
import {
  ok, created, notFound, badRequest, forbidden, noContent,
} from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { CoreEnv } from '../env';
import { SrsRepo, type SrsCard, type SrsParams } from '../repositories/srs.repo';
import {
  grade as gradeCard, previewDays, retrievabilityOf, evaluate, optimize,
  buildParams, isRating, default_w,
  type RatingValue, type StoredParams,
} from '../srs/fsrs';
import type { FSRSParameters } from 'ts-fsrs';

const MODULES = new Set(['AR', 'AL', 'QR', 'WV', 'other']);
const RESOURCE_TYPES = new Set([
  'vocabulary', 'grammar', 'root', 'lemma', 'word',
  'ayah', 'passage', 'concept', 'other',
]);

async function readJson(req: Request): Promise<Record<string, unknown> | undefined> {
  try {
    const body = await req.json();
    return typeof body === 'object' && body !== null && !Array.isArray(body)
      ? body as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

/** The learner's stored settings, or nothing — `buildParams` supplies and
 *  validates the defaults. */
function storedOf(row: SrsParams | null): StoredParams | null {
  if (!row) return null;
  const json = <T>(raw: string | null, fallback: T): T => {
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T) : fallback;
    } catch { return fallback; }
  };
  return {
    w: json<number[] | null>(row.weights_json, null),
    request_retention: row.desired_retention,
    maximum_interval: row.maximum_interval,
    learning_steps: json<string[] | null>(row.learning_steps, null),
    relearning_steps: json<string[] | null>(row.relearning_steps, null),
  };
}

function cardToApi(c: SrsCard, params: FSRSParameters) {
  let extra: unknown = null;
  if (c.extra_json) { try { extra = JSON.parse(c.extra_json); } catch { extra = null; } }
  return {
    id: c.id,
    deck_id: c.deck_id,
    module: c.module,
    resource_type: c.resource_type,
    resource_ref: c.resource_ref,
    card_template: c.card_template,
    card_kind: (c as any).card_kind ?? null,
    concept_domain: (c as any).concept_domain ?? null,
    front_text: c.front_text,
    back_text: c.back_text,
    extra,
    tags: c.tags ? c.tags.split(',').filter(Boolean) : [],
    suspended: c.suspended === 1,
    stability: c.stability,
    difficulty: c.difficulty,
    card_state: c.card_state,
    learning_step: c.learning_step,
    reps: c.reps,
    lapses: c.lapses,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    last_review_at: c.last_review_at,
    next_review_at: c.next_review_at,
    // What each button would schedule, so a client never has to reimplement
    // the algorithm to label them.
    preview_days: previewDays(c, new Date(), params),
    // What the forgetting curve says right now.
    retrievability: retrievabilityOf(c, new Date(), params),
  };
}

/// What a card can teach, per deck. Served to clients as data so a new kind or
/// domain is a worker deploy, never an app release. concept_domains apply to
/// any module's `concept` kind.
const TAXONOMY = {
  modules: {
    QR: {
      label: 'Qurʾān',
      kinds: ['vocabulary', 'idiom', 'expression', 'translation',
              'sarf', 'nahw', 'balagha', 'irab',
              'structure', 'context', 'tajwid', 'concept'],
    },
    AL: {
      label: 'Arabic Linguistics',
      kinds: ['root_dna', 'sarf', 'nahw', 'balagha', 'furuq',
              'senses', 'concept'],
    },
    AR: {
      label: 'Arabic',
      kinds: ['vocabulary', 'grammar', 'expression', 'idiom', 'concept'],
    },
    WV: {
      label: 'Worldview',
      kinds: ['concept', 'argument', 'quote', 'definition'],
    },
    other: { label: 'Other', kinds: ['concept'] },
  },
  concept_domains: ['theology', 'psychology', 'sociology', 'law',
                    'ethics', 'eschatology', 'spirituality', 'history',
                    'economics', 'politics'],
} as const;

export function srsRoutes(router: Router<CoreEnv>) {

  // GET /core/srs/leaderboard — everyone's progress, for the scoreboard.
  // Signed-in users only: it publishes display names and activity, so it is
  // shared rather than public. Mastered follows the usual convention — a card
  // in review whose interval has reached 21 days.
  router.get('/core/srs/leaderboard', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const rows = await query<{
      user_id: string; display_name: string; total: number;
      mastered: number; learning: number; reviews: number;
    }>(
      env.DB_CORE,
      `SELECT u.id AS user_id,
              u.display_name AS display_name,
              COUNT(c.id) AS total,
              SUM(CASE WHEN c.card_state = 'review' AND c.scheduled_days >= 21 THEN 1 ELSE 0 END) AS mastered,
              SUM(CASE WHEN c.card_state IN ('learning','relearning') THEN 1 ELSE 0 END) AS learning,
              COALESCE(SUM(c.reps), 0) AS reviews
         FROM core_users u
         JOIN core_srs_card c ON c.user_ref = u.id
        WHERE u.account_status = 'active'
        GROUP BY u.id, u.display_name
        HAVING COUNT(c.id) > 0
        ORDER BY mastered DESC, reviews DESC
        LIMIT 100`,
      [],
    );
    return ok({ leaderboard: rows, me: ctx.userId });
  });

  // PATCH /core/srs/decks/:id — share a deck, or move it into a workspace.
  // Sharing is the author's decision, so only the owner may set it.
  router.patch('/core/srs/decks/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const deck = await repo.findDeck(id);
    if (!deck) return notFound(`deck ${id}`);
    if (deck.user_ref !== ctx.userId) return forbidden('Not your deck');

    const body = await readJson(req);
    const shared = typeof body?.['is_shared'] === 'boolean' ? (body['is_shared'] ? 1 : 0) : deck.is_shared;
    const workspace = body?.['workspace_id'] === null
      ? null
      : (typeof body?.['workspace_id'] === 'string' ? body['workspace_id'] : deck.workspace_id);
    const title = typeof body?.['title'] === 'string' && body['title'].trim()
      ? body['title'].trim() : deck.title;

    await execute(
      env.DB_CORE,
      `UPDATE core_srs_deck SET is_shared = ?, workspace_id = ?, title = ?,
              updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
        WHERE id = ?`,
      [shared, workspace, title, id],
    );
    return ok(await repo.findDeck(id));
  });

  // GET /core/srs/decks/shared — decks other people published, plus any deck
  // in a workspace this user belongs to. Your own are excluded: you already
  // have them.
  router.get('/core/srs/decks/shared', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const rows = await query(
      env.DB_CORE,
      `SELECT d.id, d.title, d.deck_type, d.description, d.workspace_id,
              u.display_name AS author,
              (SELECT COUNT(*) FROM core_srs_card c WHERE c.deck_id = d.id) AS card_count
         FROM core_srs_deck d
         JOIN core_users u ON u.id = d.user_ref
        WHERE d.user_ref != ?
          AND (d.is_shared = 1
               OR d.workspace_id IN (SELECT workspace_id FROM core_workspace_members WHERE user_id = ?))
        ORDER BY card_count DESC
        LIMIT 100`,
      [ctx.userId, ctx.userId],
    );
    return ok({ decks: rows });
  });

  // POST /core/srs/decks/:id/copy — take a shared deck's cards for yourself.
  //
  // Every take-path in the system files cards the same way: into the taker's
  // own module deck, keyed on a stable source identity (the origin card's id),
  // so only new and unique cards are added — overlapping decks, re-takes, and
  // cards already taken from the master library all deduplicate to nothing.
  // Scheduling is personal: your copies start new and the author's progress is
  // untouched by your reviews.
  router.post('/core/srs/decks/:id/copy', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const source = await repo.findDeck(id);
    if (!source) return notFound(`deck ${id}`);

    const visible = source.user_ref === ctx.userId || source.is_shared === 1 || (source.workspace_id
      ? (await query(env.DB_CORE,
          'SELECT 1 AS ok FROM core_workspace_members WHERE workspace_id = ? AND user_id = ?',
          [source.workspace_id, ctx.userId])).length > 0
      : false);
    if (!visible) return forbidden('That deck is not shared with you');

    const cards = await repo.cardsInDeck(id);

    // What this user already holds, by source identity. A card that was itself
    // taken carries its origin in card_template; an author's original card is
    // its own origin, so its id is the identity.
    const held = await query<{ card_template: string }>(
      env.DB_CORE,
      'SELECT card_template FROM core_srs_card WHERE user_ref = ?', [ctx.userId]);
    const taken = new Set(held.map((h) => h.card_template));

    let added = 0;
    for (const c of cards) {
      // The origin id survives chained sharing: taking a deck whose cards were
      // themselves taken still dedupes against the true source.
      const origin = c.card_template && c.card_template !== 'freeform' ? c.card_template : c.id;
      if (taken.has(origin)) continue;
      await repo.createCard({
        deck_id: await deckForModule(env, ctx.userId, c.module),
        user_ref: ctx.userId,
        module: c.module, resource_type: c.resource_type, resource_ref: c.resource_ref,
        card_template: origin, front_text: c.front_text, back_text: c.back_text,
        extra_json: c.extra_json, tags: c.tags,
      });
      taken.add(origin);
      added += 1;
    }
    return created({ added, skipped: cards.length - added });
  });

  // ── Decks follow modules ──────────────────────────────────────────────────
  //
  // A user's collection is one deck per module — Qurʾān, Arabic Linguistics,
  // Arabic, Worldview — rather than a single pile. deck_type carries the module
  // code, so the deck for a card is derivable from the card and nothing has to
  // be chosen at enrollment time.

  const DECK_TITLES: Record<string, string> = {
    QR: 'Qurʾān',
    AL: 'Arabic Linguistics',
    AR: 'Arabic',
    WV: 'Worldview',
    other: 'Other',
  };

  async function deckForModule(env: CoreEnv, userId: string, module: string) {
    const code = DECK_TITLES[module] ? module : 'other';
    const found = await query<{ id: string }>(
      env.DB_CORE,
      'SELECT id FROM core_srs_deck WHERE user_ref = ? AND deck_type = ? LIMIT 1',
      [userId, code],
    );
    if (found[0]) return found[0].id;
    const deck = await new SrsRepo(env.DB_CORE).createDeck({
      user_ref: userId,
      title: DECK_TITLES[code],
      deck_type: code,
    });
    return deck.id;
  }

  // ── Library: the authored cyb_card content ────────────────────────────────
  //
  // cyb_card holds study cards written for the content itself — root work,
  // sentence structure, balāgha — keyed by node, e.g.
  // "CYB:quran:44:1-9:ss:44:3:s1". It has no owner and one shared due_at, so it
  // is a *library*, not a schedule. Enrolling copies a card into the caller's
  // own core_srs_card, where FSRS tracks it per user.

  /// The ayah key a cyb node points at ("44:3"), else the surah ("44").
  function refOfNode(nodeId: string, surah: number): string {
    const m = /:ss:(\d+):(\d+)/.exec(nodeId);
    return m ? `${m[1]}:${m[2]}` : String(surah);
  }

  /// Who may publish into the shared library. Approving a card puts it under a
  /// surah for everyone, which is an editorial act, so the list is explicit
  /// rather than "any admin". CARD_APPROVERS is a comma-separated email list.
  async function isApprover(env: CoreEnv, userId: string): Promise<boolean> {
    const allowed = (env.CARD_APPROVERS ?? '')
      .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (allowed.length === 0) return false;
    const rows = await query<{ email: string }>(
      env.DB_CORE, 'SELECT email FROM core_users WHERE id = ?', [userId]);
    const email = rows[0]?.email?.toLowerCase();
    return !!email && allowed.includes(email);
  }

  // GET /core/srs/library/items?surah=44 — every library card for a scope,
  // each marked with whether this user already has it. The client lists the
  // ones they do not, so adding is a per-card choice rather than all-or-nothing.
  router.get('/core/srs/library/items', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const url = new URL(req.url);
    const surah = Number(url.searchParams.get('surah') ?? '0');
    const like = surah > 0 ? `CYB:quran:${surah}:%` : 'CYB:%';
    const refLike = surah > 0 ? `${surah}:%` : '%';

    // What the user already holds, by the template we key copies on.
    const held = await query<{ card_template: string }>(
      env.DB_CORE,
      'SELECT card_template FROM core_srs_card WHERE user_ref = ?', [ctx.userId]);
    const taken = new Set(held.map((h) => h.card_template));

    const authored = await query<{
      id: string; node_id: string; card_kind: string;
      front_md: string | null; back_md: string | null;
    }>(
      env.DB_CORE,
      'SELECT id, node_id, card_kind, front_md, back_md FROM cyb_card WHERE node_id LIKE ?',
      [like],
    );

    const community = await query<{
      id: string; module: string; resource_ref: string; card_kind: string | null;
      front_text: string; back_text: string | null; author: string | null;
    }>(
      env.DB_CORE,
      `SELECT l.id, l.module, l.resource_ref, l.card_kind, l.front_text, l.back_text,
              u.display_name AS author
         FROM core_srs_library_card l
         LEFT JOIN core_users u ON u.id = l.author_ref
        WHERE l.status = 'approved' AND l.resource_ref LIKE ?`,
      [refLike],
    );

    const items = [
      ...authored.map((c) => ({
        id: c.id,
        source: 'authored',
        module: c.node_id.startsWith('CYB:ling:') ? 'AL' : 'QR',
        resource_ref: refOfNode(c.node_id, surah),
        kind: c.card_kind,
        front: c.front_md ?? '',
        back: c.back_md ?? '',
        author: null as string | null,
        taken: taken.has(c.id),
      })),
      ...community.map((c) => ({
        id: c.id,
        source: 'community',
        module: c.module,
        resource_ref: c.resource_ref,
        kind: c.card_kind ?? 'community',
        front: c.front_text,
        back: c.back_text ?? '',
        author: c.author,
        taken: taken.has(c.id),
      })),
    ];
    return ok({ items, available: items.length, enrolled: items.filter((i) => i.taken).length });
  });

  // POST /core/srs/library/take { ids: [...] } — add just these cards.
  router.post('/core/srs/library/take', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const ids = Array.isArray(body?.['ids']) ? (body['ids'] as unknown[]).filter((i) => typeof i === 'string') as string[] : [];
    if (ids.length === 0) return badRequest('ids is required');

    const repo = new SrsRepo(env.DB_CORE);
    let added = 0;
    for (const id of ids) {
      const authored = await query<{
        id: string; node_id: string; card_kind: string; front_md: string | null; back_md: string | null;
      }>(env.DB_CORE, 'SELECT id, node_id, card_kind, front_md, back_md FROM cyb_card WHERE id = ?', [id]);
      if (authored[0]) {
        const c = authored[0];
        const module = c.node_id.startsWith('CYB:ling:') ? 'AL' : 'QR';
        const m = /:ss:(\d+):(\d+)/.exec(c.node_id);
        await repo.createCard({
          deck_id: await deckForModule(env, ctx.userId, module),
          user_ref: ctx.userId, module, resource_type: 'concept',
          resource_ref: module === 'AL' ? (c.node_id.split(':')[3] ?? c.node_id) : (m ? `${m[1]}:${m[2]}` : c.node_id),
          card_template: c.id,
          front_text: c.front_md ?? '', back_text: c.back_md ?? '',
          extra_json: JSON.stringify({ cyb_card: c.id, node_id: c.node_id, kind: c.card_kind }),
          tags: c.card_kind,
        });
        added += 1;
        continue;
      }
      const shared = await query<{
        id: string; module: string; resource_type: string; resource_ref: string;
        card_kind: string | null; front_text: string; back_text: string | null; tags: string | null;
      }>(env.DB_CORE,
        `SELECT id, module, resource_type, resource_ref, card_kind, front_text, back_text, tags
           FROM core_srs_library_card WHERE id = ? AND status = 'approved'`, [id]);
      if (!shared[0]) continue;
      const c = shared[0];
      await repo.createCard({
        deck_id: await deckForModule(env, ctx.userId, c.module),
        user_ref: ctx.userId, module: c.module, resource_type: c.resource_type,
        resource_ref: c.resource_ref, card_template: c.id,
        front_text: c.front_text, back_text: c.back_text ?? '',
        extra_json: JSON.stringify({ library_card: c.id, kind: c.card_kind }),
        tags: c.tags,
      });
      added += 1;
    }
    return created({ added, requested: ids.length });
  });

  // POST /core/srs/library/submit — offer a card to the shared library.
  // It is not visible to anyone else until approved.
  router.post('/core/srs/library/submit', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const module = str(body?.['module']) ?? 'QR';
    const resourceRef = str(body?.['resource_ref']);
    const front = str(body?.['front_text']);
    if (!resourceRef) return badRequest('resource_ref is required');
    if (!front) return badRequest('front_text is required');

    const id = typedId('SRSLIB');
    await execute(env.DB_CORE,
      `INSERT INTO core_srs_library_card
         (id, author_ref, module, resource_type, resource_ref, card_kind,
          front_text, back_text, tags, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
       ON CONFLICT (author_ref, resource_ref, front_text) DO NOTHING`,
      [id, ctx.userId, module, str(body?.['resource_type']) ?? 'concept', resourceRef,
       str(body?.['card_kind']) ?? null, front, str(body?.['back_text']) ?? null,
       str(body?.['tags']) ?? null]);
    // Read the row back rather than trusting the generated id: on conflict the
    // insert does nothing, and returning the unused id hands the caller an id
    // that does not exist — which then "approves" silently against no row.
    const row = await query<{ id: string; status: string }>(
      env.DB_CORE,
      `SELECT id, status FROM core_srs_library_card
        WHERE author_ref = ? AND resource_ref = ? AND front_text = ?`,
      [ctx.userId, resourceRef, front]);
    if (!row[0]) return badRequest('Could not record the submission');
    return created({ id: row[0].id, status: row[0].status, duplicate: row[0].id !== id });
  });

  // GET /core/srs/library/pending — the approval queue. Approvers only; anyone
  // else gets their own submissions, so an author can still track their offers.
  router.get('/core/srs/library/pending', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const approver = await isApprover(env, ctx.userId);
    const rows = await query(
      env.DB_CORE,
      approver
        ? `SELECT l.*, u.display_name AS author, u.email AS author_email
             FROM core_srs_library_card l
             LEFT JOIN core_users u ON u.id = l.author_ref
            WHERE l.status = 'pending' ORDER BY l.created_at`
        : `SELECT l.*, NULL AS author, NULL AS author_email
             FROM core_srs_library_card l
            WHERE l.author_ref = ? ORDER BY l.created_at DESC`,
      approver ? [] : [ctx.userId],
    );
    return ok({ submissions: rows, can_approve: approver });
  });

  // POST /core/srs/library/:id/review { decision, note? } — publish or decline.
  router.post('/core/srs/library/:id/review', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    if (!(await isApprover(env, ctx.userId))) {
      return forbidden('Only a card approver can review submissions');
    }
    const body = await readJson(req);
    const decision = str(body?.['decision']);
    if (decision !== 'approved' && decision !== 'rejected') {
      return badRequest("decision must be 'approved' or 'rejected'");
    }
    const exists = await query<{ id: string }>(
      env.DB_CORE, 'SELECT id FROM core_srs_library_card WHERE id = ?', [id]);
    if (!exists[0]) return notFound(`submission ${id}`);
    await execute(env.DB_CORE,
      `UPDATE core_srs_library_card
          SET status = ?, review_note = ?, reviewed_by = ?,
              reviewed_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'),
              updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
        WHERE id = ?`,
      [decision, str(body?.['note']) ?? null, ctx.userId, id]);
    return ok({ id, status: decision });
  });

  // GET /core/srs/library?surah=44 — what the library offers, and how much of
  // it this user has already taken.
  router.get('/core/srs/library', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const url = new URL(req.url);
    const surah = Number(url.searchParams.get('surah') ?? '0');
    const like = surah > 0 ? `CYB:quran:${surah}:%` : 'CYB:%';

    const available = await query<{ n: number }>(
      env.DB_CORE,
      'SELECT COUNT(*) AS n FROM cyb_card WHERE node_id LIKE ?', [like],
    );
    const enrolled = await query<{ n: number }>(
      env.DB_CORE,
      `SELECT COUNT(*) AS n FROM core_srs_card
        WHERE user_ref = ? AND resource_type = 'concept'
          AND extra_json LIKE '%"cyb_card"%'
          AND resource_ref LIKE ?`,
      [ctx.userId, surah > 0 ? `${surah}:%` : '%'],
    );
    const kinds = await query(
      env.DB_CORE,
      'SELECT card_kind, COUNT(*) AS n FROM cyb_card WHERE node_id LIKE ? GROUP BY card_kind ORDER BY n DESC',
      [like],
    );
    return ok({
      available: available[0]?.n ?? 0,
      enrolled: enrolled[0]?.n ?? 0,
      by_kind: kinds,
    });
  });

  // POST /core/srs/library/enroll { surah? , scope? } — take a slice of the
  // library. `surah` narrows to one surah's Qurʾān cards; `scope: "roots"`
  // takes the linguistics root work, which carries no surah and so can never
  // be reached by a surah filter; otherwise everything.
  // Idempotent: a card already enrolled is skipped.
  router.post('/core/srs/library/enroll', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const surah = Number(body?.['surah'] ?? 0);
    const scope = str(body?.['scope']) ?? (surah > 0 ? 'quran' : 'all');
    const like = scope === 'roots' ? 'CYB:ling:root:%'
      : surah > 0 ? `CYB:quran:${surah}:%`
      : 'CYB:%';

    const repo = new SrsRepo(env.DB_CORE);
    // No deck is chosen up front: each card's module decides its deck, so a
    // mixed scope (quran + roots) files into the right deck per card.

    const source = await query<{
      id: string; node_id: string; card_kind: string;
      front_md: string | null; back_md: string | null; tags_json: string | null;
    }>(
      env.DB_CORE,
      'SELECT id, node_id, card_kind, front_md, back_md, tags_json FROM cyb_card WHERE node_id LIKE ?',
      [like],
    );

    const mine = await query<{ extra_json: string | null }>(
      env.DB_CORE,
      `SELECT extra_json FROM core_srs_card WHERE user_ref = ? AND extra_json LIKE '%"cyb_card"%'`,
      [ctx.userId],
    );
    const taken = new Set<string>();
    for (const row of mine) {
      try { const e = JSON.parse(row.extra_json ?? '{}'); if (e.cyb_card) taken.add(e.cyb_card); }
      catch { /* ignore malformed extra */ }
    }

    // Not `created`: that is the 201 response helper, and shadowing it here
    // turned the success path into "created is not a function".
    let enrolled = 0;
    for (const c of source) {
      if (taken.has(c.id)) continue;
      // A node's own id says which module it belongs to, so the deck follows
      // from the card rather than from how it was enrolled.
      const module = c.node_id.startsWith('CYB:ling:') ? 'AL' : 'QR';
      await repo.createCard({
        deck_id: await deckForModule(env, ctx.userId, module),
        user_ref: ctx.userId,
        module,
        resource_type: 'concept',
        resource_ref: module === 'AL'
          ? (c.node_id.split(':')[3] ?? c.node_id)
          : refOfNode(c.node_id, surah),
        // The card's uniqueness key is (deck, resource_ref, card_template) and
        // the insert is ON CONFLICT DO NOTHING. An ayah carries several cards
        // of the same kind — 44:3 has two ss_tarjama_build — so keying the
        // template on the kind silently dropped 9 of surah 44's 32. The source
        // card id is unique by construction, so it is the template; the kind
        // stays in tags and extra_json, which is where it is read from anyway.
        card_template: c.id,
        front_text: c.front_md ?? '',
        back_text: c.back_md ?? '',
        extra_json: JSON.stringify({ cyb_card: c.id, node_id: c.node_id, kind: c.card_kind }),
        tags: c.card_kind,
      });
      enrolled += 1;
    }
    return created({ enrolled, skipped: source.length - enrolled });
  });

  // PATCH /core/srs/cards/:id — edit a card's own text.
  //
  // Editing your copy never touches the library it came from: the copy is
  // yours, the source belongs to its author. Scheduling is untouched too — a
  // typo fix is not a review.
  router.patch('/core/srs/cards/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const card = await repo.findCard(id);
    if (!card) return notFound(`card ${id}`);
    if (card.user_ref !== ctx.userId) return forbidden('Not your card');

    const body = await readJson(req);
    const front = str(body?.['front_text']);
    const back = str(body?.['back_text']);
    const kind = str(body?.['card_kind']);
    const domain = str(body?.['concept_domain']);
    const suspended = typeof body?.['suspended'] === 'boolean' ? (body['suspended'] ? 1 : 0) : null;

    await execute(env.DB_CORE,
      `UPDATE core_srs_card SET
         front_text = COALESCE(?, front_text),
         back_text = COALESCE(?, back_text),
         card_kind = COALESCE(?, card_kind),
         concept_domain = COALESCE(?, concept_domain),
         suspended = COALESCE(?, suspended),
         updated_at = datetime('now')
       WHERE id = ?`,
      [front ?? null, back ?? null, kind ?? null, domain ?? null, suspended, id]);

    const params = buildParams(storedOf(await repo.params(ctx.userId)));
    const updated = await repo.findCard(id);
    return ok(updated ? cardToApi(updated, params) : null);
  });

  // GET /core/srs/stats/detail — the numbers that show whether the scheduler
  // is working: what was reviewed and when, what is coming, how intervals are
  // distributed, and how often the answer was remembered.
  //
  // Retention is measured on *review*-state cards only. Counting learning
  // steps would flatter it — a card seen three times in ten minutes is not
  // evidence of memory.
  router.get('/core/srs/stats/detail', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const [heatmap, forecast, intervals, ratings, retention, streak] = await Promise.all([
      query(env.DB_CORE,
        `SELECT substr(reviewed_at, 1, 10) AS day, COUNT(*) AS n
           FROM core_srs_review
          WHERE user_ref = ? AND reviewed_at >= date('now', '-365 day')
          GROUP BY day ORDER BY day`, [ctx.userId]),
      query(env.DB_CORE,
        `SELECT substr(next_review_at, 1, 10) AS day, COUNT(*) AS n
           FROM core_srs_card
          WHERE user_ref = ? AND suspended = 0 AND next_review_at IS NOT NULL
            AND date(next_review_at) <= date('now', '+30 day')
          GROUP BY day ORDER BY day`, [ctx.userId]),
      query(env.DB_CORE,
        `SELECT CASE
                  WHEN scheduled_days < 1   THEN 'learning'
                  WHEN scheduled_days < 7   THEN '1-6d'
                  WHEN scheduled_days < 21  THEN '1-3w'
                  WHEN scheduled_days < 90  THEN '3w-3m'
                  WHEN scheduled_days < 365 THEN '3m-1y'
                  ELSE '1y+' END AS bucket,
                COUNT(*) AS n
           FROM core_srs_card
          WHERE user_ref = ? AND card_state = 'review'
          GROUP BY bucket`, [ctx.userId]),
      query(env.DB_CORE,
        `SELECT rating, COUNT(*) AS n FROM core_srs_review
          WHERE user_ref = ? GROUP BY rating ORDER BY rating`, [ctx.userId]),
      query<{ total: number; remembered: number }>(env.DB_CORE,
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN rating > 1 THEN 1 ELSE 0 END) AS remembered
           FROM core_srs_review
          WHERE user_ref = ? AND state_before = 'review'`, [ctx.userId]),
      query<{ days: number }>(env.DB_CORE,
        `SELECT COUNT(*) AS days FROM (
           SELECT DISTINCT substr(reviewed_at, 1, 10) AS day
             FROM core_srs_review WHERE user_ref = ?)`, [ctx.userId]),
    ]);

    const r = retention[0];
    return ok({
      heatmap,
      forecast,
      intervals,
      ratings,
      days_studied: streak[0]?.days ?? 0,
      retention: r && r.total > 0 ? r.remembered / r.total : null,
      reviews_total: (heatmap as { n: number }[]).reduce((a, b) => a + b.n, 0),
    });
  });

  // ── Anki interop ──────────────────────────────────────────────────────────
  //
  // Plain-text notes, which is Anki's own native text format (File → Import /
  // Export → Notes in Plain Text). Not .apkg: that is a zip around a SQLite
  // collection plus media, which a Worker has no business assembling — and the
  // text format round-trips the part that matters, the notes themselves.
  //
  // Scheduling deliberately does not travel. FSRS state is personal and
  // relative to when *you* reviewed; importing someone's intervals would give
  // you a schedule you never earned. Anki starts imported notes fresh too.

  function tsvEscape(v: string | null | undefined): string {
    return (v ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, '<br>');
  }

  // GET /core/srs/decks/:id/export — the deck as Anki-readable TSV.
  router.get('/core/srs/decks/:id/export', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const deck = await repo.findDeck(id);
    if (!deck) return notFound(`deck ${id}`);
    const mineOrShared = deck.user_ref === ctx.userId || deck.is_shared === 1;
    if (!mineOrShared) return forbidden('That deck is not shared with you');

    const cards = await repo.cardsInDeck(id);
    const lines = [
      '#separator:tab',
      '#html:true',
      '#tags column:3',
      ...cards.map((c) => [
        tsvEscape(c.front_text),
        tsvEscape(c.back_text),
        tsvEscape((c.tags ?? '').split(',').filter(Boolean).join(' ')),
      ].join('\t')),
    ];
    return new Response(lines.join('\n'), {
      headers: {
        'content-type': 'text/tab-separated-values; charset=utf-8',
        'content-disposition': `attachment; filename="${deck.title.replace(/[^\w.-]+/g, '_')}.txt"`,
      },
    });
  });

  // POST /core/srs/import { title?, deck_id?, text } — Anki plain-text notes
  // into a deck of your own. Lines beginning with # are Anki's directives and
  // are skipped; the first two columns are front and back, a third is tags.
  router.post('/core/srs/import', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const text = typeof body?.['text'] === 'string' ? body['text'] : '';
    if (!text.trim()) return badRequest('text is required');

    const repo = new SrsRepo(env.DB_CORE);
    const deckId = str(body?.['deck_id'])
      ?? (await repo.createDeck({
            user_ref: ctx.userId,
            title: str(body?.['title']) ?? 'Imported',
          })).id;
    const deck = await repo.findDeck(deckId);
    if (!deck) return notFound(`deck ${deckId}`);
    if (deck.user_ref !== ctx.userId) return forbidden('Not your deck');

    let imported = 0;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const cols = line.split('\t');
      const front = (cols[0] ?? '').trim();
      if (!front) continue;
      await repo.createCard({
        deck_id: deckId, user_ref: ctx.userId,
        module: 'other', resource_type: 'other',
        resource_ref: front.slice(0, 120),
        front_text: front,
        back_text: (cols[1] ?? '').trim(),
        tags: (cols[2] ?? '').trim().split(/\s+/).filter(Boolean).join(',') || null,
      });
      imported += 1;
    }
    return created({ deck_id: deckId, imported });
  });

  // GET /core/srs/taxonomy — the kind/domain vocabulary, public.
  router.get('/core/srs/taxonomy', async () => ok(TAXONOMY));

  // ── Decks ──────────────────────────────────────────────────────────────────

  // GET /core/srs/decks — the user's decks with their weights.
  //
  // Counts come from here rather than from a second round trip per deck: a
  // deck list that cannot say how big each deck is forces the client to either
  // guess or fan out.
  router.get('/core/srs/decks', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const rows = await query(
      env.DB_CORE,
      `SELECT d.id, d.title, d.deck_type, d.description, d.is_shared,
              d.workspace_id, d.created_at, d.updated_at,
              (SELECT COUNT(*) FROM core_srs_card c WHERE c.deck_id = d.id) AS card_count,
              (SELECT COUNT(*) FROM core_srs_card c
                WHERE c.deck_id = d.id AND c.suspended = 0
                  AND (c.next_review_at IS NULL
                       OR c.next_review_at <= strftime('%Y-%m-%dT%H:%M:%SZ','now'))) AS due_count
         FROM core_srs_deck d
        WHERE d.user_ref = ?
        ORDER BY d.created_at`,
      [ctx.userId],
    );
    return ok(rows);
  });

  router.post('/core/srs/decks', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const title = str(body?.['title']);
    if (!title) return badRequest('title is required');
    const deck = await new SrsRepo(env.DB_CORE).createDeck({
      user_ref: ctx.userId,
      workspace_id: str(body?.['workspace_id']) ?? null,
      title,
      deck_type: str(body?.['deck_type']) ?? 'mixed',
      description: str(body?.['description']) ?? null,
    });
    return created(deck);
  });

  router.delete('/core/srs/decks/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const deck = await repo.findDeck(id);
    if (!deck) return notFound(`deck ${id}`);
    if (deck.user_ref !== ctx.userId) return forbidden('Not your deck');
    await repo.deleteDeck(id);
    return noContent();
  });

  router.get('/core/srs/decks/:id/cards', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const deck = await repo.findDeck(id);
    if (!deck) return notFound(`deck ${id}`);
    if (deck.user_ref !== ctx.userId) return forbidden('Not your deck');
    const params = buildParams(storedOf(await repo.params(ctx.userId)));
    const cards = await repo.cardsInDeck(id);
    return ok(cards.map((c) => cardToApi(c, params)));
  });

  // ── Cards ──────────────────────────────────────────────────────────────────

  // POST /core/srs/cards — enrol a resource. Idempotent on
  // (deck, resource_ref, template), so enrolling twice returns the same card.
  router.post('/core/srs/cards', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const module = str(body?.['module']);
    const resourceType = str(body?.['resource_type']);
    const resourceRef = str(body?.['resource_ref']);
    if (!module || !MODULES.has(module)) {
      return badRequest(`module must be one of ${[...MODULES].join(', ')}`);
    }
    if (!resourceType || !RESOURCE_TYPES.has(resourceType)) {
      return badRequest(`resource_type must be one of ${[...RESOURCE_TYPES].join(', ')}`);
    }
    if (!resourceRef) return badRequest('resource_ref is required');

    const repo = new SrsRepo(env.DB_CORE);
    const deckId = str(body?.['deck_id']) ?? (await repo.defaultDeck(ctx.userId)).id;
    const deck = await repo.findDeck(deckId);
    if (!deck) return notFound(`deck ${deckId}`);
    if (deck.user_ref !== ctx.userId) return forbidden('Not your deck');

    const card = await repo.createCard({
      deck_id: deckId, user_ref: ctx.userId,
      module, resource_type: resourceType, resource_ref: resourceRef,
      card_kind: str(body?.['card_kind']) ?? null,
      concept_domain: str(body?.['concept_domain']) ?? null,
      card_template: str(body?.['card_template']) ?? 'freeform',
      front_text: str(body?.['front_text']) ?? '',
      back_text: str(body?.['back_text']) ?? '',
      extra_json: body?.['extra'] ? JSON.stringify(body['extra']) : null,
      tags: Array.isArray(body?.['tags']) ? (body['tags'] as string[]).join(',') : null,
    });
    return created(cardToApi(card, buildParams(storedOf(await repo.params(ctx.userId)))));
  });

  router.get('/core/srs/cards/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const card = await repo.findCard(id);
    if (!card) return notFound(`card ${id}`);
    if (card.user_ref !== ctx.userId) return forbidden('Not your card');
    return ok(cardToApi(card, buildParams(storedOf(await repo.params(ctx.userId)))));
  });

  router.delete('/core/srs/cards/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const card = await repo.findCard(id);
    if (!card) return notFound(`card ${id}`);
    if (card.user_ref !== ctx.userId) return forbidden('Not your card');
    await repo.deleteCard(id);
    return noContent();
  });

  // POST /core/srs/cards/:id/grade — the only way a card moves.
  //
  // The server schedules and logs. A client sends a rating and gets the new
  // state back; it never computes an interval itself, so two devices cannot
  // disagree about when a card is due.
  router.post('/core/srs/cards/:id/grade', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const repo = new SrsRepo(env.DB_CORE);
    const card = await repo.findCard(id);
    if (!card) return notFound(`card ${id}`);
    if (card.user_ref !== ctx.userId) return forbidden('Not your card');

    const c = card;
    const body = await readJson(req);
    const rating: unknown = body?.['rating'];
    if (!isRating(rating)) {
      return badRequest('rating must be 1 (Again), 2 (Hard), 3 (Good) or 4 (Easy)');
    }
    const duration = typeof body?.['duration_secs'] === 'number'
      ? Math.round(body['duration_secs'] as number) : null;

    const params = buildParams(storedOf(await repo.params(ctx.userId)));
    const now = new Date();
    const next = gradeCard(c, rating, now, params);

    // The log is written first: it is the record, and the card is only its
    // latest projection. A log without an update can be replayed; an update
    // without a log cannot be explained.
    await repo.logReview({
      card_id: id, user_ref: ctx.userId, rating,
      state_before: next.state_before,
      stability_after: next.columns.stability, difficulty_after: next.columns.difficulty,
      elapsed_days: next.columns.elapsed_days,
      scheduled_days_after: next.columns.scheduled_days,
      state_after: next.columns.card_state, review_duration_secs: duration,
      reviewed_at: now.toISOString(),
    });
    const updated = await repo.applySchedule(id, next.columns);
    return ok(cardToApi(updated!, params));
  });

  // ── The queue ──────────────────────────────────────────────────────────────

  // GET /core/srs/review?module=QR&limit=50 — one queue, every subject.
  //
  // `ahead=<days>` is Anki's review-ahead: the same queue with the horizon
  // pushed forward, so a finished day can be extended instead of ending at an
  // empty screen. `due_by_module` deliberately keeps counting only what is
  // genuinely due — studying ahead must not inflate the number that tells
  // someone whether they are done.
  router.get('/core/srs/review', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const url = new URL(req.url);
    const module = url.searchParams.get('module') ?? undefined;
    const limit = Number(url.searchParams.get('limit') ?? '50');
    const surah = Number(url.searchParams.get('surah') ?? '0');
    const kind = url.searchParams.get('kind') ?? undefined;
    const domain = url.searchParams.get('domain') ?? undefined;
    const deck = url.searchParams.get('deck') ?? undefined;
    const ahead = Number(url.searchParams.get('ahead') ?? '0');
    const repo = new SrsRepo(env.DB_CORE);
    const params = buildParams(storedOf(await repo.params(ctx.userId)));
    const [cards, counts] = await Promise.all([
      repo.due(ctx.userId, {
        module,
        limit: Number.isFinite(limit) ? limit : 50,
        ahead: Number.isFinite(ahead) ? ahead : 0,
      }),
      repo.dueCounts(ctx.userId),
    ]);
    // Scope filters run here rather than in every client: surah matches the
    // ayah-key convention ("44" or "44:‥"), kind and domain are exact.
    const scoped = cards.filter((c) => {
      if (deck && c.deck_id !== deck) return false;
      if (surah > 0 && !(c.resource_ref === String(surah) || c.resource_ref.startsWith(`${surah}:`))) return false;
      if (kind && (c as any).card_kind !== kind) return false;
      if (domain && (c as any).concept_domain !== domain) return false;
      return true;
    });
    return ok({
      due: scoped.map((c) => cardToApi(c, params)),
      due_by_module: counts,
      ahead_days: ahead > 0 ? Math.floor(ahead) : 0,
    });
  });

  router.get('/core/srs/stats', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const [byState, dueByModule] = await Promise.all([
      repo.stats(ctx.userId), repo.dueCounts(ctx.userId),
    ]);
    return ok({ by_state: byState, due_by_module: dueByModule });
  });

  // ── The scheduler's own parameters ─────────────────────────────────────────

  // GET /core/srs/params — the weights in force, and how well they predict the
  // log actually recorded.
  router.get('/core/srs/params', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const row = await repo.params(ctx.userId);
    const params = buildParams(storedOf(row));
    const log = await repo.reviewLog(ctx.userId);
    return ok({
      algorithm: 'ts-fsrs',
      fitted: row !== null,
      fitted_at: row?.fitted_at ?? null,
      is_default_weights: params.w.length === default_w.length
        && params.w.every((v, i) => v === default_w[i]),
      weights: params.w,
      request_retention: params.request_retention,
      maximum_interval: params.maximum_interval,
      learning_steps: params.learning_steps,
      relearning_steps: params.relearning_steps,
      enable_fuzz: params.enable_fuzz,
      evaluation: evaluate(log, params),
      note: row?.note ?? null,
    });
  });

  // POST /core/srs/params/optimize — fit the weights to this learner.
  //
  // Scored on a held-out tail the fit never saw; the defaults stand unless the
  // fit genuinely improves it. A fit on thin data is worse than none.
  router.post('/core/srs/params/optimize', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const minimumReviews = typeof body?.['minimum_reviews'] === 'number'
      ? (body['minimum_reviews'] as number) : undefined;

    const repo = new SrsRepo(env.DB_CORE);
    const current = storedOf(await repo.params(ctx.userId));
    const log = await repo.reviewLog(ctx.userId);
    const result = optimize(log, current, { minimumReviews });

    if (result.accepted) {
      await repo.saveParams({
        user_ref: ctx.userId,
        weights: result.weights,
        fitted_reviews: result.before.reviews,
        log_loss_before: result.before.log_loss,
        log_loss_after: result.after.log_loss,
        note: result.reason,
      });
    }
    return ok({
      accepted: result.accepted,
      reason: result.reason,
      weights: result.weights,
      holdout_before: result.before,
      holdout_after: result.after,
    });
  });
}
