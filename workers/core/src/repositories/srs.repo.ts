// ─── SrsRepo — core_srs_deck · core_srs_card · core_srs_review · core_srs_params
//
// The one SRS store. Cards for every module (AR · AL · QR · WV) live here
// together, which is what lets a single query answer "what is due" across
// subjects. Nothing schedules in this file — see `src/srs/fsrs.ts`.

import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { CardState, Rating } from '../srs/fsrs';

export interface SrsDeck {
  id: string;
  user_ref: string;
  workspace_id: string | null;
  title: string;
  deck_type: string;
  description: string | null;
  is_shared: number;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface SrsCard {
  id: string;
  deck_id: string;
  user_ref: string;
  module: string;
  resource_type: string;
  resource_ref: string;
  card_template: string;
  front_text: string;
  back_text: string;
  extra_json: string | null;
  tags: string | null;
  suspended: number;
  stability: number | null;
  difficulty: number | null;
  card_state: CardState;
  learning_step: number;
  reps: number;
  lapses: number;
  elapsed_days: number;
  scheduled_days: number;
  last_review_at: string | null;
  next_review_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SrsParams {
  user_ref: string;
  weights_json: string;
  decay: number;
  desired_retention: number;
  maximum_interval: number;
  learning_steps: string;
  relearning_steps: string;
  fitted_at: string | null;
  fitted_reviews: number;
  log_loss_before: number | null;
  log_loss_after: number | null;
  note: string | null;
}

const DECK_COLS = `
  id, user_ref, workspace_id, title, deck_type, description,
  is_shared, meta_json, created_at, updated_at
FROM core_srs_deck`;

const CARD_COLS = `
  id, deck_id, user_ref, module, resource_type, resource_ref, card_template,
  front_text, back_text, extra_json, tags, suspended,
  stability, difficulty, card_state, learning_step, reps, lapses,
  elapsed_days, scheduled_days, last_review_at, next_review_at,
  created_at, updated_at
FROM core_srs_card`;

export class SrsRepo {
  constructor(private db: D1Database) {}

  // ── Decks ──────────────────────────────────────────────────────────────────

  decks(userRef: string): Promise<SrsDeck[]> {
    return query<SrsDeck>(this.db,
      `SELECT ${DECK_COLS} WHERE user_ref = ? ORDER BY created_at DESC`, [userRef]);
  }

  findDeck(id: string): Promise<SrsDeck | null> {
    return queryOne<SrsDeck>(this.db, `SELECT ${DECK_COLS} WHERE id = ?`, [id]);
  }

  async createDeck(input: {
    user_ref: string; workspace_id?: string | null; title: string;
    deck_type?: string; description?: string | null;
  }): Promise<SrsDeck> {
    const id = typedId('SRSDECK');
    await execute(this.db,
      `INSERT INTO core_srs_deck (id, user_ref, workspace_id, title, deck_type, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.user_ref, input.workspace_id ?? null, input.title,
       input.deck_type ?? 'mixed', input.description ?? null]);
    return (await this.findDeck(id))!;
  }

  async deleteDeck(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM core_srs_deck WHERE id = ?`, [id]);
  }

  /// The learner's default deck, made on first use so enrolling never needs a
  /// deck to have been created first.
  async defaultDeck(userRef: string): Promise<SrsDeck> {
    const existing = await queryOne<SrsDeck>(this.db,
      `SELECT ${DECK_COLS} WHERE user_ref = ? AND deck_type = 'mixed' ORDER BY created_at LIMIT 1`,
      [userRef]);
    return existing ?? this.createDeck({ user_ref: userRef, title: 'My cards' });
  }

  // ── Cards ──────────────────────────────────────────────────────────────────

  findCard(id: string): Promise<SrsCard | null> {
    return queryOne<SrsCard>(this.db, `SELECT ${CARD_COLS} WHERE id = ?`, [id]);
  }

  cardsInDeck(deckId: string): Promise<SrsCard[]> {
    return query<SrsCard>(this.db,
      `SELECT ${CARD_COLS} WHERE deck_id = ? ORDER BY created_at`, [deckId]);
  }

  /**
   * The unified due queue. One query, every module — this is the question the
   * split store could not answer.
   */
  due(userRef: string, opts: { module?: string; limit?: number } = {}): Promise<SrsCard[]> {
    const args: unknown[] = [userRef];
    let where = `WHERE user_ref = ? AND suspended = 0
                 AND (next_review_at IS NULL OR next_review_at <= datetime('now'))`;
    if (opts.module) { where += ` AND module = ?`; args.push(opts.module); }
    args.push(Math.min(500, Math.max(1, opts.limit ?? 50)));
    return query<SrsCard>(this.db,
      `SELECT ${CARD_COLS} ${where}
       ORDER BY CASE WHEN next_review_at IS NULL THEN 0 ELSE 1 END, next_review_at
       LIMIT ?`, args);
  }

  dueCounts(userRef: string): Promise<Array<{ module: string; n: number }>> {
    return query<{ module: string; n: number }>(this.db,
      `SELECT module, COUNT(*) AS n FROM core_srs_card
       WHERE user_ref = ? AND suspended = 0
         AND (next_review_at IS NULL OR next_review_at <= datetime('now'))
       GROUP BY module`, [userRef]);
  }

  async createCard(input: {
    deck_id: string; user_ref: string; module: string; resource_type: string;
    resource_ref: string; card_template?: string; front_text?: string;
    back_text?: string; extra_json?: string | null; tags?: string | null;
  }): Promise<SrsCard> {
    const id = typedId('SRSCARD');
    await execute(this.db,
      `INSERT INTO core_srs_card
         (id, deck_id, user_ref, module, resource_type, resource_ref, card_template,
          front_text, back_text, extra_json, tags, next_review_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT (deck_id, resource_ref, card_template) DO NOTHING`,
      [id, input.deck_id, input.user_ref, input.module, input.resource_type,
       input.resource_ref, input.card_template ?? 'freeform',
       input.front_text ?? '', input.back_text ?? '',
       input.extra_json ?? null, input.tags ?? null]);
    const row = await queryOne<SrsCard>(this.db,
      `SELECT ${CARD_COLS} WHERE deck_id = ? AND resource_ref = ? AND card_template = ?`,
      [input.deck_id, input.resource_ref, input.card_template ?? 'freeform']);
    return row!;
  }

  async applySchedule(id: string, next: {
    card_state: string; stability: number; difficulty: number;
    elapsed_days: number; scheduled_days: number; learning_step: number;
    reps: number; lapses: number; next_review_at: string; last_review_at: string;
  }): Promise<SrsCard | null> {
    await execute(this.db,
      `UPDATE core_srs_card SET
         card_state = ?, stability = ?, difficulty = ?, elapsed_days = ?,
         scheduled_days = ?, learning_step = ?, reps = ?, lapses = ?,
         last_review_at = ?, next_review_at = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [next.card_state, next.stability, next.difficulty, next.elapsed_days,
       next.scheduled_days, next.learning_step, next.reps, next.lapses,
       next.last_review_at, next.next_review_at, id]);
    return this.findCard(id);
  }

  async deleteCard(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM core_srs_card WHERE id = ?`, [id]);
  }

  // ── The log ────────────────────────────────────────────────────────────────

  async logReview(input: {
    card_id: string; user_ref: string; rating: Rating; state_before: string;
    stability_after: number; difficulty_after: number; elapsed_days: number;
    scheduled_days_after: number; state_after: string;
    review_duration_secs: number | null; reviewed_at: string;
  }): Promise<void> {
    await execute(this.db,
      `INSERT INTO core_srs_review
         (id, card_id, user_ref, rating, state_before, stability_after, difficulty_after,
          elapsed_days, scheduled_days_after, state_after, review_duration_secs, reviewed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [typedId('SRSREV'), input.card_id, input.user_ref, input.rating, input.state_before,
       input.stability_after, input.difficulty_after, input.elapsed_days,
       input.scheduled_days_after, input.state_after, input.review_duration_secs,
       input.reviewed_at]);
  }

  /** The whole log for one learner — what a weight fit trains on. */
  reviewLog(userRef: string): Promise<Array<{ card_id: string; rating: Rating; reviewed_at: string }>> {
    return query(this.db,
      `SELECT card_id, rating, reviewed_at FROM core_srs_review
       WHERE user_ref = ? ORDER BY reviewed_at`, [userRef]);
  }

  stats(userRef: string): Promise<Array<{ card_state: string; n: number }>> {
    return query(this.db,
      `SELECT card_state, COUNT(*) AS n FROM core_srs_card
       WHERE user_ref = ? GROUP BY card_state`, [userRef]);
  }

  // ── Per-user scheduler parameters ──────────────────────────────────────────

  params(userRef: string): Promise<SrsParams | null> {
    return queryOne<SrsParams>(this.db,
      `SELECT user_ref, weights_json, decay, desired_retention, maximum_interval,
              learning_steps, relearning_steps, fitted_at, fitted_reviews,
              log_loss_before, log_loss_after, note
       FROM core_srs_params WHERE user_ref = ?`, [userRef]);
  }

  async saveParams(input: {
    user_ref: string; weights: number[]; fitted_reviews: number;
    log_loss_before: number; log_loss_after: number; note: string;
  }): Promise<void> {
    await execute(this.db,
      `INSERT INTO core_srs_params
         (user_ref, weights_json, fitted_at, fitted_reviews, log_loss_before, log_loss_after, note)
       VALUES (?, ?, datetime('now'), ?, ?, ?, ?)
       ON CONFLICT (user_ref) DO UPDATE SET
         weights_json = excluded.weights_json, fitted_at = excluded.fitted_at,
         fitted_reviews = excluded.fitted_reviews,
         log_loss_before = excluded.log_loss_before,
         log_loss_after = excluded.log_loss_after,
         note = excluded.note, updated_at = datetime('now')`,
      [input.user_ref, JSON.stringify(input.weights), input.fitted_reviews,
       input.log_loss_before, input.log_loss_after, input.note]);
  }
}
