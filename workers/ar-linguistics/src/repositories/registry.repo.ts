// ─── RegistryRepo — the AL carrier registry and what the carriers hold ─────
// The linguistics domain (shared by Qurʾān + Arabic acquisition) squeezes every
// classical source into per-sub-layer *claims*, staged trilingually, then
// promoted to their carrier tables. This repo reads those staged claims so the
// Cybernetics Control Monitor can render the Data Matrix / Staging Spine tabs.
//
// READ-ONLY. Reads only ar_ling_* in DB_AL.

import { query, queryOne } from '../../../shared/src/db';
// How a carrier is tied to a root — direct, or through one other table.
// Shared and unit-tested; see workers/shared/test/carrier-bind.test.ts.
import { IDENT, parseVia, bindWhere } from '../../../shared/src/carrier-bind';

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
  /** The registry's own glyph for this sub-layer, where it declares one. */
  display_icon: string | null;
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
  display_icon: string | null;
  /** The band that owns this sub-layer. It is also on the parent layer; it is
   *  repeated here so a consumer holding one sub can still colour it. */
  band_key: string;
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
  /** How a `via` carrier reaches the root — see `ViaPath` and migration 0106. */
  root_bind_via_json?: string | null;
}

/** Band keys are upper-case registry codes (CORE, SARF, SENSE …). */
const IDENT_BAND = /^[A-Z][A-Z0-9_]*$/;

/** How much of the registry a fill reading covers. Empty means all of it. */
export interface FillScope { band?: string | null; scope?: string | null }

/** A carrier's actual rows for one root — the leaf screen's contents. */
/** One book that holds a root, and how much of it — see rootSourceCoverage. */
export interface SourceCoverage {
  source_slug: string;
  book: string | null;
  book_full: string | null;
  author: string | null;
  died_ah: number | null;
  entries: number;
}

export interface CarrierRows {
  sub_code: string;
  carrier_table: string;
  bind_col: string;
  rows: Record<string, unknown>[];
  /** How many rows the carrier actually holds, so a truncated read says so. */
  total: number;
}

/**
 * Which declared, root-bound tables a sub-layer shows.
 *
 * `role` says what kind of statement a table makes — a carrier holds the
 * content, a link ties two things together, an index says where something is
 * printed, a projection is a prepared view of it. None of that decides whether
 * the table holds rows *about this root*: `root_bind = 'direct'` does, and the
 * declaration in `tables_json` decides whether it belongs to the sub-layer.
 *
 * Filtering on `role = 'carrier'` dropped real content on that technicality.
 * `ar_ling_root_haql` is a link, so the Semantic field slot read empty over
 * بين's four fields; `ar_ling_root_sarf_form_index` is an index, so Forms read
 * empty over كتب's. `registry` stays out: a shared vocabulary is not the root's
 * own material even when it can be filtered to it.
 */
const CONTENT_ROLES = "('carrier', 'link', 'index', 'projection')";

/** A leaf shows its rows, not a page of them; enough to read, not to dump. */
const ROW_LIMIT = 50;

/**
 * How a carrier is ordered before `ROW_LIMIT` cuts it.
 *
 * Sequence ahead of `source_slug`, which decides what a truncated lexicon read
 * contains. بين has 206 blocks across eleven dictionaries: ordered by book, the
 * fifty sent are the whole of the three whose slugs sort first, and Lisān
 * al-ʿArab never arrives. Ordered by sequence, they are the opening blocks of
 * every dictionary — which is how the lexica are actually read against each
 * other, and what the screen says it is showing.
 */
const ORDER_KEYS = [
  'block_seq', 'chunk_seq', 'step_no', 'step_seq', 'stage_no', 'slot_index',
  'perm_index', 'sort_order', 'display_order', 'clause_order', 'unit_index',
  'chunk_index', 'seq', 'death_hijri', 'source_slug',
];

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

/**
 * The lexicon's book BODIES — the printed text of the muʿjams themselves.
 *
 * These are not root data. They are the corpus the Lexicon reader owns
 * (/lexicon/root/:root?book=…), and they are enormous: reading them to answer
 * "what does this root look like" pulled entry, section, block, page and chunk
 * rows for every book that mentions the root, and was most of the ~15s the
 * composed root spec took to answer.
 *
 * What the root view actually wants from the books is COVERAGE — which of them
 * hold this root, and how much — and that is one grouped query away
 * (rootSourceCoverage). So the bodies are skipped when composing a root, and
 * left to the reader whose screen they belong on. The registry's own audit view
 * still reads them: an auditor asking what a carrier holds must see the rows.
 */
const BOOK_BODY_TABLES: ReadonlySet<string> = new Set([
  'ar_ling_lexicon_entry',
  'ar_ling_lexicon_entry_section',
  'ar_ling_lexicon_block',
  'ar_ling_lexicon_book_page',
  'ar_ling_source_chunk',
  'ar_ling_root_page_index',
]);

/** How many carrier reads may be in flight at once. See mapLimit. */
const CARRIER_CONCURRENCY = 8;

/**
 * Run an async job over every item with a ceiling on how many run at once.
 *
 * D1 round-trips dominate this repo. A scope read touches every carrier table
 * a scope declares — about forty for a root — and each one costs a pragma for
 * its ordering, a read, and a count. Awaited inside a `for` loop those
 * serialise: /al/ds/root answered in ~15s, essentially all of it spent waiting
 * on one round-trip at a time. Firing all forty at once finishes quickly but
 * puts an unbounded burst on D1 for every request, so a small ceiling takes
 * nearly all of the win and keeps the burst predictable.
 *
 * Results come back in input order, so callers that relied on the loop's order
 * keep it.
 */
async function mapLimit<T, R>(
  items: readonly T[], limit: number, job: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await job(items[i]);
      }
    }),
  );
  return out;
}

export class RegistryRepo {
  constructor(private db: D1Database) {}

  /** `ORDER BY` clause per carrier table — the shape does not change per root. */
  private orderCache = new Map<string, string>();
  /** Whether migration 0106 has run here. Cached per isolate. */
  private viaColumn: boolean | null = null;

  /**
   * `root_bind_via_json` is added by migration 0106. The plan queries select it,
   * and selecting a column that does not exist fails the whole statement — which
   * the plan query's own catch would turn into "this root has no carriers at
   * all", blanking every reading rather than losing one sub-layer.
   *
   * So the column is probed once and the SELECT is built to match. Code and
   * migration can then ship in either order.
   */
  private async hasViaColumn(): Promise<boolean> {
    if (this.viaColumn !== null) return this.viaColumn;
    const row = await queryOne<{ n: number }>(
      this.db,
      `SELECT count(*) AS n FROM pragma_table_info('ar_ling_reg_table_map')
        WHERE name = 'root_bind_via_json'`,
    ).catch(() => null);
    this.viaColumn = (row?.n ?? 0) > 0;
    return this.viaColumn;
  }

  // The sub-layer registry — column headers for the matrix, in order.
  subLayers(): Promise<SubLayer[]> {
    return query<SubLayer>(
      this.db,
      `SELECT sub_code, band, band_key, band_name_ar, band_name_en,
              name_ar, name_en, name_ur, scope_level, discipline,
              default_card, produced_by, fill_state, carrier_state,
              tables_json, display_order, display_icon
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
        display_icon: sub.display_icon ?? null,
        band_key: sub.band_key,
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
    const conds: string[] = [];
    const args: string[] = [];
    if (band) { conds.push('s.band_key = ?'); args.push(band); }
    if (scope) { conds.push('s.scope_level = ?'); args.push(scope); }
    // The JOIN is not optional: a table carries a sub-layer because that
    // sub-layer DECLARES it in tables_json. Binding alone used to be enough,
    // so tables dropped into a band with nothing declaring them were counted —
    // 00-CORE collected 29 that way, and بين's Core identity read 91 rows of
    // which one was its identity. Undeclared is not a default home.
    // Migration 0106 may not have run here yet; the projection follows the
    // column that exists, so code and migration ship in either order.
    const via = await this.hasViaColumn();
    const viaCol = via ? ', m.root_bind_via_json' : '';
    const viaBind = via ? ", 'via'" : '';
    const plans = await query<CarrierPlan>(
      this.db,
      `SELECT m.table_name, m.sub_code, m.root_bind, m.root_bind_col${viaCol}
         FROM ar_ling_reg_table_map m
         JOIN ar_ling_reg_sub_layer s
           ON s.sub_code = m.sub_code
          AND s.tables_json LIKE '%"' || m.table_name || '"%'
        WHERE m.role IN ${CONTENT_ROLES} AND m.root_bind IN ('direct'${viaBind})
          AND m.table_name IS NOT NULL AND m.root_bind_col IS NOT NULL
          ${conds.length ? `AND ${conds.join(' AND ')}` : ''}`,
      args,
    ).catch(() => []);

    // The registry is the whitelist. Nothing from the request reaches the SQL
    // text — only the bound value, and only ever as a parameter.
    // A `via` plan carries its join in `root_bind_via_json`; its `root_bind_col`
    // is an audit note in prose, so it is not required to look like a column.
    const usable = plans.filter(p => IDENT.test(p.table_name) && (
      p.root_bind === 'via'
        ? parseVia(p.root_bind_via_json) !== null
        : !!p.root_bind_col && IDENT.test(p.root_bind_col)));
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
      if (p.root_bind === 'via') { safe.push(p); continue; }   // binds the root string
      const col = p.root_bind_col as string;
      if (LEMMA_COLS.has(col)) continue;
      if (ID_COLS.has(col) && !rootId) continue;   // unknown, not zero
      safe.push(p);
    }
    if (!safe.length) return [];

    const bindValue = (p: CarrierPlan): string =>
      p.root_bind !== 'via' && ID_COLS.has(p.root_bind_col as string)
        ? (rootId as string) : root;
    const whereOf = (p: CarrierPlan) => bindWhere(p, bindValue(p), root);

    const cells: RootFillCell[] = [];
    for (let i = 0; i < safe.length; i += UNION_CHUNK) {
      const chunk = safe.slice(i, i + UNION_CHUNK);
      const parts = chunk.map(p => ({ p, w: whereOf(p) })).filter(x => x.w !== null);
      const sql = parts
        .map(
          ({ p, w }) => `SELECT '${p.sub_code}' AS sub_code, '${p.table_name}' AS carrier_table, ` +
               `COUNT(*) AS rows FROM ${p.table_name} WHERE ${w!.sql}`,
        )
        .join(' UNION ALL ');
      // A carrier named in the registry may not exist in this database yet, and
      // one missing table must not blank the whole reading — so a failed union
      // falls back to counting each carrier on its own. Swallowing the error
      // outright is what let a chunk-size mistake read as "nothing is there".
      const rows = await query<RootFillCell>(
        this.db, sql, parts.flatMap(x => x.w!.params),
      ).catch(() => null);
      if (rows) {
        cells.push(...rows);
        continue;
      }
      for (const { p, w } of parts) {
        const one = await query<RootFillCell>(
          this.db,
          `SELECT '${p.sub_code}' AS sub_code, '${p.table_name}' AS carrier_table, ` +
            `COUNT(*) AS rows FROM ${p.table_name} WHERE ${w!.sql}`,
          w!.params,
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
    // Declared carriers only — the same rule the fill count reads by, so the
    // contents and the count can never come from different table sets.
    // Migration 0106 may not have run here yet; the projection follows the
    // column that exists, so code and migration ship in either order.
    const via = await this.hasViaColumn();
    const viaCol = via ? ', m.root_bind_via_json' : '';
    const viaBind = via ? ", 'via'" : '';
    const plans = await query<CarrierPlan>(
      this.db,
      `SELECT m.table_name, m.sub_code, m.root_bind, m.root_bind_col${viaCol}
         FROM ar_ling_reg_table_map m
         JOIN ar_ling_reg_sub_layer s
           ON s.sub_code = m.sub_code
          AND s.tables_json LIKE '%"' || m.table_name || '"%'
        WHERE m.role IN ${CONTENT_ROLES} AND m.root_bind IN ('direct'${viaBind}) AND m.sub_code = ?
          AND m.table_name IS NOT NULL AND m.root_bind_col IS NOT NULL`,
      [subCode],
    ).catch(() => []);

    // A `via` plan carries its join in `root_bind_via_json`; its `root_bind_col`
    // is an audit note in prose, so it is not required to look like a column.
    const usable = plans.filter(p => IDENT.test(p.table_name) && (
      p.root_bind === 'via'
        ? parseVia(p.root_bind_via_json) !== null
        : !!p.root_bind_col && IDENT.test(p.root_bind_col)));
    if (!usable.length) return [];

    const idRow = await queryOne<{ id: string }>(
      this.db, 'SELECT id FROM ar_ling_roots WHERE root_text = ? LIMIT 1', [root],
    ).catch(() => null);
    const rootId = idRow?.id ?? null;

    const ID_COLS = new Set(['root_id', 'used_root_id']);
    const LEMMA_COLS = new Set(['lemma_id']);

    await mapLimit(usable, CARRIER_CONCURRENCY, (p) => this.orderingFor(p.table_name));

    const read = await mapLimit(usable, CARRIER_CONCURRENCY, async (p): Promise<CarrierRows | null> => {
      const col = p.root_bind_col as string;
      if (p.root_bind !== 'via') {
        if (LEMMA_COLS.has(col)) return null;
        if (ID_COLS.has(col) && !rootId) return null;   // unknown, not empty
      }
      const bound = p.root_bind !== 'via' && ID_COLS.has(col) ? (rootId as string) : root;
      const w = bindWhere(p, bound, root);
      if (!w) return null;                              // unreadable: unknown, not empty

      const order = await this.orderingFor(p.table_name);
      const [rows, total] = await Promise.all([
        query<Record<string, unknown>>(
          this.db,
          `SELECT * FROM ${p.table_name} WHERE ${w.sql}${order} LIMIT ${ROW_LIMIT}`,
          w.params,
        ).catch(() => [] as Record<string, unknown>[]),
        queryOne<{ n: number }>(
          this.db,
          `SELECT count(*) AS n FROM ${p.table_name} WHERE ${w.sql}`,
          w.params,
        ).catch(() => null),
      ]);
      if (!rows.length) return null;
      return {
        sub_code: subCode, carrier_table: p.table_name,
        bind_col: p.root_bind === 'via' ? `via ${p.table_name}` : col,
        rows, total: total?.n ?? rows.length,
      };
    });

    return read.filter((r): r is CarrierRows => r !== null);
  }

  /**
   * Every sub-layer's rows for one root, in one pass.
   *
   * The leaf reader answers "what does THIS carrier hold", which makes the
   * screen a click-per-layer: twenty sub-layers meant twenty round trips
   * before you could see what a root actually holds. Reading a root is not
   * twenty questions — it is one, so this reads the whole scope and lets the
   * screen show every layer's rows at once.
   *
   * `perSub` is deliberately small. This is a preview of each layer, not the
   * leaf: `total` still reports the carrier's real size, so a card can say it
   * is showing three of three hundred and link to the full read.
   */
  async rootRowsScope(
    root: string, scope: string, perSub = 6,
    opts: { skipBookBodies?: boolean } = {},
  ): Promise<CarrierRows[]> {
    if (!IDENT.test(scope)) return [];
    const limit = Math.max(1, Math.min(ROW_LIMIT, Math.floor(perSub)));

    // Same JOIN rule as the fill count and the leaf: a table carries a
    // sub-layer only because that sub-layer declares it. Undeclared is not a
    // default home, so the contents and the count can never disagree.
    // Migration 0106 may not have run here yet; the projection follows the
    // column that exists, so code and migration ship in either order.
    const via = await this.hasViaColumn();
    const viaCol = via ? ', m.root_bind_via_json' : '';
    const viaBind = via ? ", 'via'" : '';
    const plans = await query<CarrierPlan>(
      this.db,
      `SELECT m.table_name, m.sub_code, m.root_bind, m.root_bind_col${viaCol}
         FROM ar_ling_reg_table_map m
         JOIN ar_ling_reg_sub_layer s
           ON s.sub_code = m.sub_code
          AND s.tables_json LIKE '%"' || m.table_name || '"%'
        WHERE m.role IN ${CONTENT_ROLES} AND m.root_bind IN ('direct'${viaBind})
          AND s.scope_level = ?
          AND m.table_name IS NOT NULL AND m.root_bind_col IS NOT NULL
        ORDER BY s.display_order, m.sub_code`,
      [scope],
    ).catch(() => []);

    // A `via` plan carries its join in `root_bind_via_json`; its `root_bind_col`
    // is an audit note in prose, so it is not required to look like a column.
    const usable = plans.filter(p => IDENT.test(p.table_name) && (
      p.root_bind === 'via'
        ? parseVia(p.root_bind_via_json) !== null
        : !!p.root_bind_col && IDENT.test(p.root_bind_col)))
      // The books are the Lexicon reader's, not the root's. See BOOK_BODY_TABLES.
      .filter(p => !(opts.skipBookBodies && BOOK_BODY_TABLES.has(p.table_name)));
    if (!usable.length) return [];

    const idRow = await queryOne<{ id: string }>(
      this.db, 'SELECT id FROM ar_ling_roots WHERE root_text = ? LIMIT 1', [root],
    ).catch(() => null);
    const rootId = idRow?.id ?? null;

    const ID_COLS = new Set(['root_id', 'used_root_id']);
    const LEMMA_COLS = new Set(['lemma_id']);

    // Warm every carrier's ORDER BY together. orderingFor() issues one pragma
    // per table and memoises it; pulled one at a time from inside the read
    // below it was half of the serialised round-trips.
    await mapLimit(usable, CARRIER_CONCURRENCY, (p) => this.orderingFor(p.table_name));

    const read = await mapLimit(usable, CARRIER_CONCURRENCY, async (p): Promise<CarrierRows | null> => {
      const col = p.root_bind_col as string;
      if (p.root_bind !== 'via') {
        if (LEMMA_COLS.has(col)) return null;
        if (ID_COLS.has(col) && !rootId) return null;   // unknown, not empty
      }
      const bound = p.root_bind !== 'via' && ID_COLS.has(col) ? (rootId as string) : root;
      const w = bindWhere(p, bound, root);
      if (!w) return null;                              // unreadable: unknown, not empty

      const order = await this.orderingFor(p.table_name);
      const [rows, total] = await Promise.all([
        query<Record<string, unknown>>(
          this.db,
          `SELECT * FROM ${p.table_name} WHERE ${w.sql}${order} LIMIT ${limit}`,
          w.params,
        ).catch(() => [] as Record<string, unknown>[]),
        queryOne<{ n: number }>(
          this.db,
          `SELECT count(*) AS n FROM ${p.table_name} WHERE ${w.sql}`,
          w.params,
        ).catch(() => null),
      ]);
      if (!rows.length) return null;
      return {
        sub_code: p.sub_code, carrier_table: p.table_name,
        bind_col: p.root_bind === 'via' ? `via ${p.table_name}` : col,
        rows, total: total?.n ?? rows.length,
      };
    });

    return read.filter((r): r is CarrierRows => r !== null);
  }

  /**
   * `ORDER BY` for a carrier, built from the columns it actually has.
   *
   * Without one, `LIMIT 50` takes an arbitrary fifty: بين has 206 lexicon
   * blocks across eleven dictionaries, so the leaf showed a quarter of the
   * book in storage order and read as though that were all of it. Sorting on
   * the client cannot fix this — by then the other 156 rows are already gone.
   * The order has to be decided here, before the limit applies.
   */
  /**
   * Which books hold this root, oldest first — coverage, not content.
   *
   * Keyed on root_norm, which is indexed (idx_alre_root_norm). The obvious
   * root_text is not: the same question asked that way reads ~53k rows and
   * takes ~2.4s, against ~57 rows and ~1ms here.
   */
  async rootSourceCoverage(root: string): Promise<SourceCoverage[]> {
    return query<SourceCoverage>(
      this.db,
      `SELECT s.slug            AS source_slug,
              COALESCE(s.title_short_ar, s.title_ar) AS book,
              s.title_ar        AS book_full,
              s.author_name     AS author,
              s.author_death_ah AS died_ah,
              count(*)          AS entries
         FROM ar_ling_lexicon_entry e
         JOIN ar_ling_source s ON s.id = e.source_id
        WHERE e.root_norm = ?
        GROUP BY s.id
        ORDER BY COALESCE(s.source_order, 99), s.author_death_ah`,
      [root],
    ).catch(() => []);
  }

  private async orderingFor(table: string): Promise<string> {
    if (!IDENT.test(table)) return '';
    const cached = this.orderCache.get(table);
    if (cached !== undefined) return cached;

    const cols = await query<{ name: string }>(
      this.db, 'SELECT name FROM pragma_table_info(?)', [table],
    ).catch(() => [] as { name: string }[]);
    const have = new Set(cols.map(c => c.name));

    // A book is read source by source, and within a source in printed order.
    const keys = ORDER_KEYS.filter(k => have.has(k)).slice(0, 2);
    // `id` last, so rows that tie on every ordering column still come back in
    // the same sequence on every request.
    if (have.has('id') && !keys.includes('id')) keys.push('id');
    const clause = keys.length ? ` ORDER BY ${keys.join(', ')}` : '';
    this.orderCache.set(table, clause);
    return clause;
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
