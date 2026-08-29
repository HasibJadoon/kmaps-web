// ─── /qr/study routes — Surah-centered study runtime ──────────────────────────
// All SQL lives in StudyRepo. Routes only parse params and delegate.
//
// GET /qr/study/surahs/:surahId                                   — grid overview
// GET /qr/study/surahs/:surahId/passages                          — passage list
// GET /qr/study/surahs/:surahId/passages/:passageNo               — passage + steps
// GET /qr/study/surahs/:surahId/passages/:passageNo/lesson        — full lesson
// GET /qr/study/surahs/:surahId/passages/:passageNo/vocabulary    — nouns + verbs
// GET /qr/study/surahs/:surahId/passages/:passageNo/expressions   — expression list
// GET /qr/study/surahs/:surahId/passages/:passageNo/tasks         — full task tree
// GET /qr/study/surahs/:surahId/passages/:passageNo/steps/:stepType       — lazy step data (tables)
// GET /qr/study/surahs/:surahId/passages/:passageNo/steps/:stepType/tasks

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { parseIntParam } from '../../../shared/src/validate';
import { cached } from '../../../shared/src/cache';
import type { QuranEnv } from '../env';
import {
  StudyRepo,
  vocabularyFromMorphology,
  expressionsFromTasks,
} from '../repositories/study.repo';
import { MorphDisplayRepo } from '../repositories/morph-display.repo';
import { createAlClient } from '../clients/al.client';

function parseSurahPassage(
  surahId: string,
  passageNo: string,
): { s: number; p: number } | null {
  const s = parseIntParam(surahId);
  const p = parseIntParam(passageNo);
  if (!s || !p) return null;
  return { s, p };
}

/**
 * Study content is authored, not live: a passage's reading, morphology, iʿrāb
 * and balāgha change when someone builds them and not otherwise. Four hours in
 * the browser, a day at the edge — and the ETag in `cached()` makes the
 * revalidation after that free.
 */
const CORPUS_TTL = { browser: 14400, edge: 86400 };

export function studyRoutes(router: Router<QuranEnv>) {

  // ── What build the corpus is on ─────────────────────────────────────────────
  // The client keeps authored content on disk indefinitely — it does not go
  // stale on a clock, because it does not change on a clock. This is what tells
  // it when the corpus HAS changed, so a phone holding last month's build drops
  // it on the next launch instead of showing it until someone pulls to refresh.
  //
  // Short TTL on purpose: it is a few bytes and it gates everything else.
  router.get('/qr/corpus-version', (req, env) =>
    cached(req, async () => {
      const row = await new StudyRepo(env.DB_QR).corpusVersion();
      return ok(row);
    }, { browser: 300, edge: 300 }),
  );

  // ── Study grid — passage list enriched with task-type flags and vocab counts ─

  // Corpus content: it changes on an authoring run, not per request. Edge-cached
  // like the morph grid, with `?refresh=1` as the bypass.
  router.get('/qr/study/surahs/:surahId', (req, env, { surahId }) =>
    cached(req, async () => {
      const s = parseIntParam(surahId);
      if (!s) return badRequest('Invalid surahId');
      const data = await new StudyRepo(env.DB_QR).grid(s);
      return data ? ok(data) : notFound(`study grid for surah ${s}`);
    }, CORPUS_TTL),
  );

  // ── Passage list ─────────────────────────────────────────────────────────────

  router.get('/qr/study/surahs/:surahId/passages', async (_req, env, { surahId }) => {
    const s = parseIntParam(surahId);
    if (!s) return badRequest('Invalid surahId');
    return ok(await new StudyRepo(env.DB_QR).passages(s));
  });

  // ── Passage detail (metadata + step list) ────────────────────────────────────
  // Returns the passage row plus all steps via task tree root-type enumeration.

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo',
    async (_req, env, { surahId, passageNo }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');

      const repo     = new StudyRepo(env.DB_QR);
      const passages = await repo.passages(sp.s);
      const passage  = passages.find(p => p.passage_no === sp.p);
      if (!passage) return notFound(`passage ${sp.s}:${sp.p}`);

      // Cheap step-type availability (no task_json load) for passage selection.
      const stepTypes = await repo.stepTypes(sp.s, sp.p) ?? [];

      return ok({ passage, step_types: stepTypes });
    },
  );

  // ── Unique roots of a passage, from the verses themselves ───────────────────
  // GET /qr/study/surahs/:surahId/passages/:passageNo/roots
  // One row per DISTINCT root in the passage's āyāt (qr_word_occurrence).

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo/roots',
    async (_req, env, { surahId, passageNo }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');
      const roots = await new StudyRepo(env.DB_QR).passageRoots(sp.s, sp.p);
      return roots ? ok(roots) : notFound(`passage ${sp.s}:${sp.p}`);
    },
  );

  // ── Full lesson — ayahs + vocabulary + expressions + tasks ───────────────────

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo/lesson',
    async (_req, env, { surahId, passageNo }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');
      const data = await new StudyRepo(env.DB_QR).lesson(sp.s, sp.p);
      return data ? ok(data) : notFound(`lesson ${sp.s}:${sp.p}`);
    },
  );

  // ── Vocabulary — nouns and verbs for a passage ───────────────────────────────
  // Prefers morphology task payloads (richer); falls back to raw word table.

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo/vocabulary',
    async (_req, env, { surahId, passageNo }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');

      const repo  = new StudyRepo(env.DB_QR);
      const tasks = await repo.allTasks(sp.s, sp.p);
      if (tasks === null) return notFound(`passage ${sp.s}:${sp.p}`);

      return ok(vocabularyFromMorphology(tasks));
    },
  );

  // ── Morphology (API 1) — every word in the passage as a built card ───────────
  // Basic + aesthetic vocab list: surface, lemma, root, pos, QAC sarf, iʿrāb
  // colour-chip, segments. Built from the relational tables; works for any surah.

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo/morphology',
    async (_req, env, { surahId, passageNo }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');
      const data = await new StudyRepo(env.DB_QR).passageMorphology(sp.s, sp.p);
      return data ? ok(data) : notFound(`passage ${sp.s}:${sp.p}`);
    },
  );

  // ── Morphology display layer — the WORD view straight from qr_morph_display_* ─
  // Render-ready, trilingual, tier-merged blocks. The morphology step's grid and
  // deep word modal both bind to these with zero UI logic.

  // `?from=&to=` narrows to one passage's āyāt. Without them the whole surah
  // comes back, as before — but a passage view should send them: the lemma tier
  // now resolves across a service boundary, and a surah is ~30× the lemmas a
  // passage needs. Edge-cached because the composed result changes only when AL
  // content does; `?refresh=1` bypasses it after an ingest.
  router.get('/qr/study/morph/grid/:surahId', (req, env, { surahId }) =>
    cached(req, async () => {
      const s = parseIntParam(surahId);
      if (!s) return badRequest('Invalid surahId');
      const url = new URL(req.url);
      const from = parseIntParam(url.searchParams.get('from') ?? '');
      const to = parseIntParam(url.searchParams.get('to') ?? '');
      // The full resolved lemma tier — senses, arcs, governance, furūq, taʿbīr —
      // was 62% of this response's bytes and no client decoded it: a passage of
      // 106 words shipped 104 copies of 70 distinct lemmas. It is opt-in now.
      // The tier is still *resolved* either way; gloss, wazn, form and
      // root_meaning are all derived from it. Only the echo is gone.
      const includeLemma = (url.searchParams.get('include') ?? '')
        .split(',').map((s) => s.trim()).includes('lemma');
      const repo = new MorphDisplayRepo(env.DB_QR, createAlClient(env));
      return ok(await repo.grid(s, from ?? undefined, to ?? undefined, { includeLemma }));
    }, CORPUS_TTL),
  );

  router.get(
    '/qr/study/morph/word/:surahId/:ayahNo/:wordIndex',
    async (_req, env, { surahId, ayahNo, wordIndex }) => {
      const s = parseIntParam(surahId), a = parseIntParam(ayahNo), w = parseIntParam(wordIndex);
      if (!s || !a || w == null) return badRequest('Invalid surah/ayah/wordIndex');
      const data = await new MorphDisplayRepo(env.DB_QR).wordView(s, a, w);
      return data ? ok(data) : notFound(`morph word ${s}:${a}:${w}`);
    },
  );

  // ── Word detail (API 2) — the deep modal for one clicked word ────────────────
  // Occurrence card + tafsīr for its ayah + the AL root analysis (5 lenses, hook,
  // senses, constellation, illustration). AL is best-effort — never blocks.

  router.get('/qr/study/words/:wordId', async (_req, env, { wordId }) => {
    if (!wordId) return badRequest('wordId is required');
    const repo = new StudyRepo(env.DB_QR);
    const word = await repo.wordById(wordId);
    if (!word) return notFound(`word ${wordId}`);

    const [ayah, tafsir] = await Promise.all([
      repo.ayahContext(word.surah, word.ayah),
      repo.tafsirForAyah(word.surah, word.ayah),
    ]);

    let root_analysis: unknown = null;
    const al = createAlClient(env);
    if (al && word.root) {
      try {
        const res = await al.getWordAnalysis([word.root]);
        root_analysis = res?.data?.[word.root] ?? null;
      } catch { root_analysis = null; }
    }

    return ok({ word, ayah, tafsir, root_analysis });
  });

  // ── Expressions ───────────────────────────────────────────────────────────────

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo/expressions',
    async (_req, env, { surahId, passageNo }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');

      const repo  = new StudyRepo(env.DB_QR);
      const tasks = await repo.allTasks(sp.s, sp.p);
      if (tasks === null) return notFound(`passage ${sp.s}:${sp.p}`);

      return ok(expressionsFromTasks(tasks));
    },
  );

  // ── Full task tree ────────────────────────────────────────────────────────────

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo/tasks',
    async (_req, env, { surahId, passageNo }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');

      const tasks = await new StudyRepo(env.DB_QR).allTasks(sp.s, sp.p);
      if (tasks === null) return notFound(`passage ${sp.s}:${sp.p}`);
      return ok(tasks);
    },
  );

  // ── Lazy per-step data (table-sourced) ───────────────────────────────────────
  // Loads ONLY the selected step's data, built from the normalized tables (not
  // task_json) for migrated steps (reading, comprehension). The study module
  // calls this when a step is opened, so each step lazy-loads its own payload.

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo/steps/:stepType',
    (req, env, { surahId, passageNo, stepType }) =>
      cached(req, async () => {
        const sp = parseSurahPassage(surahId, passageNo);
        if (!sp) return badRequest('Invalid surahId or passageNo');
        if (!stepType) return badRequest('stepType is required');

        const result = await new StudyRepo(env.DB_QR).stepData(
          sp.s, sp.p, stepType, createAlClient(env),
        );
        if (result === null)      return notFound(`passage ${sp.s}:${sp.p}`);
        if (result === undefined) return notFound(`step '${stepType}' in passage ${sp.s}:${sp.p}`);
        return ok(result);
      }, CORPUS_TTL),
  );

  // ── Tasks by step type ────────────────────────────────────────────────────────
  // Returns the matching root task (with its children subtree) for the given
  // step type (reading, morphology, sentence_structure, expressions, etc.).

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo/steps/:stepType/tasks',
    async (_req, env, { surahId, passageNo, stepType }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');
      if (!stepType) return badRequest('stepType is required');

      const result = await new StudyRepo(env.DB_QR).taskByStepType(sp.s, sp.p, stepType);
      if (result === null)  return notFound(`passage ${sp.s}:${sp.p}`);
      if (result === undefined) return notFound(`step type '${stepType}' in passage ${sp.s}:${sp.p}`);
      return ok(result);
    },
  );
}
