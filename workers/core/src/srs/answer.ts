// ─── Answering a card, in one place ───────────────────────────────────────────
//
// Grading used to live inside the POST /core/srs/cards/:id/grade handler. It
// now has a second caller — the shared review session, where several people
// answer the same question and each one's own card is scheduled — and a
// scheduler that exists twice is a scheduler that will eventually disagree with
// itself about when a card is due.
//
// So the order below is the contract, not an implementation detail: the log is
// written FIRST and the card is only its latest projection. A log without an
// update can be replayed; an update without a log cannot be explained.

import { SrsRepo, type SrsCard } from '../repositories/srs.repo';
import { grade as gradeCard, buildParams, type RatingValue } from './fsrs';
import { storedOf } from './stored-params';

export async function answerCard(
  repo: SrsRepo,
  card: SrsCard,
  userRef: string,
  rating: RatingValue,
  durationSecs: number | null,
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
  });
  return (await repo.applySchedule(card.id, next.columns))!;
}
