import { SrsRepo, type SrsCard } from '../repositories/srs.repo';
import { grade as gradeCard, buildParams, type RatingValue } from './fsrs';
import { storedOf } from './stored-params';

export async function answerCard(
  repo: SrsRepo,
  card: SrsCard,
  userRef: string,
  rating: RatingValue,
  durationSecs: number | null,
  opId?: string | null,
): Promise<SrsCard> {
  const params = buildParams(storedOf(await repo.params(userRef)));
  const now = new Date();
  const next = gradeCard(card, rating, now, params);

  await repo.logReview({
    card_id: card.id, user_ref: userRef, rating,
    state_before: next.state_before,
    stability_after: next.columns.stability,
    difficulty_after: next.columns.difficulty,
    elapsed_days: next.columns.elapsed_days,
    scheduled_days_after: next.columns.scheduled_days,
    state_after: next.columns.card_state,
    review_duration_secs: durationSecs,
    reviewed_at: now.toISOString(),
    op_id: opId ?? null,
  });
  return (await repo.applySchedule(card.id, next.columns))!;
}
