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

  // POST /core/srs/decks/:id/copy — take a shared deck for yourself. The cards
  // are copied fresh, not referenced: scheduling is personal, so a downloaded
  // deck starts new for you and the author's progress is untouched.
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

    const copy = await repo.createDeck({
      user_ref: ctx.userId,
      title: source.title,
      deck_type: source.deck_type,
      description: source.description,
    });
    const cards = await repo.cardsInDeck(id);
    for (const c of cards) {
      await repo.createCard({
        deck_id: copy.id, user_ref: ctx.userId,
        module: c.module, resource_type: c.resource_type, resource_ref: c.resource_ref,
        card_template: c.card_template, front_text: c.front_text, back_text: c.back_text,
        extra_json: c.extra_json, tags: c.tags,
      });
    }
    return created({ deck: copy, copied: cards.length });
  });

  // ── Decks ──────────────────────────────────────────────────────────────────

  router.get('/core/srs/decks', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    return ok(await new SrsRepo(env.DB_CORE).decks(ctx.userId));
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
  router.get('/core/srs/review', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const url = new URL(req.url);
    const module = url.searchParams.get('module') ?? undefined;
    const limit = Number(url.searchParams.get('limit') ?? '50');
    const repo = new SrsRepo(env.DB_CORE);
    const params = buildParams(storedOf(await repo.params(ctx.userId)));
    const [cards, counts] = await Promise.all([
      repo.due(ctx.userId, { module, limit: Number.isFinite(limit) ? limit : 50 }),
      repo.dueCounts(ctx.userId),
    ]);
    return ok({
      due: cards.map((c) => cardToApi(c, params)),
      due_by_module: counts,
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
