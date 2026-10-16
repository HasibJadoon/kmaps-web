import { SrsRepo, type SrsCard } from '../repositories/srs.repo';
import { grade as gradeCard, buildParams, type RatingValue, type FSRSParameters as Params } from './fsrs';
import { storedOf } from './stored-params';

/** An answer, applied: FSRS's next schedule, logged and written in one round trip. `params`: the learner's, when the
 *  caller has read them already. `leech(lapsesAfter)`: the leech mark to set, or null to leave it. */
export async function answerCard(
  repo: SrsRepo,
  card: SrsCard,
  userRef: string,
  rating: RatingValue,
  durationSecs: number | null,
  opId?: string | null,
  params?: Params,
  leech?: (lapsesAfter: number) => boolean | null,
): Promise<SrsCard> {
  const p = params ?? buildParams(storedOf(await repo.params(userRef)));
  const now = new Date();
  const next = gradeCard(card, rating, now, p);
  const updated = await repo.reviewAndSchedule({
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
  }, next.columns, leech ? leech(next.columns.lapses ?? 0) : null);
  return updated!;
}
