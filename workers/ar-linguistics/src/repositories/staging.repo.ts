// ─── StagingRepo — the AL staging spine (ar_ling_stg_claim × reg_sub_layer) ──
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
const PROMOTED = `(status = 'promoted' OR promoted_to_table IS NOT NULL)`;

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
  matrix(): Promise<StageCell[]> {
    return query<StageCell>(
      this.db,
      `SELECT root_norm, sub_code, COUNT(*) AS n,
              SUM(CASE WHEN ${PROMOTED} THEN 1 ELSE 0 END) AS promoted
       FROM ar_ling_stg_claim
       GROUP BY root_norm, sub_code`,
    );
  }

  // Per-root rollup — staged claims, promoted, distinct layers touched.
  rootRollups(): Promise<RootRollup[]> {
    return query<RootRollup>(
      this.db,
      `SELECT root_norm,
              COUNT(*) AS staged,
              SUM(CASE WHEN ${PROMOTED} THEN 1 ELSE 0 END) AS promoted,
              COUNT(DISTINCT sub_code) AS layers
       FROM ar_ling_stg_claim
       GROUP BY root_norm
       ORDER BY staged DESC`,
    );
  }

  statusCounts(): Promise<StatusCount[]> {
    return query<StatusCount>(
      this.db,
      `SELECT status, COUNT(*) AS n FROM ar_ling_stg_claim GROUP BY status ORDER BY n DESC`,
    );
  }

  // ── Deep per-root drill: the actual staged claims, memlets, questions ──

  // Every staged claim for a root — verbatim quote + trilingual gloss + source,
  // grouped client-side by sub_code (the layer). This is the "layers deeper".
  rootClaims(root: string): Promise<RootClaim[]> {
    return query<RootClaim>(
      this.db,
      // payload_json is the row's real content — the verbatim quote, the
      // trilingual body, the marked terms, the citation, and the display block
      // that says which heading level and colour the row wants. Without it a
      // client can only render the gloss columns, which are a summary and are
      // often empty where the payload is full.
      `SELECT id, sub_code, band, source_slug, claim_type, status,
              promoted_to_table, quote_ar, gloss_ar, gloss_en, gloss_ur,
              confidence, payload_json
       FROM ar_ling_stg_claim
       WHERE root_norm = ?
       ORDER BY band, sub_code, source_slug`,
      [root],
    );
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
         (SELECT COUNT(*) FROM ar_ling_stg_claim)                                  AS staged,
         (SELECT COUNT(*) FROM ar_ling_stg_claim WHERE ${PROMOTED})                AS promoted,
         (SELECT COUNT(DISTINCT root_norm) FROM ar_ling_stg_claim)                 AS roots,
         (SELECT COUNT(*) FROM ar_ling_reg_sub_layer WHERE status='live')           AS sub_layers,
         (SELECT COUNT(*) FROM ar_ling_learn_memlet)                                     AS memlets,
         (SELECT COUNT(*) FROM ar_ling_learn_question)                              AS questions`,
    );
    return row ?? { staged: 0, promoted: 0, roots: 0, sub_layers: 0, memlets: 0, questions: 0 };
  }
}
