// ─── SrsRepo — core_srs_deck · core_srs_card · core_srs_review · core_srs_params
//
// The one SRS store. Cards for every module (AR · AL · QR · WV) live here
// together, which is what lets a single query answer "what is due" across
// subjects. Nothing schedules in this file — see `src/srs/fsrs.ts`.

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
  /** Decks nest: `quran/mufradat` sits under `quran`. */
  parent_id: string | null;
  slug: string | null;
  sort_order: number | null;
  /** Anki's two daily caps. Null means "no cap of its own". */
  new_per_day: number | null;
  review_per_day: number | null;
  /** `tree` — the cap covers this deck and everything under it. */
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
  /** Selected in CARD_COLS and, until now, reached only through `as any`. */
  card_kind: string | null;
  concept_domain: string | null;
  front_text: string;
  back_text: string;
  extra_json: string | null;
  /**
   * A structured card: `note_type_id` names a `core_srs_note_type` and
   * `fields_json` holds that type's fields. 25 cards carry a complete payload —
   * radicals with their makhraj, a form ladder, a sense arc with concrete rungs
   * marked — and nothing could read it, because no column here selected it.
   */
  note_type_id: string | null;
  fields_json: string | null;
  /**
   * The root this card is about, plain. `resource_ref` carries the typed form
   * (`AL:root:<uid>`), which cannot be joined against anything that stores a
   * root as letters.
   */
  root_norm: string | null;
  /** The sūra where the learner first met it. */
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
  /** The learner's daily limits. A deck with no cap of its own uses these, so
   *  "fifty a day" is a setting rather than a number written into each deck. */
  new_per_day: number | null;
  review_per_day: number | null;
}

/** Used when a learner has never set a limit. One place, not scattered. */
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

  /** The same question in a given learner's own collection.
   *
   *  A shared review session shows one front to everyone, but a card belongs to
   *  a person: `core_srs_card` is keyed by `user_ref`, and scheduling one
   *  person's card from another person's answer would be nonsense. So each
   *  participant's rating is applied to THEIR row for the same question.
   *
   *  Two ways to be the same question, in order of confidence. `library_ref` is
   *  explicit — both cards were taken from one library card, so it is the same
   *  question by construction. Failing that, the natural key the whole store is
   *  anchored on: (module, resource_type, resource_ref, card_template). Two
   *  people who enrolled 44:3 independently never share a library_ref, and
   *  refusing to match them would make the group session useless for exactly
   *  the people most likely to use it.
   *
   *  Suspended cards are skipped: a card someone has put aside should not come
   *  back because a study partner asked about it. */
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

  /**
   * The unified due queue. One query, every module — this is the question the
   * split store could not answer.
   *
   * `ahead` widens the horizon by that many days, which is Anki's "review
   * ahead": when today's work is finished the queue is empty, but the cards
   * themselves still exist, and someone with time left should be able to reach
   * them. Nothing else changes — the cards come back in the same order, soonest
   * first, and grading them early is an ordinary review. FSRS reads the real
   * elapsed time, so an early answer earns a smaller interval than a punctual
   * one rather than being silently treated as if it were due.
   */
  due(userRef: string, opts: {
    module?: string; limit?: number; ahead?: number;
    surah?: number; kind?: string; domain?: string;
    /** An āyah range inside `surah` — what makes a passage reviewable.
     *  Only ever applied together with `surah`: "āyāt 1 to 9" means nothing on
     *  its own, and applying it alone would draw 44:1-9 and 40:1-9 together. */
    from?: number; to?: number;
    /** One study band: reading | vocabulary | sentence_structure | tafsir |
     *  worldview. A set of card kinds, so it is not the same as `kind`. */
    step?: string;
    /** One deck, or a whole subtree — selecting a parent studies its children,
     *  which is the entire point of nesting them. A parent deck usually holds
     *  no cards of its own, so matching a single deck_id served nothing. */
    deck?: string; deckIds?: string[];
  } = {}): Promise<SrsCard[]> {
    const args: unknown[] = [userRef];
    // Clamped and floored before it reaches SQL: D1 cannot bind a modifier
    // string, so the horizon is interpolated, and only an integer may be.
    const ahead = Math.min(3650, Math.max(0, Math.floor(opts.ahead ?? 0)));
    const horizon = ahead > 0 ? `datetime('now', '+${ahead} day')` : `datetime('now')`;
    // `datetime(next_review_at)`, not the raw column. Two formats used to land
    // in it — `insertCard` wrote SQLite's `datetime('now')`
    // ("2026-07-31 19:00:00") and `applySchedule` the scheduler's
    // `.toISOString()` ("2026-07-31T19:00:00.000Z") — and comparing those as
    // text compares 'T' (0x54) against ' ' (0x20), so an ISO timestamp always
    // sorted after a same-day SQLite one. A card scheduled for earlier *today*
    // therefore never came due until the date rolled over, which silently
    // disabled every learning step: Again's 1m and 10m returns were pushed to
    // tomorrow.
    //
    // `insertCard` now writes ISO too, so only one shape reaches the column.
    // The normalising call stays: it costs nothing, and it is what keeps a row
    // written by hand or by an older deploy from reviving the bug.
    let where = `WHERE user_ref = ? AND suspended = 0
                 AND (next_review_at IS NULL
                      OR datetime(next_review_at) <= ${horizon})`;
    if (opts.module) { where += ` AND module = ?`; args.push(opts.module); }
    // Scope narrows here, not after the rows come back. Filtering in the route
    // meant LIMIT counted rows the caller had already excluded: asking for one
    // card in surah 44 fetched the single soonest card in the whole collection
    // and then discarded it for being surah 6, answering "nothing due" to a
    // surah with plenty due.
    //
    // Two things can put a card in a surah and both have to count. An ayah card
    // says so in its own `resource_ref` ("40" or "40:7"). A root or lemma card
    // cannot: its ref is the thing it teaches — `AL:root:d9475928e7…` — and the
    // surah it was met in lives in `core_srs_card_surah`. Matching the ref alone
    // therefore hid every root and lemma card behind a surah filter: Ghāfir has
    // 66 such cards and returned none of them, and collection-wide only 46 of
    // 242 surah-linked cards could ever pass.
    if (opts.surah && opts.surah > 0) {
      where += ` AND (resource_ref = ? OR resource_ref LIKE ?
                      OR id IN (SELECT card_id FROM core_srs_card_surah
                                 WHERE surah = ?))`;
      args.push(String(opts.surah), `${opts.surah}:%`, opts.surah);
    }
    // A passage: the āyah cards inside the range, plus the root and lemma cards
    // first met there. The second half matters as much as the first — a
    // passage's vocabulary is most of what there is to review about it, and
    // those cards carry the lemma as their ref, not the āyah.
    if (opts.surah && opts.surah > 0 && opts.from && opts.to) {
      // The second arm is a plain column test, not a subquery: it is the same
      // table. It was written as `id IN (SELECT card_id FROM core_srs_card …)`
      // — copied from the core_srs_card_surah arm above, which really does have
      // a card_id — and core_srs_card does not, so every passage review 500'd.
      where += ` AND (
        (resource_ref GLOB ? AND CAST(substr(resource_ref, instr(resource_ref, ':') + 1)
              AS INTEGER) BETWEEN ? AND ?)
        OR (intro_surah = ? AND intro_ayah BETWEEN ? AND ?))`;
      args.push(`${opts.surah}:*`, opts.from, opts.to,
                opts.surah, opts.from, opts.to);
    }

    // A study step — reading, vocabulary, sentence structure, tafsīr — is a SET
    // of card kinds rather than one, so it cannot go through `kind`. The mapping
    // is the same one /core/learn/path groups by; keeping the two in step
    // matters, because a unit that says "24 cards" and a session that then
    // offers eleven is worse than either number alone.
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

  /**
   * What has already been answered today, split the way the caps are.
   *
   * "New" is decided by the state the card was in when it was answered, not by
   * the state it is in now: a card introduced this morning is in learning by
   * the afternoon, so counting current state would let the day's new cards
   * vanish from their own budget and the cap would never bind.
   *
   * The day boundary is UTC, matching every other date in this schema. A real
   * next-day-starts-at-4am setting belongs with the learner's timezone, which
   * is not stored yet.
   */
  /**
   * Today's answers per deck, for per-deck budgets.
   *
   * The deck is read from the card rather than the log, because a card can be
   * moved between decks and the budget that matters is the one it sits in now.
   */
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
       WHERE user_ref = ? AND suspended = 0
         AND (next_review_at IS NULL
              OR datetime(next_review_at) <= datetime('now'))
       GROUP BY module`, [userRef]);
  }

  /**
   * Add a card, reporting whether it was actually added.
   *
   * The dedup rule lives in the unique key, so a second attempt at the same
   * (deck, resource, origin) is a no-op — but the callers report a count to the
   * user ("Added 3 · 12 already yours"), and every one of them used to count
   * attempts instead of insertions. Taking the same card twice therefore said
   * "added 1" while the store correctly did nothing, which makes the one number
   * the dedup story rests on the one number that was wrong.
   */
  /**
   * A new card, due now.
   *
   * `next_review_at` is written as ISO, not as SQLite's `datetime('now')`.
   * Those are the two formats that used to land in this column, and comparing
   * them as text compares 'T' (0x54) against ' ' (0x20), so an ISO timestamp
   * always sorted after a same-day SQLite one. Every read was defended with
   * `datetime(...)`, which fixed the comparison but left two shapes in the
   * column — and `cardToApi` hands the raw string to clients, where
   * `new Date("2026-07-31 19:00:00")` is an Invalid Date in Safari.
   *
   * Writing one format is the fix at the source. No backfill is needed: every
   * one of the 62 scheduled cards in km_core already carries the ISO form.
   */
  async insertCard(input: {
    deck_id: string; user_ref: string; module: string; resource_type: string;
    resource_ref: string; card_template?: string; front_text?: string;
    back_text?: string; extra_json?: string | null; tags?: string | null;
    card_kind?: string | null; concept_domain?: string | null;
    /** A structured card. Without these no endpoint could create one. */
    note_type_id?: string | null; fields_json?: string | null;
    root_norm?: string | null; intro_surah?: number | null;
  }): Promise<{ card: SrsCard; inserted: boolean }> {
    const id = typedId('SRSCARD');
    await execute(this.db,
      `INSERT INTO core_srs_card
         (id, deck_id, user_ref, module, resource_type, resource_ref, card_template,
          front_text, back_text, extra_json, tags, card_kind, concept_domain,
          note_type_id, fields_json, root_norm, intro_surah, next_review_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (deck_id, resource_ref, card_template) DO NOTHING`,
      [id, input.deck_id, input.user_ref, input.module, input.resource_type,
       input.resource_ref, input.card_template ?? 'freeform',
       input.front_text ?? '', input.back_text ?? '',
       input.extra_json ?? null, input.tags ?? null,
       input.card_kind ?? null, input.concept_domain ?? null,
       input.note_type_id ?? null, input.fields_json ?? null,
       input.root_norm ?? null, input.intro_surah ?? null,
       // ISO, the same format `applySchedule` writes — see below.
       new Date().toISOString()]);
    const row = await queryOne<SrsCard>(this.db,
      `SELECT ${CARD_COLS} WHERE deck_id = ? AND resource_ref = ? AND card_template = ?`,
      [input.deck_id, input.resource_ref, input.card_template ?? 'freeform']);
    // The row is read back either way — on a conflict it is the copy already
    // held, which is what a caller wants to return. Whether it is *ours* is the
    // reliable signal: the id we generated comes back only if the insert won.
    // D1's `changes` for an ON CONFLICT DO NOTHING is not dependable enough to
    // decide a number the user reads.
    return { card: row!, inserted: row?.id === id };
  }

  /** The card, when the caller does not care whether it was new. */
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

  /**
   * Record where in the muṣḥaf a card's root lives.
   *
   * `core_srs_card_surah` is what lets a root card pass a sūra filter. An āyah
   * card names its sūra in `resource_ref`; a root card's ref is
   * `AL:root:<uid>`, which names none, so without a row here it is invisible to
   * every sūra-scoped query. The table was read in two places and written in
   * none — which is why Ghāfir's 66 root cards returned nothing.
   *
   * `is_intro` marks where the learner MET it, not the earliest sūra it occurs
   * in. Those are different claims and only the first one is true: كتب occurs
   * in 61 sūras beginning with al-Baqara, but a learner who met it in Ghāfir
   * met it in Ghāfir. When the caller does not know, no row is marked — an
   * unmarked spread is honest, and a guessed intro is not.
   *
   * Re-runnable: the spread is replaced, so recording it twice is not an error
   * and a corrected count overwrites a stale one.
   */
  async linkSurahs(
    cardId: string,
    spread: { surah: number; n_occur: number }[],
    introSurah: number | null = null,
  ): Promise<number> {
    await execute(this.db, `DELETE FROM core_srs_card_surah WHERE card_id = ?`, [cardId]);
    const rows = spread.filter((r) => Number.isFinite(r.surah) && r.surah > 0);
    if (!rows.length) return 0;

    // One statement rather than a round trip per sūra: a common root touches
    // sixty of them, and D1 charges for each call.
    const values = rows.map(() => '(?, ?, ?, ?)').join(', ');
    const args = rows.flatMap((r) => [
      cardId, r.surah, Math.max(0, Math.trunc(r.n_occur)),
      introSurah !== null && r.surah === introSurah ? 1 : 0,
    ]);
    await execute(this.db,
      `INSERT INTO core_srs_card_surah (card_id, surah, n_occur, is_intro)
       VALUES ${values}`, args);
    return rows.length;
  }

  async deleteCard(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM core_srs_card WHERE id = ?`, [id]);
  }

  // ── The log ────────────────────────────────────────────────────────────────

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

  /** The whole log for one learner — what a weight fit trains on. */
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

  // ── Per-user scheduler parameters ──────────────────────────────────────────

  params(userRef: string): Promise<SrsParams | null> {
    return queryOne<SrsParams>(this.db,
      `SELECT user_ref, weights_json, desired_retention, maximum_interval,
              learning_steps, relearning_steps, fitted_at, fitted_reviews,
              log_loss_before, log_loss_after, note,
              new_per_day, review_per_day
       FROM core_srs_params WHERE user_ref = ?`, [userRef]);
  }

  /** The learner's daily limits, falling back to the documented defaults. */
  async dailyDefaults(userRef: string): Promise<{ newPerDay: number; reviewPerDay: number }> {
    const row = await this.params(userRef);
    return {
      newPerDay: row?.new_per_day ?? DEFAULT_NEW_PER_DAY,
      reviewPerDay: row?.review_per_day ?? DEFAULT_REVIEW_PER_DAY,
    };
  }

  /**
   * Save the daily limits. `null` means "no limit", which is different from
   * "unset" — so the row is written either way and the column carries the
   * learner's answer rather than the absence of one.
   */
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
