import { query, queryOne } from '../../../shared/src/db';
import type { AlClient } from '../clients/al.client';
import { parseQacMorphology, posGroup as qacPosGroup, QacMorphology } from '../lib/qac-morph';

export interface TermRef { key: string; label_ar: string | null; color: string | null; }

export interface WordSegment {
  index: number;
  text: string;
  type: string | null;
  term: TermRef | null;
}

export interface WordIrab {
  position: string | null;
  position_ar: string | null;
  sign: string | null;
  sign_ar: string | null;
  syntactic_function: string | null;
  is_disputed: boolean;
  dispute_note: string | null;
  sources: string[];
  term: TermRef | null;
}

export interface WordCard {
  word_id: string;
  sml_id: string | null;
  surah: number;
  ayah: number;
  word_index: number;
  surface_ar: string;
  surface_bare: string | null;
  lemma_ar: string | null;
  root: string | null;
  pos: string | null;
  group: 'noun' | 'verb' | 'other';
  qac: QacMorphology;
  irab: WordIrab | null;
  segments: WordSegment[];
  lemma_stats: { total_occurrences: number; lx_lemma_ref: string | null } | null;
}

export interface PassageMorphology {
  surah: number;
  passage_no: number;
  ayah_from: number;
  ayah_to: number;
  label: string | null;
  words: WordCard[];
  roots: string[];
}

interface WordOccRow {
  id: string; surah: number; ayah: number; word_index: number;
  word_text: string; word_text_bare: string | null;
  root: string | null; lemma: string | null; pos: string | null;
  morphology_tag_json: string | null;
}
interface SmlRow {
  id: string; scope_id: string; lx_morph_ref: string | null;
  irab_position: string | null; irab_sign: string | null; syntactic_function: string | null;
  is_disputed: number | null; dispute_note: string | null; note_md: string | null;
}
interface SegRow {
  word_occurrence_id: string; segment_index: number; segment_text: string; segment_type: string | null;
}

type JsonRecord = Record<string, unknown>;

interface PassageRow {
  id: string;
  surah_id: number;
  passage_no: number;
  ayah_from: number;
  ayah_to: number;
  title: string | null;
  theme: string | null;
  status: string;
  name_ar: string | null;
  name_en: string | null;
}

interface RawTaskRow {
  task_id: string;
  parent_task_id: string | null;
  task_type: string;
  task_key: string | null;
  display_order: number | null;
  status: string | null;
  payload_json: string | null;
  updated_at: string | null;
}

export interface StudyTask {
  task_id: string;
  parent_task_id: string | null;
  task_type: string;
  task_name: string | null;
  display_order: number | null;
  status: string | null;
  task_json: unknown;
  updated_at: string | null;
  children: StudyTask[];
}

export interface AyahWordToken {
  position: number;
  text: string;
  simple?: string;
  char_type: 'word' | 'end';
  lemma?: string;
  root?: string;
  pos?: string;
}

export interface SsConstituencyNode {
  name:      string;
  id:        string;
  term_id?:  string;
  label_ar?: string;
  note?:     string;
  word_id?:  string;
  children?: SsConstituencyNode[];
}

export interface SsClauseNode {
  id:        string;
  order:     number;
  depth:     number;
  type?:     string;
  function?: string;
  particle?: string;
  note?:     string;
  words:     SsClauseWord[];
  children:  SsClauseNode[];
}

export interface SsClauseWord {
  wordId: string;
  ayah:   number;
  index:  number;
  text:   string;
  simple?: string;
  root?:  string;
  lemma?: string;
  pos?:   string;
  role:   string | null;
  irab:   { book: string; role: string | null; text: string | null }[];
}

function parseJson(v: unknown): unknown {
  if (typeof v !== 'string') return v ?? null;
  try { return JSON.parse(v); } catch { return v; }
}

function asStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function asNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function asRec(v: unknown): JsonRecord | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as JsonRecord) : null;
}

const IRAB_POS_AR: Record<string, string> = {
  rafa: 'رفع', raf: 'رفع', nasb: 'نصب', jarr: 'جرّ', jarr_qasam: 'جرّ', jazm: 'جزم',
  mabni: 'مبنيّ', mabni_mahall: 'مبنيّ في محلّ',
};
const IRAB_SIGN_AR: Record<string, string> = {
  damma: 'ضمّة', fatha: 'فتحة', kasra: 'كسرة', sukun: 'سكون', ya: 'الياء', waw: 'الواو',
  alif: 'الألف', thubut_nun: 'ثبوت النون', hadhf_nun: 'حذف النون', muqaddara: 'مقدّرة',
};

function stripTermPrefix(ref: string | null): string | null {
  if (!ref) return null;
  return ref.replace(/^AL:(nahw|sarf):/i, '');
}

function termOf(map: Map<string, TermRef>, key: string | null): TermRef | null {
  if (!key) return null;
  return map.get(key) ?? null;
}

function sourcesFromNote(note: string | null): string[] {
  const rec = asRec(parseJson(note));
  const arr = rec && Array.isArray(rec['sources']) ? rec['sources'] : [];
  return arr.filter((s): s is string => typeof s === 'string');
}

const STEP_ORDER: Record<string, number> = {
  reading: 100, vocabulary: 200, sentence_structure: 300,
  passage_structure: 400, tafsir: 500, worldview: 600,

  surah_structure: 700,

  morphology: 200, expressions: 210,
  comprehension: 500, scholarship: 510,
};

const STEP_ALIAS: Record<string, string> = {
  morphology: 'vocabulary', expressions: 'vocabulary',
  comprehension: 'tafsir', scholarship: 'tafsir',
};

function taskSortKey(t: StudyTask): number {
  return asNum(t.display_order) ?? STEP_ORDER[t.task_type] ?? 99000;
}

function sortTasks(ts: StudyTask[]): StudyTask[] {
  return [...ts].sort((a, b) => taskSortKey(a) - taskSortKey(b) || a.task_id.localeCompare(b.task_id));
}

export class StudyRepo {
  constructor(private db: D1Database) {}

  passages(surahId: number): Promise<PassageRow[]> {
    return this._passages(surahId);
  }

  async corpusVersion(): Promise<{ version: string; built_at: string | null }> {
    const row = await queryOne<{ version: string; built_at: string | null }>(
      this.db, `SELECT version, built_at FROM qr_corpus_version WHERE id = 1`,
    ).catch(() => null);
    if (row?.version) return row;
    const fallback = await queryOne<{ v: string | null }>(
      this.db, `SELECT MAX(created_at) AS v FROM qr_ss_occ_sentence`,
    ).catch(() => null);
    return { version: `qr-derived-${fallback?.v ?? 'unknown'}`, built_at: fallback?.v ?? null };
  }

  async grid(surahId: number) {
    const passages = await this._passages(surahId);
    if (!passages.length) return null;

    const [typeFlags, wordCounts, dataFlags] = await Promise.all([
      this._taskTypeFlags(surahId),
      this._wordCounts(surahId, passages),
      this._dataFlags(surahId, passages),
    ]);

    const units = passages.map(p => {
      const flags = typeFlags.get(p.id) ?? new Set<string>();
      const data  = dataFlags.get(p.id) ?? new Set<string>();
      const wc    = wordCounts.get(p.id) ?? { total: 0, nouns: 0, verbs: 0 };
      const has   = (...steps: string[]) =>
        steps.some(s => flags.has(s) || data.has(s)) ? 1 : 0;
      return {
        passage_id:  p.id,
        passage_no:  p.passage_no,
        ayah_from:   p.ayah_from,
        ayah_to:     p.ayah_to,
        start_ref:   `${p.surah_id}:${p.ayah_from}`,
        end_ref:     `${p.surah_id}:${p.ayah_to}`,
        label:       p.title ?? `Passage ${p.passage_no}`,
        theme:       p.theme ?? null,

        reading:             { has: has('reading') },
        vocabulary:          {
          nouns: wc.nouns, verbs: wc.verbs, total: wc.total,

          has: (wc.total > 0 || has('vocabulary', 'morphology', 'expressions') === 1) ? 1 : 0,
        },
        sentence_structure:  { has: has('sentence_structure') },
        passage_structure:   { has: has('passage_structure') },
        tafsir:              { has: has('tafsir', 'comprehension', 'scholarship') },
        worldview:           { has: has('worldview') },
        surah_structure:     { has: has('surah_structure') },
      };
    });

    return {
      surah: {
        surah_id: surahId,
        name_ar:  passages[0].name_ar ?? null,
        name_en:  passages[0].name_en ?? null,
      },
      units,
    };
  }

  async lesson(surahId: number, passageNo: number) {
    const passages = await this._passages(surahId);
    const passage  = passages.find(p => p.passage_no === passageNo);
    if (!passage) return null;

    const [tasks, ayahs] = await Promise.all([
      this._tasks(passage.id),
      this._ayahs(passage),
    ]);

    const fromMorph = vocabularyFromMorphology(tasks);
    const vocabulary = (fromMorph.nouns.length || fromMorph.verbs.length)
      ? fromMorph
      : await this._wordsAsVocabulary(passage);

    return {
      passage_id:  passage.id,
      passage_no:  passage.passage_no,
      ayah_from:   passage.ayah_from,
      ayah_to:     passage.ayah_to,
      start_ref:   `${passage.surah_id}:${passage.ayah_from}`,
      end_ref:     `${passage.surah_id}:${passage.ayah_to}`,
      label:       passage.title ?? `Passage ${passage.passage_no}`,
      theme:       passage.theme ?? null,
      ayahs,
      vocabulary,
      expressions: expressionsFromTasks(tasks),
      tasks,
    };
  }

  async allTasks(surahId: number, passageNo: number): Promise<StudyTask[] | null> {
    const passages = await this._passages(surahId);
    const passage  = passages.find(p => p.passage_no === passageNo);
    if (!passage) return null;
    return this._tasks(passage.id);
  }

  async taskByStepType(
    surahId: number,
    passageNo: number,
    stepType: string,
  ): Promise<StudyTask | null | undefined> {
    const passages = await this._passages(surahId);
    const passage  = passages.find(p => p.passage_no === passageNo);
    if (!passage) return null;
    const tasks = await this._tasks(passage.id);
    return tasks.find(t => t.task_type === stepType) ?? undefined;
  }

  async passageRoots(
    surahId: number,
    passageNo: number,
  ): Promise<
    { root: string; occurrences: number; lemmas: number; first_ayah: number; first_word: number }[] | null
  > {
    const passages = await this._passages(surahId);
    const passage  = passages.find(p => p.passage_no === passageNo);
    if (!passage) return null;

    return query<{ root: string; occurrences: number; lemmas: number; first_ayah: number; first_word: number }>(
      this.db,
      `SELECT root,
              COUNT(*)                              AS occurrences,
              COUNT(DISTINCT lemma)                 AS lemmas,
              MIN(ayah)                             AS first_ayah,
              MIN(ayah * 1000 + word_index)         AS first_pos,
              MIN(ayah * 1000 + word_index) % 1000  AS first_word
       FROM qr_word_occurrence
       WHERE surah = ? AND ayah BETWEEN ? AND ?
         AND root IS NOT NULL AND root <> ''
       GROUP BY root
       ORDER BY first_pos`,
      [passage.surah_id, passage.ayah_from, passage.ayah_to],
    );
  }

  async stepTypes(surahId: number, passageNo: number): Promise<string[] | null> {
    const passages = await this._passages(surahId);
    const passage  = passages.find(p => p.passage_no === passageNo);
    if (!passage) return null;
    const flags = await this._taskTypeFlags(surahId);
    return [...(flags.get(passage.id) ?? new Set<string>())]
      .sort((a, b) => (STEP_ORDER[a] ?? 99000) - (STEP_ORDER[b] ?? 99000));
  }

  async readingStep(surahId: number, passageNo: number) {
    const passages = await this._passages(surahId);
    const passage  = passages.find(p => p.passage_no === passageNo);
    if (!passage) return null;

    const ayahs = await this._ayahs(passage);
    return {
      step:       'reading',
      source:     'tables',
      passage_id: passage.id,
      surah:      passage.surah_id,
      ayah_from:  passage.ayah_from,
      ayah_to:    passage.ayah_to,
      ayahs,
    };
  }

  async comprehensionStep(surahId: number, passageNo: number) {
    const passages = await this._passages(surahId);
    const passage  = passages.find(p => p.passage_no === passageNo);
    if (!passage) return null;

    const questions = await query<JsonRecord>(
      this.db,
      `SELECT id, scope_ref, ayah_from, ayah_to, question_type,
              question_en, question_ar, options_json, answer_md,
              difficulty, sort_order
       FROM qr_study_question
       WHERE surah = ? AND passage_id = ? AND status != 'deleted'
       ORDER BY sort_order, ayah_from, id`,
      [passage.surah_id, passage.id],
    ).catch(() => []);

    return {
      step:       'comprehension',
      source:     'tables',
      passage_id: passage.id,
      questions,
    };
  }

  async morphologyStep(surahId: number, passageNo: number) {
    const passages = await this._passages(surahId);
    const passage  = passages.find(p => p.passage_no === passageNo);
    if (!passage) return null;
    const { surah_id: surah, ayah_from: from, ayah_to: to } = passage;

    const [rows, irabRows, readingRows, tafsirRows, synthRows, synthEvRows] = await Promise.all([
      query<{
        id: string; ayah: number; word_index: number;
        word_text: string; word_text_bare: string | null;
        root: string | null; lemma: string | null;
        pos: string | null; morphology_tag: string | null;
        syntactic_function: string | null;
      }>(
        this.db,
        `SELECT w.id, w.ayah, w.word_index, w.word_text, w.word_text_bare,
                w.root, w.lemma, w.pos, w.morphology_tag, m.syntactic_function
         FROM qr_word_occurrence w
         LEFT JOIN qr_ss_scope_morph_link m ON m.scope_id = w.id
         WHERE w.surah = ? AND w.ayah BETWEEN ? AND ?
         ORDER BY w.ayah, w.word_index`,
        [surah, from, to],
      ).catch(() => []),

      query<{ wid: string; source_slug: string; source_title: string | null;
              role: string | null; text: string | null }>(
        this.db,
        `SELECT e.word_occurrence_id AS wid, e.source_slug, e.source_title,
                e.grammar_role_ar AS role, e.irab_text_ar AS text
         FROM qr_irab_book_entry e
         JOIN qr_word_occurrence w ON w.id = e.word_occurrence_id
         WHERE w.surah = ? AND w.ayah BETWEEN ? AND ? AND e.word_link_status = 'linked'
           AND (e.grammar_role_ar IS NOT NULL OR e.irab_text_ar IS NOT NULL)`,
        [surah, from, to],
      ).catch(() => []),

      query<{ wid: string; reading_type: string | null; scholar_ref: string | null;
              text_ar: string | null; is_contested: number | null; is_minority: number | null }>(
        this.db,
        `SELECT r.scope_id AS wid, r.reading_type, r.scholar_ref,
                r.reading_text_ar AS text_ar, r.is_contested, r.is_minority
         FROM qr_ss_scope_reading r
         JOIN qr_word_occurrence w ON w.id = r.scope_id
         WHERE r.scope_type = 'word' AND r.reading_type <> 'synthesis'
           AND w.surah = ? AND w.ayah BETWEEN ? AND ?`,
        [surah, from, to],
      ).catch(() => []),

      query<{ ayah_from: number; ayah_to: number; scholar_id: string | null;
              work: string | null; text: string | null }>(
        this.db,
        `SELECT t.ayah_from, t.ayah_to, t.scholar_id, wk.title_ar AS work,
                substr(t.content_ar, 1, 700) AS text
         FROM qr_tafsir_entry t
         JOIN qr_scholar_work wk ON wk.id = t.work_id
         WHERE t.surah = ? AND t.ayah_from <= ? AND t.ayah_to >= ?
           AND t.content_ar IS NOT NULL AND TRIM(t.content_ar) <> ''
         ORDER BY t.ayah_from`,
        [surah, to, from],
      ).catch(() => []),

      query<{ wid: string; text: string | null; text_ar: string | null; contested: number | null }>(
        this.db,
        `SELECT r.scope_id AS wid, r.reading_text AS text, r.reading_text_ar AS text_ar, r.is_contested AS contested
         FROM qr_ss_scope_reading r
         JOIN qr_word_occurrence w ON w.id = r.scope_id
         WHERE r.scope_type = 'word' AND r.reading_type = 'synthesis'
           AND w.surah = ? AND w.ayah BETWEEN ? AND ?`,
        [surah, from, to],
      ).catch(() => []),

      query<{ wid: string; etype: string | null; provenance: string | null;
              locator: string | null; text_ar: string | null; disputed: number | null }>(
        this.db,
        `SELECT r.scope_id AS wid, ev.evidence_type AS etype, ev.provenance,
                ev.locator, ev.content_text_ar AS text_ar, ev.is_disputed AS disputed
         FROM qr_ss_scope_reading r
         JOIN qr_ss_scope_reading_evidence_link l ON l.reading_id = r.id
         JOIN qr_evidence ev ON ev.id = l.evidence_id
         JOIN qr_word_occurrence w ON w.id = r.scope_id
         WHERE r.scope_type = 'word' AND r.reading_type = 'synthesis'
           AND w.surah = ? AND w.ayah BETWEEN ? AND ?`,
        [surah, from, to],
      ).catch(() => []),
    ]);

    const irabByWord = new Map<string, { source: string; book: string | null; role: string | null; text: string | null }[]>();
    for (const e of irabRows) {
      const list = irabByWord.get(e.wid) ?? [];
      list.push({ source: e.source_slug, book: e.source_title ?? IRAB_BOOKS[e.source_slug] ?? null, role: e.role, text: e.text });
      irabByWord.set(e.wid, list);
    }
    const readingsByWord = new Map<string, { type: string | null; scholar: string | null; text_ar: string | null; contested: boolean; minority: boolean }[]>();
    for (const r of readingRows) {
      const list = readingsByWord.get(r.wid) ?? [];
      list.push({ type: r.reading_type, scholar: r.scholar_ref, text_ar: r.text_ar, contested: !!r.is_contested, minority: !!r.is_minority });
      readingsByWord.set(r.wid, list);
    }

    const synthEvByWord = new Map<string, { type: string | null; provenance: string | null; locator: string | null; text_ar: string | null; disputed: boolean }[]>();
    for (const e of synthEvRows) {
      const list = synthEvByWord.get(e.wid) ?? [];
      list.push({ type: e.etype, provenance: e.provenance, locator: e.locator, text_ar: e.text_ar, disputed: !!e.disputed });
      synthEvByWord.set(e.wid, list);
    }

    const synthByWord = new Map<string, { text: string | null; text_ar: string | null; contested: boolean; evidence: { type: string | null; provenance: string | null; locator: string | null; text_ar: string | null; disputed: boolean }[] }>();
    for (const s of synthRows) {
      synthByWord.set(s.wid, { text: s.text, text_ar: s.text_ar, contested: !!s.contested, evidence: synthEvByWord.get(s.wid) ?? [] });
    }

    const items = rows.map(r => {
      const feat  = parseQacTag(r.morphology_tag);
      const group = posGroup(r.pos);
      return {
        word_id:   r.id,
        ayah:      r.ayah,
        position:  r.word_index,
        word:      r.word_text,
        simple:    r.word_text_bare ?? undefined,
        root:      r.root ?? undefined,
        lemma:     r.lemma ?? undefined,
        pos:       r.pos ?? undefined,
        group,
        verb_form: feat.verb_form,
        pattern:   feat.verb_form ? `Form ${feat.verb_form}` : undefined,
        morph_features: feat,
        syntactic_function: r.syntactic_function ?? undefined,

        synthesis: synthByWord.get(r.id) ?? null,

        irab:      irabByWord.get(r.id) ?? [],
        readings:  readingsByWord.get(r.id) ?? [],
        lexicon_root: r.root ?? null,
      };
    });

    const tafsirByAyah = new Map<number, { work: string | null; scholar: string | null; text: string | null }[]>();
    for (const t of tafsirRows) {
      const lo = Math.max(t.ayah_from, from);
      const hi = Math.min(t.ayah_to, to);
      for (let a = lo; a <= hi; a++) {
        const list = tafsirByAyah.get(a) ?? [];
        list.push({ work: t.work, scholar: t.scholar_id, text: t.text });
        tafsirByAyah.set(a, list);
      }
    }
    const tafsir = [...tafsirByAyah.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([ayah, sources]) => ({ ayah, sources }));

    return {
      step:       'morphology',
      source:     'tables',
      passage_id: passage.id,
      surah,
      ayah_from:  from,
      ayah_to:    to,
      nouns:      items.filter(i => i.group === 'noun'),
      verbs:      items.filter(i => i.group === 'verb'),
      particles:  items.filter(i => i.group === 'particle'),
      words:      items,
      tafsir,
    };
  }

  /// How the rendering of a passage is built: the units it is made of, the
  /// steps that accumulate them one connector at a time, the nuances that
  /// fork a choice, and the final fluent the passage settles on. Every field
  /// is stated in qr_ss_translation_*; nothing here is assembled by guess.
  async passageStructureStep(surahId: number, passageNo: number) {
    const passages = await this._passages(surahId);
    const p = passages.find((x) => x.passage_no === passageNo);
    if (!p) return null;

    const [rendering, units, buildup, nuances, decisions] = await Promise.all([
      queryOne<Record<string, unknown>>(
        this.db,
        `SELECT id, assembled_fluent_en AS assembled, final_fluent_en AS final,
                assembly_note_ar AS noteAr, synthesis_md AS synthesis, nazm_ref AS nazmRef,
                rejected_assemblies_json AS rejected
           FROM qr_ss_translation_passage
          WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ?
          ORDER BY ayah_from LIMIT 1`,
        [surahId, p.ayah_from, p.ayah_to],
      ).catch(() => null),
      query<Record<string, unknown>>(
        this.db,
        `SELECT id, scope_id AS scopeId, seq, ayah_from AS ayah, ayah_to AS ayahTo,
                structural_literal_en AS structural, fluent_en AS fluentEn,
                fluent_ar AS fluentAr, decision_note_ar AS noteAr,
                synthesis_md AS synthesis, reading_ref AS readingRef
           FROM qr_ss_translation_unit
          WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ? AND status = 'live'
          ORDER BY ayah_from, seq`,
        [surahId, p.ayah_from, p.ayah_to],
      ).catch(() => []),
      query<Record<string, unknown>>(
        this.db,
        `SELECT b.id, b.step_seq AS seq, b.unit_id AS unitId, b.relation_type AS relation,
                b.connector_en AS connectorEn, b.added_en AS addedEn,
                b.cumulative_en AS cumulativeEn, b.layers_ar AS layersAr,
                b.driver_kind AS driverKind, b.driver_ref AS driverRef
           FROM qr_ss_translation_buildup b
           JOIN qr_ss_translation_passage tp ON tp.id = b.passage_id
          WHERE tp.surah = ? AND tp.ayah_from >= ? AND tp.ayah_to <= ?
          ORDER BY b.step_seq, b.id`,
        [surahId, p.ayah_from, p.ayah_to],
      ).catch(() => []),
      query<Record<string, unknown>>(
        this.db,
        `SELECT n.id, n.translation_unit_id AS unitId, n.driver_ar AS driverAr,
                n.fork_json AS fork, n.chosen_en AS chosenEn,
                n.changes_translation AS changesTranslation,
                n.nuance_ref AS ref, n.note_md AS noteMd
           FROM qr_ss_translation_nuance n
           JOIN qr_ss_translation_unit u ON u.id = n.translation_unit_id
          WHERE u.surah = ? AND u.ayah_from >= ? AND u.ayah_to <= ?
          ORDER BY u.ayah_from, n.id`,
        [surahId, p.ayah_from, p.ayah_to],
      ).catch(() => []),
      query<Record<string, unknown>>(
        this.db,
        `SELECT id, ayah, step_seq AS seq, target_span_ar AS spanAr,
                rendered_json AS rendered, driver_kind AS driverKind,
                driver_ref AS driverRef, rationale_json AS rationale
           FROM qr_ss_translation_decision
          WHERE surah = ? AND ayah BETWEEN ? AND ? AND status = 'live'
          ORDER BY ayah, step_seq`,
        [surahId, p.ayah_from, p.ayah_to],
      ).catch(() => []),
    ]);

    // The analytical lenses — ring/chiasm, discourse, conflict, lexicon and the
    // rest — live in the passage_structure task tree, and the parent is often a
    // pending stub whose children carry the sections.
    const task = await this.taskByStepType(surahId, passageNo, 'passage_structure');

    if (!rendering && units.length === 0 && buildup.length === 0 && !task) return null;

    return {
      step: 'passage_structure',
      task: task ?? null,
      surah: surahId,
      passage: passageNo,
      ayahFrom: p.ayah_from,
      ayahTo: p.ayah_to,
      rendering,
      units,
      buildup: buildup.map((b) => ({ ...b, fork: undefined })),
      nuances: nuances.map((n) => ({ ...n, fork: parseJson(n.fork as string | null) })),
      decisions: decisions.map((d) => ({
        ...d,
        rendered: parseJson(d.rendered as string | null),
        rationale: parseJson(d.rationale as string | null),
      })),
    };
  }

  async expressionsStep(surahId: number, passageNo: number, al: AlClient | null) {
    const passages = await this._passages(surahId);
    const p = passages.find((x) => x.passage_no === passageNo);
    if (!p) return null;

    let items: unknown[] = [];
    if (al) {
      try {
        const res = await al.getExpressionsByQuran(surahId, p.ayah_from, p.ayah_to);
        items = res.data ?? [];
      } catch {
        items = [];
      }
    }
    return {
      step: 'expressions',
      surah: surahId,
      passage: passageNo,
      ayahFrom: p.ayah_from,
      ayahTo: p.ayah_to,
      items,
    };
  }

  async sentenceStructureStep(surahId: number, passageNo: number) {
    const passages = await this._passages(surahId);
    const passage  = passages.find((x) => x.passage_no === passageNo);
    if (!passage) return null;
    const { surah_id: surah, ayah_from: from, ayah_to: to } = passage;

    const sentProbe = await query<{ id: string }>(
      this.db,
      `SELECT id FROM qr_ss_occ_sentence
        WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ? LIMIT 1`,
      [surah, from, to],
    ).catch(() => []);
    if (!sentProbe.length) {
      return {
        step: 'sentence_structure', surah, passage: passageNo,
        ayahFrom: from, ayahTo: to,
        termColors: {}, terms: [], sentences: [],
      };
    }

    const [sentRows, clauseRows, wordRows, irabRows, balaghaRows, ellipsisRows, tafsirRows, treeRows, nodeRows, termRows, irabAyahRows, grammarRows, readingRows, foldRows, sarfRows] =
      await Promise.all([
        query<{ id: string; ayah_from: number; ayah_to: number; word_start_index: number | null;
                word_end_index: number | null; sentence_kind: string | null;
                discourse_role: string | null; note_md: string | null;
                gt_sentence_class: string | null; gt_kalam_kind: string | null;
                gt_sentence_role: string | null }>(
          this.db,
          `SELECT id, ayah_from, ayah_to, word_start_index, word_end_index,
                  sentence_kind, discourse_role, note_md,
                  -- A sentence is classified on three different questions:
                  -- what it is BUILT from (اسمية / فعلية / شرطية), what it
                  -- DOES (خبرية / إنشائية، طلبي / غير طلبي), and where it SITS
                  -- in the iʿrāb (خبر، حال، صفة، مضاف إليه — or لا محل لها).
                  -- All three are GT ids.
                  gt_sentence_class, gt_kalam_kind, gt_sentence_role
           FROM qr_ss_occ_sentence
           WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ?
           ORDER BY ayah_from, COALESCE(word_start_index, 0)`,
          [surah, from, to],
        ).catch(() => []),
        query<{ id: string; sentence_id: string; parent_clause_id: string | null;
                clause_order: number; ayah_from: number; ayah_to: number;
                word_start_index: number | null; word_end_index: number | null;
                clause_type: string | null; clause_function: string | null;
                governing_particle: string | null; note_md: string | null }>(
          this.db,
          `SELECT id, sentence_id, parent_clause_id, clause_order, ayah_from, ayah_to,
                  word_start_index, word_end_index, clause_type, clause_function,
                  governing_particle, note_md
           FROM qr_ss_occ_clause
           WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ?
           ORDER BY ayah_from, clause_order`,
          [surah, from, to],
        ).catch(() => []),
        query<{ id: string; ayah: number; word_index: number; word_text: string;
                word_text_bare: string | null; root: string | null;
                lemma: string | null; pos: string | null }>(
          this.db,
          `SELECT id, ayah, word_index, word_text, word_text_bare, root, lemma, pos
           FROM qr_word_occurrence
           WHERE surah = ? AND ayah BETWEEN ? AND ?
           ORDER BY ayah, word_index`,
          [surah, from, to],
        ).catch(() => []),
        query<{ wid: string; ayah: number; source_slug: string; source_title: string | null;
                role: string | null; text: string | null }>(
          this.db,
          `SELECT e.word_occurrence_id AS wid, w.ayah, e.source_slug, e.source_title,
                  e.grammar_role_ar AS role, e.irab_text_ar AS text
           FROM qr_irab_book_entry e
           JOIN qr_word_occurrence w ON w.id = e.word_occurrence_id
           WHERE w.surah = ? AND w.ayah BETWEEN ? AND ? AND e.word_link_status = 'linked'
             AND (e.grammar_role_ar IS NOT NULL OR e.irab_text_ar IS NOT NULL)`,
          [surah, from, to],
        ).catch(() => []),
        query<{ scope_type: string; scope_id: string; ref: string | null;
                category: string | null; effect: string | null; note: string | null }>(
          this.db,
          `SELECT scope_type, scope_id, lx_balagha_ref AS ref,
                  balagha_category AS category, rhetorical_effect AS effect, note_md AS note
           FROM qr_ss_scope_balagha_link
           WHERE scope_id IN (SELECT id FROM qr_ss_occ_clause WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ?)
           UNION ALL
           SELECT scope_type, scope_id, lx_balagha_ref AS ref,
                  balagha_category AS category, rhetorical_effect AS effect, note_md AS note
           FROM qr_ss_scope_balagha_link
           WHERE scope_id IN (SELECT id FROM qr_ss_occ_sentence WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ?)`,

          [surah, from, to, surah, from, to],
        ).catch(() => []),
        query<{ sentence_id: string; scope_type: string | null; scope_id: string | null;
                ellipsis_type: string; elided_element: string; effect: string | null; note: string | null }>(
          this.db,
          `SELECT sentence_id, scope_type, scope_id, ellipsis_type, elided_element,
                  rhetorical_effect AS effect, note_md AS note
           FROM qr_ss_ellipsis_event
           WHERE sentence_id IN (SELECT id FROM qr_ss_occ_sentence WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ?)`,
          [surah, from, to],
        ).catch(() => []),
        query<{ ayah_from: number; ayah_to: number; scholar_id: string | null;
                work: string | null; text: string | null }>(
          this.db,
          `SELECT t.ayah_from, t.ayah_to, t.scholar_id, wk.title_ar AS work,
                  substr(t.content_ar, 1, 900) AS text
           FROM qr_tafsir_entry t
           LEFT JOIN qr_scholar_work wk ON wk.id = t.work_id
           WHERE t.surah = ? AND t.ayah_from <= ? AND t.ayah_to >= ?
             AND t.content_ar IS NOT NULL AND TRIM(t.content_ar) <> ''
           ORDER BY t.ayah_from`,
          [surah, to, from],
        ).catch(() => []),

        query<{ id: string; sentence_id: string; grounding: string | null; note_md: string | null }>(
          this.db,
          `SELECT t.id, t.sentence_id, t.grounding, t.note_md
           FROM qr_ss_tree t
           WHERE t.sentence_id IN (SELECT id FROM qr_ss_occ_sentence WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ?)`,
          [surah, from, to],
        ).catch(() => []),
        query<{ id: string; tree_id: string; parent_node_id: string | null; node_label: string;
                term_key: string | null; label_ar: string | null; note_md: string | null;
                word_occurrence_id: string | null; depth: number; node_order: number }>(
          this.db,
          `SELECT n.id, n.tree_id, n.parent_node_id, n.node_label,
                  -- 014 resolved every node's term onto gram_term_ref; the bare
                  -- term_key stays only as the fallback for a row it could not
                  -- place. Sending the resolved id is what lets the board name
                  -- and colour the node from the registry instead of printing
                  -- a bare mudaf_ilayh at a reader.
                  COALESCE(n.gram_term_ref, n.term_key) AS term_key, n.label_ar,
                  n.note_md, n.word_occurrence_id, n.depth, n.node_order
           FROM qr_ss_tree_node n
           WHERE n.tree_id IN (
             SELECT t.id FROM qr_ss_tree t
             WHERE t.sentence_id IN (SELECT id FROM qr_ss_occ_sentence WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ?))
           ORDER BY n.depth, n.node_order`,
          [surah, from, to],
        ).catch(() => []),

        query<{ id: string; term_key: string; category_key: string;
                parent_term_id: string | null;
                name_ar: string | null; name_en: string | null; name_ur: string | null;
                badge_color: string | null; sources: string | null }>(
          this.db,

          `SELECT g.id, g.term_key, g.category_key, g.parent_term_id,
                  g.name_ar, g.name_en, g.name_ur, g.badge_color,
                  (SELECT group_concat(s.source_slug, '|')
                     FROM ar_ling_gram_term_source s WHERE s.term_id = g.id) AS sources
             FROM ar_ling_gram_term g WHERE g.status = 'live'`,
          [],
        ).catch(() => []),

        query<{ ayah: number; source_slug: string; source_title: string | null;
                entry_order: number | null; phrase: string | null; role: string | null;
                gcase: string | null; mahal: string | null; text: string | null }>(
          this.db,
          `SELECT ayah_from AS ayah, source_slug, source_title, entry_order,
                  target_text_ar AS phrase, grammar_role_ar AS role,
                  grammar_case_ar AS gcase, mahal_ar AS mahal, irab_text_ar AS text
           FROM qr_irab_book_entry
           WHERE surah = ? AND ayah_from BETWEEN ? AND ?
             AND irab_text_ar IS NOT NULL AND TRIM(irab_text_ar) <> ''
           ORDER BY ayah_from, source_slug, entry_order`,
          [surah, from, to],
        ).catch(() => []),

        query<{ scope_type: string; scope_id: string; ref: string;
                note: string | null; gloss: string | null }>(
          this.db,
          `SELECT scope_type, scope_id, lx_grammar_ref AS ref,
                  COALESCE(application_note, note_md) AS note, gloss_json AS gloss
             FROM qr_ss_scope_grammar_link
            WHERE scope_id IN (SELECT id FROM qr_ss_occ_sentence WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ?)
            UNION ALL
           SELECT scope_type, scope_id, lx_grammar_ref AS ref,
                  COALESCE(application_note, note_md) AS note, gloss_json AS gloss
             FROM qr_ss_scope_grammar_link
            WHERE scope_id IN (SELECT id FROM qr_ss_occ_clause WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ?)
            UNION ALL
           SELECT scope_type, scope_id, lx_grammar_ref AS ref,
                  COALESCE(application_note, note_md) AS note, gloss_json AS gloss
             FROM qr_ss_scope_grammar_link
            WHERE scope_id IN (SELECT id FROM qr_word_occurrence WHERE surah = ? AND ayah BETWEEN ? AND ?)`,
          [surah, from, to, surah, from, to, surah, from, to],
        ).catch(() => []),

        query<{ id: string; scope_type: string; scope_id: string; type: string | null;
                ref: string | null; paradigm: string | null; en: string | null;
                ar: string | null; scholars: string | null; minority: number;
                contested: number; selected: number; witnesses: number | null;
                why: string | null }>(
          this.db,
          `SELECT r.id, r.scope_type, r.scope_id, r.reading_type AS type,
                  r.lx_reading_type_ref AS ref, r.paradigm_ref AS paradigm,
                  r.reading_text AS en, r.reading_text_ar AS ar,
                  r.scholar_ref AS scholars, r.is_minority AS minority,
                  r.is_contested AS contested, r.is_selected AS selected,
                  r.witness_count AS witnesses,
                  r.selection_rationale_json AS why
             FROM qr_ss_scope_reading r
            WHERE r.scope_id IN (SELECT id FROM qr_ss_occ_sentence WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ?)
               OR r.scope_id IN (SELECT id FROM qr_word_occurrence   WHERE surah = ? AND ayah BETWEEN ? AND ?)`,
          [surah, from, to, surah, from, to],
        ).catch(() => []),

        query<{ id: string; scope_id: string; seq: number; ayah_from: number; ayah_to: number;
                structural: string | null; fluent_en: string | null; fluent_ar: string | null;
                gloss: string | null; note_ar: string | null; synthesis: string | null;
                reading_ref: string | null; rejected: string | null }>(
          this.db,
          `SELECT id, scope_id, seq, ayah_from, ayah_to,
                  structural_literal_en AS structural, fluent_en, fluent_ar,
                  gloss_json AS gloss, decision_note_ar AS note_ar,
                  synthesis_md AS synthesis, reading_ref, rejected_readings_json AS rejected
             FROM qr_ss_translation_unit
            WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ? AND status = 'live'
            ORDER BY ayah_from, seq`,
          [surah, from, to],
        ).catch(() => []),
        query<{ scope_type: string; scope_id: string; ref: string;
                fn: string | null; position: string | null; sign: string | null;
                disputed: number; dispute: string | null; note: string | null }>(
          this.db,
          `SELECT m.scope_type, m.scope_id, m.lx_morph_ref AS ref,
                  m.syntactic_function AS fn, m.irab_position AS position,
                  m.irab_sign AS sign, m.is_disputed AS disputed,
                  m.dispute_note AS dispute, m.note_md AS note
             FROM qr_ss_scope_morph_link m
            WHERE m.scope_id IN (SELECT id FROM qr_word_occurrence WHERE surah = ? AND ayah BETWEEN ? AND ?)`,
          [surah, from, to],
        ).catch(() => []),
      ]);

    const irabByWord = new Map<string, { book: string; role: string | null; text: string | null }[]>();
    for (const e of irabRows) {
      const list = irabByWord.get(e.wid) ?? [];
      list.push({ book: e.source_title ?? IRAB_BOOKS[e.source_slug] ?? e.source_slug, role: e.role, text: e.text });
      irabByWord.set(e.wid, list);
    }
    const primaryRole = (wid: string): string | null => {
      const list = irabByWord.get(wid);
      if (!list?.length) return null;
      const tally = new Map<string, number>();
      for (const r of list) if (r.role) tally.set(r.role, (tally.get(r.role) ?? 0) + 1);
      let best: string | null = null, bestN = 0;
      for (const [role, n] of tally) if (n > bestN) { best = role; bestN = n; }
      return best;
    };

    const wordByPos = new Map<string, typeof wordRows[number]>();
    for (const w of wordRows) wordByPos.set(`${w.ayah}:${w.word_index}`, w);

    const buildWord = (w: typeof wordRows[number]) => ({
      wordId: w.id,
      ayah:   w.ayah,
      index:  w.word_index,
      text:   w.word_text,
      simple: w.word_text_bare ?? undefined,
      root:   w.root ?? undefined,
      lemma:  w.lemma ?? undefined,
      pos:    w.pos ?? undefined,
      role:   primaryRole(w.id),
      irab:   irabByWord.get(w.id) ?? [],
    });

    const nodesByTree = new Map<string, typeof nodeRows>();
    for (const n of nodeRows) {
      const list = nodesByTree.get(n.tree_id) ?? [];
      list.push(n);
      nodesByTree.set(n.tree_id, list);
    }
    const buildConstituency = (treeId: string): SsConstituencyNode | null => {
      const ns = nodesByTree.get(treeId);
      if (!ns?.length) return null;
      const byId = new Map<string, SsConstituencyNode>();
      let root: SsConstituencyNode | null = null;
      for (const n of ns) {
        byId.set(n.id, {
          name: n.node_label, id: n.id, term_id: n.term_key ?? undefined,
          label_ar: n.label_ar ?? undefined, note: n.note_md ?? undefined,
          word_id: n.word_occurrence_id ?? undefined, children: [],
        });
      }
      for (const n of ns) {
        const node = byId.get(n.id)!;
        if (n.parent_node_id && byId.get(n.parent_node_id)) byId.get(n.parent_node_id)!.children!.push(node);
        else root = root ?? node;
      }
      return root;
    };

    const treesBySentence = new Map<string, { id: string; node: SsConstituencyNode | null; grounding: string | null }[]>();
    for (const t of [...treeRows].sort((a, b) => a.id.localeCompare(b.id))) {
      const list = treesBySentence.get(t.sentence_id) ?? [];
      list.push({ id: t.id, node: buildConstituency(t.id), grounding: t.grounding ?? null });
      treesBySentence.set(t.sentence_id, list);
    }

    const clausesBySentence = new Map<string, typeof clauseRows>();
    for (const c of clauseRows) {
      const list = clausesBySentence.get(c.sentence_id) ?? [];
      list.push(c);
      clausesBySentence.set(c.sentence_id, list);
    }
    const buildClauseTree = (sentenceId: string, sentenceAyah: number) => {
      const cs = clausesBySentence.get(sentenceId) ?? [];
      const byId = new Map<string, SsClauseNode>();
      for (const c of cs) {
        const words = [] as ReturnType<typeof buildWord>[];
        if (c.word_start_index != null && c.word_end_index != null) {
          for (let i = c.word_start_index; i <= c.word_end_index; i++) {
            const w = wordByPos.get(`${c.ayah_from}:${i}`);
            if (w) words.push(buildWord(w));
          }
        }
        byId.set(c.id, {
          id: c.id, order: c.clause_order, depth: 0,
          type: c.clause_type ?? undefined, function: c.clause_function ?? undefined,
          particle: c.governing_particle ?? undefined, note: c.note_md ?? undefined,
          words, children: [],
        });
      }
      const roots: SsClauseNode[] = [];
      for (const c of cs) {
        const node = byId.get(c.id)!;
        if (c.parent_clause_id && byId.get(c.parent_clause_id)) byId.get(c.parent_clause_id)!.children.push(node);
        else roots.push(node);
      }
      const setDepth = (n: SsClauseNode, d: number) => { n.depth = d; n.children.forEach((k) => setDepth(k, d + 1)); };
      roots.forEach((r) => setDepth(r, 0));
      return roots;
    };

    const balaghaByScope = new Map<string, { category: string | null; effect: string | null; note: string | null; ref: string | null }[]>();
    for (const b of balaghaRows) {
      const list = balaghaByScope.get(b.scope_id) ?? [];
      list.push({ category: b.category, effect: b.effect, note: b.note, ref: b.ref });
      balaghaByScope.set(b.scope_id, list);
    }
    const ellipsisBySentence = new Map<string, { type: string; elided: string; effect: string | null; note: string | null }[]>();
    for (const e of ellipsisRows) {
      const list = ellipsisBySentence.get(e.sentence_id) ?? [];
      list.push({ type: e.ellipsis_type, elided: e.elided_element, effect: e.effect, note: e.note });
      ellipsisBySentence.set(e.sentence_id, list);
    }

    const irabAyahByAyah = new Map<number, { book: string; phrase: string | null; role: string | null;
                                             case: string | null; mahal: string | null; text: string | null }[]>();
    for (const e of irabAyahRows) {
      const list = irabAyahByAyah.get(e.ayah) ?? [];
      list.push({
        book:  e.source_title ?? IRAB_BOOKS[e.source_slug] ?? e.source_slug,
        phrase: e.phrase, role: e.role, case: e.gcase, mahal: e.mahal, text: e.text,
      });
      irabAyahByAyah.set(e.ayah, list);
    }

    const tafsirByAyah = new Map<number, { work: string | null; scholar: string | null; text: string | null }[]>();
    for (const t of tafsirRows) {
      const lo = Math.max(t.ayah_from, from), hi = Math.min(t.ayah_to, to);
      for (let a = lo; a <= hi; a++) {
        const list = tafsirByAyah.get(a) ?? [];
        list.push({ work: t.work, scholar: t.scholar_id, text: t.text });
        tafsirByAyah.set(a, list);
      }
    }

    const sentences: unknown[] = [];
    for (const s of sentRows) {
      const clauseIds = (clausesBySentence.get(s.id) ?? []).map((c) => c.id);
      const balagha = [
        ...(balaghaByScope.get(s.id) ?? []),
        ...clauseIds.flatMap((cid) => balaghaByScope.get(cid) ?? []),
      ];
      const base = {
        ayah:      s.ayah_from,
        ayahTo:    s.ayah_to,
        kind:      s.sentence_kind ?? null,
        mode:      parseDiscourseMode(s.note_md),

        sentenceClassRef: s.gt_sentence_class ?? null,
        kalamKindRef:     s.gt_kalam_kind ?? null,
        sentenceRoleRef:  s.gt_sentence_role ?? null,
        note:      stripModePrefix(s.note_md),
        clauseTree: buildClauseTree(s.id, s.ayah_from),
        irabAnalysis: irabAyahByAyah.get(s.ayah_from) ?? [],
        balagha,
        ellipsis:  ellipsisBySentence.get(s.id) ?? [],
        tafsir:    tafsirByAyah.get(s.ayah_from) ?? [],
      };
      const trees = treesBySentence.get(s.id) ?? [];
      if (trees.length) {
        trees.forEach((t, i) => sentences.push({
          ...base,
          id: trees.length > 1 ? `${s.id}#${i + 1}` : s.id,
          grounding: t.grounding ?? 'authored',
          tree: t.node,
        }));
      } else {
        sentences.push({
          ...base,
          id: s.id,
          grounding: irabRows.length ? 'irab' : null,
          tree: null,
        });
      }
    }

    interface ScopeLayers {
      nahw:    { ref: string; note: string | null; gloss: unknown }[];
      balagha: { ref: string | null; category: string | null; effect: string | null; note: string | null }[];
      irab:    { ref: string; fn: string | null; position: string | null; sign: string | null;
                 disputed: boolean; dispute: string | null; note: string | null }[];
    }
    const layersByScope: Record<string, ScopeLayers> = {};
    const layersFor = (scopeId: string): ScopeLayers =>
      (layersByScope[scopeId] ??= { nahw: [], balagha: [], irab: [] });

    for (const g of grammarRows) {
      layersFor(g.scope_id).nahw.push({
        ref: g.ref, note: g.note, gloss: parseJson(g.gloss),
      });
    }
    for (const b of balaghaRows) {
      layersFor(b.scope_id).balagha.push({
        ref: b.ref, category: b.category, effect: b.effect, note: b.note,
      });
    }
    for (const m of sarfRows) {
      layersFor(m.scope_id).irab.push({
        ref: m.ref, fn: m.fn, position: m.position, sign: m.sign,
        disputed: !!m.disputed, dispute: m.dispute, note: m.note,
      });
    }

    const readings = readingRows.map((r) => ({
      id: r.id,
      scopeType: r.scope_type,
      scopeId: r.scope_id,
      question: r.type,
      ref: r.ref,
      paradigm: r.paradigm,
      en: r.en,
      ar: r.ar,

      sources: (r.scholars ?? '').split(';').map((x) => x.trim()).filter(Boolean),
      isMinority: !!r.minority,
      isContested: !!r.contested,
      isSelected: !!r.selected,
      witnesses: r.witnesses ?? null,
      why: parseJson(r.why),
    }));

    const fold = foldRows.map((f) => ({
      id: f.id,
      scopeId: f.scope_id,
      seq: f.seq,
      ayah: f.ayah_from,
      ayahTo: f.ayah_to,
      structural: f.structural,
      fluentEn: f.fluent_en,
      fluentAr: f.fluent_ar,
      gloss: parseJson(f.gloss),
      noteAr: f.note_ar,

      synthesis: f.synthesis,
      readingRef: f.reading_ref,
      rejected: parseJson(f.rejected),
    }));

    const termColors: Record<string, string> = {};
    const terms = termRows.map((t) => {
      if (t.badge_color) {
        termColors[t.id] = t.badge_color;
        termColors[t.term_key] = t.badge_color;
      }
      return {
        key: t.term_key, ref: t.id, category: t.category_key,
        parentRef: t.parent_term_id,
        labelAr: t.name_ar, labelEn: t.name_en, labelUr: t.name_ur,
        color: t.badge_color,

        sources: (t.sources ?? '').split('|').filter(Boolean),
      };
    });

    return {
      step:      'sentence_structure',
      surah,
      passage:   passageNo,
      ayahFrom:  from,
      ayahTo:    to,
      termColors,
      terms,
      layersByScope,
      readings,
      fold,
      sentences,
    };
  }

  async stepData(
    surahId: number,
    passageNo: number,
    stepType: string,
    al: AlClient | null = null,
  ): Promise<unknown> {
    switch (stepType) {
      case 'reading':       return this.readingStep(surahId, passageNo);

      case 'vocabulary':
      case 'morphology':    return this.morphologyStep(surahId, passageNo);
      case 'tafsir':
      case 'comprehension': return this.comprehensionStep(surahId, passageNo);
      case 'expressions':   return this.expressionsStep(surahId, passageNo, al);
      case 'sentence_structure': return this.sentenceStructureStep(surahId, passageNo);
      case 'passage_structure':  return this.passageStructureStep(surahId, passageNo);
      default: {
        const task = await this.taskByStepType(surahId, passageNo, stepType);
        if (task === null) return null;
        if (task === undefined) return undefined;
        return { step: stepType, source: 'tasks', task };
      }
    }
  }

  async passageMorphology(surahId: number, passageNo: number): Promise<PassageMorphology | null> {
    const passages = await this._passages(surahId);
    const passage = passages.find(p => p.passage_no === passageNo);
    if (!passage) return null;

    const cards = await this._buildWordCards(surahId, passage.ayah_from, passage.ayah_to);
    const roots = [...new Set(cards.map(c => c.root).filter((r): r is string => !!r))];

    return {
      surah: surahId,
      passage_no: passage.passage_no,
      ayah_from: passage.ayah_from,
      ayah_to: passage.ayah_to,
      label: passage.title ?? null,
      words: cards,
      roots,
    };
  }

  async wordById(wordId: string): Promise<WordCard | null> {
    const rows = await query<WordOccRow>(
      this.db,
      `SELECT id, surah, ayah, word_index, word_text, word_text_bare, root, lemma, pos, morphology_tag_json
       FROM qr_word_occurrence WHERE id = ?`,
      [wordId],
    ).catch(() => []);
    if (!rows.length) return null;
    const cards = await this._buildWordCards(rows[0].surah, rows[0].ayah, rows[0].ayah, wordId);
    return cards.find(c => c.word_id === wordId) ?? cards[0] ?? null;
  }

  async ayahContext(surah: number, ayah: number): Promise<{ ayah: number; text: string | null; translation: string | null }> {
    const [a] = await query<{ text: string | null }>(
      this.db,
      `SELECT COALESCE(text_uthmani_clean, text_uthmani, text_bare, text) AS text
       FROM qr_ayah WHERE surah = ? AND ayah = ? LIMIT 1`,
      [surah, ayah],
    ).catch(() => [] as { text: string | null }[]);
    const [t] = await query<{ text: string | null }>(
      this.db,
      `SELECT tr.translation_text AS text
       FROM qr_translation tr JOIN qr_translation_source ts ON ts.id = tr.source_id
       WHERE ts.is_default = 1 AND tr.surah = ? AND tr.ayah = ? LIMIT 1`,
      [surah, ayah],
    ).catch(() => [] as { text: string | null }[]);
    return { ayah, text: a?.text ?? null, translation: t?.text ?? null };
  }

  async tafsirForAyah(surah: number, ayah: number): Promise<{ scholar_id: string; snippet: string }[]> {
    const rows = await query<{ scholar_id: string; content_ar: string | null }>(
      this.db,
      `SELECT scholar_id, substr(content_ar, 1, 300) AS content_ar
       FROM qr_tafsir_entry
       WHERE surah = ? AND ayah_from <= ? AND ayah_to >= ?
       ORDER BY scholar_id`,
      [surah, ayah, ayah],
    ).catch(() => []);
    return rows
      .filter(r => !!r.content_ar)
      .map(r => ({ scholar_id: r.scholar_id, snippet: (r.content_ar ?? '').trim() }));
  }

  private async _buildWordCards(
    surahId: number,
    ayahFrom: number,
    ayahTo: number,
    onlyWordId?: string,
  ): Promise<WordCard[]> {
    const [words, terms, sml, segs, lemmas] = await Promise.all([
      query<WordOccRow>(
        this.db,
        `SELECT id, surah, ayah, word_index, word_text, word_text_bare, root, lemma, pos, morphology_tag_json
         FROM qr_word_occurrence
         WHERE surah = ? AND ayah BETWEEN ? AND ?
         ORDER BY ayah, word_index`,
        [surahId, ayahFrom, ayahTo],
      ).catch(() => [] as WordOccRow[]),

      query<{ term_key: string; label_ar: string | null; color: string | null }>(
        this.db,
        `SELECT id AS term_key, name_ar AS label_ar, badge_color AS color
           FROM ar_ling_gram_term WHERE status = 'live'
          UNION ALL
         SELECT term_key, name_ar, badge_color
           FROM ar_ling_gram_term WHERE status = 'live'`,
      ).catch(() => []),
      query<SmlRow>(
        this.db,
        `SELECT id, scope_id, lx_morph_ref, irab_position, irab_sign, syntactic_function,
                is_disputed, dispute_note, note_md
         FROM qr_ss_scope_morph_link WHERE id LIKE ?`,
        [`QR:SML:${surahId}:%`],
      ).catch(() => []),
      query<SegRow>(
        this.db,
        `SELECT word_occurrence_id, segment_index, segment_text, segment_type
         FROM qr_ss_occ_segment
         WHERE surah = ? AND ayah BETWEEN ? AND ?
         ORDER BY word_occurrence_id, segment_index`,
        [surahId, ayahFrom, ayahTo],
      ).catch(() => []),
      query<{ word_occurrence_id: string; total_occurrences: number; lx_lemma_ref: string | null }>(
        this.db,
        `SELECT lo.word_occurrence_id, l.total_occurrences, l.lx_lemma_ref
         FROM qr_lemma_occurrence lo JOIN qr_lemma l ON l.id = lo.lemma_id
         WHERE lo.surah = ? AND lo.ayah BETWEEN ? AND ?`,
        [surahId, ayahFrom, ayahTo],
      ).catch(() => []),
    ]);

    const termMap = new Map<string, TermRef>(
      terms.map(t => [t.term_key, { key: t.term_key, label_ar: t.label_ar, color: t.color }]),
    );
    const smlByScope = new Map<string, SmlRow>(sml.map(r => [r.scope_id, r]));
    const segsByWord = new Map<string, SegRow[]>();
    for (const s of segs) {
      if (!segsByWord.has(s.word_occurrence_id)) segsByWord.set(s.word_occurrence_id, []);
      segsByWord.get(s.word_occurrence_id)!.push(s);
    }
    const lemmaByWord = new Map(lemmas.map(l => [l.word_occurrence_id, l]));

    const source = onlyWordId ? words.filter(w => w.id === onlyWordId) : words;

    return source.map((w): WordCard => {
      const qac = parseQacMorphology(w.morphology_tag_json);
      const smlRow = smlByScope.get(w.id) ?? null;
      const irab: WordIrab | null = smlRow
        ? {
            position: smlRow.irab_position,
            position_ar: smlRow.irab_position ? (IRAB_POS_AR[smlRow.irab_position] ?? null) : null,
            sign: smlRow.irab_sign,
            sign_ar: smlRow.irab_sign ? (IRAB_SIGN_AR[smlRow.irab_sign] ?? null) : null,
            syntactic_function: smlRow.syntactic_function,
            is_disputed: !!smlRow.is_disputed,
            dispute_note: smlRow.dispute_note,
            sources: sourcesFromNote(smlRow.note_md),
            term: termOf(termMap, stripTermPrefix(smlRow.lx_morph_ref) ?? smlRow.syntactic_function),
          }
        : null;
      const segments: WordSegment[] = (segsByWord.get(w.id) ?? []).map(s => ({
        index: Number(s.segment_index),
        text: s.segment_text,
        type: s.segment_type,
        term: termOf(termMap, s.segment_type),
      }));
      const ls = lemmaByWord.get(w.id);
      return {
        word_id: w.id,
        sml_id: smlRow?.id ?? null,
        surah: Number(w.surah),
        ayah: Number(w.ayah),
        word_index: Number(w.word_index),
        surface_ar: w.word_text,
        surface_bare: w.word_text_bare,
        lemma_ar: w.lemma,
        root: w.root,
        pos: w.pos,
        group: qacPosGroup(w.pos),
        qac,
        irab,
        segments,
        lemma_stats: ls ? { total_occurrences: Number(ls.total_occurrences), lx_lemma_ref: ls.lx_lemma_ref } : null,
      };
    });
  }

  private async _passages(surahId: number): Promise<PassageRow[]> {
    const rows = await query<PassageRow>(
      this.db,
      `SELECT p.id, p.surah AS surah_id, p.passage_no, p.ayah_from, p.ayah_to,
              COALESCE(p.title_en, p.label) AS title,
              p.theme, p.status,
              s.name_ar, s.name_en
       FROM qr_surah_study_passage p
       LEFT JOIN qr_surah s ON s.id = p.surah
       WHERE p.surah = ? AND p.status != 'deleted'
       ORDER BY p.passage_no`,
      [surahId],
    );
    return rows.map(r => ({
      ...r,
      passage_no: Number(r.passage_no),
      ayah_from:  Number(r.ayah_from),
      ayah_to:    Number(r.ayah_to),
      surah_id:   Number(r.surah_id),
    }));
  }

  private async _tasks(passageId: string): Promise<StudyTask[]> {
    const rows = await query<RawTaskRow>(
      this.db,
      `SELECT t.id            AS task_id,
              t.parent_task_id,
              t.task_type,
              t.task_name     AS task_key,
              t.step_no       AS display_order,
              t.status,
              t.task_json     AS payload_json,
              t.updated_at
       FROM qr_surah_study_task t
       WHERE t.passage_id = ?
       ORDER BY t.parent_task_id NULLS FIRST, COALESCE(t.step_no, 99999), t.id`,
      [passageId],
    ).catch(() => []);

    const chunks = await query<{ task_id: string; chunk_index: number; chunk_text: string }>(
      this.db,
      `SELECT task_id, chunk_index, chunk_text
       FROM qr_surah_study_task_chunk
       WHERE passage_id = ?
       ORDER BY task_id, chunk_index`,
      [passageId],
    ).catch(() => []);

    if (chunks.length) {
      const byTask = new Map<string, string[]>();
      for (const c of chunks) {
        if (!byTask.has(c.task_id)) byTask.set(c.task_id, []);
        byTask.get(c.task_id)!.push(c.chunk_text);
      }
      for (const row of rows) {
        const parts = byTask.get(row.task_id);
        if (parts?.length) row.payload_json = parts.join('');
      }
    }

    return buildTaskTree(rows);
  }

  private async _ayahs(passage: PassageRow) {
    const [ayahs, translations, words] = await Promise.all([
      query<{
        surah: number; ayah: number; page: number | null;
        juz: number | null; hizb: number | null; ruku: number | null;
        verse_mark: string | null;
        text_uthmani: string | null; text_clean: string | null; text_bare: string | null;
      }>(
        this.db,

        `SELECT surah, ayah, page_number AS page, juz, hizb, ruku, verse_mark,
                text_uthmani, text_uthmani_clean AS text_clean, text_bare
         FROM qr_ayah
         WHERE surah = ? AND ayah BETWEEN ? AND ?
         ORDER BY ayah`,
        [passage.surah_id, passage.ayah_from, passage.ayah_to],
      ),
      query<{ ayah: number; text: string }>(
        this.db,
        `SELECT t.ayah, t.translation_text AS text
         FROM qr_translation t
         JOIN qr_translation_source ts ON ts.id = t.source_id
         WHERE ts.is_default = 1
           AND t.surah = ? AND t.ayah BETWEEN ? AND ?
         ORDER BY t.ayah`,
        [passage.surah_id, passage.ayah_from, passage.ayah_to],
      ),

      query<{
        ayah: number; position: number;
        text: string; simple: string | null;
        lemma: string | null; root: string | null; pos: string | null;
      }>(
        this.db,
        `SELECT ayah, word_index AS position,
                word_text AS text, word_text_bare AS simple,
                lemma, root, pos
         FROM qr_word_occurrence
         WHERE surah = ? AND ayah BETWEEN ? AND ?
         ORDER BY ayah, word_index`,
        [passage.surah_id, passage.ayah_from, passage.ayah_to],
      ),
    ]);

    const transByAyah = new Map(translations.map(t => [t.ayah, t.text]));

    const wordsByAyah = new Map<number, AyahWordToken[]>();
    for (const w of words) {
      const list = wordsByAyah.get(w.ayah) ?? [];
      list.push({
        position:  w.position,
        text:      w.text,
        simple:    w.simple ?? undefined,
        char_type: 'word',
        lemma:     w.lemma ?? undefined,
        root:      w.root ?? undefined,
        pos:       w.pos ?? undefined,
      });
      wordsByAyah.set(w.ayah, list);
    }

    return ayahs.map(a => {
      const diacritic = a.text_clean ?? a.text_uthmani ?? a.text_bare ?? '';
      return {
        surah:       a.surah,
        ayah:        a.ayah,
        surah_ayah:  `${a.surah}:${a.ayah}`,
        page:        a.page,
        juz:         a.juz,
        hizb:        a.hizb,
        ruku:        a.ruku,
        verse_mark:  a.verse_mark,
        text:        diacritic,
        text_simple: a.text_bare ?? undefined,
        text_arabic: diacritic,
        words:       wordsByAyah.get(a.ayah) ?? [],
        translation: transByAyah.get(a.ayah) ?? null,
      };
    });
  }

  private async _wordsAsVocabulary(passage: PassageRow) {
    const rows = await query<{
      word_id: string; ayah: number; position: number;
      word: string; simple: string | null;
      lemma: string | null; root: string | null; pos: string | null;
    }>(
      this.db,
      `SELECT id            AS word_id,
              ayah,
              word_index    AS position,
              word_text     AS word,
              word_text_bare AS simple,
              lemma,
              root,
              pos
       FROM qr_word_occurrence
       WHERE surah = ? AND ayah BETWEEN ? AND ?
       ORDER BY ayah, word_index`,
      [passage.surah_id, passage.ayah_from, passage.ayah_to],
    );

    return {
      nouns: rows.filter(w => posGroup(w.pos) === 'noun'),
      verbs: rows.filter(w => posGroup(w.pos) === 'verb'),
    };
  }

  private async _taskTypeFlags(surahId: number): Promise<Map<string, Set<string>>> {
    const rows = await query<{ passage_id: string; task_type: string }>(
      this.db,
      `SELECT t.passage_id, t.task_type
       FROM qr_surah_study_task t
       JOIN qr_surah_study_passage p ON p.id = t.passage_id
       WHERE p.surah = ?
       GROUP BY t.passage_id, t.task_type`,
      [surahId],
    ).catch(() => []);

    const out = new Map<string, Set<string>>();
    for (const r of rows) {
      let set = out.get(r.passage_id);
      if (!set) { set = new Set<string>(); out.set(r.passage_id, set); }
      set.add(r.task_type);
    }
    return out;
  }

  private async _dataFlags(
    surahId: number,
    passages: PassageRow[],
  ): Promise<Map<string, Set<string>>> {
    const out = new Map<string, Set<string>>();
    if (!passages.length) return out;

    const spans = await Promise.all([
      query<{ ayah_from: number; ayah_to: number }>(
        this.db,
        `SELECT DISTINCT ayah_from, ayah_to FROM qr_ss_occ_sentence WHERE surah = ?`,
        [surahId],
      ).catch(() => []).then(rows => ['sentence_structure', rows] as const),
      query<{ ayah_from: number; ayah_to: number }>(
        this.db,
        `SELECT DISTINCT ayah_from, ayah_to FROM qr_tafsir_entry WHERE surah = ?`,
        [surahId],
      ).catch(() => []).then(rows => ['tafsir', rows] as const),

      query<{ ayah_from: number; ayah_to: number }>(
        this.db,
        `SELECT DISTINCT ayah AS ayah_from, ayah AS ayah_to
           FROM qr_word_occurrence WHERE surah = ?`,
        [surahId],
      ).catch(() => []).then(rows => ['reading', rows] as const),
    ]);

    for (const p of passages) {
      const steps = new Set<string>();
      for (const [step, rows] of spans) {

        if (rows.some(r => r.ayah_from <= p.ayah_to && r.ayah_to >= p.ayah_from)) {
          steps.add(step);
        }
      }
      out.set(p.id, steps);
    }
    return out;
  }

  private async _wordCounts(
    surahId: number,
    passages: PassageRow[],
  ): Promise<Map<string, { total: number; nouns: number; verbs: number }>> {
    const out = new Map<string, { total: number; nouns: number; verbs: number }>();
    if (!passages.length) return out;

    const rows = await query<{ ayah: number; total: number; nouns: number; verbs: number }>(
      this.db,
      `SELECT ayah,
              COUNT(*) AS total,
              SUM(CASE WHEN LOWER(COALESCE(pos, '')) = 'noun' THEN 1 ELSE 0 END) AS nouns,
              SUM(CASE WHEN LOWER(COALESCE(pos, '')) = 'verb' THEN 1 ELSE 0 END) AS verbs
       FROM qr_word_occurrence
       WHERE surah = ?
       GROUP BY ayah`,
      [surahId],
    ).catch(() => []);

    for (const p of passages) {
      const counts = { total: 0, nouns: 0, verbs: 0 };
      for (const r of rows) {
        if (r.ayah < p.ayah_from || r.ayah > p.ayah_to) continue;
        counts.total += Number(r.total);
        counts.nouns += Number(r.nouns);
        counts.verbs += Number(r.verbs);
      }
      out.set(p.id, counts);
    }
    return out;
  }
}

const IRAB_BOOKS: Record<string, string> = {
  qul_irab_muyassar:    'الإعراب الميسر',
  qul_jadwal_irab_quran:'الجدول في إعراب القرآن (صافي)',
  qul_irab_quran_daas:  'إعراب القرآن للدعّاس',
  qul_irab_darwish:     'إعراب القرآن وبيانه (درويش)',
  tibyan_ukbari_irab:   'التبيان في إعراب القرآن (العكبري)',
};

const ROMAN = new Set(['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII']);
const ASPECT: Record<string, string> = { PERF: 'perfect', IMPF: 'imperfect', IMPV: 'imperative' };
const CASE:   Record<string, string> = { NOM: 'nominative', GEN: 'genitive', ACC: 'accusative' };
const GENDER: Record<string, string> = { M: 'masculine', F: 'feminine' };
const NUMBER: Record<string, string> = { S: 'singular', D: 'dual', P: 'plural' };

export interface MorphFeatures {
  aspect?: string;
  verb_form?: string;
  grammatical_case?: string;
  gender?: string;
  number_base?: string;
  person?: string;
  raw?: string;
}

export function parseQacTag(raw: string | null | undefined): MorphFeatures {
  if (!raw) return {};
  const out: MorphFeatures = { raw };
  for (const part of raw.split('|')) {
    const tok = part.trim();
    if (!tok) continue;
    if (ASPECT[tok]) out.aspect = ASPECT[tok];
    else if (CASE[tok]) out.grammatical_case = CASE[tok];
    else if (tok.startsWith('(') && tok.endsWith(')') && ROMAN.has(tok.slice(1, -1))) {
      out.verb_form = tok.slice(1, -1);
    } else {

      const m = /^([123])?([MF])([SDP])?$/.exec(tok);
      if (m) {
        if (m[1]) out.person = m[1];
        out.gender = GENDER[m[2]];
        if (m[3]) out.number_base = NUMBER[m[3]];
      }
    }
  }
  return out;
}

export function posGroup(pos: string | null | undefined): 'noun' | 'verb' | 'particle' {
  const p = (pos ?? '').toUpperCase();
  if (p === 'V') return 'verb';
  if (p === 'N' || p === 'PN' || p === 'ADJ') return 'noun';
  return 'particle';
}

export function parseDiscourseMode(note: string | null | undefined): string | null {
  if (!note) return null;
  const m = /^\s*Mode:\s*([^.\n]+)\.?/i.exec(note);
  return m ? m[1].trim() : null;
}

export function stripModePrefix(note: string | null | undefined): string | null {
  if (!note) return null;
  return note.replace(/^\s*Mode:\s*[^.\n]+\.?\s*/i, '').trim() || null;
}

export function buildTaskTree(rows: RawTaskRow[]): StudyTask[] {
  const byId  = new Map<string, StudyTask>();
  const roots: StudyTask[] = [];

  for (const row of rows) {
    if (!row.task_id) continue;
    byId.set(row.task_id, {
      task_id:       row.task_id,
      parent_task_id: asStr(row.parent_task_id),
      task_type:     String(row.task_type ?? ''),
      task_name:     asStr(row.task_key),
      display_order: asNum(row.display_order),
      status:        asStr(row.status),
      task_json:     parseJson(row.payload_json),
      updated_at:    asStr(row.updated_at),
      children:      [],
    });
  }

  for (const task of byId.values()) {
    if (task.parent_task_id && byId.has(task.parent_task_id)) {
      byId.get(task.parent_task_id)!.children.push(task);
    } else {
      roots.push(task);
    }
  }

  for (const task of byId.values()) {
    if (task.children.length) task.children = sortTasks(task.children);
  }

  return sortTasks(roots);
}

export function vocabularyFromMorphology(
  tasks: StudyTask[],
): { nouns: JsonRecord[]; verbs: JsonRecord[] } {
  const morph = tasks.find(t => t.task_type === 'morphology');
  if (!morph) return { nouns: [], verbs: [] };

  const payloads = [morph.task_json, ...(morph.children ?? []).map(c => c.task_json)];
  const items = payloads.flatMap(payload => {
    const rec     = asRec(parseJson(payload));
    const direct  = rec && Array.isArray(rec['items'])             ? rec['items']             : [];
    const lexicon = rec && Array.isArray(rec['lexicon_morphology']) ? rec['lexicon_morphology'] : [];
    return [...direct, ...lexicon].filter(
      (e): e is JsonRecord => !!e && typeof e === 'object' && !Array.isArray(e),
    );
  });

  return {
    nouns: items.filter(i => asStr(i['pos'])?.toLowerCase() === 'noun'),
    verbs: items.filter(i => asStr(i['pos'])?.toLowerCase() === 'verb'),
  };
}

export function expressionsFromTasks(tasks: StudyTask[]): JsonRecord[] {
  const expTask = tasks.find(t => t.task_type === 'expressions');
  if (!expTask) return [];

  const payloads = [expTask.task_json, ...(expTask.children ?? []).map(c => c.task_json)];
  const rows: JsonRecord[] = [];

  for (const payload of payloads) {
    const rec   = asRec(parseJson(payload));
    const items = rec && Array.isArray(rec['u_expressions']) ? rec['u_expressions'] : [];
    for (const item of items) {
      const row = asRec(item);
      if (!row) continue;
      rows.push({
        expression_id:      asStr(row['ar_u_expression']) ?? asStr(row['expression_id']) ?? '',
        ayah:               Number(row['ayah'] ?? 0),
        label:              asStr(row['label']),
        text:               asStr(row['text_ar']) ?? asStr(row['text']),
        expression_type:    asStr(row['expression_type']),
        expression_meaning: asStr(row['expression_meaning']) ?? asStr(row['meaning']),
        gloss:              asStr(row['gloss_primary']) ?? asStr(row['gloss']),
      });
    }
  }

  return rows.sort((a, b) => Number(a.ayah ?? 0) - Number(b.ayah ?? 0));
}
