import {
  fsrs, generatorParameters, createEmptyCard, forgetting_curve,
  Rating, State, default_w, FSRS6_DEFAULT_DECAY,
  type Card, type FSRSParameters, type Grade,
} from 'ts-fsrs';

export { Rating, State, default_w, FSRS6_DEFAULT_DECAY };
export type { Card, FSRSParameters, Grade };

export type RatingValue = 1 | 2 | 3 | 4;

export const isRating = (v: unknown): v is RatingValue =>
  v === 1 || v === 2 || v === 3 || v === 4;

export type CardStateName = 'new' | 'learning' | 'review' | 'relearning';

const STATE_NAMES: Record<number, CardStateName> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
};

const STATE_VALUES: Record<CardStateName, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

export const stateName = (s: State): CardStateName => STATE_NAMES[s] ?? 'new';

export interface StoredParams {
  w?: number[] | null;
  request_retention?: number | null;
  maximum_interval?: number | null;
  learning_steps?: string[] | null;
  relearning_steps?: string[] | null;
  enable_fuzz?: boolean | null;
}

export function buildParams(stored?: StoredParams | null): FSRSParameters {
  const w = Array.isArray(stored?.w) && stored!.w!.length === default_w.length
    ? stored!.w!
    : undefined;
  return generatorParameters({
    ...(w ? { w } : {}),
    ...(stored?.request_retention != null ? { request_retention: stored.request_retention } : {}),
    ...(stored?.maximum_interval != null ? { maximum_interval: stored.maximum_interval } : {}),
    // a drill reaches review only once answered well in its lesson: its first review is the next day, not ten minutes on
    learning_steps: (stored?.learning_steps ?? ['1d']) as never,
    ...(stored?.relearning_steps ? { relearning_steps: stored.relearning_steps as never } : {}),
    ...(stored?.enable_fuzz != null ? { enable_fuzz: stored.enable_fuzz } : {}),
  });
}

export const scheduler = (params?: FSRSParameters) => fsrs(params ?? generatorParameters());

export interface CardRow {
  stability: number | null;
  difficulty: number | null;
  card_state: string;
  learning_step: number;
  reps: number;
  lapses: number;
  elapsed_days: number;
  scheduled_days: number;
  last_review_at: string | null;
  next_review_at: string | null;
}

export function toCard(row: CardRow, now: Date = new Date()): Card {
  if (row.stability == null || row.difficulty == null || row.card_state === 'new') {
    return createEmptyCard(row.next_review_at ? new Date(row.next_review_at) : now);
  }
  return {
    due: row.next_review_at ? new Date(row.next_review_at) : now,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_step,
    reps: row.reps,
    lapses: row.lapses,
    state: STATE_VALUES[(row.card_state as CardStateName)] ?? State.New,
    last_review: row.last_review_at ? new Date(row.last_review_at) : undefined,
  };
}

export function toColumns(card: Card) {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    card_state: stateName(card.state),
    learning_step: card.learning_steps ?? 0,
    reps: card.reps,
    lapses: card.lapses,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    last_review_at: (card.last_review ?? new Date()).toISOString(),
    next_review_at: card.due.toISOString(),
  };
}

export interface GradeResult {
  columns: ReturnType<typeof toColumns>;
  state_before: CardStateName;
  card: Card;
}

export function grade(
  row: CardRow, rating: RatingValue, now: Date, params?: FSRSParameters,
): GradeResult {
  const before = toCard(row, now);
  const { card } = scheduler(params).next(before, now, rating as Grade);
  return { columns: toColumns(card), state_before: stateName(before.state), card };
}

export function previewDays(
  row: CardRow, now: Date = new Date(), params?: FSRSParameters,
): Record<RatingValue, number> {
  const preview = scheduler(params).repeat(toCard(row, now), now);
  const days = (g: Grade) => {
    const next = preview[g].card;
    return next.scheduled_days > 0
      ? next.scheduled_days
      : (next.due.getTime() - now.getTime()) / 86_400_000;
  };
  return {
    1: days(Rating.Again as Grade),
    2: days(Rating.Hard as Grade),
    3: days(Rating.Good as Grade),
    4: days(Rating.Easy as Grade),
  };
}

export function retrievabilityOf(
  row: CardRow, now: Date = new Date(), params?: FSRSParameters,
): number | null {
  if (row.stability == null || !row.last_review_at) return null;
  return scheduler(params).get_retrievability(toCard(row, now), now, false);
}

export interface ReviewPoint {
  card_id: string;
  rating: RatingValue;
  reviewed_at: string;
}

export interface Evaluation {
  reviews: number;

  log_loss: number;
  rmse: number;
  mean_predicted: number;
  mean_observed: number;

  bias: number;
}

const EMPTY_EVAL: Evaluation = {
  reviews: 0, log_loss: 0, rmse: 0, mean_predicted: 0, mean_observed: 0, bias: 0,
};

export function evaluate(
  reviews: ReviewPoint[], params?: FSRSParameters,
  window?: { after?: Date; before?: Date },
): Evaluation {
  const p = params ?? generatorParameters();
  const f = fsrs(p);
  const byCard = new Map<string, ReviewPoint[]>();
  for (const r of reviews) {
    const list = byCard.get(r.card_id) ?? [];
    list.push(r);
    byCard.set(r.card_id, list);
  }

  const points: Array<[number, number]> = [];
  for (const log of byCard.values()) {
    log.sort((a, b) => a.reviewed_at.localeCompare(b.reviewed_at));
    let card: Card | null = null;
    for (const review of log) {
      const at = new Date(review.reviewed_at);
      const inWindow =
        (!window?.after || at >= window.after) && (!window?.before || at < window.before);
      if (inWindow && card?.last_review) {
        const elapsed = (at.getTime() - card.last_review.getTime()) / 86_400_000;
        if (elapsed >= 1) {
          points.push([
            forgetting_curve(p.w, elapsed, card.stability),
            review.rating > 1 ? 1 : 0,
          ]);
        }
      }
      card = f.next(card ?? createEmptyCard(at), at, review.rating as Grade).card;
    }
  }

  if (points.length === 0) return EMPTY_EVAL;

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

export interface OptimizeResult {
  weights: number[];
  accepted: boolean;
  before: Evaluation;
  after: Evaluation;
  reason: string;
}

export function optimize(
  reviews: ReviewPoint[],
  stored?: StoredParams | null,
  opts: { minimumReviews?: number; holdoutFraction?: number; rounds?: number } = {},
): OptimizeResult {
  const base = buildParams(stored);
  const minimumReviews = opts.minimumReviews ?? 200;
  const holdoutFraction = Math.min(0.5, Math.max(0.1, opts.holdoutFraction ?? 0.2));
  const rounds = Math.max(1, opts.rounds ?? 6);

  const ordered = [...reviews].sort((a, b) => a.reviewed_at.localeCompare(b.reviewed_at));
  const baseWeights = [...base.w];
  const whole = evaluate(ordered, base);
  const cut = Math.trunc(ordered.length * (1 - holdoutFraction));

  if (ordered.length < minimumReviews || cut <= 0 || cut >= ordered.length) {
    return {
      weights: baseWeights, accepted: false, before: whole, after: whole,
      reason: `${ordered.length} reviews recorded — ${minimumReviews} are needed before a fit `
            + `can be told apart from noise.`,
    };
  }

  const cutoff = new Date(ordered[cut].reviewed_at);

  const withW = (w: number[]) => generatorParameters({ ...base, w });
  const trainLoss = (w: number[]) => evaluate(ordered, withW(w), { before: cutoff }).log_loss;
  const holdout = (w: number[]) => evaluate(ordered, withW(w), { after: cutoff });

  const before = holdout(baseWeights);
  if (before.reviews === 0 || evaluate(ordered, base, { before: cutoff }).reviews === 0) {
    return {
      weights: baseWeights, accepted: false, before, after: before,
      reason: 'Every review is a same-day repeat or a first sight, so none of them predicted '
            + 'anything there was to predict.',
    };
  }

  let best = baseWeights;
  let bestLoss = trainLoss(best);
  let step = 0.35;

  for (let round = 0; round < rounds; round++) {
    let improved = false;
    for (let i = 0; i < best.length; i++) {
      const delta = Math.max(Math.abs(best[i]) * step, 0.01);
      for (const value of [best[i] - delta, best[i] + delta]) {
        const candidate = best.map((v, j) => (j === i ? value : v));
        const settled = [...generatorParameters({ ...base, w: candidate }).w];
        if (settled[i] === best[i]) continue;
        const loss = trainLoss(settled);
        if (loss < bestLoss - 1e-9) {
          bestLoss = loss;
          best = settled;
          improved = true;
        }
      }
    }
    step /= 2;
    if (!improved) break;
  }

  const after = holdout(best);
  const accepted = after.log_loss < before.log_loss - 1e-9;
  return {
    weights: accepted ? best : baseWeights,
    accepted,
    before,
    after,
    reason: accepted
      ? `Fitted and improved the held-out ${before.reviews} reviews — log-loss `
        + `${before.log_loss.toFixed(4)} → ${after.log_loss.toFixed(4)}.`
      : `The fit did not improve the held-out ${before.reviews} reviews `
        + `(${before.log_loss.toFixed(4)} → ${after.log_loss.toFixed(4)}), so the defaults stand.`,
  };
}
