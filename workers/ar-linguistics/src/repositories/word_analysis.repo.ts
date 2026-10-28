import { query, placeholders, chunked } from '../../../shared/src/db';

export interface LensEntry { source: string; heading: string | null; text: string; page: number | null; dirty?: boolean; }
export interface FiveLens { sarf: string | null; irab: string | null; dalala: string | null; balagha: string | null; tarjama: string | null; }
export interface FamilyLemma { lemma_ar: string; pos: string | null; verb_form: string | null; is_quran_word: boolean; }

export interface SinaiTerms { terms: string[]; terms_ar: Record<string, string>; type: string | null; weak_pattern: string | null; epigraphic: boolean; }

export interface RootSenseNode {
  id: string; sense_key: string; gloss_ar: string | null; gloss_en: string | null;
  gloss_ur: string | null; label_ar: string | null; label_en: string | null;
  definition_md: string | null; is_core: number; status: string;
}
export interface RootSenseArcStep {
  step_no: number; sense_id: string; note_md: string | null;
  gloss_ar: string | null; gloss_en: string | null;
}
export interface RootSenseArcNode {
  id: string; arc_key: string; arc_ar: string | null; arc_en: string | null;
  arc_ur: string | null; is_primary: number; is_synthesis: number;
  confidence: number | null; status: string; steps: RootSenseArcStep[];
}

export interface RootAnalysis {
  root: string;
  root_letters: string | null;
  root_type: string | null;
  weak_pattern: string | null;
  frequency_quran: number | null;
  meaning_core_ar: string | null;
  meaning_core_en: string | null;
  hook: string | null;
  senses: string[];

  sense_map: RootSenseNode[];
  sense_arcs: RootSenseArcNode[];
  examples: string[];
  near_synonyms: unknown[];
  antonyms: { ar: string; en: string | null; root: string | null }[];
  family: FamilyLemma[];
  five_lens: FiveLens | null;
  sinai: SinaiTerms | null;
  lenses: { maqayis: LensEntry | null; mufradat: LensEntry | null; lane: LensEntry | null; sinai: LensEntry | null; others: LensEntry[] };
  gems: unknown[];
  illustration: { title: string | null; caption_md: string | null; palette: string | null; svg_inline: string | null } | null;
  diagram: { kind: string | null; spec_json: unknown; renderer_key: string | null } | null;
  coverage: Record<string, boolean>;
}

const LENS_SLUG = {
  maqayis: 'maqayis_lugha',
  mufradat: 'raghib_mufradat',
  lane: 'lane_lexicon',
  sinai: 'sinai_key_terms',
} as const;
const FIVE_LENS_SLUG = 'kmaps_five_lens';
const MAX_LEN = 1400;

const STATUS_RANK = `CASE status WHEN 'live' THEN 0 WHEN 'review' THEN 1 ELSE 2 END`;

const CHUNK = 40;

function jsonArr(v: unknown): unknown[] { if (v == null) return []; if (Array.isArray(v)) return v; try { const p = JSON.parse(String(v)); return Array.isArray(p) ? p : []; } catch { return []; } }
function jsonStrArr(v: unknown): string[] { return jsonArr(v).filter((x): x is string => typeof x === 'string'); }

function clip(s: string | null): string {
  if (!s) return '';
  const t = s.trim();
  if (t.length <= MAX_LEN) return t;
  const head = t.slice(0, MAX_LEN);
  const stop = Math.max(head.lastIndexOf('. '), head.lastIndexOf('۔'), head.lastIndexOf('،'), head.lastIndexOf(' '));
  return (stop > MAX_LEN * 0.6 ? head.slice(0, stop) : head).trimEnd() + '…';
}

function stripMarkup(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isJsonBlob(s: string): boolean {
  const t = s.trim();
  if (t[0] !== '{' && t[0] !== '[') return false;
  try { return typeof JSON.parse(t) === 'object'; } catch { return false; }
}
function looksDirty(s: string): boolean { return /<[a-z][^>]*>/i.test(s) || isJsonBlob(s); }

function parseSinai(raw: string | null): SinaiTerms | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const terms = Array.isArray(o['terms']) ? o['terms'].filter((x): x is string => typeof x === 'string') : [];
    if (!terms.length) return null;
    const ta = o['terms_ar'];
    const terms_ar: Record<string, string> = {};
    if (ta && typeof ta === 'object') {
      for (const [k, v] of Object.entries(ta as Record<string, unknown>)) {
        if (typeof v === 'string' && v) terms_ar[k] = v;
      }
    }
    return {
      terms,
      terms_ar,
      type: typeof o['ty'] === 'string' ? o['ty'] : null,
      weak_pattern: typeof o['wp'] === 'string' ? o['wp'] : null,
      epigraphic: o['epi'] === true,
    };
  } catch { return null; }
}

export class WordAnalysisRepo {
  constructor(private db: D1Database) {}

  async byRoots(roots: string[]): Promise<Record<string, RootAnalysis>> {
    const uniq = [...new Set(roots.filter(r => !!r))];
    if (!uniq.length) return {};
    const parts = await Promise.all(
      chunked(uniq, CHUNK).map(c => this.resolveChunk(c)),
    );
    return Object.assign({}, ...parts) as Record<string, RootAnalysis>;
  }

  private async resolveChunk(uniq: string[]): Promise<Record<string, RootAnalysis>> {
    const out: Record<string, RootAnalysis> = {};
    const ph = placeholders(uniq.length);

    const [rootsRows, vocab, depth, antonyms, illus, diagrams, lensRows, fiveSections] = await Promise.all([
      query<{ root_text: string; root_normalized: string | null; root_letters: string | null; root_type: string | null; weak_pattern: string | null; frequency_quran: number | null; meaning_core_ar: string | null; meaning_core_en: string | null }>(
        this.db, `SELECT root_text, root_normalized, root_letters, root_type, weak_pattern, frequency_quran, meaning_core_ar, meaning_core_en FROM ar_ling_roots WHERE root_text IN (${ph}) OR root_normalized IN (${ph})`, [...uniq, ...uniq]).catch(() => []),
      query<{ root_norm: string; membean_hook: string | null; unique_senses_json: string | null; examples_json: string | null }>(
        this.db, `SELECT root_norm, membean_hook, unique_senses_json, examples_json FROM ar_ling_learn_vocab WHERE root_norm IN (${ph})`, uniq).catch(() => []),
      query<{ root_norm: string; nuance_gems_json: string | null; near_synonyms_json: string | null }>(
        this.db, `SELECT root_norm, nuance_gems_json, near_synonyms_json FROM ar_ling_vocab_depth WHERE root_norm IN (${ph})`, uniq).catch(() => []),
      query<{ root_norm: string; antonym_ar: string; antonym_en: string | null; antonym_root: string | null }>(
        this.db, `SELECT root_norm, antonym_ar, antonym_en, antonym_root FROM ar_ling_root_didd WHERE root_norm IN (${ph}) ORDER BY sort_order`, uniq).catch(() => []),
      query<{ root_norm: string; title: string | null; caption_md: string | null; palette: string | null; svg_inline: string | null }>(
        this.db, `SELECT root_norm, title, caption_md, palette, svg_inline FROM ar_ling_vocab_illustrations WHERE root_norm IN (${ph})`, uniq).catch(() => []),
      query<{ root_norm: string; diagram_kind: string | null; spec_json: string | null; renderer_key: string | null }>(
        this.db, `SELECT root_norm, diagram_kind, spec_json, renderer_key FROM ar_ling_vocab_diagrams WHERE root_norm IN (${ph})`, uniq).catch(() => []),
      query<{ root_norm: string; source_slug: string; raw_text: string | null; entry_text_ar: string | null; entry_text_en: string | null; page_start: number | null }>(
        this.db, `SELECT root_norm, source_slug, raw_text, entry_text_ar, entry_text_en, page_start FROM ar_ling_lexicon_entry WHERE root_norm IN (${ph})`,
        uniq).catch(() => []),
      query<{ root_norm: string; heading_norm: string | null; text_ar: string | null }>(
        this.db, `SELECT root_norm, heading_norm, text_ar FROM ar_ling_lexicon_entry_section WHERE root_norm IN (${ph}) AND source_slug = ?`, [...uniq, FIVE_LENS_SLUG]).catch(() => []),
    ]);

    const [senseNodes, arcNodes, arcSteps] = await Promise.all([
      query<{ root_norm: string } & RootSenseNode>(
        this.db,
        `SELECT root_norm, id, sense_key, gloss_ar, gloss_en, gloss_ur,
                label_ar, label_en, definition_md, is_core, status
           FROM ar_ling_root_sense
          WHERE scope_level = 'root' AND root_norm IN (${ph})
          ORDER BY ${STATUS_RANK}, is_core DESC, sort_order, sense_key`,
        uniq).catch(() => []),
      query<{ root_norm: string; id: string; arc_key: string; arc_ar: string | null;
              arc_en: string | null; arc_ur: string | null; is_primary: number;
              is_synthesis: number; confidence: number | null; status: string }>(
        this.db,
        `SELECT root_norm, id, arc_key, arc_ar, arc_en, arc_ur,
                is_primary, is_synthesis, confidence, status
           FROM ar_ling_sense_arc
          WHERE scope_level = 'root' AND root_norm IN (${ph})
          ORDER BY ${STATUS_RANK}, is_primary DESC, arc_key`,
        uniq).catch(() => []),
      query<{ arc_id: string } & RootSenseArcStep>(
        this.db,
        `SELECT st.arc_id, st.step_no, st.sense_id, st.note_md, s.gloss_ar, s.gloss_en
           FROM ar_ling_sense_arc_step st
           JOIN ar_ling_sense_arc a ON a.id = st.arc_id
           LEFT JOIN ar_ling_root_sense s ON s.id = st.sense_id
          WHERE a.scope_level = 'root' AND a.root_norm IN (${ph})
          ORDER BY st.arc_id, st.step_no`,
        uniq).catch(() => []),
    ]);
    const senseByRoot = groupBy(senseNodes, s => s.root_norm);
    const arcByRoot = groupBy(arcNodes, a => a.root_norm);
    const stepByArc = groupBy(arcSteps, s => s.arc_id);

    const familyRows = await query<{ root_text: string; root_normalized: string | null; lemma_text: string; part_of_speech: string | null; verb_form: string | null; is_quran_word: number }>(
      this.db,
      `SELECT r.root_text, r.root_normalized,
              coalesce(l.lemma_text_canonical, l.lemma_text) AS lemma_text, l.part_of_speech, l.verb_form, l.is_quran_word
         FROM ar_ling_root_lemma l JOIN ar_ling_roots r ON l.root_id = r.id
        WHERE (r.root_text IN (${ph}) OR r.root_normalized IN (${ph}))
          AND l.is_quran_word = 1
          AND l.part_of_speech != 'root_entry'
        ORDER BY l.part_of_speech, l.lemma_text`,
      [...uniq, ...uniq]).catch(() => []);

    const famByRoot = new Map<string, FamilyLemma[]>();
    for (const f of familyRows) {
      const key = uniq.find(u => u === f.root_text || u === f.root_normalized);
      if (!key) continue;
      const list = famByRoot.get(key) ?? [];
      if (!list.some(x => x.lemma_ar === f.lemma_text)) {
        list.push({ lemma_ar: f.lemma_text, pos: f.part_of_speech, verb_form: f.verb_form, is_quran_word: !!f.is_quran_word });
      }
      famByRoot.set(key, list);
    }

    const rootMap = new Map<string, (typeof rootsRows)[number]>();
    for (const r of rootsRows) {
      for (const k of [r.root_text, r.root_normalized]) {
        if (!k) continue;
        const prev = rootMap.get(k);
        if (!prev || (!(prev.meaning_core_ar || prev.meaning_core_en) && (r.meaning_core_ar || r.meaning_core_en))) {
          rootMap.set(k, r);
        }
      }
    }
    const vMap = new Map(vocab.map(v => [v.root_norm, v]));
    const dMap = new Map(depth.map(d => [d.root_norm, d]));
    const antByRoot = groupBy(antonyms, a => a.root_norm);
    const illMap = new Map(illus.map(i => [i.root_norm, i]));
    const diaMap = new Map(diagrams.map(d => [d.root_norm, d]));
    const lensByRoot = groupBy(lensRows, l => l.root_norm);
    const fiveByRoot = groupBy(fiveSections, s => s.root_norm);

    for (const root of uniq) {
      const r = rootMap.get(root);
      const v = vMap.get(root);
      const d = dMap.get(root);
      const lensList = lensByRoot.get(root) ?? [];
      type LensRow = (typeof lensList)[number];
      const entryOf = (e: LensRow): LensEntry => {

        const raw = e.entry_text_ar || e.entry_text_en || e.raw_text;
        const dirty = !!raw && looksDirty(raw);

        const text = !raw ? '' : isJsonBlob(raw) ? '' : clip(dirty ? stripMarkup(raw) : raw);
        return { source: e.source_slug, heading: null, text, page: e.page_start, ...(dirty ? { dirty: true } : {}) };
      };
      const pick = (slug: string): LensEntry | null => {
        const e = lensList.find(x => x.source_slug === slug);
        return e ? entryOf(e) : null;
      };
      const namedSlugs = new Set<string>([...Object.values(LENS_SLUG), FIVE_LENS_SLUG]);
      const others = lensList
        .filter(e => !namedSlugs.has(e.source_slug))
        .map(entryOf)
        .sort((a, b) => a.source.localeCompare(b.source));
      const sinaiRaw = lensList.find(x => x.source_slug === LENS_SLUG.sinai)?.raw_text ?? null;
      const fiveRaw = lensList.find(x => x.source_slug === FIVE_LENS_SLUG)?.raw_text ?? null;
      const five = buildFiveLens(fiveByRoot.get(root) ?? [], fiveRaw);
      const senseMap = (senseByRoot.get(root) ?? []).map(({ root_norm: _rn, ...s }) => s);
      const senseArcs: RootSenseArcNode[] = (arcByRoot.get(root) ?? []).map(a => ({
        id: a.id, arc_key: a.arc_key, arc_ar: a.arc_ar, arc_en: a.arc_en, arc_ur: a.arc_ur,
        is_primary: a.is_primary, is_synthesis: a.is_synthesis,
        confidence: a.confidence, status: a.status,
        steps: (stepByArc.get(a.id) ?? []).map(({ arc_id: _ai, ...s }) => s),
      }));

      out[root] = {
        root,
        root_letters: shapeRootLetters(r?.root_letters ?? null),
        root_type: r?.root_type ? (ROOT_TYPE_AR[r.root_type] ?? r.root_type) : null,
        weak_pattern: r?.weak_pattern ? (WEAK_PATTERN_AR[r.weak_pattern] ?? r.weak_pattern) : null,
        frequency_quran: r?.frequency_quran ?? null,
        meaning_core_ar: r?.meaning_core_ar ?? null,
        meaning_core_en: r?.meaning_core_en ?? null,
        hook: v?.membean_hook ?? null,
        senses: jsonStrArr(v?.unique_senses_json),
        sense_map: senseMap,
        sense_arcs: senseArcs,
        examples: jsonStrArr(v?.examples_json),
        near_synonyms: jsonArr(d?.near_synonyms_json),
        antonyms: (antByRoot.get(root) ?? []).map(a => ({ ar: a.antonym_ar, en: a.antonym_en, root: a.antonym_root })),
        family: famByRoot.get(root) ?? [],
        five_lens: five,
        sinai: parseSinai(sinaiRaw),
        lenses: { maqayis: pick(LENS_SLUG.maqayis), mufradat: pick(LENS_SLUG.mufradat), lane: pick(LENS_SLUG.lane), sinai: pick(LENS_SLUG.sinai), others },
        gems: jsonArr(d?.nuance_gems_json),
        illustration: illMap.has(root) ? { title: illMap.get(root)!.title, caption_md: illMap.get(root)!.caption_md, palette: illMap.get(root)!.palette, svg_inline: illMap.get(root)!.svg_inline } : null,
        diagram: diaMap.has(root) ? { kind: diaMap.get(root)!.diagram_kind, spec_json: safeJson(diaMap.get(root)!.spec_json), renderer_key: diaMap.get(root)!.renderer_key } : null,
        coverage: {
          hook: !!v?.membean_hook, five_lens: !!fiveRaw, gems: jsonArr(d?.nuance_gems_json).length > 0,
          meaning_core: !!(r?.meaning_core_en || r?.meaning_core_ar), illustration: illMap.has(root),
          sinai: lensList.some(x => x.source_slug === LENS_SLUG.sinai), lane: lensList.some(x => x.source_slug === LENS_SLUG.lane),
          family: (famByRoot.get(root) ?? []).length > 0,
          sense_map: senseMap.length > 0, sense_arcs: senseArcs.length > 0,
        },
      };
    }
    return out;
  }
}

function shapeRootLetters(v: string | null): string | null {
  if (!v) return null;
  try { const a = JSON.parse(v); return Array.isArray(a) ? a.join('') : v; /* shown joined (نزل), never ن ز ل */ } catch { return v; }
}

const ROOT_TYPE_AR: Record<string, string> = {
  trilateral: 'ثلاثي', quadrilateral: 'رباعي', biliteral: 'ثنائي',
};
const WEAK_PATTERN_AR: Record<string, string> = {
  ajwaf_ya: 'أجوف يائي', ajwaf_waw: 'أجوف واوي', mithal_waw: 'مثال واوي', mithal_ya: 'مثال يائي',
  naqis_ya: 'ناقص يائي', naqis_waw: 'ناقص واوي', lafif: 'لفيف', mudaaf: 'مضعّف', mahmuz: 'مهموز',
  sound: 'سالم', salim: 'سالم',
};

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) { const k = key(r); if (!m.has(k)) m.set(k, []); m.get(k)!.push(r); }
  return m;
}
function safeJson(v: string | null): unknown { if (!v) return null; try { return JSON.parse(v); } catch { return v; } }

function buildFiveLens(sections: { heading_norm: string | null; text_ar: string | null }[], raw: string | null): FiveLens | null {
  if (!raw && !sections.length) return null;
  const out: FiveLens = { sarf: null, irab: null, dalala: null, balagha: null, tarjama: null };
  if (raw) {
    const grab = (label: string, next: string[]): string | null => {
      const re = new RegExp(`${label}:\\s*([\\s\\S]*?)(?:\\s(?:${next.join('|')}):|$)`);
      const m = re.exec(raw);
      return m ? m[1].trim() : null;
    };
    out.sarf = grab('SARF', ['IRAB', 'DALALA', 'BALAGHA', 'TARJAMA']);
    out.irab = grab('IRAB', ['DALALA', 'BALAGHA', 'TARJAMA']);
    out.dalala = grab('DALALA', ['BALAGHA', 'TARJAMA']);
    out.balagha = grab('BALAGHA', ['TARJAMA']);
    out.tarjama = grab('TARJAMA', []);
  }
  return out;
}
