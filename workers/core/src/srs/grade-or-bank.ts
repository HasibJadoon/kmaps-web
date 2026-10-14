import type { SrsRepo, SrsCard } from '../repositories/srs.repo';
import type { RatingValue } from './fsrs';
import { answerCard } from './answer';

/** A drill answered right this many times in its lesson graduates into review (owner, 2026-10-15: round robin in the
 *  lesson; marked right three times, it goes to the SRS review stream — every domain). */
export const GRADUATE_AFTER = 3;

/** A drill lapsed this many times goes back to its lesson (leech), its schedule kept. */
export const LEECH_LAPSES = 8;

export type Graded = { card: SrsCard; outcome: 'graded' | 'banked' | 'repeat' };

/** How long an answer took, if it is a believable number of seconds. */
export const cleanSecs = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 3600 ? Math.round(n) : null;
};

/**
 * The one way an answer moves a drill (the grade route, bulk filing, class filing, the together session):
 *   · an op already applied (its op_id seen) changes nothing — a resend from the device is safe;
 *   · a drill still in the BANK (state 'new') missed (Again · Hard) stays banked — logged, not scheduled;
 *   · answered well it stays in its lesson's rotation until it has been right GRADUATE_AFTER times, then graduates
 *     into review, and FSRS adapts to every answer from then on;
 *   · a leech answered well in its lesson goes back to review; a drill past LEECH_LAPSES becomes a leech.
 */
export async function gradeOrBank(repo: SrsRepo, card: SrsCard, userRef: string, rating: RatingValue,
                                  secs: number | null, opId?: string | null): Promise<Graded> {
  if (await repo.seenOp(opId)) return { card, outcome: 'repeat' };
  // in its lesson, answered right but not yet three times: it stays in the lesson's rotation — logged, not scheduled
  const learning = card.card_state === 'new' && rating >= 3 && (await repo.lessonRights(card.id)) + 1 < GRADUATE_AFTER;
  if (card.card_state === 'new' && (rating === 1 || rating === 2 || learning)) {
    await repo.logReview({ card_id: card.id, user_ref: userRef, rating, state_before: 'new', state_after: 'new',
      stability_after: card.stability ?? 0, difficulty_after: card.difficulty ?? 0, elapsed_days: 0, scheduled_days_after: 0,
      review_duration_secs: secs, reviewed_at: new Date().toISOString(), op_id: opId ?? null });
    return { card, outcome: 'banked' };
  }
  const updated = await answerCard(repo, card, userRef, rating, secs, opId);
  if (card.leech && rating >= 3) await repo.setLeech(card.id, false);
  else if ((updated.lapses ?? 0) >= LEECH_LAPSES && !card.leech) await repo.setLeech(card.id, true);
  return { card: updated, outcome: 'graded' };
}
