import { query, queryOne } from '../../../shared/src/db';

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

  display_icon: string | null;
}

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

export interface LayerModelSub {
  sub_code: string;
  name_ar: string;
  name_en: string;
  name_ur: string | null;

  scope_level: string;
  discipline: string;
  card: string;
  produced_by: string;
  fill_state: string;
  carrier_state: string;
  tables: string[];
  display_order: number;
  display_icon: string | null;

  band_key: string;
}

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

export interface RootOption {
  id: string; item_id: string;
  option_ar: string; option_en: string | null; option_ur: string | null;
  is_correct: number; distractor_kind: string | null;
  why_wrong_en: string | null; why_wrong_ar: string | null; sort_order: number;
}

export interface RootMedia {
  id: string; memlet_id: string; memlet_key: string | null;
  media_kind: string; r2_key: string; bucket: string;
  mime: string | null; duration_ms: number | null;
  reciter: string | null; qr_ref: string | null; status: string;
}

export interface MemletKind {
  memlet_key: string; name_ar: string; name_en: string; name_ur: string | null;
  modality: string; scope_level: string; display_order: number;
}

export interface QuestionKind {
  question_key: string; name_ar: string; name_en: string;
  memlet_key: string | null; response_kind: string;
  cognitive_level: string; difficulty_floor: number;
}
export interface RootRollup { root_norm: string; staged: number; promoted: number; layers: number }

const SCOPE_KEY: Record<string, string> = { root: 'root', lemma: 'lemma', context: 'word' };

const SCOPE_OF: Record<string, string> = {
  root: 'root', letter: 'root',
  lemma: 'lemma', form: 'lemma',
  word: 'word', context: 'word',
};

function parseTables(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export interface RootFillCell {
  sub_code: string;
  carrier_table: string;
  rows: number;
}

interface CarrierPlan {
  table_name: string;
  sub_code: string;
  root_bind: string;
  root_bind_col: string | null;

  root_bind_via_json?: string | null;
}

const IDENT_BAND = /^[A-Z][A-Z0-9_]*$/;

export interface FillScope { band?: string | null; scope?: string | null }

export interface SourceCoverage {
  source_slug: string;
  book: string | null;
  book_full: string | null;
  book_en: string | null;
  author: string | null;
  author_en: string | null;
  died_ah: number | null;
  entries: number;
}

export interface CarrierRows {
  sub_code: string;
  carrier_table: string;
  bind_col: string;
  rows: Record<string, unknown>[];

  total: number;
}

const CONTENT_ROLES = "('carrier', 'link', 'index', 'projection')";

const ROW_LIMIT = 50;

const ORDER_KEYS = [
  'block_seq', 'chunk_seq', 'step_no', 'step_seq', 'stage_no', 'slot_index',
  'perm_index', 'sort_order', 'display_order', 'clause_order', 'unit_index',
  'chunk_index', 'seq', 'death_hijri', 'source_slug',
];

const UNION_CHUNK = 5;

const BOOK_BODY_TABLES: ReadonlySet<string> = new Set([
  'ar_ling_lexicon_entry',
  'ar_ling_lexicon_entry_section',
  'ar_ling_lexicon_block',
  'ar_ling_lexicon_book_page',
  'ar_ling_source_chunk',
  'ar_ling_root_page_index',
]);

const CARRIER_CONCURRENCY = 8;

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

  private orderCache = new Map<string, string>();

  private viaColumn: boolean | null = null;

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

  async rootFill(root: string, where: FillScope = {}): Promise<RootFillCell[]> {

    const band = where.band && IDENT_BAND.test(where.band) ? where.band : null;
    const scope = where.scope && IDENT.test(where.scope) ? where.scope : null;
    const conds: string[] = [];
    const args: string[] = [];
    if (band) { conds.push('s.band_key = ?'); args.push(band); }
    if (scope) { conds.push('s.scope_level = ?'); args.push(scope); }

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

    const safe: CarrierPlan[] = [];
    for (const p of usable) {
      if (p.root_bind === 'via') { safe.push(p); continue; }
      const col = p.root_bind_col as string;
      if (LEMMA_COLS.has(col)) continue;
      if (ID_COLS.has(col) && !rootId) continue;
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

  async rootRows(root: string, subCode: string): Promise<CarrierRows[]> {

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
        if (ID_COLS.has(col) && !rootId) return null;
      }
      const bound = p.root_bind !== 'via' && ID_COLS.has(col) ? (rootId as string) : root;
      const w = bindWhere(p, bound, root);
      if (!w) return null;

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

  async rootRowsScope(
    root: string, scope: string, perSub = 6,
    opts: { skipBookBodies?: boolean } = {},
  ): Promise<CarrierRows[]> {
    if (!IDENT.test(scope)) return [];
    const limit = Math.max(1, Math.min(ROW_LIMIT, Math.floor(perSub)));

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

    const usable = plans.filter(p => IDENT.test(p.table_name) && (
      p.root_bind === 'via'
        ? parseVia(p.root_bind_via_json) !== null
        : !!p.root_bind_col && IDENT.test(p.root_bind_col)))

      .filter(p => !(opts.skipBookBodies && BOOK_BODY_TABLES.has(p.table_name)));
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
        if (ID_COLS.has(col) && !rootId) return null;
      }
      const bound = p.root_bind !== 'via' && ID_COLS.has(col) ? (rootId as string) : root;
      const w = bindWhere(p, bound, root);
      if (!w) return null;

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

  async rootSourceCoverage(root: string): Promise<SourceCoverage[]> {
    return query<SourceCoverage>(
      this.db,
      `SELECT s.slug            AS source_slug,
              COALESCE(s.title_short_ar, s.title_ar) AS book,
              s.title_ar        AS book_full,
              s.title_en        AS book_en,
              s.author_name     AS author,
              s.author_en       AS author_en,
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

    const keys = ORDER_KEYS.filter(k => have.has(k)).slice(0, 2);

    if (have.has('id') && !keys.includes('id')) keys.push('id');
    const clause = keys.length ? ` ORDER BY ${keys.join(', ')}` : '';
    this.orderCache.set(table, clause);
    return clause;
  }

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

  memletKinds(): Promise<MemletKind[]> {
    return query<MemletKind>(
      this.db,
      `SELECT memlet_key, name_ar, name_en, name_ur, modality, scope_level, display_order
       FROM ar_ling_learn_memlet_kind ORDER BY display_order`,
    );
  }

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
