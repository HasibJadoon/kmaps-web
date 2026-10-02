import { query, queryOne } from '../../../shared/src/db';
import { nonBlank } from '../../../shared/src/validate';
import { makeGtResolver, type GtAliasRow, type GtSlots } from '../../../shared/src/gt-resolve';
import type { AlClient } from '../clients/al.client';
import { parseQacMorphology, posGroup as qacPosGroup, QacMorphology } from '../lib/qac-morph';
import { labels, byKey } from '../lib/labels';
import type { QuranEnv } from '../env';
import { atlasUnits, coversSurah } from '../routes/atlas-layers';
import { derivedStructureSections, derivedScholarship } from './study-derived';

/// How a passage is asked for: a curated passage_no (or, where no curated passage has
/// that number, the unit at that place in the atlas's list), or its key "from-to".
export type PassageRef = number | string;

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
  /// A derived passage's basis (qr_surah_passage_proposal.basis_json, or the atlas's trim).
  basis?: unknown;
  title_ar?: string | null;
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
  /// The word's time in the recording (seconds on the surah file's clock), where the
  /// recitation's segments number the āyah's words as the corpus does.
  start?: number | null;
  end?: number | null;
}

/// The recitation the reading step times its words against — the atlas's (atlas.ts RECITER):
/// Mishary Rashid al-ʿAfāsī in qr_recitation.
const READING_RECITER = 7;

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

function taskSortKey(t: StudyTask): number {
  return asNum(t.display_order) ?? STEP_ORDER[t.task_type] ?? 99000;
}

function sortTasks(ts: StudyTask[]): StudyTask[] {
  return [...ts].sort((a, b) => taskSortKey(a) - taskSortKey(b) || a.task_id.localeCompare(b.task_id));
}

/// A sentence-structure row built from the books rather than authored: the Jadwal-derived
/// layer marks its rows source_basis 'derived:jadwal' (tafsīr-mined ones 'derived:tafsir:<slug>')
/// and ids 'QR:SS:{s}:{a}:jadwal:s{n}'. A curated sentence always wins over a derived one on
/// the same āyah.
export function isDerivedSs(id: string | null | undefined, basis: string | null | undefined, grounding?: string | null): boolean {
  return /^derived/i.test(basis ?? '')
    || /:(jadwal|derived)(:|$)/i.test(id ?? '')
    || /^(derived|jadwal)/i.test(grounding ?? '');
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
    // An authored layer is corrected far more often than it is created, and a
    // correction only moves `updated_at`. Deriving the version from creation
    // alone froze it at the last build, so the client's invalidation never
    // fired and a device kept a pre-correction snapshot indefinitely.
    // The sentences are not the only authored layer: a reading corrected in
    // place moves nothing in qr_ss_occ_sentence, so a version derived from
    // that table alone stayed put and no device ever dropped its snapshot.
    const fallback = await queryOne<{ v: string | null }>(
      this.db,
      `SELECT MAX(v) AS v FROM (
         SELECT MAX(MAX(COALESCE(created_at, '')), MAX(COALESCE(updated_at, ''))) AS v
           FROM qr_ss_occ_sentence
         UNION ALL
         SELECT MAX(MAX(COALESCE(created_at, '')), MAX(COALESCE(updated_at, ''))) AS v
           FROM qr_ss_scope_reading
       )`,
    ).catch(() => null);
    return { version: `qr-derived-${fallback?.v ?? 'unknown'}`, built_at: fallback?.v ?? null };
  }

  /// A surah's study grid: each passage with what its steps hold. `has` is whether the
  /// step returns content for it (built from the sources where nothing is authored);
  /// `built` is whether that content is authored rows. With `derived`, the grid lists
  /// the atlas's units — curated passages and the derived passages between them — so
  /// every āyah of the surah sits in a passage; a derived one carries its key "from-to".
  async grid(surahId: number, opts: { derived?: boolean; al?: AlClient | null } = {}) {
    const passages = opts.derived ? await this.units(surahId) : await this._passages(surahId);
    if (!passages.length) return null;

    const [typeFlags, wordCounts, dataFlags, builtFlags, exprAyat] = await Promise.all([
      this._taskTypeFlags(surahId),
      this._wordCounts(surahId, passages),
      this._dataFlags(surahId, passages),
      this._builtFlags(surahId, passages),
      this._expressionAyat(surahId, passages, opts.al ?? null),
    ]);

    const units = passages.map(p => {
      const flags = typeFlags.get(p.id) ?? new Set<string>();
      const data  = dataFlags.get(p.id) ?? new Set<string>();
      const built = builtFlags.get(p.id) ?? new Set<string>();
      const wc    = wordCounts.get(p.id) ?? { total: 0, nouns: 0, verbs: 0 };
      const has   = (...steps: string[]) =>
        steps.some(s => flags.has(s) || data.has(s)) ? 1 : 0;
      const derived = p.status === 'derived';
      const ss = has('sentence_structure');
      const expr = exprAyat === null ? null
        : [...exprAyat].some((a) => a >= p.ayah_from && a <= p.ayah_to) ? 1 : 0;
      return {
        passage_id:  p.id,
        passage_no:  p.passage_no,
        ayah_from:   p.ayah_from,
        ayah_to:     p.ayah_to,
        start_ref:   `${p.surah_id}:${p.ayah_from}`,
        end_ref:     `${p.surah_id}:${p.ayah_to}`,
        label:       p.title ?? `Passage ${p.passage_no}`,
        theme:       p.theme ?? null,
        ...(derived ? { derived: true, key: `${p.ayah_from}-${p.ayah_to}` } : {}),

        reading:             { has: has('reading'), built: has('reading') },
        vocabulary:          {
          nouns: wc.nouns, verbs: wc.verbs, total: wc.total,

          has: (wc.total > 0 || has('vocabulary', 'morphology', 'expressions') === 1) ? 1 : 0,
        },
        ...(expr === null ? {} : { expressions: { has: expr } }),
        sentence_structure:  { has: ss, built: built.has('sentence_structure') ? 1 : 0 },
        // Every passage has a structure step: where nothing is authored it is built from
        // the books' divisions, the opening's cue and the translations (study-derived.ts).
        passage_structure:   { has: wc.total > 0 || has('passage_structure') ? 1 : 0,
                               built: (flags.has('passage_structure') || built.has('passage_structure')) ? 1 : 0 },
        tafsir:              { has: has('tafsir', 'comprehension', 'scholarship'),
                               built: (flags.has('scholarship') || built.has('scholarship')) ? 1 : 0 },
        scholarship:         { has: has('tafsir', 'scholarship'),
                               built: (flags.has('scholarship') || built.has('scholarship')) ? 1 : 0 },
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

  async lesson(surahId: number, passageNo: PassageRef) {
    const passage = await this.resolve(surahId, passageNo);
    if (!passage) return null;

    const [tasks, ayahs] = await Promise.all([
      this._tasks(passage.id),
      this._ayahs(passage),
    ]);

    const vocabulary = await this._morphologyFor(passage, tasks);

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

  async allTasks(surahId: number, passageNo: PassageRef): Promise<StudyTask[] | null> {
    const passage = await this.resolve(surahId, passageNo);
    if (!passage) return null;
    return this._tasks(passage.id);
  }

  async taskByStepType(
    surahId: number,
    passageNo: PassageRef,
    stepType: string,
  ): Promise<StudyTask | null | undefined> {
    const passage = await this.resolve(surahId, passageNo);
    if (!passage) return null;
    const tasks = await this._tasks(passage.id);
    return tasks.find(t => t.task_type === stepType) ?? undefined;
  }

  async passageRoots(
    surahId: number,
    passageNo: PassageRef,
  ): Promise<
    { root: string; occurrences: number; lemmas: number; first_ayah: number; first_word: number }[] | null
  > {
    const passage = await this.resolve(surahId, passageNo);
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

  /// The steps that have content for this passage: its authored tasks, and every one of
  /// the six study steps that returns content for it (built from the sources where
  /// nothing is authored), in study order.
  async stepTypes(surahId: number, passageNo: PassageRef, al: AlClient | null = null): Promise<string[] | null> {
    const passage = await this.resolve(surahId, passageNo);
    if (!passage) return null;
    const [flags, data, words, expr] = await Promise.all([
      this._taskTypeFlags(surahId),
      this._dataFlags(surahId, [passage]),
      this._wordCounts(surahId, [passage]),
      this._expressionAyat(surahId, [passage], al),
    ]);
    const out = new Set<string>(flags.get(passage.id) ?? []);
    const d = data.get(passage.id) ?? new Set<string>();
    const wc = words.get(passage.id)?.total ?? 0;
    if (d.has('reading')) out.add('reading');
    if (wc > 0) { out.add('morphology'); out.add('passage_structure'); }
    if (expr && [...expr].some((a) => a >= passage.ayah_from && a <= passage.ayah_to)) out.add('expressions');
    if (d.has('sentence_structure')) out.add('sentence_structure');
    if (d.has('tafsir') || d.has('scholarship')) out.add('scholarship');
    return [...out].sort((a, b) => (STEP_ORDER[a] ?? 99000) - (STEP_ORDER[b] ?? 99000));
  }

  async readingStep(surahId: number, passageNo: PassageRef) {
    const passage = await this.resolve(surahId, passageNo);
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

  async comprehensionStep(surahId: number, passageNo: PassageRef) {
    const passage = await this.resolve(surahId, passageNo);
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

  async morphologyStep(surahId: number, passageNo: PassageRef) {
    const passage = await this.resolve(surahId, passageNo);
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
    let tafsir = [...tafsirByAyah.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([ayah, sources]) => ({ ayah, sources }));

    // A step stays under ~200 KB: on a long passage the per-āyah tafsīr openings (700
    // characters × 8 works × each āyah) are cut shorter, and said so in `trimmed`.
    const trimmed: string[] = [];
    const wordBytes = new TextEncoder().encode(JSON.stringify(items)).length * 2;
    for (const n of [350, 160]) {
      if (wordBytes + new TextEncoder().encode(JSON.stringify(tafsir)).length <= MORPH_BUDGET) break;
      tafsir = tafsir.map((t) => ({
        ayah: t.ayah,
        sources: t.sources.map((x) => ({ ...x, text: x.text && x.text.length > n ? `${x.text.slice(0, n)} …` : x.text })),
      }));
      trimmed.push(`tafsir_openings_cut_${n}`);
    }

    return {
      ...(trimmed.length ? { trimmed } : {}),
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
  async passageStructureStep(surahId: number, passageNo: PassageRef) {
    const p = await this.resolve(surahId, passageNo);
    if (!p) return null;

    const [rendering, units, buildup, nuances, decisions] = await Promise.all([
      queryOne<Record<string, unknown>>(
        this.db,
        `SELECT id, assembled_fluent_en AS assembled, final_fluent_en AS final,
                assembly_note_ar AS noteAr, synthesis_md AS synthesis, nazm_ref AS nazmRef,
                rejected_assemblies_json AS rejected
           FROM qr_ss_translation_passage
          WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ?
          -- The widest row first: the passage's own assembly spans every ayah,
          -- while the per-ayah rows each span one. Ordering by ayah_from alone
          -- picked the first ayah's row, so a three-ayah passage reported its
          -- final rendering as the rendering of its opening line.
          ORDER BY (ayah_to - ayah_from) DESC, ayah_from LIMIT 1`,
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
        // unit_id and buildup_id travel with the row: without them a decision
        // cannot be attached to the step whose wording it explains, and the
        // client renders the ladder with no reasons at all.
        `SELECT id, unit_id AS unitId, buildup_id AS buildupId,
                ayah, step_seq AS seq, target_span_ar AS spanAr,
                rendered_json AS rendered, driver_kind AS driverKind,
                driver_ref AS driverRef, rationale_json AS rationale
           FROM qr_ss_translation_decision
          WHERE surah = ? AND ayah BETWEEN ? AND ? AND status = 'live'
          ORDER BY ayah, step_seq`,
        [surahId, p.ayah_from, p.ayah_to],
      ).catch(() => []),
    ]);

    // The passage's rendering, kept in its ayah pieces as well as whole. A
    // reader wants to see where one ayah ends and the next begins; that is a
    // fact about the rows, not something the app should find by splitting a
    // paragraph on full stops.
    const renderingParts = await query<{ ayah: number; text: string | null }>(
      this.db,
      `SELECT ayah_from AS ayah, COALESCE(final_fluent_en, assembled_fluent_en) AS text
         FROM qr_ss_translation_passage
        WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ? AND ayah_from = ayah_to
        ORDER BY ayah_from`,
      [surahId, p.ayah_from, p.ayah_to],
    ).catch(() => []);

    // How the English came to read the way it does, sentence by sentence: the
    // literal rendering the structure gives, the parts it is built from with
    // the role each plays, the fluent line that results, and the decisions
    // that moved one to the other. All authored rows — nothing assembled by
    // guess, and nothing the client has to work out for itself.
    const ladderSentences = await query<LadderSentenceRow>(
      this.db,
      `SELECT s.id, s.ayah_from AS ayah, s.ayah_to AS ayahTo,
              u.id AS unitId, u.structural_literal_en AS literalEn,
              u.fluent_en AS fluentEn, u.decision_note_ar AS noteAr,
              u.synthesis_md AS synthesis
         FROM qr_ss_occ_sentence s
         JOIN qr_ss_translation_unit u ON u.scope_id = s.id AND u.status = 'live'
        WHERE s.surah = ? AND s.ayah_from >= ? AND s.ayah_to <= ?
        ORDER BY s.ayah_from, s.word_start_index`,
      [surahId, p.ayah_from, p.ayah_to],
    ).catch(() => []);

    const ladderNodes = ladderSentences.length
      ? await query<LadderNodeRow>(
          this.db,
          `SELECT t.sentence_id AS sentenceId, n.id, n.parent_node_id AS parentId,
                  n.depth, n.node_order AS ord, n.node_label AS arabic,
                  n.gram_term_ref AS termRef, n.term_key AS termKey,
                  n.label_ar AS irabAr, n.gloss_json AS gloss
             FROM qr_ss_tree t
             JOIN qr_ss_tree_node n ON n.tree_id = t.id
            WHERE t.sentence_id IN (SELECT value FROM json_each(?))
            ORDER BY n.depth, n.node_order`,
          [JSON.stringify(ladderSentences.map((r) => r.id))],
        ).catch(() => [])
      : [];

    const termRefs = [...new Set(
      ladderNodes.map((n) => n.termRef).filter((x): x is string => !!x),
    )];
    const termNameAr = new Map<string, string>();
    if (termRefs.length) {
      const rows = await query<{ id: string; name_ar: string | null }>(
        this.db,
        `SELECT id, name_ar FROM ar_ling_gram_term
          WHERE id IN (SELECT value FROM json_each(?))`,
        [JSON.stringify(termRefs)],
      ).catch(() => []);
      for (const t of rows) if (t.name_ar) termNameAr.set(t.id, t.name_ar);
    }

    const nodesBySentence = new Map<string, LadderNodeRow[]>();
    for (const n of ladderNodes) {
      const list = nodesBySentence.get(n.sentenceId) ?? [];
      list.push(n);
      nodesBySentence.set(n.sentenceId, list);
    }

    // The rows carry `rendered` and `rationale` as JSON text; the client is
    // handed objects, the same as the passage's own decision list.
    const decisionsByUnit = new Map<string, Record<string, unknown>[]>();
    for (const d of decisions) {
      const key = typeof d['unitId'] === 'string' ? d['unitId'] : '';
      const list = decisionsByUnit.get(key) ?? [];
      list.push({
        ...d,
        rendered: parseJson(d['rendered'] as string | null),
        rationale: parseJson(d['rationale'] as string | null),
      });
      decisionsByUnit.set(key, list);
    }

    const ladder = ladderSentences.map((row) => {
      const parts = (nodesBySentence.get(row.id) ?? []).map((n) => {
        const gloss = asRec(parseJson(n.gloss));
        return {
          id: n.id,
          parentId: n.parentId,
          depth: n.depth,
          order: n.ord,
          arabic: n.arabic,
          termRef: n.termRef,
          termKey: n.termKey,
          termAr: n.termRef ? (termNameAr.get(n.termRef) ?? null) : null,
          irabAr: n.irabAr,
          glossEn: gloss ? nonBlank(gloss['en']) : null,
          glossAr: gloss ? nonBlank(gloss['ar']) : null,
        };
      });
      // The sentence's own Arabic is the root of its tree; there is no need to
      // stitch it back together out of words.
      const root = parts.find((x) => x.depth === 0) ?? parts[0] ?? null;
      return {
        id: row.id,
        unitId: row.unitId,
        ayah: row.ayah,
        ayahTo: row.ayahTo,
        arabic: root?.arabic ?? null,
        literalEn: row.literalEn,
        fluentEn: row.fluentEn,
        noteAr: row.noteAr,
        synthesis: row.synthesis,
        parts,
        decisions: decisionsByUnit.get(row.unitId ?? '') ?? [],
      };
    });

    // The ladder is ordered here, and each sentence's last step is told what
    // follows it. The rows come back grouped by step_seq, which interleaves
    // the sentences; sorting them by unit and then by seq is the order a
    // reader climbs them in, and it is the same order for every client.
    const unitRank = new Map<string, number>();
    units.forEach((u, i) => {
      const id = typeof u['id'] === 'string' ? u['id'] : null;
      if (id) unitRank.set(id, i);
    });
    const rankOf = (row: Record<string, unknown>) => {
      const id = typeof row['unitId'] === 'string' ? row['unitId'] : '';
      return unitRank.get(id) ?? units.length;
    };
    const climbed = [...buildup].sort((a, b) => {
      const r = rankOf(a) - rankOf(b);
      return r !== 0 ? r : Number(a['seq'] ?? 0) - Number(b['seq'] ?? 0);
    });

    // A sentence closes where the next step belongs to another unit. That step
    // is the transition into the sentence after it — its connector and the
    // relation the books name it by — and it belongs on the roof of the
    // sentence it is leaving, not buried in the sentence it opens.
    const orderedBuildup = climbed.map((b, i) => {
      const next = climbed[i + 1];
      const ends = !next || next['unitId'] !== b['unitId'];
      const connector = next && typeof next['connectorEn'] === 'string'
        ? next['connectorEn'].trim() : '';
      return {
        ...b,
        fork: undefined,
        endsSentence: ends,
        transitionEn: ends && next ? (connector || null) : null,
        transitionRelation: ends && next ? (next['relation'] ?? null) : null,
        transitionOpensEn: ends && next ? (next['addedEn'] ?? null) : null,
      };
    });

    // The analytical lenses — ring/chiasm, discourse, conflict, lexicon and the
    // rest — are authored rows in qr_passage_section, one card each, keyed by
    // the study passage and ordered by sort_order. Read from the table, never
    // from a task_json payload.
    const sectionRows = await query<{
      id: string; sort_order: number; section_key: string | null; title: string | null;
      badge: string | null; tone: string | null; renderer: string; data_json: string | null;
    }>(
      this.db,
      `SELECT id, sort_order, section_key, title, badge, tone, renderer, data_json
         FROM qr_passage_section
        WHERE passage_id = ? AND status = 'active'
        ORDER BY sort_order, id`,
      [p.id],
    ).catch(() => []);
    const sections = sectionRows.map((r) => ({
      id:       r.id,
      key:      r.section_key ?? r.renderer,
      title:    r.title ?? '',
      badge:    r.badge ?? '',
      tone:     r.tone ?? 'secondary',
      renderer: r.renderer,
      data:     parseJson(r.data_json) ?? {},
    }));

    // The concept behind each decision, named rather than explained. A driver
    // is a balagha or grammar row; each carries a GT term, and the term has a
    // short name in both languages. The reader gets the name and can follow it
    // to the concept; the reasoning stays available but does not lead.
    const drivers = await query<{
      link_id: string; gt_id: string; name_ar: string; name_en: string; category: string;
    }>(
      this.db,
      `SELECT b.id AS link_id, t.id AS gt_id, t.name_ar, t.name_en, t.category_key AS category
         FROM qr_ss_scope_balagha_link b
         JOIN ar_ling_gram_term t ON t.id = b.lx_balagha_ref
        WHERE b.id LIKE ?
        UNION ALL
       SELECT g.id, t.id, t.name_ar, t.name_en, t.category_key
         FROM qr_ss_scope_grammar_link g
         JOIN ar_ling_gram_term t ON t.id = g.lx_grammar_ref
        WHERE g.id LIKE ?`,
      [`QR:BL:${surahId}:%`, `QR:GR:${surahId}:%`],
    ).catch(() => []);
    const conceptOf = new Map(drivers.map((d) => [d.link_id, d]));

    // The passage's comprehension questions. They have no tab of their own, and
    // they belong to the passage rather than to a sentence, so they travel with
    // this step and the client shows them as one more lens.
    const questions = await query<{
      id: string; ayah_from: number | null; ayah_to: number | null;
      question_type: string; question_en: string; question_ar: string | null;
      answer_md: string | null; difficulty: string; sort_order: number;
    }>(
      this.db,
      `SELECT id, ayah_from, ayah_to, question_type, question_en, question_ar,
              answer_md, difficulty, sort_order
         FROM qr_study_question
        WHERE passage_id = ? AND status != 'deleted'
        ORDER BY sort_order, id`,
      [p.id],
    ).catch(() => []);

    // A passage with no ladder of its own — a derived passage, or a curated one whose
    // build-up is not written yet — gets the lenses the sources give it: how the four
    // boundary tafsīrs divide it, its opening and cue, Ibn ʿĀshūr's turns, Maududi, and
    // the translations (study-derived.ts). Each is marked source: 'derived'.
    const hasLadder = buildup.length > 0 || !!rendering;
    const derivedSections = hasLadder ? [] : await derivedStructureSections(this.db, p);
    const allSections = [
      ...sections.map((s) => ({ ...s, source: 'tables' })),
      ...derivedSections,
    ];
    if (!hasLadder && units.length === 0 && allSections.length === 0 && questions.length === 0) return null;

    // The lens deck, composed here rather than in the client: only lenses with something
    // under them, the first one the app opens on first. A lens is keyed by its section's id,
    // which is how the app keys the section (two naẓm relations share a section_key). The
    // ladder's and the questions' names are rows (qr_study_label 'passage_lens'),
    // English-primary with the Arabic as the gloss.
    const lensNames = byKey((await labels({ DB_QR: this.db } as unknown as QuranEnv)).passage_lens);
    const named = (key: string, fallback: string) => {
      const l = lensNames.get(key);
      return { label: l?.label ?? fallback, labelAr: l?.labelAr ?? null, labelEn: l?.label ?? fallback };
    };
    const lenses = [
      ...(hasLadder
        ? [{ key: 'ladder', ...named('ladder', 'Ladder'),
             count: buildup.length || null, tone: 'gold', enabled: true }]
        : []),
      ...allSections.map((s) => ({
        key: s.id,
        label: s.badge && allSections.filter((o) => o.badge === s.badge).length > 1 && s.title
          ? s.title : (s.badge || s.title),
        labelAr: null as string | null,
        labelEn: s.title,
        count: null as number | null,
        tone: s.tone,
        enabled: true,
        source: s.source,
      })),
      ...(questions.length > 0
        ? [{ key: 'questions', ...named('questions', 'Questions'),
             count: questions.length, tone: 'gold', enabled: true }]
        : []),
    ];

    return {
      step: 'passage_structure',
      source: derivedSections.length === 0 ? 'tables'
        : (hasLadder || sections.length > 0 || questions.length > 0) ? 'mixed' : 'derived',
      passage_id: p.id,
      lenses,
      sections: allSections,
      questions: questions.map((q) => ({
        id:         q.id,
        ayahFrom:   q.ayah_from,
        ayahTo:     q.ayah_to,
        type:       q.question_type,
        difficulty: q.difficulty,
        questionEn: q.question_en,
        questionAr: q.question_ar,
        answerMd:   q.answer_md,
      })),
      surah: surahId,
      passage: p.passage_no,
      ayahFrom: p.ayah_from,
      ayahTo: p.ayah_to,
      rendering,
      renderingParts,
      units,
      buildup: orderedBuildup,
      ladder,
      nuances: nuances.map((n) => ({ ...n, fork: parseJson(n.fork as string | null) })),
      decisions: decisions.map((d) => ({
        ...d,
        rendered: parseJson(d.rendered as string | null),
        rationale: parseJson(d.rationale as string | null),
        concepts: String(d.driverRef ?? '')
          .split(';')
          .map((ref) => conceptOf.get(ref.trim()))
          .filter((c): c is NonNullable<typeof c> => Boolean(c))
          .map((c) => ({ ref: c.gt_id, nameAr: c.name_ar, nameEn: c.name_en, category: c.category })),
      })),
    };
  }

  /// The mufassirun on this passage, one reading per work: the stance and
  /// thesis the reading was built on, then its sections in the order they were
  /// written. Straight from qr_scholar_passage_reading / _section — a reading
  /// with no sections yet still returns, because the thesis alone is worth
  /// reading and the section count says what is still missing.
  async scholarshipStep(surahId: number, passageNo: PassageRef) {
    const p = await this.resolve(surahId, passageNo);
    if (!p) return null;

    const readings = await query<{
      id: string; source_slug: string; author_name_ar: string | null;
      author_name_en: string | null; death_year_hijri: number | null;
      reading_stance: string | null; thesis_ar: string | null; thesis_en: string | null;
      summary_en: string | null; summary_ar: string | null;
      section_count: number; key_notes_json: string | null;
    }>(
      this.db,
      `SELECT id, source_slug, author_name_ar, author_name_en, death_year_hijri,
              reading_stance, thesis_ar, thesis_en, summary_en, summary_ar,
              section_count, key_notes_json
         FROM qr_scholar_passage_reading
        WHERE passage_ref = ? AND status != 'deleted'
        ORDER BY death_year_hijri, source_slug`,
      [p.id],
    ).catch(() => []);
    // No reading written for this passage (a derived passage, or a curated one not reached
    // yet): each tafsīr's own discussion of the range, opening verbatim (study-derived.ts).
    if (!readings.length) return (await derivedScholarship(this.db, p)) ?? undefined;

    const sections = await query<{
      tafsir_id: string; id: string; section_ord: number;
      heading_en: string; heading_ar: string; ayah_anchor: string | null;
      section_kind: string | null; verdict: string; body_en: string | null;
      body_ar: string | null; quote_ar: string | null;
    }>(
      this.db,
      `SELECT tafsir_id, id, section_ord, heading_en, heading_ar, ayah_anchor,
              section_kind, verdict, body_en, body_ar, quote_ar
         FROM qr_scholar_passage_section
        WHERE tafsir_id IN (SELECT value FROM json_each(?))
        ORDER BY tafsir_id, section_ord`,
      [JSON.stringify(readings.map((r) => r.id))],
    ).catch(() => []);

    return {
      step:       'scholarship',
      source:     'tables',
      passage_id: p.id,
      surah:      p.surah_id,
      ayah_from:  p.ayah_from,
      ayah_to:    p.ayah_to,
      readings: readings.map((r) => ({
        id:            r.id,
        slug:          r.source_slug,
        authorEn:      r.author_name_en,
        authorAr:      r.author_name_ar,
        died:          r.death_year_hijri,
        stance:        r.reading_stance,
        thesisEn:      r.thesis_en,
        thesisAr:      r.thesis_ar,
        summaryEn:     r.summary_en,
        summaryAr:     r.summary_ar,
        sectionCount:  r.section_count,
        keyNotes:      parseJson(r.key_notes_json),
        // Lifted out of key_notes so the client does not have to know the
        // shape: the reading's own English line, and the axes on which it
        // parts from the others.
        derivedLineEn: nonBlank((asRec(parseJson(r.key_notes_json))?.['derived_line_en']) ?? null),
        axes: (() => {
          const notes = asRec(parseJson(r.key_notes_json));
          const raw = notes?.['divergence_axes'];
          if (!Array.isArray(raw)) return [];
          return raw.map((entry) => {
            const a = asRec(entry) ?? {};
            const names = (v: unknown) =>
              Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string')
              : typeof v === 'string' ? [v] : [];
            return {
              axis:       nonBlank(a['axis']),
              spanAr:     nonBlank(a['span_ar']),
              position:   nonBlank(a['position']),
              enEffect:   nonBlank(a['en_effect']),
              section:    nonBlank(a['section']),
              against:    names(a['against']),
              agreesWith: names(a['agrees_with']),
              silent:     names(a['silent']),
              uniqueTo:   nonBlank(a['unique_to']),
            };
          });
        })(),
        sections: sections
          .filter((x) => x.tafsir_id === r.id)
          .map((x) => ({
            id:        x.id,
            ord:       x.section_ord,
            headingEn: x.heading_en,
            headingAr: x.heading_ar,
            ayah:      x.ayah_anchor,
            kind:      x.section_kind,
            verdict:   x.verdict,
            bodyEn:    x.body_en,
            bodyAr:    x.body_ar,
            quoteAr:   x.quote_ar,
          })),
      })),
    };
  }

  /**
   * Every place a GT concept is referenced, for the term's own page.
   *
   * A concept is not only a definition — it is the set of passages that turned
   * out to need it. Balagha and grammar rows name the term against a sentence,
   * tree nodes name it against a word, and a translation decision names it as
   * the reason a phrase reads the way it does. All of them resolve through the
   * sentence to the passage that holds it, so each reference can be followed
   * back to where it was used.
   */
  async termReferences(gtId: string) {
    // The fallbacks are typed: `.catch(() => [])` widens a result to
    // `Row[] | never[]`, and pushing into that union takes `never`.
    type TermRef = {
      kind: string; ref_id: string; scope_id: string; surah: number;
      ayah_from: number; ayah_to: number; label: string | null;
    };
    type Passage = {
      id: string; surah: number; passage_no: number; ayah_from: number;
      ayah_to: number; title: string | null;
    };
    const rows = await query<TermRef>(
      this.db,
      `SELECT 'balagha' AS kind, b.id AS ref_id, b.scope_id, s.surah,
              s.ayah_from, s.ayah_to, b.rhetorical_effect AS label
         FROM qr_ss_scope_balagha_link b
         JOIN qr_ss_occ_sentence s ON s.id = b.scope_id
        WHERE b.lx_balagha_ref = ?
        UNION ALL
       SELECT 'grammar', g.id, g.scope_id, s.surah, s.ayah_from, s.ayah_to,
              g.application_note
         FROM qr_ss_scope_grammar_link g
         JOIN qr_ss_occ_sentence s ON s.id = g.scope_id
        WHERE g.lx_grammar_ref = ?
        UNION ALL
       SELECT 'word', n.id, n.tree_id, s.surah, s.ayah_from, s.ayah_to, n.node_label
         FROM qr_ss_tree_node n
         JOIN qr_ss_tree t ON t.id = n.tree_id
         JOIN qr_ss_occ_sentence s ON s.id = t.sentence_id
        WHERE n.gram_term_ref = ?
        UNION ALL
       SELECT 'sentence', s.id, s.id, s.surah, s.ayah_from, s.ayah_to, s.discourse_role
         FROM qr_ss_occ_sentence s
        WHERE s.gt_sentence_class = ?`,
      [gtId, gtId, gtId, gtId],
    ).catch((): TermRef[] => []);
    if (!rows.length) return { term: gtId, total: 0, passages: [] };

    const surahs = [...new Set(rows.map((r) => r.surah))];
    const passages = await query<Passage>(
      this.db,
      `SELECT id, surah, passage_no, ayah_from, ayah_to, title_en AS title
         FROM qr_surah_study_passage
        WHERE surah IN (SELECT value FROM json_each(?)) AND status != 'deleted'
        ORDER BY surah, passage_no`,
      [JSON.stringify(surahs)],
    ).catch((): Passage[] => []);

    // Group by the passage each reference falls inside; a reference whose ayah
    // sits outside every passage is still reported, keyed by its ayah, rather
    // than dropped for want of a passage row.
    const buckets = new Map<string, {
      passage: Passage | null; surah: number;
      ayahFrom: number; refs: TermRef[];
    }>();
    for (const r of rows) {
      const p = passages.find(
        (x) => x.surah === r.surah && r.ayah_from >= x.ayah_from && r.ayah_to <= x.ayah_to,
      ) ?? null;
      const key = p ? p.id : `${r.surah}:${r.ayah_from}`;
      const bucket = buckets.get(key)
        ?? { passage: p, surah: r.surah, ayahFrom: r.ayah_from, refs: [] as TermRef[] };
      bucket.refs.push(r);
      buckets.set(key, bucket);
    }

    return {
      term: gtId,
      total: rows.length,
      passages: [...buckets.values()]
        .sort((a, b) => a.surah - b.surah || a.ayahFrom - b.ayahFrom)
        .map((b) => ({
          passageId:  b.passage?.id ?? null,
          passageNo:  b.passage?.passage_no ?? null,
          title:      b.passage?.title ?? null,
          surah:      b.surah,
          ayahFrom:   b.passage?.ayah_from ?? b.ayahFrom,
          ayahTo:     b.passage?.ayah_to ?? b.ayahFrom,
          references: b.refs.map((r) => ({
            kind:  r.kind,
            id:    r.ref_id,
            ayah:  r.ayah_from,
            label: r.label,
          })),
        })),
    };
  }

  async expressionsStep(surahId: number, passageNo: PassageRef, al: AlClient | null) {
    const p = await this.resolve(surahId, passageNo);
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
      passage: p.passage_no,
      ayahFrom: p.ayah_from,
      ayahTo: p.ayah_to,
      items,
    };
  }

  async sentenceStructureStep(surahId: number, passageNo: PassageRef) {
    const passage = await this.resolve(surahId, passageNo);
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
        step: 'sentence_structure', surah, passage: passage.passage_no,
        ayahFrom: from, ayahTo: to,
        termColors: {}, terms: [], sentences: [],
      };
    }

    // eslint-disable-next-line prefer-const
    let [sentRows, clauseRows, phraseRows, wordRows, irabRows, balaghaRows, ellipsisRows, tafsirRows, treeRows, nodeRows, termRows, irabAyahRows, grammarRows, readingRows, foldRows, decisionRows, sarfRows] =
      await Promise.all([
        query<{ id: string; ayah_from: number; ayah_to: number; word_start_index: number | null;
                word_end_index: number | null; sentence_kind: string | null;
                discourse_role: string | null; note_md: string | null;
                gt_sentence_class: string | null; gt_kalam_kind: string | null;
                gt_sentence_role: string | null; source_basis: string | null }>(
          this.db,
          `SELECT id, ayah_from, ayah_to, word_start_index, word_end_index,
                  sentence_kind, discourse_role, note_md,
                  -- A sentence is classified on three different questions:
                  -- what it is BUILT from (اسمية / فعلية / شرطية), what it
                  -- DOES (خبرية / إنشائية، طلبي / غير طلبي), and where it SITS
                  -- in the iʿrāb (خبر، حال، صفة، مضاف إليه — or لا محل لها).
                  -- All three are GT ids.
                  gt_sentence_class, gt_kalam_kind, gt_sentence_role, source_basis
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
        // A phrase is the smallest scope the SS layer classifies, and it is
        // where a naḥw or balāgha point about مِن or an iḍāfa actually belongs.
        // The board draws tree nodes, not phrases, so the two are matched on
        // the words they cover further down.
        query<{ id: string; clause_id: string; ayah: number; phrase_order: number;
                word_start_index: number; word_end_index: number;
                phrase_type: string | null; phrase_function: string | null }>(
          this.db,
          `SELECT id, clause_id, ayah, phrase_order, word_start_index, word_end_index,
                  phrase_type, phrase_function
           FROM qr_ss_occ_phrase
           WHERE surah = ? AND ayah BETWEEN ? AND ?
           ORDER BY ayah, phrase_order`,
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
                category: string | null; effect: string | null; note: string | null;
                gloss: string | null }>(
          this.db,
          `SELECT scope_type, scope_id, lx_balagha_ref AS ref,
                  balagha_category AS category, rhetorical_effect AS effect, note_md AS note,
                  gloss_json AS gloss
           FROM qr_ss_scope_balagha_link
           WHERE scope_id IN (SELECT id FROM qr_ss_occ_clause WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ?)
           UNION ALL
           SELECT scope_type, scope_id, lx_balagha_ref AS ref,
                  balagha_category AS category, rhetorical_effect AS effect, note_md AS note,
                  gloss_json AS gloss
           FROM qr_ss_scope_balagha_link
           WHERE scope_id IN (SELECT id FROM qr_ss_occ_sentence WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ?)
           UNION ALL
           SELECT scope_type, scope_id, lx_balagha_ref AS ref,
                  balagha_category AS category, rhetorical_effect AS effect, note_md AS note,
                  gloss_json AS gloss
           FROM qr_ss_scope_balagha_link
           WHERE scope_id IN (SELECT id FROM qr_ss_occ_phrase WHERE surah = ? AND ayah BETWEEN ? AND ?)`,

          [surah, from, to, surah, from, to, surah, from, to],
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
            WHERE scope_id IN (SELECT id FROM qr_word_occurrence WHERE surah = ? AND ayah BETWEEN ? AND ?)
            UNION ALL
           SELECT scope_type, scope_id, lx_grammar_ref AS ref,
                  COALESCE(application_note, note_md) AS note, gloss_json AS gloss
             FROM qr_ss_scope_grammar_link
            WHERE scope_id IN (SELECT id FROM qr_ss_occ_phrase WHERE surah = ? AND ayah BETWEEN ? AND ?)`,
          [surah, from, to, surah, from, to, surah, from, to, surah, from, to],
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
        query<{ ayah: number; seq: number | null; span: string;
                rendered: string | null; driver_kind: string; driver_ref: string }>(
          this.db,
          // A rendering decision is keyed to the Arabic span it applies to, so
          // a node can be given its own English rather than its sentence's.
          `SELECT ayah, step_seq AS seq, target_span_ar AS span,
                  rendered_json AS rendered, driver_kind, driver_ref
             FROM qr_ss_translation_decision
            WHERE surah = ? AND ayah BETWEEN ? AND ? AND status = 'live'
            ORDER BY ayah, step_seq`,
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

    // Curated sentences win. The Jadwal-derived layer (isDerivedSs) fills the āyāt no one has
    // authored; where an āyah has authored sentences, any derived sentence on it is left out,
    // and its clauses, phrases, trees and the points filed on them go with it.
    {
      const derivedTree = new Set(treeRows.filter((t) => isDerivedSs(null, null, t.grounding)).map((t) => t.sentence_id));
      const isDer = (r: { id: string; source_basis: string | null }) =>
        isDerivedSs(r.id, r.source_basis) || derivedTree.has(r.id);
      const curatedAyat = new Set<number>();
      for (const r of sentRows) if (!isDer(r)) for (let a = r.ayah_from; a <= r.ayah_to; a++) curatedAyat.add(a);
      const dropped = new Set(sentRows
        .filter((r) => isDer(r) && [...Array(r.ayah_to - r.ayah_from + 1).keys()].some((k) => curatedAyat.has(r.ayah_from + k)))
        .map((r) => r.id));
      if (dropped.size) {
        const clauses = new Set(clauseRows.filter((c) => dropped.has(c.sentence_id)).map((c) => c.id));
        const phrases = new Set(phraseRows.filter((ph) => clauses.has(ph.clause_id)).map((ph) => ph.id));
        const trees = new Set(treeRows.filter((t) => dropped.has(t.sentence_id)).map((t) => t.id));
        const gone = (id: string | null) => !!id && (dropped.has(id) || clauses.has(id) || phrases.has(id));
        sentRows = sentRows.filter((r) => !dropped.has(r.id));
        clauseRows = clauseRows.filter((c) => !clauses.has(c.id));
        phraseRows = phraseRows.filter((ph) => !phrases.has(ph.id));
        treeRows = treeRows.filter((t) => !trees.has(t.id));
        nodeRows = nodeRows.filter((n) => !trees.has(n.tree_id));
        balaghaRows = balaghaRows.filter((b) => !gone(b.scope_id));
        ellipsisRows = ellipsisRows.filter((e) => !dropped.has(e.sentence_id) && !gone(e.scope_id));
        grammarRows = grammarRows.filter((g) => !gone(g.scope_id));
        readingRows = readingRows.filter((r) => !gone(r.scope_id));
        foldRows = foldRows.filter((x) => !gone(x.scope_id));
      }
    }

    // The derived layer's own notes, where its tables exist: each iʿrāb book's statement on a
    // clause (qr_ss_clause_reading) and Jadwal's ṣarf, balāgha and fawāʾid notes on a clause
    // or a word (qr_ss_book_note). Absent tables read as nothing.
    const clauseIds = JSON.stringify(clauseRows.map((c) => c.id));
    const [clauseReadings, bookNotes] = await Promise.all([
      clauseRows.length
        ? query<JsonRecord>(this.db,
            `SELECT * FROM qr_ss_clause_reading WHERE clause_id IN (SELECT value FROM json_each(?))`,
            [clauseIds]).catch(() => [] as JsonRecord[])
        : Promise.resolve([] as JsonRecord[]),
      query<JsonRecord>(this.db,
        `SELECT * FROM qr_ss_book_note
          WHERE scope_id IN (SELECT value FROM json_each(?))
             OR scope_id IN (SELECT id FROM qr_word_occurrence WHERE surah = ? AND ayah BETWEEN ? AND ?)`,
        [clauseIds, surah, from, to]).catch(() => [] as JsonRecord[]),
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
        if (c.word_start_index != null && c.word_end_index != null
            && c.ayah_to !== c.ayah_from && isDerivedSs(c.id, null)) {
          // A derived clause running across āyāt: word_start_index is in ayah_from and
          // word_end_index in ayah_to.
          const lo = c.ayah_from * 1000 + c.word_start_index, hi = c.ayah_to * 1000 + c.word_end_index;
          for (const w of wordRows) {
            const at = w.ayah * 1000 + w.word_index;
            if (at >= lo && at <= hi) words.push(buildWord(w));
          }
        } else if (c.word_start_index != null && c.word_end_index != null) {
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
      balagha: { ref: string | null; category: string | null; effect: string | null;
                 note: string | null; gloss: unknown }[];
      irab:    { ref: string; fn: string | null; position: string | null; sign: string | null;
                 fnRef: string | null; positionRef: string | null; signRef: string | null;
                 disputed: boolean; dispute: string | null; note: string | null }[];
      hadhf:   { type: string; elided: string; effect: string | null; note: string | null }[];
    }
    const layersByScope: Record<string, ScopeLayers> = {};
    const layersFor = (scopeId: string): ScopeLayers =>
      (layersByScope[scopeId] ??= { nahw: [], balagha: [], irab: [], hadhf: [] });

    for (const g of grammarRows) {
      layersFor(g.scope_id).nahw.push({
        ref: g.ref, note: g.note, gloss: parseJson(g.gloss),
      });
    }
    for (const b of balaghaRows) {
      layersFor(b.scope_id).balagha.push({
        ref: b.ref, category: b.category, effect: b.effect, note: b.note,
        gloss: parseJson(b.gloss),
      });
    }
    // What was left out is a point about the part it was left out of, so an
    // ellipsis event is filed on its own scope — the clause, phrase or word —
    // not only on the sentence that contains it.
    for (const e of ellipsisRows) {
      if (!e.scope_id) continue;
      layersFor(e.scope_id).hadhf.push({
        type: e.ellipsis_type, elided: e.elided_element, effect: e.effect, note: e.note,
      });
    }
    // The function, case and sign come free-form (Arabic, slugs, English phrases). Each is
    // looked up among the registry's spellings, in the categories its slot names (ss_slot
    // labels); the term's Arabic name and colour are what the reader is shown.
    const ssLabels = await labels({ DB_QR: this.db } as unknown as QuranEnv);
    const slots: GtSlots = Object.fromEntries((ssLabels.ss_slot ?? []).map((l) =>
      [l.key, Array.isArray(l.extra?.['categories']) ? (l.extra!['categories'] as string[]) : []]));
    const aliasRows = await query<GtAliasRow>(this.db,
      `SELECT alias_bare, term_id, category_key FROM ar_ling_gram_term_alias`, []).catch(() => [] as GtAliasRow[]);
    const gt = makeGtResolver(aliasRows, slots);
    for (const m of sarfRows) {
      layersFor(m.scope_id).irab.push({
        ref: m.ref, fn: m.fn, position: m.position, sign: m.sign,
        fnRef: gt('function', m.fn), positionRef: gt('position', m.position), signRef: gt('sign', m.sign),
        disputed: !!m.disputed, dispute: m.dispute, note: m.note,
      });
    }

    // The SS layer classifies phrases and clauses; the board draws tree nodes.
    // They are the same stretch of Arabic under two names, so a point filed on
    // a phrase is republished under the node covering it — otherwise a note
    // about مِن sits in the database and never reaches the card that is tapped.
    //
    // Matching is on the words themselves rather than on indexes: the tree
    // hangs the particle off its own phrase node without giving it a leaf, so
    // «مِنَ اللَّهِ» and the phrase spanning words 3–4 agree on text but not on
    // the set of leaves.
    const bare = (text: string): string =>
      [...text].filter((ch) => {
        const c = ch.codePointAt(0)!;
        return !((c >= 0x064b && c <= 0x0652) || c === 0x0670 || c === 0x0640
                 || (c >= 0x06d6 && c <= 0x06ed) || ch === ' ');
      }).join('')
        .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

    const nodeByText = new Map<string, string>();
    for (const n of nodeRows) {
      const key = bare(n.node_label ?? '');
      if (key && !nodeByText.has(key)) nodeByText.set(key, n.id);
    }
    const rootNodeOfSentence = new Map<string, string>();
    for (const n of nodeRows) {
      if (n.parent_node_id) continue;
      const tree = treeRows.find((t) => t.id === n.tree_id);
      if (tree && !rootNodeOfSentence.has(tree.sentence_id)) {
        rootNodeOfSentence.set(tree.sentence_id, n.id);
      }
    }
    const textOfSpan = (ayah: number, start: number | null, end: number | null): string | null => {
      if (start == null || end == null) return null;
      const parts: string[] = [];
      for (let i = start; i <= end; i++) {
        const w = wordByPos.get(`${ayah}:${i}`);
        if (w) parts.push(w.word_text);
      }
      return parts.length ? bare(parts.join(' ')) : null;
    };
    const republish = (scopeId: string, nodeId: string | undefined) => {
      const src = layersByScope[scopeId];
      if (!src || !nodeId || nodeId === scopeId) return;
      const dst = layersFor(nodeId);
      for (const n of src.nahw)    if (!dst.nahw.some((x) => x.ref === n.ref)) dst.nahw.push(n);
      for (const b of src.balagha) if (!dst.balagha.some((x) => x.ref === b.ref)) dst.balagha.push(b);
      for (const h of src.hadhf)   if (!dst.hadhf.some((x) => x.type === h.type)) dst.hadhf.push(h);
    };
    for (const ph of phraseRows) {
      const key = textOfSpan(ph.ayah, ph.word_start_index, ph.word_end_index);
      republish(ph.id, key ? nodeByText.get(key) : undefined);
    }
    for (const c of clauseRows) {
      // A clause that is the whole sentence is the board's root card; a clause
      // inside one ayah is matched on its words like a phrase.
      const key = c.ayah_from === c.ayah_to
        ? textOfSpan(c.ayah_from, c.word_start_index, c.word_end_index)
        : null;
      republish(c.id, (key ? nodeByText.get(key) : undefined)
        ?? (c.parent_clause_id ? undefined : rootNodeOfSentence.get(c.sentence_id)));
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

    // The ledger is shaped here, not in the app. A passage carries well over
    // a hundred readings and most are bare role stamps — one book naming one
    // word's function, which no one disputes and no one discusses — so the
    // groups below arrive ordered, labelled and already stripped of them, and
    // the app only draws what it is given.
    const READING_QUESTION_ORDER = [
      'synthesis', 'irab', 'qiraat', 'qiraah', 'tafsir',
      'balagha', 'sarf', 'lugha', 'theology', 'dalala', 'tarjama',
    ];
    const READING_QUESTION_AR: Record<string, string> = {
      synthesis: 'الخلاصة', irab: 'الإعراب', qiraat: 'القراءة', qiraah: 'القراءة',
      tafsir: 'التفسير', balagha: 'البلاغة', sarf: 'الصرف', lugha: 'اللغة',
      theology: 'العقيدة', dalala: 'الدلالة', tarjama: 'الترجمة',
    };
    const isRoleStamp = (en: string | null) =>
      !!en && /^i\s*[ʿʻ'`]?\s*r[āa]b\s+role\b/i.test(en.trim());

    // Settled first, then the faces that diverge, then the rest — and within
    // each, the reading more books stand behind.
    const readingTier = (r: (typeof readings)[number]) =>
      r.isSelected ? 0 : (r.isContested || r.isMinority) ? 1 : 2;

    const byQuestion = new Map<string, typeof readings>();
    for (const r of readings) {
      const key = r.question ?? '—';
      const list = byQuestion.get(key) ?? [];
      list.push(r);
      byQuestion.set(key, list);
    }

    let readingsHeld = 0;
    const readingGroups = [...byQuestion.entries()]
      .map(([question, all]) => {
        const discussed = all.filter((r) => !isRoleStamp(r.en));
        readingsHeld += all.length - discussed.length;
        discussed.sort((a, b) => {
          const t = readingTier(a) - readingTier(b);
          return t !== 0 ? t : (b.witnesses ?? 0) - (a.witnesses ?? 0);
        });
        return {
          question,
          labelAr: READING_QUESTION_AR[question] ?? question,
          total: all.length,
          readings: discussed,
        };
      })
      .filter((g) => g.readings.length > 0)
      .sort((a, b) => {
        const ra = READING_QUESTION_ORDER.indexOf(a.question);
        const rb = READING_QUESTION_ORDER.indexOf(b.question);
        const na = ra < 0 ? READING_QUESTION_ORDER.length : ra;
        const nb = rb < 0 ? READING_QUESTION_ORDER.length : rb;
        return na === nb ? a.question.localeCompare(b.question) : na - nb;
      });

    // Every book a reading cites, resolved to its own title, badge colour and
    // glyph from the two display registries. A book's colour is a fact about
    // the book and already lives beside it in D1, so it travels with the
    // payload rather than being invented client-side from its slug. Readings
    // cite iʿrāb books by slug and tafsīr works by id, so both columns are
    // matched in both tables.
    const citedBooks = [...new Set(readings.flatMap((r) => r.sources))];
    const books: Record<string, BookBadge> = {};
    if (citedBooks.length) {
      // One bound list (json_each), not a placeholder per book: D1 binds at most 100.
      const cited = JSON.stringify(citedBooks);
      const rows = await query<BookRow>(
        this.db,
        `SELECT id, source_slug, book_title_ar, book_title_en, badge_color, badge_glyph
           FROM qr_irab_book_display_source
          WHERE source_slug IN (SELECT value FROM json_each(?1)) OR id IN (SELECT value FROM json_each(?1))
          UNION ALL
         SELECT id, source_slug, book_title_ar, book_title_en, badge_color, badge_glyph
           FROM qr_tafsir_book_display_source
          WHERE source_slug IN (SELECT value FROM json_each(?1)) OR id IN (SELECT value FROM json_each(?1))`,
        [cited],
      ).catch(() => [] as BookRow[]);
      for (const b of rows) {
        const badge: BookBadge = {
          titleAr: b.book_title_ar,
          titleEn: b.book_title_en,
          color: b.badge_color,
          glyph: b.badge_glyph,
        };
        if (b.source_slug) books[b.source_slug] = badge;
        if (b.id) books[b.id] = badge;
      }
    }

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

    const body = {
      layersByScope,
      readings,
      readingGroups,
      readingsHeld,
      books,
      fold,
      decisions: decisionRows.map((d) => ({
        ayah: d.ayah,
        seq: d.seq,
        spanAr: d.span,
        rendered: parseJson(d.rendered),
        driverKind: d.driver_kind,
        driverRef: d.driver_ref,
      })),
      sentences,
      ...(clauseReadings.length ? { clauseReadings } : {}),
      ...(bookNotes.length ? { bookNotes } : {}),
      // Every word the tab shows that is not a registry term: its lenses, strips, key-note
      // bands and its own words, and how the prose names a source (hidden with Sources off).
      labels: {
        lens: ssLabels.ss_lens ?? [],
        layer: ssLabels.ss_layer ?? [],
        keynote: ssLabels.ss_keynote ?? [],
        ui: ssLabels.ss_ui ?? [],
        ellipsis: ssLabels.ss_ellipsis ?? [],
      },
      sourceNames: [...new Set((ssLabels.source_name ?? []).flatMap((l) => [
        l.label, l.labelAr,
        ...(Array.isArray(l.extra?.['also']) ? (l.extra!['also'] as string[]) : []),
      ]).filter((n): n is string => !!n))],
    };

    // A step stays under ~200 KB. The per-āyah layers (each book's iʿrāb of the āyah, each
    // tafsīr's opening on it) are repeated on every sentence of the āyah; past the budget they
    // travel on the āyah's first sentence only, and past it again the tafsīr openings are cut
    // to 400 characters. What was trimmed is said in `trimmed`.
    const trimmed: string[] = [];
    const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).length;
    if (bytes(body) > SS_BUDGET) {
      const firstOf = new Map<number, unknown>();
      for (const x of sentences as JsonRecord[]) {
        const a = Number(x['ayah']);
        if (firstOf.has(a)) {
          x['tafsir'] = [];
          x['irabAnalysis'] = [];
          x['ayahLayersOn'] = firstOf.get(a);
        } else {
          firstOf.set(a, x['id']);
        }
      }
      trimmed.push('per_ayah_layers_on_first_sentence');
    }
    const cut = (t: unknown, n: number) =>
      typeof t === 'string' && t.length > n ? `${t.slice(0, n)} …` : t;
    for (const n of [400, 200]) {
      if (bytes(body) <= SS_BUDGET) break;
      for (const x of sentences as JsonRecord[]) {
        if (Array.isArray(x['tafsir'])) {
          x['tafsir'] = (x['tafsir'] as JsonRecord[]).map((e) => ({ ...e, text: cut(e['text'], n) }));
        }
        if (Array.isArray(x['irabAnalysis'])) {
          x['irabAnalysis'] = (x['irabAnalysis'] as JsonRecord[]).map((e) => ({ ...e, text: cut(e['text'], n * 2) }));
        }
      }
      trimmed.push(`openings_cut_${n}`);
    }
    if (bytes(body) > SS_BUDGET) {
      // Last: the per-āyah tafsīr openings go (the scholarship step carries them), and each
      // iʿrāb book keeps its parse — role, case, place — without its running text.
      for (const x of sentences as JsonRecord[]) {
        x['tafsir'] = [];
        if (Array.isArray(x['irabAnalysis'])) {
          x['irabAnalysis'] = (x['irabAnalysis'] as JsonRecord[]).map((e) => ({ ...e, text: null }));
        }
      }
      trimmed.push('tafsir_openings_and_irab_text_dropped');
    }
    if (trimmed.length) (body as JsonRecord)['trimmed'] = trimmed;

    // Only the terms (and colours) this passage names, with the terms above
    // them: the registry is ~500 terms and ~700 colours, a passage uses a
    // few dozen, and the app only ever looks them up by ref or key.
    const text = JSON.stringify(body);
    const byRef = new Map(terms.map((t) => [t.ref, t]));
    const keep = new Set(terms.filter((t) => text.includes(t.ref) || (!!t.key && text.includes(t.key))).map((t) => t.ref));
    for (const ref of [...keep]) {
      let up = byRef.get(ref)?.parentRef;
      while (up && !keep.has(up) && byRef.has(up)) { keep.add(up); up = byRef.get(up)?.parentRef; }
    }
    const usedTerms = terms.filter((t) => keep.has(t.ref));
    const usedColors: Record<string, string> = {};
    for (const t of usedTerms) {
      if (termColors[t.ref]) usedColors[t.ref] = termColors[t.ref];
      if (t.key && termColors[t.key]) usedColors[t.key] = termColors[t.key];
    }
    for (const [k, v] of Object.entries(termColors)) if (!(k in usedColors) && text.includes(k)) usedColors[k] = v;

    return {
      step:      'sentence_structure',
      surah,
      passage:   passage.passage_no,
      ayahFrom:  from,
      ayahTo:    to,
      termColors: usedColors,
      terms: usedTerms,
      ...body,
    };
  }

  async stepData(
    surahId: number,
    passageNo: PassageRef,
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
      case 'scholarship':        return this.scholarshipStep(surahId, passageNo);
      default: {
        const task = await this.taskByStepType(surahId, passageNo, stepType);
        if (task === null) return null;
        if (task === undefined) return undefined;
        return { step: stepType, source: 'tasks', task };
      }
    }
  }

  async passageMorphology(surahId: number, passageNo: PassageRef): Promise<PassageMorphology | null> {
    const passage = await this.resolve(surahId, passageNo);
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

  private _memo = new Map<string, Promise<unknown>>();
  private _once<T>(key: string, f: () => Promise<T>): Promise<T> {
    let v = this._memo.get(key) as Promise<T> | undefined;
    if (!v) { v = f(); this._memo.set(key, v); }
    return v;
  }

  private _surahHead(surahId: number) {
    return this._once(`head:${surahId}`, () => queryOne<{ ayahs: number; name_ar: string | null; name_en: string | null }>(
      this.db, `SELECT ayah_count AS ayahs, name_ar, name_en FROM qr_surah WHERE id = ?`, [surahId],
    ).catch(() => null));
  }

  /// A passage no one has curated, as a row the steps read like any other: keyed by its range,
  /// numbered by its place in the atlas's list, status 'derived'.
  private _derivedRow(
    surahId: number,
    head: { name_ar: string | null; name_en: string | null } | null,
    u: { no: number; from: number; to: number; title?: string | null; titleAr?: string | null; basis?: unknown },
  ): PassageRow {
    return {
      id: `derived:${surahId}:${u.from}-${u.to}`,
      surah_id: surahId,
      passage_no: u.no,
      ayah_from: u.from,
      ayah_to: u.to,
      title: u.title ?? null,
      title_ar: u.titleAr ?? null,
      theme: null,
      status: 'derived',
      name_ar: head?.name_ar ?? null,
      name_en: head?.name_en ?? null,
      basis: u.basis ?? null,
    };
  }

  /// The surah's passages as the atlas lists them (atlas-layers.ts atlasUnits): the curated
  /// rows, and derived passages (qr_surah_passage_proposal) wherever the curated ones leave
  /// āyāt uncovered, ordered by āyah. A wholly curated surah is its curated rows.
  units(surahId: number): Promise<PassageRow[]> {
    return this._once(`units:${surahId}`, async () => {
      const [curated, head] = await Promise.all([this._passages(surahId), this._surahHead(surahId)]);
      const cur = curated.map((c) => ({ no: c.passage_no, from: c.ayah_from, to: c.ayah_to, row: c }));
      if (!head || coversSurah(cur, Number(head.ayahs))) {
        return [...curated].sort((a, b) => a.ayah_from - b.ayah_from);
      }
      const env = { DB_QR: this.db } as unknown as QuranEnv;
      const units = await atlasUnits(env, surahId, Number(head.ayahs), cur, () => []);
      return units.map((u) => ('derived' in u && u.derived === true)
        ? this._derivedRow(surahId, head, u)
        : (u as unknown as { row: PassageRow }).row);
    });
  }

  /// One passage, however it is asked for — the one resolver every step uses.
  ///   "7"      the curated passage numbered 7; where none is, the 7th unit of the atlas's list
  ///   "12-18"  the curated passage spanning exactly 12–18; else the atlas's unit with that
  ///            range; else, for a range inside the surah, that range studied as asked
  async resolve(surahId: number, ref: PassageRef): Promise<PassageRow | null> {
    const key = String(ref).trim();
    const range = /^(\d+)-(\d+)$/.exec(key);
    const curated = await this._passages(surahId);
    if (!range) {
      if (!/^\d+$/.test(key)) return null;
      const n = Number(key);
      if (n < 1) return null;
      const c = curated.find((p) => p.passage_no === n);
      if (c) return c;
      return (await this.units(surahId))[n - 1] ?? null;
    }
    const from = Number(range[1]), to = Number(range[2]);
    const c = curated.find((p) => p.ayah_from === from && p.ayah_to === to);
    if (c) return c;
    const head = await this._surahHead(surahId);
    if (!head || from < 1 || to < from || to > Number(head.ayahs)) return null;
    const units = await this.units(surahId);
    const hit = units.find((u) => u.ayah_from === from && u.ayah_to === to);
    if (hit) return hit;
    if (to - from >= 60) return null;
    const at = units.findIndex((u) => u.ayah_from <= from && u.ayah_to >= from);
    return this._derivedRow(surahId, head, { no: at + 1, from, to, title: null });
  }

  private _passages(surahId: number): Promise<PassageRow[]> {
    return this._once(`passages:${surahId}`, () => this._passagesUncached(surahId));
  }

  private async _passagesUncached(surahId: number): Promise<PassageRow[]> {
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
    const [ayahs, translations, words, rec] = await Promise.all([
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
      query<{ ayah: number; start_ms: number; end_ms: number; segments_json: string | null; audio_url: string }>(
        this.db,
        `SELECT a.ayah, a.start_ms, a.end_ms, a.segments_json, r.audio_url
           FROM qr_recitation_ayah a
           JOIN qr_recitation r ON r.reciter_id = a.reciter_id AND r.surah = a.surah
          WHERE a.reciter_id = ? AND a.surah = ? AND a.ayah BETWEEN ? AND ?`,
        [READING_RECITER, passage.surah_id, passage.ayah_from, passage.ayah_to],
      ).catch(() => []),
    ]);

    const transByAyah = new Map(translations.map(t => [t.ayah, t.text]));
    const recByAyah = new Map(rec.map(r => [r.ayah, r]));

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
      const r = recByAyah.get(a.ayah);
      // Each word with its time, only where the segments number the āyah's words as the
      // corpus does (as atlas.ts passageSlice); a word the reciter repeats keeps its first time.
      let segs: number[][] = [];
      try { segs = r?.segments_json ? JSON.parse(r.segments_json) : []; } catch { segs = []; }
      const at = new Map<number, number[]>();
      for (const x of segs) if (Array.isArray(x) && !at.has(x[0])) at.set(x[0], x);
      const ws = wordsByAyah.get(a.ayah) ?? [];
      const aligned = ws.length > 0 && at.size === ws.length && ws.every((w) => at.has(w.position));
      const timed = aligned
        ? ws.map((w) => { const t = at.get(w.position)!; return { ...w, start: t[1] / 1000, end: t[2] / 1000 }; })
        : ws;
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
        words:       timed,
        translation: transByAyah.get(a.ayah) ?? null,
        audio:       r ? { url: r.audio_url, start: r.start_ms / 1000, end: r.end_ms / 1000 } : null,
      };
    });
  }

  /** The vocabulary of a passage, resolved the one way both routes use.
   *
   * A morphology task is a descriptor, not content: it says how to find the
   * words (`resolve`), how complete that answer is (`availability`, `pending`)
   * and what it draws on (`sources`). Inline `items[]` are the older payload
   * model and are still honoured while a task carries them. */
  async vocabulary(surahId: number, passageNo: PassageRef): Promise<MorphologyVocabulary | null> {
    const passage = await this.resolve(surahId, passageNo);
    if (!passage) return null;
    return this._morphologyFor(passage, await this._tasks(passage.id));
  }

  private async _morphologyFor(passage: PassageRow, tasks: StudyTask[]): Promise<MorphologyVocabulary> {
    const live = (t: StudyTask) => t.status !== 'retired';
    const morph = tasks.find(t => t.task_type === 'morphology' && live(t));

    // 1. No morphology task: the passage's own words, split by part of speech.
    //    This fallback serves every passage that has no task and must stay.
    if (!morph) {
      return { ...(await this._wordsAsVocabulary(passage)), resolved_by: 'pos_fallback' };
    }

    const descriptor = asRec(parseJson(morph.task_json)) ?? {};
    const meta = {
      task_id:      morph.task_id,
      resolve:      nonBlank(descriptor['resolve']),
      availability: nonBlank(descriptor['availability']),
      depth_level:  nonBlank(descriptor['depth_level']),
      // A partial answer that says it is partial: passed through, never dropped.
      pending:      strList(descriptor['pending']),
      sources:      strList(descriptor['sources']),
    };

    // 2. Inline items (payload model v1). Retired children are the superseded
    //    model and do not count.
    const inline = vocabularyFromMorphology([{ ...morph, children: (morph.children ?? []).filter(live) }]);
    if (inline.nouns.length || inline.verbs.length) {
      // Every word carries all its properties: each inline item sits on its
      // occurrence row (matched by āyah and word position), and what the item
      // itself says is kept on top.
      const full = await this._wordsAsVocabulary(passage, { depth: meta.depth_level });
      const byPlace = new Map<string, JsonRecord>();
      for (const w of [...full.nouns, ...full.verbs]) byPlace.set(`${w['ayah']}:${w['position']}`, w);
      const merge = (item: JsonRecord): JsonRecord => ({
        ...(byPlace.get(`${item['ayah']}:${item['word_index'] ?? item['position']}`) ?? {}),
        ...withReadingFacts(item),
      });
      return {
        nouns: inline.nouns.map(merge),
        verbs: inline.verbs.map(merge),
        resolved_by: 'inline_items',
        ...meta,
      };
    }

    // 3. The descriptor's resolver.
    if (meta.resolve === 'by_ayah_range') {
      return {
        ...(await this._wordsAsVocabulary(passage, { depth: meta.depth_level })),
        resolved_by: 'by_ayah_range',
        ...meta,
      };
    }

    // 4. A verb this reader does not know. No strategy is guessed.
    return { nouns: [], verbs: [], resolved_by: 'unsupported', ...meta };
  }

  /** The `by_ayah_range` resolver: every word of the passage with all it carries.
   *
   * `gt_readings_json` is authoritative. `gt_derivation_type` is a convenience
   * copy and is NULL by design whenever there is more than one reading
   * (AGR:QUR:001): a contested word is shown as contested, never collapsed to
   * one reading. `rank` inside the readings is presentation order, not a
   * verdict. GT ids are returned as stored (`GT:jumud:mushtaqq`). */
  private async _wordsAsVocabulary(passage: PassageRow, opts: { depth?: string | null } = {}) {
    const rows = await query<WordOccurrenceRow>(
      this.db,
      `SELECT id            AS word_id,
              ayah,
              word_index    AS position,
              word_text     AS word,
              word_text_bare AS simple,
              lemma,
              root,
              pos,
              stem_pos,
              morphology_tag,
              morphology_tag_json,
              root_uid,
              lemma_ref,
              gid_root,
              gid_lemma,
              stem_form_ar,
              stem_lemma_ar,
              stem_root_ar,
              form_roman,
              segment_count,
              prefix_count,
              suffix_count,
              has_det_prefix,
              has_pron_suffix,
              is_content_word,
              is_promoted,
              gt_case,
              gt_definiteness,
              gt_number,
              gt_gender,
              gt_person,
              gt_voice,
              gt_tense,
              gt_mood,
              gt_jumud,
              gt_derivation_type,
              gt_form_family,
              gt_readings_json
       FROM qr_word_occurrence
       WHERE surah = ? AND ayah BETWEEN ? AND ?
       ORDER BY ayah, word_index`,
      [passage.surah_id, passage.ayah_from, passage.ayah_to],
    );

    const words = rows.map(w => shapeWord(w, opts.depth ?? null));
    return {
      nouns: words.filter(w => posGroup(posCode(w)) === 'noun'),
      verbs: words.filter(w => posGroup(posCode(w)) === 'verb'),
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
      // Passage-structure cards are authored per study passage in
      // qr_passage_section; project the passage's own span so the same
      // overlap test below lights the flag.
      query<{ ayah_from: number; ayah_to: number }>(
        this.db,
        `SELECT DISTINCT p.ayah_from, p.ayah_to
           FROM qr_passage_section s
           JOIN qr_surah_study_passage p ON p.id = s.passage_id
          WHERE p.surah = ? AND s.status = 'active'`,
        [surahId],
      ).catch(() => []).then(rows => ['passage_structure', rows] as const),
      query<{ ayah_from: number; ayah_to: number }>(
        this.db,
        `SELECT DISTINCT ayah_from, ayah_to
           FROM qr_scholar_passage_reading
          WHERE surah = ? AND status != 'deleted'`,
        [surahId],
      ).catch(() => []).then(rows => ['scholarship', rows] as const),
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

  /// Which steps hold AUTHORED rows for each passage, matched the way the steps read them:
  /// the structure lenses by passage id (qr_passage_section) or a translation build-up inside
  /// the range, the mufassir readings by passage id, the sentence structure by curated
  /// (non-derived) sentences inside the range.
  private async _builtFlags(surahId: number, passages: PassageRow[]): Promise<Map<string, Set<string>>> {
    const [sections, ladders, readings, sentences] = await Promise.all([
      query<{ passage_id: string }>(this.db,
        `SELECT DISTINCT s.passage_id FROM qr_passage_section s
           JOIN qr_surah_study_passage p ON p.id = s.passage_id
          WHERE p.surah = ? AND s.status = 'active'`, [surahId]).catch(() => []),
      query<{ ayah_from: number; ayah_to: number }>(this.db,
        `SELECT DISTINCT ayah_from, ayah_to FROM qr_ss_translation_passage WHERE surah = ?`, [surahId]).catch(() => []),
      query<{ passage_ref: string }>(this.db,
        `SELECT DISTINCT passage_ref FROM qr_scholar_passage_reading WHERE surah = ? AND status != 'deleted'`,
        [surahId]).catch(() => []),
      query<{ id: string; ayah_from: number; ayah_to: number; basis: string | null }>(this.db,
        `SELECT id, ayah_from, ayah_to, source_basis AS basis FROM qr_ss_occ_sentence WHERE surah = ?`,
        [surahId]).catch(() => []),
    ]);
    const sec = new Set(sections.map((r) => r.passage_id));
    const rd = new Set(readings.map((r) => r.passage_ref));
    const curatedSs = sentences.filter((r) => !isDerivedSs(r.id, r.basis));
    const out = new Map<string, Set<string>>();
    for (const p of passages) {
      const set = new Set<string>();
      if (sec.has(p.id) || ladders.some((l) => l.ayah_from >= p.ayah_from && l.ayah_to <= p.ayah_to)) {
        set.add('passage_structure');
      }
      if (rd.has(p.id)) set.add('scholarship');
      if (curatedSs.some((r) => r.ayah_from >= p.ayah_from && r.ayah_to <= p.ayah_to)) set.add('sentence_structure');
      out.set(p.id, set);
    }
    return out;
  }

  /// The āyāt of the surah the AL expressions layer (ar_ling_root_lemma_tabir) names, or
  /// null when AL is not asked — one read for the whole surah, not one per passage.
  private async _expressionAyat(surahId: number, passages: PassageRow[], al: AlClient | null): Promise<Set<number> | null> {
    if (!al || !passages.length) return null;
    const to = Math.max(...passages.map((p) => p.ayah_to));
    try {
      const res = await al.getExpressionsByQuran(surahId, 1, to);
      return new Set((res.data ?? []).map((x) => Number((x as { ayah?: unknown }).ayah)).filter(Number.isFinite));
    } catch {
      return null;
    }
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
              SUM(CASE WHEN code IN ('N', 'PN', 'ADJ') THEN 1 ELSE 0 END) AS nouns,
              SUM(CASE WHEN code = 'V' THEN 1 ELSE 0 END) AS verbs
       FROM (
         -- the same grouping as posGroup(posCode(w)): the pos code, else stem_pos
         SELECT ayah,
                UPPER(COALESCE(CASE WHEN pos <> '' AND pos NOT GLOB '*[^A-Z]*' THEN pos END, stem_pos, pos, '')) AS code
         FROM qr_word_occurrence
         WHERE surah = ?
       )
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

/// The size a morphology step is kept under (bytes of JSON).
const MORPH_BUDGET = 190_000;

/// The size a sentence-structure step's body is kept under (bytes of JSON; the terms it
/// names are added after, ~30 KB), so the whole step stays under ~200 KB.
const SS_BUDGET = 165_000;

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

/// A book as the reading ledger shows it: its own title in both scripts and
/// the badge it is already drawn with elsewhere in the app.
interface LadderSentenceRow {
  id: string;
  ayah: number;
  ayahTo: number;
  unitId: string | null;
  literalEn: string | null;
  fluentEn: string | null;
  noteAr: string | null;
  synthesis: string | null;
}

interface LadderNodeRow {
  sentenceId: string;
  id: string;
  parentId: string | null;
  depth: number;
  ord: number;
  arabic: string | null;
  termRef: string | null;
  termKey: string | null;
  irabAr: string | null;
  gloss: string | null;
}

interface BookBadge {
  titleAr: string | null;
  titleEn: string | null;
  color: string | null;
  glyph: string | null;
}

interface BookRow {
  id: string | null;
  source_slug: string | null;
  book_title_ar: string | null;
  book_title_en: string | null;
  badge_color: string | null;
  badge_glyph: string | null;
}

interface WordOccurrenceRow {
  word_id: string; ayah: number; position: number;
  word: string; simple: string | null;
  lemma: string | null; root: string | null; pos: string | null; stem_pos: string | null;
  morphology_tag: string | null; morphology_tag_json: string | null;
  root_uid: string | null; lemma_ref: string | null; gid_root: string | null; gid_lemma: string | null;
  stem_form_ar: string | null; stem_lemma_ar: string | null; stem_root_ar: string | null; form_roman: string | null;
  segment_count: number | null; prefix_count: number | null; suffix_count: number | null;
  has_det_prefix: number | null; has_pron_suffix: number | null;
  is_content_word: number | null; is_promoted: number | null;
  gt_case: string | null; gt_definiteness: string | null; gt_number: string | null; gt_gender: string | null;
  gt_person: string | null; gt_voice: string | null; gt_tense: string | null; gt_mood: string | null;
  gt_jumud: string | null; gt_derivation_type: string | null; gt_form_family: string | null;
  gt_readings_json: string | null;
}

export interface MorphologyVocabulary {
  nouns: JsonRecord[];
  verbs: JsonRecord[];
  /** How the words were found: pos_fallback | inline_items | by_ayah_range | unsupported. */
  resolved_by: 'pos_fallback' | 'inline_items' | 'by_ayah_range' | 'unsupported';
  task_id?: string;
  resolve?: string | null;
  availability?: string | null;
  depth_level?: string | null;
  pending?: string[];
  sources?: string[];
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function flag(v: number | null): boolean | null {
  return v === null || v === undefined ? null : v === 1;
}

/** One word of a passage with every property the occurrence table holds. */
export function shapeWord(w: WordOccurrenceRow, depth: string | null): JsonRecord {
  const readings = (() => {
    const parsed = parseJson(w.gt_readings_json);
    return Array.isArray(parsed) ? parsed.filter((r): r is JsonRecord => !!asRec(r)) : [];
  })();
  const facts = readingFacts(readings);
  return {
    word_id:         w.word_id,
    ayah:            w.ayah,
    position:        w.position,
    word:            w.word,
    simple:          w.simple,
    lemma:           w.lemma,
    root:            w.root,
    pos:             w.pos,
    stem_pos:        w.stem_pos,
    depth_level:     depth,
    is_content_word: flag(w.is_content_word),
    is_promoted:     flag(w.is_promoted),
    root_uid:        w.root_uid,
    lemma_ref:       w.lemma_ref,
    gid_root:        w.gid_root,
    gid_lemma:       w.gid_lemma,
    morphology_tag:  w.morphology_tag,
    morphology:      asRec(parseJson(w.morphology_tag_json)) ?? parseJson(w.morphology_tag_json),
    stem: {
      form_ar:  w.stem_form_ar,
      lemma_ar: w.stem_lemma_ar,
      root_ar:  w.stem_root_ar,
      form_roman: w.form_roman,
    },
    segments: {
      count:           w.segment_count,
      prefixes:        w.prefix_count,
      suffixes:        w.suffix_count,
      has_det_prefix:  flag(w.has_det_prefix),
      has_pron_suffix: flag(w.has_pron_suffix),
    },
    case:         w.gt_case,
    definiteness: w.gt_definiteness,
    number:       w.gt_number,
    gender:       w.gt_gender,
    person:       w.gt_person,
    voice:        w.gt_voice,
    tense:        w.gt_tense,
    mood:         w.gt_mood,
    jumud:        w.gt_jumud,
    // Never the answer when the readings disagree: NULL by design then.
    derivation:   readings.length > 1 ? null : w.gt_derivation_type,
    form_family:  w.gt_form_family,
    readings,
    ...facts,
  };
}

/** What the readings say about a word, whichever payload carried them. */
function readingFacts(readings: JsonRecord[]): { contested: boolean; citation_count: number } {
  // Distinct citations across every reading: the same source cited for two
  // readings (al-Rāzī on التوب at 40:3) is one citation of the word.
  const citations = new Set<string>();
  for (const r of readings) {
    for (const src of Array.isArray(r['sources']) ? r['sources'] : []) {
      const rec = asRec(src);
      if (rec) citations.add(`${nonBlank(rec['slug']) ?? ''}|${nonBlank(rec['cite']) ?? ''}`);
    }
  }
  return { contested: readings.length > 1, citation_count: citations.size };
}

/** An inline item (payload model v1) with the same reading facts a resolved word carries. */
function withReadingFacts(item: JsonRecord): JsonRecord {
  const readings = Array.isArray(item['readings']) ? item['readings'].filter((r): r is JsonRecord => !!asRec(r)) : [];
  return { ...item, ...readingFacts(readings) };
}

/** The part-of-speech code posGroup reads. Most surahs carry the code in `pos`
 *  (N, PN, ADJ, V); some carry a word there ("noun", "verb") or nothing, and
 *  keep the code in `stem_pos` (Yūsuf 12:1-7). */
function posCode(w: JsonRecord): string | null {
  const pos = nonBlank(w['pos']);
  return pos && /^[A-Z]+$/.test(pos) ? pos : nonBlank(w['stem_pos']) ?? pos;
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
      parent_task_id: nonBlank(row.parent_task_id),
      task_type:     String(row.task_type ?? ''),
      task_name:     nonBlank(row.task_key),
      display_order: asNum(row.display_order),
      status:        nonBlank(row.status),
      task_json:     parseJson(row.payload_json),
      updated_at:    nonBlank(row.updated_at),
      children:      [],
    });
  }

  for (const task of byId.values()) {
    // A row that names itself as its parent (44:1-9's morphology task) would
    // become its own child and vanish from the tree; it is top level.
    if (task.parent_task_id && task.parent_task_id !== task.task_id && byId.has(task.parent_task_id)) {
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
    nouns: items.filter(i => nonBlank(i['pos'])?.toLowerCase() === 'noun'),
    verbs: items.filter(i => nonBlank(i['pos'])?.toLowerCase() === 'verb'),
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
        expression_id:      nonBlank(row['ar_u_expression']) ?? nonBlank(row['expression_id']) ?? '',
        ayah:               Number(row['ayah'] ?? 0),
        label:              nonBlank(row['label']),
        text:               nonBlank(row['text_ar']) ?? nonBlank(row['text']),
        expression_type:    nonBlank(row['expression_type']),
        expression_meaning: nonBlank(row['expression_meaning']) ?? nonBlank(row['meaning']),
        gloss:              nonBlank(row['gloss_primary']) ?? nonBlank(row['gloss']),
      });
    }
  }

  return rows.sort((a, b) => Number(a.ayah ?? 0) - Number(b.ayah ?? 0));
}
