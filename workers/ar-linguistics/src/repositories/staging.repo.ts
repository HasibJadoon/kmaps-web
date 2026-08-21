// ─── StagingRepo — the AL carrier registry and what the carriers hold ──────
// The linguistics domain (shared by Qurʾān + Arabic acquisition) squeezes every
// classical source into per-sub-layer *claims*, staged trilingually, then
// promoted to their carrier tables. This repo reads those staged claims so the
// Cybernetics Control Monitor can render the Data Matrix / Staging Spine tabs.
//
// READ-ONLY. Reads only ar_ling_* in DB_AL.

import { query, queryOne } from '../../../shared/src/db';

export interface SubLayer {
  sub_code: string;
  band: number;
  band_key: string;
  band_name_ar: string | null;
  band_name_en: string | null;
  name_ar: string;
  name_en: string;
  name_ur: string | null;
  scope_level: string;
  discipline: string;
  default_card: string;
  produced_by: string;
  fill_state: string;
  carrier_state: string;
  tables_json: string;
  display_order: number;
}

/** A row of `ar_ling_reg_build_layer` — the scope registry (root/lemma/word). */
export interface BuildLayerRow {
  layer_code: string;
  layer_key: string;
  name_ar: string;
  name_en: string;
  name_ur: string;
  scope_level: string;
  fill_order: number;
  mode: string;
  note_en: string | null;
}

/** One sub-layer as the layer model publishes it — tables parsed, no raw JSON. */
export interface LayerModelSub {
  sub_code: string;
  name_ar: string;
  name_en: string;
  name_ur: string | null;
  /** The registry's own scope_level, before the fold onto a tab (see `SCOPE_OF`). */
  scope_level: string;
  discipline: string;
  card: string;
  produced_by: string;
  fill_state: string;
  carrier_state: string;
  tables: string[];
  display_order: number;
}

/** One band of sub-layers inside a scope — what the mobile UI calls a "layer". */
export interface LayerModelLayer {
  scope: string;
  band: number;
  key: string;
  name_ar: string | null;
  name_en: string | null;
  subs: LayerModelSub[];
}

export interface LayerModelScope {
  key: string;
  code: string;
  name_ar: string;
  name_en: string;
  name_ur: string;
  note: string | null;
  layers: number;
  subs: number;
}

export interface LayerModel {
  scopes: LayerModelScope[];
  layers: LayerModelLayer[];
}

export interface StageCell { root_norm: string; sub_code: string; n: number; promoted: number }
export interface RootClaim {
  id: string; sub_code: string; band: number; source_slug: string;
  claim_type: string; status: string; promoted_to_table: string | null;
  quote_ar: string | null;
  gloss_ar: string | null; gloss_en: string | null; gloss_ur: string | null;
  confidence: string | null;
  /** The row's full content. See the SELECT for why it is carried. */
  payload_json: string | null;
}
export interface RootMemlet {
  id: string; memlet_key: string; scope_level: string;
  title_ar: string | null; title_en: string | null; title_ur: string | null;
  body_ar: string | null; body_en: string | null; body_ur: string | null; status: string;
}
export interface RootQuestion {
  id: string; question_key: string;
  prompt_ar: string | null; prompt_en: string | null; prompt_ur: string | null;
  explanation_en: string | null; answer_json: string | null;
}
/** One MCQ option for a question (correct or a typed distractor). */
export interface RootOption {
  id: string; item_id: string;
  option_ar: string; option_en: string | null; option_ur: string | null;
  is_correct: number; distractor_kind: string | null;
  why_wrong_en: string | null; why_wrong_ar: string | null; sort_order: number;
}
/** A media asset catalogued for a memlet (image / video / audio). */
export interface RootMedia {
  id: string; memlet_id: string; memlet_key: string | null;
  media_kind: string; r2_key: string; bucket: string;
  mime: string | null; duration_ms: number | null;
  reciter: string | null; qr_ref: string | null; status: string;
}
/** The memlet-kind registry — the memlet layer family (parallel to sub-layers). */
export interface MemletKind {
  memlet_key: string; name_ar: string; name_en: string; name_ur: string | null;
  modality: string; scope_level: string; display_order: number;
}
/** The question-kind registry — the question layer family. */
export interface QuestionKind {
  question_key: string; name_ar: string; name_en: string;
  memlet_key: string | null; response_kind: string;
  cognitive_level: string; difficulty_floor: number;
}
export interface RootRollup { root_norm: string; staged: number; promoted: number; layers: number }
export interface StatusCount { status: string; n: number }

/** A claim is promoted when it has reached its carrier table. */

/**
 * `ar_ling_reg_build_layer.layer_key` → the scope key the app tabs between.
 * Only the naming differs: layer 300 is registered as "context" and reads as
 * the word scope everywhere else.
 */
const SCOPE_KEY: Record<string, string> = { root: 'root', lemma: 'lemma', context: 'word' };

/**
 * `ar_ling_reg_sub_layer.scope_level` → the scope that owns it. Two levels have
 * no scope row of their own and fold onto their nearest owner: a *form* is a
 * property of the lemma that carries it, and a *letter* is a radical of the
 * root. The unfolded `scope_level` still rides on every sub so the fold is
 * visible in the UI rather than lost here.
 */
const SCOPE_OF: Record<string, string> = {
  root: 'root', letter: 'root',
  lemma: 'lemma', form: 'lemma',
  word: 'word', context: 'word',
};

/** `tables_json` is a JSON array of carrier table names; a bad blob is no table. */
function parseTables(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}


// ─── Carrier fill — what actually landed, counted live ────────────────────────
// The staging table says what a mining session *proposed*. These counts say what
// is *there*. They are different facts and the second is the one a reader means
// by "is this built": a claim can sit staged forever without reaching a carrier,
// and a carrier can be full of rows no claim ever passed through (imported
// directly). Reading the queue for fill reported نزل's Identity as 1-of-4 when
// three of its four carriers hold rows.
//
// Nothing here is stored. `ar_ling_reg_table_map` already holds the only durable
// part — which table carries a sub-layer and which column binds the root — so
// the count is taken at read time and can never go stale.

/** One carrier's live row count for a root. */
export interface RootFillCell {
  sub_code: string;
  carrier_table: string;
  rows: number;
}

/** A carrier as the registry declares it. */
interface CarrierPlan {
  table_name: string;
  sub_code: string;
  root_bind: string;
  root_bind_col: string | null;
}

/** Identifiers are interpolated into SQL, so they must look like identifiers. */
const IDENT = /^[a-z_][a-z0-9_]*$/;

/** Band keys are upper-case registry codes (CORE, SARF, SENSE …). */
const IDENT_BAND = /^[A-Z][A-Z0-9_]*$/;

/** How much of the registry a fill reading covers. Empty means all of it. */
export interface FillScope { band?: string | null; scope?: string | null }

/** A carrier's actual rows for one root — the leaf screen's contents. */
export interface CarrierRows {
  sub_code: string;
  carrier_table: string;
  bind_col: string;
  rows: Record<string, unknown>[];
}

/** A leaf shows its rows, not a page of them; enough to read, not to dump. */
const ROW_LIMIT = 50;

/**
 * D1 refuses compound SELECTs of more than five branches ("too many terms in
 * compound SELECT"), measured against the live database — not a soft limit.
 *
 * This was 8, so every full chunk threw and the catch below turned it into an
 * empty result. Only the short final chunk survived, and نزل reported two
 * carriers out of thirty-four: its Identity layer read "0 of 4 filled" over a
 * real `ar_ling_roots` row, four phonology rows and a permutation row.
 */
const UNION_CHUNK = 5;

export class StagingRepo {
  constructor(private db: D1Database) {}

  // The sub-layer registry — column headers for the matrix, in order.
  subLayers(): Promise<SubLayer[]> {
    return query<SubLayer>(
      this.db,
      `SELECT sub_code, band, band_key, band_name_ar, band_name_en,
              name_ar, name_en, name_ur, scope_level, discipline,
              default_card, produced_by, fill_state, carrier_state,
              tables_json, display_order
       FROM ar_ling_reg_sub_layer
       WHERE status = 'live'
       ORDER BY display_order, band, sub_code`,
    );
  }

  /** The three scopes the Root Dashboard tabs between — real registry rows. */
  buildScopes(): Promise<BuildLayerRow[]> {
    return query<BuildLayerRow>(
      this.db,
      `SELECT layer_code, layer_key, name_ar, name_en, name_ur,
              scope_level, fill_order, mode, note_en
       FROM ar_ling_reg_build_layer
       WHERE layer_code IN ('100', '200', '300')
       ORDER BY fill_order`,
    );
  }

  /**
   * The scope → layer → sub-layer tree behind the mobile Root Dashboard.
   *
   * Nothing here is authored in the app: the three scopes are the 100/200/300
   * rows of `ar_ling_reg_build_layer`, a "layer" is a *band* of
   * `ar_ling_reg_sub_layer` within a scope, and the leaves are the sub-layer
   * rows themselves with their carrier tables and fill state.
   */
  async layerModel(): Promise<LayerModel> {
    const [scopeRows, subs] = await Promise.all([this.buildScopes(), this.subLayers()]);

    const layers: LayerModelLayer[] = [];
    const index = new Map<string, LayerModelLayer>();
    for (const sub of subs) {
      const scope = SCOPE_OF[sub.scope_level];
      if (!scope) continue;
      const key = `${scope}:${sub.band}`;
      let layer = index.get(key);
      if (!layer) {
        layer = {
          scope, band: sub.band, key: sub.band_key,
          name_ar: sub.band_name_ar, name_en: sub.band_name_en, subs: [],
        };
        index.set(key, layer);
        layers.push(layer);
      }
      layer.subs.push({
        sub_code: sub.sub_code,
        name_ar: sub.name_ar, name_en: sub.name_en, name_ur: sub.name_ur,
        scope_level: sub.scope_level, discipline: sub.discipline,
        card: sub.default_card, produced_by: sub.produced_by,
        fill_state: sub.fill_state, carrier_state: sub.carrier_state,
        tables: parseTables(sub.tables_json),
        display_order: sub.display_order,
      });
    }
    layers.sort((a, b) => a.band - b.band);

    const scopes: LayerModelScope[] = scopeRows.map((row) => {
      const key = SCOPE_KEY[row.layer_key] ?? row.layer_key;
      const mine = layers.filter((l) => l.scope === key);
      return {
        key,
        code: `${row.layer_code}-${row.layer_key.toUpperCase()}`,
        name_ar: row.name_ar, name_en: row.name_en, name_ur: row.name_ur,
        note: row.note_en,
        layers: mine.length,
        subs: mine.reduce((total, l) => total + l.subs.length, 0),
      };
    });

    return { scopes, layers };
  }

  // Per root × sub_code counts (+ how many promoted) — the matrix body.

  // ── Carrier fill ────────────────────────────────────────────────────────────

  /**
   * Live row counts per sub-layer for one root, straight from the carriers.
   *
   * Driven entirely by `ar_ling_reg_table_map`: it names the carrier table and
   * the column that binds a root, which is the whole of what a sensor needs to
   * hold. Carriers whose binding has not been audited (`root_bind` of `unset`)
   * are omitted rather than returned as zero — an unaudited carrier is unknown,
   * and calling it empty is the same untruth in a new place.
   */
  async rootFill(root: string, where: FillScope = {}): Promise<RootFillCell[]> {
    // Narrowed to what the caller is actually showing. Counting every carrier
    // the registry declares to render one band's four sub-layers threw most of
    // the work away; `band_key` and `scope_level` are the registry's own
    // groupings, so the narrowing comes from the same place the screens' layers
    // and tabs do.
    const band = where.band && IDENT_BAND.test(where.band) ? where.band : null;
    const scope = where.scope && IDENT.test(where.scope) ? where.scope : null;
    const joins = band || scope;
    const conds: string[] = [];
    const args: string[] = [];
    if (band) { conds.push('s.band_key = ?'); args.push(band); }
    if (scope) { conds.push('s.scope_level = ?'); args.push(scope); }
    const plans = await query<CarrierPlan>(
      this.db,
      `SELECT m.table_name, m.sub_code, m.root_bind, m.root_bind_col
         FROM ar_ling_reg_table_map m
         ${joins ? 'JOIN ar_ling_reg_sub_layer s ON s.sub_code = m.sub_code' : ''}
        WHERE m.role = 'carrier' AND m.root_bind = 'direct'
          AND m.table_name IS NOT NULL AND m.root_bind_col IS NOT NULL
          ${conds.length ? `AND ${conds.join(' AND ')}` : ''}`,
      args,
    ).catch(() => []);

    // The registry is the whitelist. Nothing from the request reaches the SQL
    // text — only the bound value, and only ever as a parameter.
    const usable = plans.filter(
      p => IDENT.test(p.table_name) && !!p.root_bind_col && IDENT.test(p.root_bind_col),
    );
    if (!usable.length) return [];

    // A carrier binds the root by one of three different things, and binding the
    // wrong one silently returns zero rather than failing. `ar_ling_root_lugha`
    // and `ar_ling_root_taqalib` key on the root's ULID, so matching them against
    // the root *string* reported an empty carrier for every root in the corpus —
    // which is why Permutation read "empty" over a real row.
    const idRow = await queryOne<{ id: string }>(
      this.db, 'SELECT id FROM ar_ling_roots WHERE root_text = ? LIMIT 1', [root],
    ).catch(() => null);
    const rootId = idRow?.id ?? null;

    const ID_COLS = new Set(['root_id', 'used_root_id']);
    // Bound by a lemma, not a root: counting these against a root value is not a
    // near-miss but a category error, so they are omitted as unknown.
    const LEMMA_COLS = new Set(['lemma_id']);

    const safe: CarrierPlan[] = [];
    for (const p of usable) {
      const col = p.root_bind_col as string;
      if (LEMMA_COLS.has(col)) continue;
      if (ID_COLS.has(col) && !rootId) continue;   // unknown, not zero
      safe.push(p);
    }
    if (!safe.length) return [];

    const bindValue = (p: CarrierPlan): string =>
      ID_COLS.has(p.root_bind_col as string) ? (rootId as string) : root;

    const cells: RootFillCell[] = [];
    for (let i = 0; i < safe.length; i += UNION_CHUNK) {
      const chunk = safe.slice(i, i + UNION_CHUNK);
      const sql = chunk
        .map(
          p => `SELECT '${p.sub_code}' AS sub_code, '${p.table_name}' AS carrier_table, ` +
               `COUNT(*) AS rows FROM ${p.table_name} WHERE ${p.root_bind_col} = ?`,
        )
        .join(' UNION ALL ');
      // A carrier named in the registry may not exist in this database yet, and
      // one missing table must not blank the whole reading — so a failed union
      // falls back to counting each carrier on its own. Swallowing the error
      // outright is what let a chunk-size mistake read as "nothing is there".
      const rows = await query<RootFillCell>(this.db, sql, chunk.map(bindValue))
        .catch(() => null);
      if (rows) {
        cells.push(...rows);
        continue;
      }
      for (const p of chunk) {
        const one = await query<RootFillCell>(
          this.db,
          `SELECT '${p.sub_code}' AS sub_code, '${p.table_name}' AS carrier_table, ` +
            `COUNT(*) AS rows FROM ${p.table_name} WHERE ${p.root_bind_col} = ?`,
          [bindValue(p)],
        ).catch(() => [] as RootFillCell[]);
        cells.push(...one);
      }
    }

    // A band can be carried by several tables (`tables_json` lists them), so the
    // reading for a sub-layer is their sum.
    const merged = new Map<string, RootFillCell>();
    for (const c of cells) {
      const seen = merged.get(c.sub_code);
      if (seen) {
        seen.rows += Number(c.rows) || 0;
        if (Number(c.rows) > 0 && !seen.carrier_table.includes(c.carrier_table)) {
          seen.carrier_table = `${seen.carrier_table}, ${c.carrier_table}`;
        }
      } else {
        merged.set(c.sub_code, {
          sub_code: c.sub_code,
          carrier_table: c.carrier_table,
          rows: Number(c.rows) || 0,
        });
      }
    }
    return [...merged.values()].sort((a, b) => a.sub_code.localeCompare(b.sub_code));
  }

  /**
   * The rows one sub-layer's carriers actually hold for one root.
   *
   * The leaf screen used to render mirrored staging claims, so a sub-layer
   * whose carrier held rows but whose claims were filed elsewhere showed
   * nothing at all. This reads the carrier itself — the same tables the fill
   * count is taken from, so the count and the contents cannot disagree.
   *
   * `SELECT *`: the carriers have no common shape, and the point of the leaf is
   * to show what the row is. Columns are rendered as they come.
   */
  async rootRows(root: string, subCode: string): Promise<CarrierRows[]> {
    const plans = await query<CarrierPlan>(
      this.db,
      `SELECT table_name, sub_code, root_bind, root_bind_col
         FROM ar_ling_reg_table_map
        WHERE role = 'carrier' AND root_bind = 'direct' AND sub_code = ?
          AND table_name IS NOT NULL AND root_bind_col IS NOT NULL`,
      [subCode],
    ).catch(() => []);

    const usable = plans.filter(
      p => IDENT.test(p.table_name) && !!p.root_bind_col && IDENT.test(p.root_bind_col),
    );
    if (!usable.length) return [];

    const idRow = await queryOne<{ id: string }>(
      this.db, 'SELECT id FROM ar_ling_roots WHERE root_text = ? LIMIT 1', [root],
    ).catch(() => null);
    const rootId = idRow?.id ?? null;

    const ID_COLS = new Set(['root_id', 'used_root_id']);
    const LEMMA_COLS = new Set(['lemma_id']);

    const out: CarrierRows[] = [];
    for (const p of usable) {
      const col = p.root_bind_col as string;
      if (LEMMA_COLS.has(col)) continue;
      if (ID_COLS.has(col) && !rootId) continue;   // unknown, not empty
      const bound = ID_COLS.has(col) ? (rootId as string) : root;
      const rows = await query<Record<string, unknown>>(
        this.db,
        `SELECT * FROM ${p.table_name} WHERE ${col} = ? LIMIT ${ROW_LIMIT}`,
        [bound],
      ).catch(() => [] as Record<string, unknown>[]);
      if (rows.length) {
        out.push({ sub_code: subCode, carrier_table: p.table_name, bind_col: col, rows });
      }
    }
    return out;
  }
  // The Membean-style memlet cards for a root (root/lemma/word scope).
  rootMemlets(root: string): Promise<RootMemlet[]> {
    return query<RootMemlet>(
      this.db,
      `SELECT id, memlet_key, scope_level, title_ar, title_en, title_ur,
              body_ar, body_en, body_ur, status
       FROM ar_ling_learn_memlet
       WHERE root_norm = ?
       ORDER BY CASE scope_level WHEN 'root' THEN 0 WHEN 'lemma' THEN 1 WHEN 'word' THEN 2 ELSE 3 END, memlet_key`,
      [root],
    );
  }

  // The question bank for a root.
  rootQuestions(root: string): Promise<RootQuestion[]> {
    return query<RootQuestion>(
      this.db,
      `SELECT id, question_key, prompt_ar, prompt_en, prompt_ur, explanation_en, answer_json
       FROM ar_ling_learn_question
       WHERE root_norm = ?
       ORDER BY question_key`,
      [root],
    );
  }

  /** MCQ options for every question of a root — correct + typed distractors. */
  rootOptions(root: string): Promise<RootOption[]> {
    return query<RootOption>(
      this.db,
      `SELECT d.id, d.item_id, d.option_ar, d.option_en, d.option_ur, d.is_correct,
              d.distractor_kind, d.why_wrong_en, d.why_wrong_ar, d.sort_order
       FROM ar_ling_learn_question_distractor d
       JOIN ar_ling_learn_question q ON q.id = d.item_id
       WHERE q.root_norm = ?
       ORDER BY d.item_id, d.sort_order`,
      [root],
    );
  }

  /** Media catalogued against this root's memlets (image · video · audio). */
  rootMedia(root: string): Promise<RootMedia[]> {
    return query<RootMedia>(
      this.db,
      `SELECT m.id, m.memlet_id, ml.memlet_key, m.media_kind, m.r2_key, m.bucket,
              m.mime, m.duration_ms, m.reciter, m.qr_ref, m.status
       FROM ar_ling_learn_memlet_media m
       JOIN ar_ling_learn_memlet ml ON ml.id = m.memlet_id
       WHERE ml.root_norm = ?
       ORDER BY m.media_kind`,
      [root],
    );
  }

  /** The 16-kind memlet registry — the memlet layer family. */
  memletKinds(): Promise<MemletKind[]> {
    return query<MemletKind>(
      this.db,
      `SELECT memlet_key, name_ar, name_en, name_ur, modality, scope_level, display_order
       FROM ar_ling_learn_memlet_kind ORDER BY display_order`,
    );
  }

  /** The 11-kind question registry — the question layer family. */
  questionKinds(): Promise<QuestionKind[]> {
    return query<QuestionKind>(
      this.db,
      `SELECT question_key, name_ar, name_en, memlet_key, response_kind,
              cognitive_level, difficulty_floor
       FROM ar_ling_learn_question_kind ORDER BY question_key`,
    );
  }

  async counts(): Promise<{ staged: number; promoted: number; roots: number; sub_layers: number; memlets: number; questions: number }> {
    const row = await queryOne<{
      staged: number; promoted: number; roots: number; sub_layers: number; memlets: number; questions: number;
    }>(
      this.db,
      `SELECT
         0                                                                        AS staged,
         0                                                                        AS promoted,
         (SELECT COUNT(DISTINCT root_norm) FROM ar_ling_roots)                     AS roots,
         (SELECT COUNT(*) FROM ar_ling_reg_sub_layer WHERE status='live')           AS sub_layers,
         (SELECT COUNT(*) FROM ar_ling_learn_memlet)                                     AS memlets,
         (SELECT COUNT(*) FROM ar_ling_learn_question)                              AS questions`,
    );
    return row ?? { staged: 0, promoted: 0, roots: 0, sub_layers: 0, memlets: 0, questions: 0 };
  }
}
