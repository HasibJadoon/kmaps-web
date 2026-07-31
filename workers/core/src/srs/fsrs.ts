// ─── FSRS · the Free Spaced Repetition Scheduler ─────────────────────────────
//
// The algorithm Anki has scheduled with since 2023, from the open-source
// `open-spaced-repetition` project. This is FSRS-5.
//
// It replaces an SM-2 scheduler that was filling FSRS-named columns with SM-2
// values — `stability` was assigned the interval and `difficulty` held the ease
// factor. The columns were right; the model behind them was not.
//
// SM-2 keeps one number per card and multiplies the interval by it. FSRS models
// memory as two variables:
//
//   Stability  (S) — days until recall probability falls to 90%
//   Difficulty (D) — 1…10, how much this card resists gaining stability
//
// and derives everything else from them, including *retrievability* — the
// probability the learner would recall the card right now:
//
//   R(t) = (1 + FACTOR · t/S) ^ DECAY
//   I    = (S / FACTOR) · (Rd ^ (1/DECAY) − 1)
//
// with DECAY = −0.5 and FACTOR = 0.9^(1/DECAY) − 1 = 19/81, which makes I = S
// exactly at a desired retention of 0.9.
//
// Because R is computed from how long it has actually been, FSRS uses lateness
// as information: recalling a card three weeks overdue is stronger evidence
// than recalling it on time, and stability grows accordingly. SM-2 cannot see
// that at all.
//
// The weights below are the published defaults. In Anki they are *optimised per
// user* from review history — that is where most of FSRS's advantage lives — so
// `core_srs_review` is written on every grade to make that fit possible later.

export type Rating = 1 | 2 | 3 | 4; // Again · Hard · Good · Easy
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface FsrsParams {
  /** Nineteen weights, FSRS-5. */
  w: number[];
  /** The forgetting curve's shape. −0.5 in FSRS-5; FSRS-6 fits it per user. */
  decay: number;
  /** The recall probability an interval is scheduled to land on. */
  desiredRetention: number;
  maximumInterval: number;
  /** Anki's short-term steps, in minutes, before a card graduates. */
  learningSteps: number[];
  relearningSteps: number[];
}

export const DEFAULT_WEIGHTS: number[] = [
  0.40255, 1.18385, 3.173, 15.69105,
  7.1949, 0.5345,
  1.4604,
  0.0046,
  1.54575, 0.1192, 1.01925,
  1.9395, 0.11, 0.29605, 2.2698,
  0.2315, 2.9898,
  0.51655, 0.6621,
];

export const DEFAULT_PARAMS: FsrsParams = {
  w: DEFAULT_WEIGHTS,
  decay: -0.5,
  desiredRetention: 0.9,
  maximumInterval: 36500,
  learningSteps: [1, 10],
  relearningSteps: [10],
};

/** Bounds that keep a fitted weight vector physically meaningful. */
export const WEIGHT_LOWER = [
  0.001, 0.001, 0.001, 0.001, 1.0, 0.001, 0.001, 0.001,
  0.0, 0.0, 0.001, 0.001, 0.001, 0.001, 0.0, 0.0, 1.0, 0.0, 0.0,
];
export const WEIGHT_UPPER = [
  100, 100, 100, 100, 10.0, 4.0, 4.0, 0.75,
  4.5, 0.8, 3.5, 5.0, 0.25, 0.9, 4.0, 1.0, 6.0, 2.0, 2.0,
];

export function clampWeights(w: number[]): number[] {
  if (!Array.isArray(w) || w.length !== DEFAULT_WEIGHTS.length) return DEFAULT_WEIGHTS;
  return w.map((value, i) =>
    Number.isFinite(value) ? Math.min(WEIGHT_UPPER[i], Math.max(WEIGHT_LOWER[i], value))
                           : DEFAULT_WEIGHTS[i]);
}

export function resolveParams(partial?: Partial<FsrsParams> | null): FsrsParams {
  const p = { ...DEFAULT_PARAMS, ...(partial ?? {}) };
  return {
    w: clampWeights(p.w),
    decay: Number.isFinite(p.decay) && p.decay < 0 ? p.decay : -0.5,
    desiredRetention: Math.min(0.99, Math.max(0.7, p.desiredRetention)),
    maximumInterval: Math.max(1, Math.trunc(p.maximumInterval)),
    learningSteps: (p.learningSteps ?? []).filter((m) => m > 0),
    relearningSteps: (p.relearningSteps ?? []).filter((m) => m > 0),
  };
}

const DAY_MS = 86_400_000;
const factorOf = (decay: number) => Math.pow(0.9, 1 / decay) - 1;

// ── the curve ────────────────────────────────────────────────────────────────

/** Probability of recall `elapsedDays` after the last review. */
export function retrievability(elapsedDays: number, stability: number, p = DEFAULT_PARAMS): number {
  if (!(stability > 0) || !(elapsedDays >= 0)) return 1;
  const r = Math.pow(1 + factorOf(p.decay) * elapsedDays / stability, p.decay);
  return Number.isFinite(r) ? Math.min(1, Math.max(0, r)) : 0;
}

/** The interval that lands on the desired retention. */
export function intervalFor(stability: number, p = DEFAULT_PARAMS): number {
  const f = factorOf(p.decay);
  const raw = (stability / f) * (Math.pow(p.desiredRetention, 1 / p.decay) - 1);
  if (!Number.isFinite(raw)) return p.maximumInterval;
  return Math.min(p.maximumInterval, Math.max(1, raw));
}

// ── memory state ─────────────────────────────────────────────────────────────

const clampD = (d: number) => (Number.isFinite(d) ? Math.min(10, Math.max(1, d)) : 5);
const clampS = (s: number, p: FsrsParams) =>
  Number.isFinite(s) ? Math.min(p.maximumInterval, Math.max(0.01, s)) : 0.01;

export const initialStability = (g: Rating, p = DEFAULT_PARAMS) => clampS(p.w[g - 1], p);

export const initialDifficulty = (g: Rating, p = DEFAULT_PARAMS) =>
  clampD(p.w[4] - Math.exp(p.w[5] * (g - 1)) + 1);

/**
 * Difficulty moves by rating, is damped near the ceiling, then reverts slightly
 * toward the anchor an "Easy" first answer would set — so one bad day cannot
 * permanently mark a card hard.
 */
export function nextDifficulty(d: number, g: Rating, p = DEFAULT_PARAMS): number {
  const delta = -p.w[6] * (g - 3);
  const damped = d + delta * (10 - d) / 9;
  return clampD(p.w[7] * initialDifficulty(4, p) + (1 - p.w[7]) * damped);
}

/**
 * Stability after a successful recall. The `(1 − R)` term is the important one:
 * the less likely recall was, the more recalling it teaches.
 */
export function stabilityOnRecall(
  s: number, d: number, r: number, g: Rating, p = DEFAULT_PARAMS,
): number {
  const hard = g === 2 ? p.w[15] : 1;
  const easy = g === 4 ? p.w[16] : 1;
  const growth =
    Math.exp(p.w[8]) * (11 - d) * Math.pow(s, -p.w[9]) *
    (Math.exp(p.w[10] * (1 - r)) - 1) * hard * easy;
  return clampS(s * (1 + growth), p);
}

/** Stability after a lapse — capped at the prior stability, because forgetting
 *  a card can never be evidence the learner knows it better. */
export function stabilityOnLapse(s: number, d: number, r: number, p = DEFAULT_PARAMS): number {
  const lapsed =
    p.w[11] * Math.pow(d, -p.w[12]) * (Math.pow(s + 1, p.w[13]) - 1) *
    Math.exp(p.w[14] * (1 - r));
  return clampS(Math.min(lapsed, s), p);
}

/** Same-day repeats are not a memory test, so they get their own adjustment. */
export function shortTermStability(s: number, g: Rating, p = DEFAULT_PARAMS): number {
  return clampS(s * Math.exp(p.w[17] * (g - 3 + p.w[18])), p);
}

// ── scheduling ───────────────────────────────────────────────────────────────

export interface ScheduleInput {
  card_state: CardState | string;
  stability: number | null;
  difficulty: number | null;
  scheduled_days: number;
  learning_step: number;
  reps: number;
  lapses: number;
  last_review_at: string | null;
}

export interface ScheduleResult {
  card_state: CardState;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_step: number;
  reps: number;
  lapses: number;
  next_review_at: string;
}

/**
 * One answer. FSRS decides the memory state; the learning steps decide whether
 * the card returns in minutes or in months.
 */
export function schedule(
  input: ScheduleInput, rating: Rating, now: Date = new Date(), partial?: Partial<FsrsParams>,
): ScheduleResult {
  const p = resolveParams(partial);
  const state = (input.card_state ?? 'new') as CardState;
  const isFirst = state === 'new' || input.stability == null || input.difficulty == null;

  const elapsedMs = input.last_review_at
    ? Math.max(0, now.getTime() - new Date(input.last_review_at).getTime())
    : 0;
  const elapsedDaysExact = elapsedMs / DAY_MS;
  const elapsed_days = Math.round(elapsedDaysExact);

  let stability: number;
  let difficulty: number;

  if (isFirst) {
    stability = initialStability(rating, p);
    difficulty = initialDifficulty(rating, p);
  } else {
    const s = input.stability as number;
    const d = input.difficulty as number;
    const r = retrievability(elapsedDaysExact, s, p);
    difficulty = nextDifficulty(d, rating, p);
    if (state === 'review' && rating === 1) {
      stability = stabilityOnLapse(s, d, r, p);
    } else if (elapsedDaysExact < 1) {
      stability = shortTermStability(s, rating, p);
    } else {
      stability = stabilityOnRecall(s, d, r, rating, p);
    }
  }

  const reps = Math.max(0, Math.trunc(input.reps) || 0) + 1;
  let lapses = Math.max(0, Math.trunc(input.lapses) || 0);
  const step = Math.max(0, Math.trunc(input.learning_step) || 0);

  const graduate = (): ScheduleResult => {
    const days = Math.min(p.maximumInterval, Math.max(1, Math.round(intervalFor(stability, p))));
    return {
      card_state: 'review', stability, difficulty, elapsed_days,
      scheduled_days: days, learning_step: 0, reps, lapses,
      next_review_at: new Date(now.getTime() + days * DAY_MS).toISOString(),
    };
  };

  const enterSteps = (steps: number[], next: CardState, index: number): ScheduleResult => {
    if (steps.length === 0) return graduate();
    const i = Math.min(Math.max(0, index), steps.length - 1);
    return {
      card_state: next, stability, difficulty, elapsed_days,
      scheduled_days: 0, learning_step: i, reps, lapses,
      next_review_at: new Date(now.getTime() + steps[i] * 60_000).toISOString(),
    };
  };

  if (state === 'review') {
    if (rating === 1) {
      lapses += 1;
      return enterSteps(p.relearningSteps, 'relearning', 0);
    }
    return graduate();
  }

  // new · learning · relearning
  const steps = state === 'relearning' ? p.relearningSteps : p.learningSteps;
  const back: CardState = state === 'relearning' ? 'relearning' : 'learning';
  if (rating === 4) return graduate();
  // A miss inside the steps restarts them but is not a lapse — Anki counts
  // lapses only from the review state.
  if (rating === 1) return enterSteps(steps, back, 0);
  if (rating === 2) return enterSteps(steps, back, step);
  const advanced = step + 1;
  return advanced >= steps.length ? graduate() : enterSteps(steps, back, advanced);
}

/** What each rating would schedule — for the review buttons. */
export function previewIntervals(
  input: ScheduleInput, now: Date = new Date(), partial?: Partial<FsrsParams>,
): Record<Rating, number> {
  const at = (g: Rating) => {
    const r = schedule(input, g, now, partial);
    return r.scheduled_days > 0
      ? r.scheduled_days
      : (new Date(r.next_review_at).getTime() - now.getTime()) / DAY_MS;
  };
  return { 1: at(1), 2: at(2), 3: at(3), 4: at(4) };
}

// ── scoring the parameters ───────────────────────────────────────────────────

export interface ReviewPoint {
  card_id: string;
  rating: Rating;
  reviewed_at: string;
}

export interface Evaluation {
  reviews: number;
  /** Mean binary cross-entropy — what FSRS's own optimiser minimises. */
  log_loss: number;
  rmse: number;
  mean_predicted: number;
  mean_observed: number;
  /** Positive means recall is predicted more often than it happens, i.e.
   *  intervals are running long. */
  bias: number;
}

/**
 * Replays each card's log, scoring every prediction before applying it. Only
 * genuine tests count: a same-day repeat and a card's first sight had no prior
 * interval, so there was nothing to predict.
 */
export function evaluate(
  reviews: ReviewPoint[], partial?: Partial<FsrsParams>,
  window?: { after?: Date; before?: Date },
): Evaluation {
  const p = resolveParams(partial);
  const byCard = new Map<string, ReviewPoint[]>();
  for (const r of reviews) {
    const list = byCard.get(r.card_id) ?? [];
    list.push(r);
    byCard.set(r.card_id, list);
  }

  const points: Array<[number, number]> = [];
  for (const log of byCard.values()) {
    log.sort((a, b) => a.reviewed_at.localeCompare(b.reviewed_at));
    let state: ScheduleInput = {
      card_state: 'new', stability: null, difficulty: null,
      scheduled_days: 0, learning_step: 0, reps: 0, lapses: 0, last_review_at: null,
    };
    for (const review of log) {
      const at = new Date(review.reviewed_at);
      const inWindow =
        (!window?.after || at >= window.after) && (!window?.before || at < window.before);
      if (inWindow && state.stability != null && state.last_review_at) {
        const elapsed = (at.getTime() - new Date(state.last_review_at).getTime()) / DAY_MS;
        if (elapsed >= 1) {
          points.push([retrievability(elapsed, state.stability, p), review.rating > 1 ? 1 : 0]);
        }
      }
      const next = schedule(state, review.rating, at, p);
      state = {
        card_state: next.card_state, stability: next.stability, difficulty: next.difficulty,
        scheduled_days: next.scheduled_days, learning_step: next.learning_step,
        reps: next.reps, lapses: next.lapses, last_review_at: review.reviewed_at,
      };
    }
  }

  if (points.length === 0) {
    return { reviews: 0, log_loss: 0, rmse: 0, mean_predicted: 0, mean_observed: 0, bias: 0 };
  }

  const n = points.length;
  const eps = 1e-6;
  let loss = 0, squared = 0, sumP = 0, sumO = 0;
  for (const [predicted, observed] of points) {
    const q = Math.min(1 - eps, Math.max(eps, predicted));
    loss -= observed * Math.log(q) + (1 - observed) * Math.log(1 - q);
    squared += (predicted - observed) ** 2;
    sumP += predicted;
    sumO += observed;
  }
  return {
    reviews: n,
    log_loss: loss / n,
    rmse: Math.sqrt(squared / n),
    mean_predicted: sumP / n,
    mean_observed: sumO / n,
    bias: sumP / n - sumO / n,
  };
}

/**
 * Fits the weights to one learner's log by coordinate descent, scored on a
 * held-out tail it never trained on. Returns the defaults untouched unless the
 * fit genuinely improves that tail — a fit on thin data is worse than none.
 */
export function optimize(
  reviews: ReviewPoint[],
  starting: Partial<FsrsParams> | null = null,
  opts: { minimumReviews?: number; holdoutFraction?: number; rounds?: number } = {},
): { weights: number[]; accepted: boolean; before: Evaluation; after: Evaluation; reason: string } {
  const base = resolveParams(starting);
  const minimumReviews = opts.minimumReviews ?? 200;
  const holdoutFraction = Math.min(0.5, Math.max(0.1, opts.holdoutFraction ?? 0.2));
  const rounds = Math.max(1, opts.rounds ?? 8);

  const ordered = [...reviews].sort((a, b) => a.reviewed_at.localeCompare(b.reviewed_at));
  const cut = Math.trunc(ordered.length * (1 - holdoutFraction));
  const whole = evaluate(ordered, base);

  if (ordered.length < minimumReviews || cut <= 0 || cut >= ordered.length) {
    return {
      weights: base.w, accepted: false, before: whole, after: whole,
      reason: `${ordered.length} reviews recorded — ${minimumReviews} are needed before a fit ` +
              `can be told apart from noise.`,
    };
  }

  const cutoff = new Date(ordered[cut].reviewed_at);
  const trainOf = (w: number[]) => evaluate(ordered, { ...base, w }, { before: cutoff });
  const holdOf = (w: number[]) => evaluate(ordered, { ...base, w }, { after: cutoff });

  const before = holdOf(base.w);
  if (before.reviews === 0 || trainOf(base.w).reviews === 0) {
    return {
      weights: base.w, accepted: false, before, after: before,
      reason: 'Every review is a same-day repeat or a first sight, so none of them predicted ' +
              'anything there was to predict.',
    };
  }

  let best = clampWeights(base.w);
  let bestLoss = trainOf(best).log_loss;
  let step = 0.35;

  for (let round = 0; round < rounds; round++) {
    let improved = false;
    for (let i = 0; i < best.length; i++) {
      const span = WEIGHT_UPPER[i] - WEIGHT_LOWER[i];
      const delta = Math.max(Math.abs(best[i]) * step, span * step * 0.05);
      for (const value of [best[i] - delta, best[i] + delta]) {
        const candidate = clampWeights(best.map((v, j) => (j === i ? value : v)));
        if (candidate[i] === best[i]) continue;
        const loss = trainOf(candidate).log_loss;
        if (loss < bestLoss - 1e-9) {
          bestLoss = loss;
          best = candidate;
          improved = true;
        }
      }
    }
    step /= 2;
    if (!improved) break;
  }

  const after = holdOf(best);
  const accepted = after.log_loss < before.log_loss - 1e-9;
  return {
    weights: accepted ? best : base.w,
    accepted,
    before,
    after,
    reason: accepted
      ? `Fitted and improved the held-out ${before.reviews} reviews — log-loss ` +
        `${before.log_loss.toFixed(4)} → ${after.log_loss.toFixed(4)}.`
      : `The fit did not improve the held-out ${before.reviews} reviews ` +
        `(${before.log_loss.toFixed(4)} → ${after.log_loss.toFixed(4)}), so the defaults stand.`,
  };
}
