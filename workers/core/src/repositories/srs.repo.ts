import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { CardStateName, RatingValue } from '../srs/fsrs';

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

  parent_id: string | null;
  slug: string | null;
  sort_order: number | null;

  new_per_day: number | null;
  review_per_day: number | null;

  limit_scope: string | null;
}

export interface SrsCard {
  id: string;
  deck_id: string;
  user_ref: string;
  module: string;
  resource_type: string;
  resource_ref: string;
  card_template: string;

  card_kind: string | null;
  concept_domain: string | null;
  front_text: string;
  back_text: string;
  extra_json: string | null;

  note_type_id: string | null;
  fields_json: string | null;

  root_norm: string | null;

  intro_surah: number | null;
  tags: string | null;
  suspended: number;
  stability: number | null;
  difficulty: number | null;
  card_state: CardStateName;
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
  desired_retention: number;
  maximum_interval: number;
  learning_steps: string;
  relearning_steps: string;
  fitted_at: string | null;
  fitted_reviews: number;
  log_loss_before: number | null;
  log_loss_after: number | null;
  note: string | null;

  new_per_day: number | null;
  review_per_day: number | null;
}

export const DEFAULT_NEW_PER_DAY = 50;
export const DEFAULT_REVIEW_PER_DAY = 200;

const DECK_COLS = `
  id, user_ref, workspace_id, title, deck_type, description,
  is_shared, meta_json, created_at, updated_at,
  parent_id, slug, sort_order, new_per_day, review_per_day, limit_scope
FROM core_srs_deck`;

const CARD_COLS = `
  id, deck_id, user_ref, module, resource_type, resource_ref, card_template,
  front_text, back_text, extra_json, tags, card_kind, concept_domain, suspended,
  note_type_id, fields_json, root_norm, intro_surah,
  stability, difficulty, card_state, learning_step, reps, lapses,
  elapsed_days, scheduled_days, last_review_at, next_review_at,
  created_at, updated_at
FROM core_srs_card`;

export class SrsRepo {
  constructor(private db: D1Database) {}

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

  async defaultDeck(userRef: string): Promise<SrsDeck> {
    const existing = await queryOne<SrsDeck>(this.db,
      `SELECT ${DECK_COLS} WHERE user_ref = ? AND deck_type = 'mixed' ORDER BY created_at LIMIT 1`,
      [userRef]);
    return existing ?? this.createDeck({ user_ref: userRef, title: 'My cards' });
  }

  findCard(id: string): Promise<SrsCard | null> {
    return queryOne<SrsCard>(this.db, `SELECT ${CARD_COLS} WHERE id = ?`, [id]);
  }

  counterpart(userRef: string, askedCardId: string): Promise<SrsCard | null> {
    return queryOne<SrsCard>(
      this.db,
      `SELECT ${CARD_COLS}
        WHERE user_ref = ? AND suspended = 0
          AND EXISTS (
            SELECT 1 FROM core_srs_card asked
             WHERE asked.id = ?
               AND ((asked.library_ref IS NOT NULL
                     AND core_srs_card.library_ref = asked.library_ref)
                 OR (core_srs_card.module        = asked.module
                 AND core_srs_card.resource_type = asked.resource_type
                 AND core_srs_card.resource_ref  = asked.resource_ref
                 AND core_srs_card.card_template = asked.card_template)))
        ORDER BY next_review_at IS NULL, next_review_at
        LIMIT 1`,
      [userRef, askedCardId],
    );
  }

  cardsInDeck(deckId: string): Promise<SrsCard[]> {
    return query<SrsCard>(this.db,
      `SELECT ${CARD_COLS} WHERE deck_id = ? ORDER BY created_at`, [deckId]);
  }

  due(userRef: string, opts: {
    module?: string; limit?: number; ahead?: number;
    surah?: number; kind?: string; domain?: string;

    from?: number; to?: number;

    step?: string;

    deck?: string; deckIds?: string[];
    /** 'practised' (review: drills met at least once) or 'bank' (filed but never practised — dealt by their lesson, not by review) */
    state?: 'practised' | 'bank';
  } = {}): Promise<SrsCard[]> {
    const args: unknown[] = [userRef];
    const bank = opts.state === 'bank';

    const ahead = Math.min(3650, Math.max(0, Math.floor(opts.ahead ?? 0)));
    const horizon = ahead > 0 ? `datetime('now', '+${ahead} day')` : `datetime('now')`;

    // Review deals only what was practised: a drill comes to SRS once it has been met in its lesson. One filed and never
    // practised waits in the bank (state 'new'), and its lesson deals it (GET /core/srs/bank).
    let where = bank
      ? `WHERE user_ref = ? AND suspended = 0 AND card_state = 'new'`
      : `WHERE user_ref = ? AND suspended = 0 AND card_state != 'new'
                 AND (next_review_at IS NULL
                      OR datetime(next_review_at) <= ${horizon})`;
    if (opts.module) { where += ` AND module = ?`; args.push(opts.module); }

    if (opts.surah && opts.surah > 0) {
      where += ` AND (resource_ref = ? OR resource_ref LIKE ? OR intro_surah = ?
                      OR id IN (SELECT card_id FROM core_srs_card_surah
                                 WHERE surah = ?))`;
      args.push(String(opts.surah), `${opts.surah}:%`, opts.surah, opts.surah);
    }

    if (opts.surah && opts.surah > 0 && opts.from && opts.to) {

      where += ` AND (
        (resource_ref GLOB ? AND CAST(substr(resource_ref, instr(resource_ref, ':') + 1)
              AS INTEGER) BETWEEN ? AND ?)
        OR (intro_surah = ? AND intro_ayah BETWEEN ? AND ?))`;
      args.push(`${opts.surah}:*`, opts.from, opts.to,
                opts.surah, opts.from, opts.to);
    }

    if (opts.step) {
      const STEP_SQL: Record<string, string> = {
        reading: `card_kind IN ('translation','context')`,
        vocabulary: `(resource_type IN ('lemma','word','root')
                      OR card_kind IN ('morphology','vocabulary','senses','root_dna',
                                       'root_sense','root_gov','sarf'))`,
        sentence_structure: `card_kind IN ('nahw','irab','structure')`,
        tafsir: `card_kind IN ('balagha','expression','furuq')`,
        worldview: `module = 'WV'`,
      };
      const clause = STEP_SQL[opts.step];
      if (clause) where += ` AND ${clause}`;
    }
    if (opts.kind) { where += ` AND card_kind = ?`; args.push(opts.kind); }
    if (opts.domain) { where += ` AND concept_domain = ?`; args.push(opts.domain); }
    const deckSet = opts.deckIds?.length ? opts.deckIds : (opts.deck ? [opts.deck] : []);
    if (deckSet.length > 0) {
      where += ` AND deck_id IN (${deckSet.map(() => '?').join(',')})`;
      args.push(...deckSet);
    }
    args.push(Math.min(500, Math.max(1, opts.limit ?? 50)));
    return query<SrsCard>(this.db,
      `SELECT ${CARD_COLS} ${where}
       ORDER BY CASE WHEN next_review_at IS NULL THEN 0 ELSE 1 END,
                datetime(next_review_at)
       LIMIT ?`, args);
  }

  async todayCountsByDeck(userRef: string): Promise<Map<string, { introduced: number; reviewed: number }>> {
    const rows = await query<{ deck_id: string; state_before: string; n: number }>(this.db,
      `SELECT c.deck_id AS deck_id, r.state_before AS state_before, COUNT(*) AS n
         FROM core_srs_review r
         JOIN core_srs_card c ON c.id = r.card_id
        WHERE r.user_ref = ? AND date(r.reviewed_at) = date('now')
        GROUP BY c.deck_id, r.state_before`, [userRef]);
    const out = new Map<string, { introduced: number; reviewed: number }>();
    for (const r of rows) {
      const cur = out.get(r.deck_id) ?? { introduced: 0, reviewed: 0 };
      if (r.state_before === 'new') cur.introduced += r.n;
      else cur.reviewed += r.n;
      out.set(r.deck_id, cur);
    }
    return out;
  }

  async todayCounts(userRef: string, deckIds?: string[]): Promise<{ introduced: number; reviewed: number }> {
    const args: unknown[] = [userRef];
    let scope = '';
    if (deckIds && deckIds.length > 0) {
      scope = ` AND c.deck_id IN (${deckIds.map(() => '?').join(',')})`;
      args.push(...deckIds);
    }
    const rows = await query<{ state_before: string; n: number }>(this.db,
      `SELECT r.state_before AS state_before, COUNT(*) AS n
         FROM core_srs_review r
         JOIN core_srs_card c ON c.id = r.card_id
        WHERE r.user_ref = ? AND date(r.reviewed_at) = date('now')${scope}
        GROUP BY r.state_before`, args);
    let introduced = 0, reviewed = 0;
    for (const r of rows) {
      if (r.state_before === 'new') introduced += r.n;
      else reviewed += r.n;
    }
    return { introduced, reviewed };
  }

  dueCounts(userRef: string): Promise<Array<{ module: string; n: number }>> {
    return query<{ module: string; n: number }>(this.db,
      `SELECT module, COUNT(*) AS n FROM core_srs_card
       WHERE user_ref = ? AND suspended = 0 AND card_state != 'new'
         AND (next_review_at IS NULL
              OR datetime(next_review_at) <= datetime('now'))
       GROUP BY module`, [userRef]);
  }

  async insertCard(input: {
    deck_id: string; user_ref: string; module: string; resource_type: string;
    resource_ref: string; card_template?: string; front_text?: string;
    back_text?: string; extra_json?: string | null; tags?: string | null;
    card_kind?: string | null; concept_domain?: string | null;

    note_type_id?: string | null; fields_json?: string | null;
    root_norm?: string | null; intro_surah?: number | null; intro_ayah?: number | null;
  }): Promise<{ card: SrsCard; inserted: boolean }> {
    const id = typedId('SRSCARD');
    await execute(this.db,
      `INSERT INTO core_srs_card
         (id, deck_id, user_ref, module, resource_type, resource_ref, card_template,
          front_text, back_text, extra_json, tags, card_kind, concept_domain,
          note_type_id, fields_json, root_norm, intro_surah, intro_ayah, next_review_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (deck_id, resource_ref, card_template) DO NOTHING`,
      [id, input.deck_id, input.user_ref, input.module, input.resource_type,
       input.resource_ref, input.card_template ?? 'freeform',
       input.front_text ?? '', input.back_text ?? '',
       input.extra_json ?? null, input.tags ?? null,
       input.card_kind ?? null, input.concept_domain ?? null,
       input.note_type_id ?? null, input.fields_json ?? null,
       input.root_norm ?? null, input.intro_surah ?? null, input.intro_ayah ?? null,

       new Date().toISOString()]);
    const row = await queryOne<SrsCard>(this.db,
      `SELECT ${CARD_COLS} WHERE deck_id = ? AND resource_ref = ? AND card_template = ?`,
      [input.deck_id, input.resource_ref, input.card_template ?? 'freeform']);

    return { card: row!, inserted: row?.id === id };
  }

  async createCard(input: Parameters<SrsRepo['insertCard']>[0]): Promise<SrsCard> {
    return (await this.insertCard(input)).card;
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

  async linkSurahs(
    cardId: string,
    spread: { surah: number; n_occur: number }[],
    introSurah: number | null = null,
  ): Promise<number> {
    await execute(this.db, `DELETE FROM core_srs_card_surah WHERE card_id = ?`, [cardId]);
    const rows = spread.filter((r) => Number.isFinite(r.surah) && r.surah > 0);
    if (!rows.length) return 0;

    const PER_ROW = 4;
    const CHUNK = Math.floor(100 / PER_ROW);
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const values = slice.map(() => '(?, ?, ?, ?)').join(', ');
      const args = slice.flatMap((r) => [
        cardId, r.surah, Math.max(0, Math.trunc(r.n_occur)),
        introSurah !== null && r.surah === introSurah ? 1 : 0,
      ]);
      await execute(this.db,
        `INSERT INTO core_srs_card_surah (card_id, surah, n_occur, is_intro)
         VALUES ${values}`, args);
    }
    return rows.length;
  }

  async deleteCard(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM core_srs_card WHERE id = ?`, [id]);
  }

  async logReview(input: {
    card_id: string; user_ref: string; rating: RatingValue; state_before: string;
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

  reviewLog(userRef: string): Promise<Array<{ card_id: string; rating: RatingValue; reviewed_at: string }>> {
    return query(this.db,
      `SELECT card_id, rating, reviewed_at FROM core_srs_review
       WHERE user_ref = ? ORDER BY reviewed_at`, [userRef]);
  }

  stats(userRef: string): Promise<Array<{ card_state: string; n: number }>> {
    return query(this.db,
      `SELECT card_state, COUNT(*) AS n FROM core_srs_card
       WHERE user_ref = ? GROUP BY card_state`, [userRef]);
  }

  params(userRef: string): Promise<SrsParams | null> {
    return queryOne<SrsParams>(this.db,
      `SELECT user_ref, weights_json, desired_retention, maximum_interval,
              learning_steps, relearning_steps, fitted_at, fitted_reviews,
              log_loss_before, log_loss_after, note,
              new_per_day, review_per_day
       FROM core_srs_params WHERE user_ref = ?`, [userRef]);
  }

  async dailyDefaults(userRef: string): Promise<{ newPerDay: number; reviewPerDay: number }> {
    const row = await this.params(userRef);
    return {
      newPerDay: row?.new_per_day ?? DEFAULT_NEW_PER_DAY,
      reviewPerDay: row?.review_per_day ?? DEFAULT_REVIEW_PER_DAY,
    };
  }

  async saveDailyLimits(userRef: string, newPerDay: number | null, reviewPerDay: number | null): Promise<void> {
    await execute(this.db,
      `INSERT INTO core_srs_params (user_ref, weights_json, new_per_day, review_per_day)
       VALUES (?, '[]', ?, ?)
       ON CONFLICT (user_ref) DO UPDATE SET
         new_per_day = excluded.new_per_day,
         review_per_day = excluded.review_per_day,
         updated_at = datetime('now')`,
      [userRef, newPerDay, reviewPerDay]);
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
