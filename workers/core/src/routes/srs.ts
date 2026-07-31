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
import type { CoreEnv } from '../env';
import { SrsRepo, type SrsCard, type SrsParams } from '../repositories/srs.repo';
import {
  schedule, previewIntervals, evaluate, optimize, resolveParams,
  DEFAULT_WEIGHTS, type Rating, type FsrsParams,
} from '../srs/fsrs';

const MODULES = new Set(['AR', 'AL', 'QR', 'WV', 'other']);
const RESOURCE_TYPES = new Set([
  'vocabulary', 'grammar', 'root', 'lemma', 'word',
  'ayah', 'passage', 'concept', 'other',
]);

const isRating = (v: unknown): v is Rating =>
  v === 1 || v === 2 || v === 3 || v === 4;

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

/** The learner's parameters, falling back to the published defaults. */
function paramsOf(row: SrsParams | null): Partial<FsrsParams> {
  if (!row) return {};
  let weights = DEFAULT_WEIGHTS;
  try {
    const parsed = JSON.parse(row.weights_json);
    if (Array.isArray(parsed)) weights = parsed as number[];
  } catch { /* a corrupt vector falls back rather than failing the review */ }
  const steps = (raw: string, fallback: number[]) => {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as number[] : fallback;
    } catch { return fallback; }
  };
  return {
    w: weights,
    decay: row.decay,
    desiredRetention: row.desired_retention,
    maximumInterval: row.maximum_interval,
    learningSteps: steps(row.learning_steps, [1, 10]),
    relearningSteps: steps(row.relearning_steps, [10]),
  };
}

function cardToApi(c: SrsCard, params: Partial<FsrsParams>) {
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
    preview_days: previewIntervals(
      {
        card_state: c.card_state, stability: c.stability, difficulty: c.difficulty,
        scheduled_days: c.scheduled_days, learning_step: c.learning_step,
        reps: c.reps, lapses: c.lapses, last_review_at: c.last_review_at,
      },
      new Date(), params,
    ),
  };
}

export function srsRoutes(router: Router<CoreEnv>) {

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
    const params = paramsOf(await repo.params(ctx.userId));
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
    return created(cardToApi(card, paramsOf(await repo.params(ctx.userId))));
  });

  router.get('/core/srs/cards/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const card = await repo.findCard(id);
    if (!card) return notFound(`card ${id}`);
    if (card.user_ref !== ctx.userId) return forbidden('Not your card');
    return ok(cardToApi(card, paramsOf(await repo.params(ctx.userId))));
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

    const body = await readJson(req);
    const rating = body?.['rating'];
    if (!isRating(rating)) {
      return badRequest('rating must be 1 (Again), 2 (Hard), 3 (Good) or 4 (Easy)');
    }
    const duration = typeof body?.['duration_secs'] === 'number'
      ? Math.round(body['duration_secs'] as number) : null;

    const params = paramsOf(await repo.params(ctx.userId));
    const now = new Date();
    const next = schedule(
      {
        card_state: card.card_state, stability: card.stability, difficulty: card.difficulty,
        scheduled_days: card.scheduled_days, learning_step: card.learning_step,
        reps: card.reps, lapses: card.lapses, last_review_at: card.last_review_at,
      },
      rating, now, params,
    );

    // The log is written first: it is the record, and the card is a projection
    // of it. If the update failed after a successful log the state could be
    // rebuilt; the reverse could not.
    await repo.logReview({
      card_id: id, user_ref: ctx.userId, rating,
      state_before: card.card_state,
      stability_after: next.stability, difficulty_after: next.difficulty,
      elapsed_days: next.elapsed_days, scheduled_days_after: next.scheduled_days,
      state_after: next.card_state, review_duration_secs: duration,
      reviewed_at: now.toISOString(),
    });
    const updated = await repo.applySchedule(id, {
      ...next, last_review_at: now.toISOString(),
    });
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
    const params = paramsOf(await repo.params(ctx.userId));
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
    const params = resolveParams(paramsOf(row));
    const log = await repo.reviewLog(ctx.userId);
    return ok({
      fitted: row !== null,
      fitted_at: row?.fitted_at ?? null,
      weights: params.w,
      decay: params.decay,
      desired_retention: params.desiredRetention,
      maximum_interval: params.maximumInterval,
      learning_steps: params.learningSteps,
      relearning_steps: params.relearningSteps,
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
    const current = paramsOf(await repo.params(ctx.userId));
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
