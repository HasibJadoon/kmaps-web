import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { parseIntParam } from '../../../shared/src/validate';
import { cached } from '../../../shared/src/cache';
import type { QuranEnv } from '../env';
import {
  StudyRepo,
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

const CORPUS_TTL = { browser: 14400, edge: 86400 };

// The step payloads are not corpus: the SS, translation and balāgha layers are
// authored, and a row written into D1 has to be readable in the app the same
// minute. A day at the edge meant new analysis sat in the database invisible
// until the cache aged out, which read in the app as a missing feature.
const AUTHORED_TTL = { browser: 30, edge: 60 };

export function studyRoutes(router: Router<QuranEnv>) {

  router.get('/qr/corpus-version', (req, env) =>
    cached(req, async () => {
      const row = await new StudyRepo(env.DB_QR).corpusVersion();
      return ok(row);
    }, { browser: 300, edge: 300 }),
  );

  router.get('/qr/study/surahs/:surahId', (req, env, { surahId }) =>
    cached(req, async () => {
      const s = parseIntParam(surahId);
      if (!s) return badRequest('Invalid surahId');
      const data = await new StudyRepo(env.DB_QR).grid(s);
      return data ? ok(data) : notFound(`study grid for surah ${s}`);
    // The grid's has-flags follow authored rows (sections, sentences, tafsir),
    // so they must age like the step payloads, not like the corpus.
    }, AUTHORED_TTL),
  );

  router.get('/qr/study/surahs/:surahId/passages', async (_req, env, { surahId }) => {
    const s = parseIntParam(surahId);
    if (!s) return badRequest('Invalid surahId');
    return ok(await new StudyRepo(env.DB_QR).passages(s));
  });

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo',
    async (_req, env, { surahId, passageNo }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');

      const repo     = new StudyRepo(env.DB_QR);
      const passages = await repo.passages(sp.s);
      const passage  = passages.find(p => p.passage_no === sp.p);
      if (!passage) return notFound(`passage ${sp.s}:${sp.p}`);

      const stepTypes = await repo.stepTypes(sp.s, sp.p) ?? [];

      return ok({ passage, step_types: stepTypes });
    },
  );

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo/roots',
    async (_req, env, { surahId, passageNo }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');
      const roots = await new StudyRepo(env.DB_QR).passageRoots(sp.s, sp.p);
      return roots ? ok(roots) : notFound(`passage ${sp.s}:${sp.p}`);
    },
  );

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo/lesson',
    async (_req, env, { surahId, passageNo }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');
      const data = await new StudyRepo(env.DB_QR).lesson(sp.s, sp.p);
      return data ? ok(data) : notFound(`lesson ${sp.s}:${sp.p}`);
    },
  );

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo/vocabulary',
    async (_req, env, { surahId, passageNo }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');

      // The same resolver as the lesson route: one passage, one answer.
      const data = await new StudyRepo(env.DB_QR).vocabulary(sp.s, sp.p);
      return data ? ok(data) : notFound(`passage ${sp.s}:${sp.p}`);
    },
  );

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo/morphology',
    async (_req, env, { surahId, passageNo }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');
      const data = await new StudyRepo(env.DB_QR).passageMorphology(sp.s, sp.p);
      return data ? ok(data) : notFound(`passage ${sp.s}:${sp.p}`);
    },
  );

  router.get('/qr/study/morph/grid/:surahId', (req, env, { surahId }) =>
    cached(req, async () => {
      const s = parseIntParam(surahId);
      if (!s) return badRequest('Invalid surahId');
      const url = new URL(req.url);
      const from = parseIntParam(url.searchParams.get('from') ?? '');
      const to = parseIntParam(url.searchParams.get('to') ?? '');

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
      }, AUTHORED_TTL),
  );

  // Linked references for a GT concept: every passage that uses it, and how.
  router.get('/qr/gram/terms/:id/references', (req, env, { id }) =>
    cached(req, async () => {
      if (!id) return badRequest('term id is required');
      return ok(await new StudyRepo(env.DB_QR).termReferences(decodeURIComponent(id)));
    }, AUTHORED_TTL),
  );

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
