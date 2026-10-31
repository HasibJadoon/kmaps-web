import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { CardStateName, RatingValue } from '../srs/fsrs';
import { softFail } from '../../../shared/src/soft-fail';

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
  /** the lesson the drill belongs to (extra.group.workId), and whether it lapsed so often its lesson deals it again */
  work_ref?: string | null;
  leech?: number | null;
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

/** the lesson a drill belongs to: its extra.group.workId (QR:SURAH:n, ACQ:…, WV:…) */
const workOf = (extra: string | null | undefined): string | null => {
  try { const g = extra ? (JSON.parse(extra) as { group?: { workId?: unknown } }).group : null; return typeof g?.workId === 'string' ? g.workId : null; }
  catch { return null; }
};

/** a drill's own stable id and what classifies it: its discipline (a grammar-term drill's term), kind, and focus */
const drillOf = (extra: string | null | undefined) => {
  try {
    const x = extra ? (JSON.parse(extra) as { drill?: Record<string, unknown>; group?: { skill?: unknown } }) : null;
    const d = x?.drill;
    if (d?.id == null) return null;
    const str = (v: unknown) => (typeof v === 'string' && v ? v : null);
    return { id: String(d.id), discipline: str(d.discipline), kind: str(d.ask) ?? str(d.kind), skill: str(x?.group?.skill) };
  } catch { return null; }
};

const CARD_COLS = `
  id, deck_id, user_ref, module, resource_type, resource_ref, card_template,
  front_text, back_text, extra_json, tags, card_kind, concept_domain, suspended,
  note_type_id, fields_json, root_norm, intro_surah, work_ref, leech,
  stability, difficulty, card_state, learning_step, reps, lapses,
  elapsed_days, scheduled_days, last_review_at, next_review_at,
  created_at, updated_at
FROM core_srs_card`;

export type CardInsert = {
  deck_id: string; user_ref: string; module: string; resource_type: string;
  resource_ref: string; card_template?: string; front_text?: string;
  back_text?: string; extra_json?: string | null; tags?: string | null;
  card_kind?: string | null; concept_domain?: string | null;
  note_type_id?: string | null; fields_json?: string | null;
  root_norm?: string | null; intro_surah?: number | null; intro_ayah?: number | null;
};

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
    /** the lesson (extra.group.workId) — a lesson deals its own bank */
    work?: string;
  } = {}): Promise<SrsCard[]> {
    const args: unknown[] = [userRef];
    const bank = opts.state === 'bank';

    const ahead = Math.min(3650, Math.max(0, Math.floor(opts.ahead ?? 0)));
    // next_review_at is ISO with ms and Z everywhere (migration 064): compared as stored, so the queue index serves it
    const horizon = ahead > 0 ? `strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+${ahead} day')` : `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;

    // Review deals only what was practised: a drill comes to SRS once it has been met in its lesson. One filed and never
    // practised waits in the bank (state 'new'), and its lesson deals it (GET /core/srs/bank).
    // drills only (a review item replays its drill), and never a leech: its lesson deals it again
    // `is_drill` is kept on the card (migration 064); the queue's terms match idx_core_srs_card_queue's
    const drill = `is_drill = 1`;
    let where = bank
      ? `WHERE user_ref = ? AND suspended = 0 AND (card_state = 'new' OR leech = 1) AND ${drill}`
      : `WHERE user_ref = ? AND suspended = 0 AND leech = 0 AND card_state <> 'new' AND ${drill}
                 AND (next_review_at IS NULL
                      OR next_review_at <= ${horizon})`;
    if (opts.work) { where += ` AND work_ref = ?`; args.push(opts.work); }
    if (opts.module) { where += ` AND module = ?`; args.push(opts.module); }

    if (opts.surah && opts.surah > 0) {
      // a card that stands at a place carries its sūra (migration 065); a word or root met in many sūras is in the map
      where += ` AND (intro_surah = ? OR id IN (SELECT card_id FROM core_srs_card_surah WHERE surah = ?))`;
      args.push(opts.surah, opts.surah);
    }

    if (opts.surah && opts.surah > 0 && opts.from && opts.to) {

      where += ` AND intro_surah = ? AND intro_ayah BETWEEN ? AND ?`;
      args.push(opts.surah, opts.from, opts.to);
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
       ORDER BY next_review_at   -- never-scheduled (NULL) first, as SQLite sorts NULLs; the queue index gives this order
       LIMIT ?`, args);
  }

  async todayCountsByDeck(userRef: string): Promise<Map<string, { introduced: number; reviewed: number }>> {
    const rows = await query<{ deck_id: string; state_before: string; n: number }>(this.db,
      `SELECT c.deck_id AS deck_id, r.state_before AS state_before, COUNT(*) AS n
         FROM core_srs_review r
         JOIN core_srs_card c ON c.id = r.card_id
        WHERE r.user_ref = ? AND r.reviewed_at >= date('now')
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
        WHERE r.user_ref = ? AND r.reviewed_at >= date('now')${scope}
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
       WHERE user_ref = ? AND suspended = 0 AND leech = 0 AND card_state <> 'new' AND is_drill = 1
         AND (next_review_at IS NULL
              OR next_review_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       GROUP BY module`, [userRef]);
  }

  /** A drill's GLOBAL id, by the km_core standard (migration 050): DRL:<cyb_domain.code>:<cyb_discipline.code>:<its id>.
   *  The discipline is the drill's own (a grammar-term drill carries its term's), else its kind's cyb_drill_type row,
   *  else its focus's (card kind, then skill), else XX — unclassified, listed by the audit, never left out. */
  async drillGid(module: string, cardKind: string | null, extra: string | null | undefined): Promise<string | null> {
    const d = drillOf(extra);
    if (!d) return null;
    const row = await queryOne<{ disc: string | null }>(this.db,
      `SELECT COALESCE(
         (SELECT code FROM cyb_discipline WHERE code = ?1),
         (SELECT discipline FROM cyb_drill_type WHERE domain = ?2 AND scope = 'kind' AND code = ?3),
         (SELECT discipline FROM cyb_drill_type WHERE domain = ?2 AND scope = 'focus' AND code = ?4),
         (SELECT discipline FROM cyb_drill_type WHERE domain = ?2 AND scope = 'focus' AND code = ?5)) AS disc`,
      [d.discipline, module, d.kind, cardKind, d.skill]).catch(softFail(null));
    return `DRL:${module}:${row?.disc ?? 'XX'}:${d.id}`;
  }

  async insertCard(input: CardInsert): Promise<{ card: SrsCard; inserted: boolean }> {
    const id = typedId('SRSCARD');
    const gid = await this.gidFor(input);
    await this.insertStmt(input, id, gid).run();
    const row = await queryOne<SrsCard>(this.db,
      `SELECT ${CARD_COLS} WHERE deck_id = ? AND resource_ref = ? AND card_template = ?`,
      [input.deck_id, input.resource_ref, input.card_template ?? 'freeform']);

    return { card: row!, inserted: row?.id === id };
  }

  /**
   * Many cards in a few round trips: the same row insertCard writes, sent with db.batch() in
   * chunks (each statement keeps its own 21 binds, under D1's 100 cap). Drill ids are looked up
   * once per distinct classification. Returns how many rows were new (ON CONFLICT skips the rest).
   */
  async insertCards(inputs: CardInsert[], chunk = 50): Promise<number> {
    const gidMemo = new Map<string, Promise<string | null>>();
    const gids = await Promise.all(inputs.map((input) => {
      const k = `${input.module}|${input.card_kind ?? ''}|${input.resource_ref}|${input.extra_json ?? ''}`;
      if (!gidMemo.has(k)) gidMemo.set(k, this.gidFor(input));
      return gidMemo.get(k)!;
    }));
    let inserted = 0;
    for (let i = 0; i < inputs.length; i += chunk) {
      const stmts = inputs.slice(i, i + chunk).map((input, j) => this.insertStmt(input, typedId('SRSCARD'), gids[i + j]));
      const results = await this.db.batch(stmts);
      for (const r of results) inserted += (r.meta?.changes ?? 0) > 0 ? 1 : 0;
    }
    return inserted;
  }

  /// an authored drill (core cyb_drill) is filed under its own global id; any other drill gets one from the registries
  private gidFor(input: CardInsert): Promise<string | null> {
    return /^DRL:[A-Z]+:[A-Z]{2}:/.test(input.resource_ref) ? Promise.resolve(input.resource_ref)
      : this.drillGid(input.module, input.card_kind ?? null, input.extra_json);
  }

  private insertStmt(input: CardInsert, id: string, gid: string | null): D1PreparedStatement {
    return this.db.prepare(
      `INSERT INTO core_srs_card
         (id, deck_id, user_ref, module, resource_type, resource_ref, card_template,
          front_text, back_text, extra_json, tags, card_kind, concept_domain,
          note_type_id, fields_json, root_norm, intro_surah, intro_ayah, next_review_at, work_ref, drill_gid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (deck_id, resource_ref, card_template) DO NOTHING`,
    ).bind(id, input.deck_id, input.user_ref, input.module, input.resource_type,
       input.resource_ref, input.card_template ?? 'freeform',
       input.front_text ?? '', input.back_text ?? '',
       input.extra_json ?? null, input.tags ?? null,
       input.card_kind ?? null, input.concept_domain ?? null,
       input.note_type_id ?? null, input.fields_json ?? null,
       input.root_norm ?? null, input.intro_surah ?? null, input.intro_ayah ?? null,
       new Date().toISOString(), workOf(input.extra_json), gid);
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
    review_duration_secs: number | null; reviewed_at: string; op_id?: string | null;
  }): Promise<void> {
    await execute(this.db,
      `INSERT INTO core_srs_review
         (id, card_id, user_ref, rating, state_before, stability_after, difficulty_after,
          elapsed_days, scheduled_days_after, state_after, review_duration_secs, reviewed_at, op_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [typedId('SRSREV'), input.card_id, input.user_ref, input.rating, input.state_before,
       input.stability_after, input.difficulty_after, input.elapsed_days,
       input.scheduled_days_after, input.state_after, input.review_duration_secs,
       input.reviewed_at, input.op_id ?? null]);
  }

  /** an answer already applied (its op_id seen) — a resend changes nothing */
  /** Right answers a drill has had in its lesson (before review): Good or Easy while still new. */
  async lessonRights(cardId: string): Promise<number> {
    const r = await queryOne<{ n: number }>(this.db,
      `SELECT COUNT(*) AS n FROM core_srs_review WHERE card_id = ? AND state_before = 'new' AND rating >= 3`, [cardId]);
    return r?.n ?? 0;
  }

  /** An answer applied in one round trip: its review logged, the card rescheduled (and its leech mark set, when
   *  `leech` is given), and the card read back. */
  async reviewAndSchedule(log: {
    card_id: string; user_ref: string; rating: RatingValue; state_before: string;
    stability_after: number; difficulty_after: number; elapsed_days: number;
    scheduled_days_after: number; state_after: string;
    review_duration_secs: number | null; reviewed_at: string; op_id?: string | null;
  }, next: {
    card_state: string; stability: number; difficulty: number;
    elapsed_days: number; scheduled_days: number; learning_step: number;
    reps: number; lapses: number; next_review_at: string; last_review_at: string;
  }, leech: boolean | null): Promise<SrsCard | null> {
    const r = await this.db.batch([
      this.db.prepare(`INSERT INTO core_srs_review
         (id, card_id, user_ref, rating, state_before, stability_after, difficulty_after,
          elapsed_days, scheduled_days_after, state_after, review_duration_secs, reviewed_at, op_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        typedId('SRSREV'), log.card_id, log.user_ref, log.rating, log.state_before,
        log.stability_after, log.difficulty_after, log.elapsed_days,
        log.scheduled_days_after, log.state_after, log.review_duration_secs,
        log.reviewed_at, log.op_id ?? null),
      this.db.prepare(`UPDATE core_srs_card SET
         card_state = ?, stability = ?, difficulty = ?, elapsed_days = ?,
         scheduled_days = ?, learning_step = ?, reps = ?, lapses = ?,
         last_review_at = ?, next_review_at = ?, leech = COALESCE(?, leech), updated_at = datetime('now')
       WHERE id = ?`).bind(
        next.card_state, next.stability, next.difficulty, next.elapsed_days,
        next.scheduled_days, next.learning_step, next.reps, next.lapses,
        next.last_review_at, next.next_review_at, leech === null ? null : leech ? 1 : 0, log.card_id),
      this.db.prepare(`SELECT ${CARD_COLS} WHERE id = ?`).bind(log.card_id),
    ]);
    return ((r[2].results ?? []) as SrsCard[])[0] ?? null;
  }

  async seenOp(opId: string | null | undefined): Promise<boolean> {
    if (!opId) return false;
    return !!(await queryOne<{ id: string }>(this.db, `SELECT id FROM core_srs_review WHERE op_id = ? LIMIT 1`, [opId]));
  }

  async setLeech(cardId: string, on: boolean): Promise<void> {
    await execute(this.db, `UPDATE core_srs_card SET leech = ? WHERE id = ?`, [on ? 1 : 0, cardId]);
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
