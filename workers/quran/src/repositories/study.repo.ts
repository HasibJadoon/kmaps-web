// ─── StudyRepo — Quran study grid and lesson data ──────────────────────────────
// Ports the previous Quran study implementation into the repository pattern.
// All SQL targets the deployed qr_* D1 schema.
//
// Tables: qr_surah_study_passage, qr_surah_study_step, qr_surah_study_task,
//         qr_surah_study_task_chunk, qr_word_occurrence, qr_ayah,
//         qr_surah, qr_translation, qr_translation_source

import { query } from '../../../shared/src/db';
import type { AlClient } from '../clients/al.client';
import { parseQacMorphology, posGroup as qacPosGroup, QacMorphology } from '../lib/qac-morph';

// ─── types ─────────────────────────────────────────────────────────────────────

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
  name_ar: string | null;   // from qr_surah join
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

// One reading token of an ayah, both script forms, sourced from
// qr_word_occurrence (not from any task_json payload).
export interface AyahWordToken {
  position: number;
  text: string;              // diacritic (harakāt)
  simple?: string;           // non-diacritic (plain)
  char_type: 'word' | 'end';
  lemma?: string;
  root?: string;
  pos?: string;
}

// Authored word-level constituency node (reassembled from qr_ss_tree_node).
export interface SsConstituencyNode {
  name:      string;                 // the Arabic text span
  id:        string;
  term_id?:  string;                 // GT: id — the registry names and colours it
  label_ar?: string;                 // grammatical role label, e.g. 'مبتدأ'
  note?:     string;
  word_id?:  string;                 // leaf → its word occurrence (lexicon cross-ref)
  children?: SsConstituencyNode[];
}

// Grounded clause node (clause hierarchy + words decorated with iʿrāb).
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
  role:   string | null;                                  // reconciled iʿrāb role
  irab:   { book: string; role: string | null; text: string | null }[];
}

// ─── micro-helpers ─────────────────────────────────────────────────────────────

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

// iʿrāb position / sign Arabic labels (values seen in qr_ss_scope_morph_link)
const IRAB_POS_AR: Record<string, string> = {
  rafa: 'رفع', raf: 'رفع', nasb: 'نصب', jarr: 'جرّ', jarr_qasam: 'جرّ', jazm: 'جزم',
  mabni: 'مبنيّ', mabni_mahall: 'مبنيّ في محلّ',
};
const IRAB_SIGN_AR: Record<string, string> = {
  damma: 'ضمّة', fatha: 'فتحة', kasra: 'كسرة', sukun: 'سكون', ya: 'الياء', waw: 'الواو',
  alif: 'الألف', thubut_nun: 'ثبوت النون', hadhf_nun: 'حذف النون', muqaddara: 'مقدّرة',
};

/** lx_morph_ref "AL:nahw:naat" / "AL:sarf:x" → term_key "naat". */
function stripTermPrefix(ref: string | null): string | null {
  if (!ref) return null;
  return ref.replace(/^AL:(nahw|sarf):/i, '');
}

function termOf(map: Map<string, TermRef>, key: string | null): TermRef | null {
  if (!key) return null;
  return map.get(key) ?? null;
}

/** parse note_md {"sources":[...]} into a string[] */
function sourcesFromNote(note: string | null): string[] {
  const rec = asRec(parseJson(note));
  const arr = rec && Array.isArray(rec['sources']) ? rec['sources'] : [];
  return arr.filter((s): s is string => typeof s === 'string');
}

// Task sort order: explicit display_order wins; fall back to known step type order.
// The registered study process — cyb_process_step under PRC:quran:surah_passage_study.
// Six steps in the order the work is done. `morphology` and `expressions` are one
// step (an idiom cannot be read by parsing it); `comprehension` and `scholarship`
// are one step. Task rows keep their original task_type, so the distinction
// survives inside the step — which is why the legacy keys still resolve here.
const STEP_ORDER: Record<string, number> = {
  reading: 100, vocabulary: 200, sentence_structure: 300,
  passage_structure: 400, tafsir: 500, worldview: 600,
  // Step 700 of the registered process. It was missing here, so a task of this
  // type fell to the 99000 default and sorted after everything — and the grid
  // below never reported it at all. No passage carries one yet, which is the
  // only reason it has not bitten.
  surah_structure: 700,
  // Legacy task_type values, ordered inside the step that now owns them.
  morphology: 200, expressions: 210,
  comprehension: 500, scholarship: 510,
};

/** The step a legacy key now belongs to. */
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

// ─── StudyRepo ─────────────────────────────────────────────────────────────────

export class StudyRepo {
  constructor(private db: D1Database) {}

  // ── Public API ──────────────────────────────────────────────────────────────

  /** All study passages for a surah (ordered). */
  passages(surahId: number): Promise<PassageRow[]> {
    return this._passages(surahId);
  }

  /**
   * Study grid — the lightweight passage LIST: only what the UI needs to pick a
   * passage (range, label, theme, which study layers exist, vocab counts).
   *
   * Lazy by design: it does NOT load the per-passage task trees or parse any
   * task_json. Step availability comes from one cheap GROUP BY over the tasks
   * table, and vocab counts from one aggregate over the word table. The full
   * passage payload is fetched only when a passage (or a step) is opened.
   */
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
        // One flag per registered step, all six. This emitted five and omitted
        // `comprehension` and `scholarship` entirely, so 21 real tasks across 11
        // passages were invisible in the grid — not because the app dropped them
        // but because the server never sent them. A legacy task_type counts
        // towards the step that now owns it.
        //
        // `has` used to mean "somebody authored a task row", which is a
        // different question from the one the pill is asked: is there anything
        // to open? Surah 40 has iʿrāb for two passages and content words for all
        // twenty, and reported 0 for every step of every one. It is now task OR
        // data — the tab opens if either says there is something there.
        reading:             { has: has('reading') },
        vocabulary:          {
          nouns: wc.nouns, verbs: wc.verbs, total: wc.total,
          // The count sitting next to it already proves the case.
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

  /**
   * Full lesson for a passage: ayahs with translation, task tree,
   * vocabulary, and expressions extracted from task payloads.
   */
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

  /**
   * All tasks for a passage as a tree (does not filter by step type).
   * Useful for "all tasks" overview.
   */
  async allTasks(surahId: number, passageNo: number): Promise<StudyTask[] | null> {
    const passages = await this._passages(surahId);
    const passage  = passages.find(p => p.passage_no === passageNo);
    if (!passage) return null;
    return this._tasks(passage.id);
  }

  /**
   * Root task for a specific step type within a passage.
   * Returns null if passage not found; undefined if no task of that type.
   */
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

  /**
   * Available step types for a passage, in step order. Cheap — derived from the
   * task-type flags query (no task_json). Used by the passage-detail endpoint so
   * picking a passage does not pull the whole task tree.
   */
  /**
   * The UNIQUE roots actually occurring in a passage's āyāt, straight from the
   * corpus (qr_word_occurrence). One row per root — no duplicates — with how
   * often it occurs and how many distinct lemmas it takes in this passage.
   * This is the authoritative vocabulary spine for the passage.
   */
  async passageRoots(
    surahId: number,
    passageNo: number,
  ): Promise<
    { root: string; occurrences: number; lemmas: number; first_ayah: number; first_word: number }[] | null
  > {
    const passages = await this._passages(surahId);
    const passage  = passages.find(p => p.passage_no === passageNo);
    if (!passage) return null;
    // Ordered by where each root FIRST appears in the passage (āyah, then word),
    // so the grid reads in the order the verses do.
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

  // ── Lazy per-step loaders ─────────────────────────────────────────────────
  // Each study step loads ONLY its own data, and from the normalized tables —
  // not from task_json. The UI calls these when a step is selected.

  /** Reading step — ayahs in both script forms + word tokens + muṣḥaf meta. */
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

  /** Comprehension step — questions straight from qr_study_question. */
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

  /**
   * Morphology step — each word rooted in the source books:
   *   • ṣarf  : root, lemma, pos and the features parsed from the QAC tag, plus
   *             the lexicon root key so the per-word Five-Lens lookup resolves.
   *   • iʿrāb : the parse from every iʿrāb book, attributed per author/book
   *             (qr_irab_book_entry linked to the word).
   *   • qirāʾāt / disputed readings : word-scoped qr_ss_scope_reading rows with
   *             their scholar reference.
   *   • tafsīr : the mufassir discussion for the verse (qr_tafsir_entry),
   *             attributed per work, as the deeper discussion layer.
   * All from the tables — no task_json. Lexicon bodies stay lazy (Five-Lens
   * lookup per tapped word over the AR_LINGUISTICS binding).
   */
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
      // iʿrāb of each word, attributed per book/author.
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
      // word-scoped qirāʾāt / disputed readings, with scholar reference.
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
      // tafsīr discussion for the verse range, attributed per mufassir/work.
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
      // The synthesized per-word reading (ingested sources woven into one analysis).
      query<{ wid: string; text: string | null; text_ar: string | null; contested: number | null }>(
        this.db,
        `SELECT r.scope_id AS wid, r.reading_text AS text, r.reading_text_ar AS text_ar, r.is_contested AS contested
         FROM qr_ss_scope_reading r
         JOIN qr_word_occurrence w ON w.id = r.scope_id
         WHERE r.scope_type = 'word' AND r.reading_type = 'synthesis'
           AND w.surah = ? AND w.ayah BETWEEN ? AND ?`,
        [surah, from, to],
      ).catch(() => []),
      // Evidence ingested into each synthesis (ontology + provenance + dispute).
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
    // Ingested evidence per synthesized word, with provenance + dispute status.
    const synthEvByWord = new Map<string, { type: string | null; provenance: string | null; locator: string | null; text_ar: string | null; disputed: boolean }[]>();
    for (const e of synthEvRows) {
      const list = synthEvByWord.get(e.wid) ?? [];
      list.push({ type: e.etype, provenance: e.provenance, locator: e.locator, text_ar: e.text_ar, disputed: !!e.disputed });
      synthEvByWord.set(e.wid, list);
    }
    // The woven per-word synthesis (the headline analysis), with its evidence.
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
        // Headline: the woven synthesis (ingested lexicon + iʿrāb + tafsīr),
        // with its evidence (provenance + dispute). Null until a word is synthesized.
        synthesis: synthByWord.get(r.id) ?? null,
        // Supporting source-rooted detail, attributed:
        irab:      irabByWord.get(r.id) ?? [],      // per iʿrāb book / author
        readings:  readingsByWord.get(r.id) ?? [],  // qirāʾāt / disputes per scholar
        lexicon_root: r.root ?? null,               // Five-Lens lookup key (lazy)
      };
    });

    // Tafsīr discussion grouped per ayah, attributed per mufassir/work.
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
      tafsir,     // per-ayah mufassir discussion (deeper layer)
    };
  }

  /**
   * Expressions step — table-sourced (no task_json). Reads ar_ling_root_lemma_tabir
   * for the passage's surah:ayah range over the AR_LINGUISTICS service binding.
   * Lean payload: { step, surah, passage, ayahFrom, ayahTo, items[] }.
   */
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

  /**
   * Sentence-structure step — fully grounded, table-sourced (no task_json).
   *
   * Fuses every available analytical layer for the passage, per sentence:
   *   • the clause hierarchy (qr_ss_occ_clause, nested via parent_clause_id)
   *     with each clause's words attached by word-index span;
   *   • per-word iʿrāb grounding (qr_irab_book_entry) — the grammatical role
   *     reconciled across the classical books by majority vote, with EVERY book's
   *     role + full iʿrāb text kept and attributed (the grammarian detail);
   *   • the authored word-level constituency tree (qr_ss_tree / qr_ss_tree_node)
   *     when one has been curated for the sentence;
   *   • balāgha annotations (qr_ss_scope_balagha_link) and ellipsis events
   *     (qr_ss_ellipsis_event) scoped to the sentence/clause;
   *   • the mufassir discussion for the ayah (qr_tafsir_entry), attributed.
   * Colours + Arabic/English labels come from the global term dictionary
   * (ar_ling_gram_term). The per-word `root` lets the UI cross-reference the Five-Lens
   * lexicon lazily on tap.
   */
  async sentenceStructureStep(surahId: number, passageNo: number) {
    const passages = await this._passages(surahId);
    const passage  = passages.find((x) => x.passage_no === passageNo);
    if (!passage) return null;
    const { surah_id: surah, ayah_from: from, ayah_to: to } = passage;

    // Probe for sentences first. Everything below is keyed to them, so with
    // none there is nothing any of the other ten queries could return — and
    // most passages are in that state while the corpus is still being built
    // (surah 40 has iʿrāb for two of its twenty). Answering "not built yet"
    // used to cost eleven unlimited queries including two full scans of
    // qr_irab_book_entry; it now costs this one indexed lookup.
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
                gt_sentence_class: string | null; gt_kalam_kind: string | null }>(
          this.db,
          `SELECT id, ayah_from, ayah_to, word_start_index, word_end_index,
                  sentence_kind, discourse_role, note_md,
                  -- A sentence is classified twice, on two different questions:
                  -- what it is BUILT from (اسمية / فعلية / شرطية) and what it
                  -- DOES (خبرية / إنشائية). Both are GT ids as of 018.
                  gt_sentence_class, gt_kalam_kind
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
          // Two indexed arms, not one OR. SQLite will not use idx_qrsbl_scope
          // for an OR across two IN-subqueries and scans the whole link table;
          // as a UNION ALL each branch takes the index. The arms are disjoint —
          // a scope_id is a clause id or a sentence id, never both.
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
        // Authored constituency trees curated for these sentences (post-ETL).
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
        // The grammar registry, which is where every term in the system lives.
        // This used to read qr_ss_term — a table that does not exist in the
        // deployed database, so the query threw, the .catch() swallowed it, and
        // the tab has been shipping `terms: []` and `termColors: {}` for its
        // whole life. Nothing on the board could be named or coloured.
        //
        // Keyed by `id` (the GT: global id) as well as `term_key`, so a node
        // referring to a term either way resolves.
        query<{ id: string; term_key: string; category_key: string;
                name_ar: string | null; name_en: string | null; name_ur: string | null;
                badge_color: string | null; sources: string | null }>(
          this.db,
          // …and where the classical books define it. A figure the board names
          // should be able to say where it is defined — al-Qazwini's Talkhis,
          // Ibn Hisham's Shudhur, Ibn Ashur — which is what turns a chip from a
          // label into a reference. 144 of the balagha terms are attested.
          `SELECT g.id, g.term_key, g.category_key, g.name_ar, g.name_en, g.name_ur,
                  g.badge_color,
                  (SELECT group_concat(s.source_slug, '|')
                     FROM ar_ling_gram_term_source s WHERE s.term_id = g.id) AS sources
             FROM ar_ling_gram_term g WHERE g.status = 'live'`,
          [],
        ).catch(() => []),
        // Ayah-level iʿrāb from EVERY classical book, even where the entries are
        // not word-linked (e.g. S12). This is the grammarian-detail grounding:
        // each parsed phrase with its role / case / maḥall and full analysis,
        // attributed per book. Multiple books → multiple granularities kept.
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
        // ── the two layers that were never sent ──────────────────────────────
        // Grammar (naḥw) and ṣarf, scope by scope. Balāgha was already read
        // above but flattened onto the sentence; these three together are what
        // the board hangs under each node.
        //
        // Both are keyed by scope_id, which is a sentence, clause, phrase or
        // word id depending on what the claim is about — so a node can ask for
        // its own and get exactly what was said about it, rather than about the
        // sentence it happens to sit in.
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
        // The word layer: 620 rows where the whole grammar layer is 115. This
        // is the per-word iʿrāb the board puts under a leaf node — its
        // syntactic function, where the case sits and what marks it, and
        // whether the grammarians disagree about it at all.
        // ── the readings ledger ──────────────────────────────────────────
        // Every position a source takes, with who takes it and how many. This
        // is the band that answers "why do they disagree" — is_contested marks
        // the ones where they do, is_minority the lone voice, is_selected the
        // one the translation was folded from.
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
        // ── the fold ─────────────────────────────────────────────────────
        // The derived translation, step by step: the structural track is the
        // grammar-only reading, the fluent one is grammar folded with balagha.
        // Where the two part is where a rendering decision was made, and
        // reading_ref names the reading it was made on.
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

    // ── iʿrāb per word: reconcile a primary role by majority, keep all sources ──
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

    // Word lookup by (ayah, index) for clause word-span attachment.
    const wordByPos = new Map<string, typeof wordRows[number]>();
    for (const w of wordRows) wordByPos.set(`${w.ayah}:${w.word_index}`, w);

    const buildWord = (w: typeof wordRows[number]) => ({
      wordId: w.id,
      ayah:   w.ayah,
      index:  w.word_index,
      text:   w.word_text,
      simple: w.word_text_bare ?? undefined,
      root:   w.root ?? undefined,        // Five-Lens lexicon cross-ref key (lazy)
      lemma:  w.lemma ?? undefined,
      pos:    w.pos ?? undefined,
      role:   primaryRole(w.id),          // reconciled grammatical role
      irab:   irabByWord.get(w.id) ?? [], // every book's role + full text, attributed
    });

    // ── Authored constituency trees, reassembled into SsTreeNode form ──────────
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
    // Multiple authored trees can hang off one ayah's sentence row (e.g. ayahs
    // 5–6, which contain several sentences). Keep them all, ordered by tree id
    // (which carries the authoring step number), and emit one board per tree.
    const treesBySentence = new Map<string, { id: string; node: SsConstituencyNode | null; grounding: string | null }[]>();
    for (const t of [...treeRows].sort((a, b) => a.id.localeCompare(b.id))) {
      const list = treesBySentence.get(t.sentence_id) ?? [];
      list.push({ id: t.id, node: buildConstituency(t.id), grounding: t.grounding ?? null });
      treesBySentence.set(t.sentence_id, list);
    }

    // ── Clause hierarchy per sentence, words attached by index span ────────────
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

    // ── balāgha / ellipsis grouped by scope ────────────────────────────────────
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

    // ── ayah-level iʿrāb (grammarian details), grouped per ayah, per book ──────
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

    // ── tafsīr per ayah, attributed per work/mufassir ──────────────────────────
    const tafsirByAyah = new Map<number, { work: string | null; scholar: string | null; text: string | null }[]>();
    for (const t of tafsirRows) {
      const lo = Math.max(t.ayah_from, from), hi = Math.min(t.ayah_to, to);
      for (let a = lo; a <= hi; a++) {
        const list = tafsirByAyah.get(a) ?? [];
        list.push({ work: t.work, scholar: t.scholar_id, text: t.text });
        tafsirByAyah.set(a, list);
      }
    }

    // ── Compose sentences ──────────────────────────────────────────────────────
    // One board per authored constituency tree where curated; otherwise a single
    // board built from the grounded clause hierarchy.
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
        // The two classifications as registry references. `kind` and `mode`
        // stay for the release that has not moved yet, and the note keeps the
        // nuance a column cannot hold — 'khabariyya + shart' is a real remark
        // about a sentence declarative in form and conditional in structure.
        sentenceClassRef: s.gt_sentence_class ?? null,
        kalamKindRef:     s.gt_kalam_kind ?? null,
        note:      stripModePrefix(s.note_md),
        clauseTree: buildClauseTree(s.id, s.ayah_from),     // grounded clause hierarchy + iʿrāb
        irabAnalysis: irabAyahByAyah.get(s.ayah_from) ?? [], // grammarian detail, per book
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
          tree: t.node,                                      // authored word-level constituency
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

    // ── the layers, keyed by what they are about ──────────────────────────────
    //
    // Until now these arrived flattened onto the sentence: every iʿrāb reading,
    // every balāgha figure and every tafsīr note for the whole sentence in four
    // long lists, which the reader then had to match back to words by eye. The
    // claims were never sentence-wide — the tables have carried
    // (scope_type, scope_id) all along, pointing at the sentence, the clause,
    // the phrase or the single word each one is actually about.
    //
    // Sending them keyed by scope is what lets a tree node ask "what was said
    // about *me*" and get an answer. The flat arrays stay on the sentence for
    // the release that has not moved yet.
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

    // ── the readings, keyed by scope, and the questions they answer ──────────
    //
    // The artifact groups these by the QUESTION each answers rather than by
    // source, because that is how a reader uses them: not "what does al-Razi
    // say" but "where does the sentence sit, and who disagrees". reading_type
    // is that grouping, and the weight is the witness count — 9 · all, or
    // 1 · minority.
    const readings = readingRows.map((r) => ({
      id: r.id,
      scopeType: r.scope_type,
      scopeId: r.scope_id,
      question: r.type,
      ref: r.ref,
      paradigm: r.paradigm,
      en: r.en,
      ar: r.ar,
      // scholar_ref is a semicolon-joined list; the board renders one chip each.
      sources: (r.scholars ?? '').split(';').map((x) => x.trim()).filter(Boolean),
      isMinority: !!r.minority,
      isContested: !!r.contested,
      isSelected: !!r.selected,
      witnesses: r.witnesses ?? null,
      why: parseJson(r.why),
    }));

    // ── the fold ─────────────────────────────────────────────────────────────
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
      // The 'finding' band: why the English says what it says.
      synthesis: f.synthesis,
      readingRef: f.reading_ref,
      rejected: parseJson(f.rejected),
    }));

    // A term is addressable by its global id and by its bare key, because the
    // tree nodes still carry bare keys (`muqattaat`) while the scope links
    // already carry global ones (`GT:irab_role:mubtada`). Both resolve to the
    // same row until 013 finishes retiring the bare form.
    const termColors: Record<string, string> = {};
    const terms = termRows.map((t) => {
      if (t.badge_color) {
        termColors[t.id] = t.badge_color;
        termColors[t.term_key] = t.badge_color;
      }
      return {
        key: t.term_key, ref: t.id, category: t.category_key,
        labelAr: t.name_ar, labelEn: t.name_en, labelUr: t.name_ur,
        color: t.badge_color,
        // The books that define this term, so a chip can be followed back to
        // where the definition lives.
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

  /**
   * Lazy step dispatcher. Returns the step's data sourced from tables when the
   * step has been migrated off task_json (reading, morphology, comprehension,
   * expressions, sentence_structure); otherwise falls back to the task tree.
   *   null      → passage not found
   *   undefined → no such step in this passage
   */
  async stepData(
    surahId: number,
    passageNo: number,
    stepType: string,
    al: AlClient | null = null,
  ): Promise<unknown> {
    switch (stepType) {
      case 'reading':       return this.readingStep(surahId, passageNo);
      // `vocabulary` is the registered step; `morphology` is the legacy key for
      // the same work and still resolves.
      case 'vocabulary':
      case 'morphology':    return this.morphologyStep(surahId, passageNo);
      case 'tafsir':
      case 'comprehension': return this.comprehensionStep(surahId, passageNo);
      case 'expressions':   return this.expressionsStep(surahId, passageNo, al);
      case 'sentence_structure': return this.sentenceStructureStep(surahId, passageNo);
      default: {
        const task = await this.taskByStepType(surahId, passageNo, stepType);
        if (task === null) return null;
        if (task === undefined) return undefined;
        return { step: stepType, source: 'tasks', task };
      }
    }
  }

  // ── Morphology / vocabulary (from the relational tables) ────────────────────

  /**
   * Full per-word morphology for a passage, built from qr_word_occurrence (QAC)
   * + qr_ss_scope_morph_link (iʿrāb) × ar_ling_gram_term (labels) + qr_ss_occ_segment.
   * Every word emits a card, so this works for any surah (SML/segments fill in
   * where present). Returns the distinct root list for AL enrichment.
   */
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

  /** Single word card by word-occurrence id (word-hash) — for the detail modal. */
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

  /** Ayah text + default translation for the modal's context line. */
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

  /** Tafsīr snippets covering a single ayah (for the word modal). */
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
      // The grammar registry. This read qr_ss_term, which does not exist in the
      // deployed database — the query threw, the .catch swallowed it, and every
      // word card has been built with an empty label map. Same bug as the
      // sentence-structure step had, in a second place.
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

  // ── Private SQL methods ─────────────────────────────────────────────────────

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

    // Merge chunked JSON payloads (large task_json split across rows)
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
        // Reading text is served from the tables in BOTH forms:
        //   diacritic     → text_uthmani_clean / text_uthmani
        //   non-diacritic → text_bare
        // plus the muṣḥaf metadata (page / juz / hizb / ruku / verse mark).
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
      // Per-word tokens, both forms, from the word table (no JSON).
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
        text:      w.text,                 // diacritic
        simple:    w.simple ?? undefined,  // non-diacritic
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
        text:        diacritic,                  // diacritic (mushaf) option
        text_simple: a.text_bare ?? undefined,   // non-diacritic option
        text_arabic: diacritic,                  // back-compat alias
        words:       wordsByAyah.get(a.ayah) ?? [],
        translation: transByAyah.get(a.ayah) ?? null,
      };
    });
  }

  /** Vocabulary from qr_word_occurrence — fallback when morphology tasks lack payloads. */
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
    // pos is QAC (N/V/PN/ADJ) or lowercase (noun/verb) in curated rows — map both.
    return {
      nouns: rows.filter(w => posGroup(w.pos) === 'noun'),
      verbs: rows.filter(w => posGroup(w.pos) === 'verb'),
    };
  }

  /**
   * Which task types exist per passage, for the whole surah, in one cheap
   * GROUP BY (no task_json, no per-passage round trips). Used for the grid's
   * "which layers are available" flags.
   */
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

  /**
   * Word counts per passage — vocabulary stats for the grid. Aggregated by ayah
   * in SQL (one row per ayah, not per word), then bucketed into passage ranges.
   */
  /**
   * Step availability derived from the *content*, not from the task tree —
   * the other half of `has`. One āyah-range query per content-bearing step,
   * folded onto the passage ranges in memory the way `_wordCounts` does, so
   * this costs three indexed scans and no per-passage round trip.
   *
   * A step missing from this map simply has no content table to ask (the task
   * tree is still authoritative for those); a step present here is one the
   * reader can open regardless of whether anyone wrote a task for it.
   */
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
      // Every passage has āyāt, so reading is available wherever the surah has
      // word rows at all — one query answers it for the whole surah.
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
        // Any overlap between the content's range and the passage's counts.
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

// ─── Morphology helpers ─────────────────────────────────────────────────────────
// Parse the QAC morphology tag and classify part-of-speech into study groups.

// iʿrāb book slugs → readable book / author labels (for source attribution).
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
  verb_form?: string;          // roman numeral, e.g. "VIII"
  grammatical_case?: string;
  gender?: string;
  number_base?: string;
  person?: string;
  raw?: string;
}

/** Parse a QAC pipe tag, e.g. "STEM|POS:V|PERF|(VIII)|LEM:..|ROOT:Ax*|3MP". */
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
      // person/gender/number token, e.g. 3MP, MS, MP, F
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

/** Group a QAC part-of-speech code into a study bucket. */
export function posGroup(pos: string | null | undefined): 'noun' | 'verb' | 'particle' {
  const p = (pos ?? '').toUpperCase();
  if (p === 'V') return 'verb';
  if (p === 'N' || p === 'PN' || p === 'ADJ') return 'noun';
  return 'particle';
}

// Sentence note_md is authored as "Mode: <discourse-mode>. <Arabic analysis>".
// Split the machine-readable mode from the human prose.
export function parseDiscourseMode(note: string | null | undefined): string | null {
  if (!note) return null;
  const m = /^\s*Mode:\s*([^.\n]+)\.?/i.exec(note);
  return m ? m[1].trim() : null;
}

export function stripModePrefix(note: string | null | undefined): string | null {
  if (!note) return null;
  return note.replace(/^\s*Mode:\s*[^.\n]+\.?\s*/i, '').trim() || null;
}

// ─── Exported task-tree helpers ─────────────────────────────────────────────────
// These are exported so routes can call them directly if needed.

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

/**
 * Extract vocabulary (nouns + verbs) from morphology task payloads.
 * Preferred over raw qr_word_occurrence when morphology tasks have payloads
 * (richer data: glosses, verb forms, patterns).
 */
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

/**
 * Extract expressions list from expression task payloads.
 */
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
