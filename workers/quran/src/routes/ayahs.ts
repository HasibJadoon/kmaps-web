import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import { AyahRepo } from '../repositories/ayah.repo';
import { validateAyahPatch } from '../schemas/ayah.schema';

export function ayahRoutes(router: Router<QuranEnv>) {

  router.get('/qr/ayahs', async (req, env) => {
    const url = new URL(req.url);
    const surah = parseIntParam(url.searchParams.get('surah') ?? '');
    if (!surah) return badRequest('surah query param is required');

    const repo      = new AyahRepo(env.DB_QR);
    const withWords = url.searchParams.get('words') === '1';
    const fromStr   = url.searchParams.get('from');
    const toStr     = url.searchParams.get('to');
    const hasRange  = fromStr && toStr;

    let ayahs;
    if (hasRange) {
      const from = parseIntParam(fromStr);
      const to   = parseIntParam(toStr);
      if (!from || !to || to < from) return badRequest('Invalid from/to range');
      ayahs = await repo.byRange(surah, from, to);
    } else {
      ayahs = await repo.bySurah(surah);
    }

    if (!withWords) return ok(ayahs);

    const rawWords = hasRange
      ? await repo.wordsByRange(surah,
          parseIntParam(fromStr) ?? 1,
          parseIntParam(toStr)   ?? 999)
      : await repo.wordsBySurah(surah);

    const wordMap = new Map<number, typeof rawWords>();
    for (const w of rawWords) {
      if (!wordMap.has(w.ayah)) wordMap.set(w.ayah, []);
      wordMap.get(w.ayah)!.push(w);
    }

    return ok(ayahs.map(a => ({ ...a, words: wordMap.get(a.ayah) ?? [] })));
  });

  // An āyah, or a run of them, as a reference opens it: the muṣḥaf text, the default English, the sūra's names.
  //   GET /qr/ayah-range/40/1/3   (an essay's (40:1–3) link, com.kmaps.app://quran/40/1-3)
  router.get('/qr/ayah-range/:surah/:from/:to', async (_req, env, { surah, from, to }) => {
    const s = parseIntParam(surah), a = parseIntParam(from), b = parseIntParam(to);
    if (!s || !a || !b || b < a || b - a > 40) return badRequest('Invalid range');
    const [ayat, sura] = await Promise.all([
      env.DB_QR.prepare(
        `SELECT q.ayah, q.text_display AS ar,
                (SELECT t.translation_text FROM qr_translation t JOIN qr_translation_source ts ON ts.id = t.source_id AND ts.is_default = 1
                  WHERE t.surah = q.surah AND t.ayah = q.ayah LIMIT 1) AS en
           FROM qr_ayah q WHERE q.surah = ? AND q.ayah BETWEEN ? AND ? ORDER BY q.ayah`).bind(s, a, b).all(),
      env.DB_QR.prepare('SELECT id, name_ar, name_en FROM qr_surah WHERE id = ?').bind(s).first(),
    ]);
    if (!ayat.results.length) return notFound(`ayah ${s}:${a}`);
    return ok({ surah: s, from: a, to: b, surahAr: (sura as { name_ar?: string } | null)?.name_ar ?? null,
                surahEn: (sura as { name_en?: string } | null)?.name_en ?? null, ayat: ayat.results });
  });

  router.get('/qr/ayahs/:surah/:ayah', async (_req, env, { surah, ayah }) => {
    const s = parseIntParam(surah);
    const a = parseIntParam(ayah);
    if (!s || !a) return badRequest('Invalid surah or ayah');

    const row = await new AyahRepo(env.DB_QR).find(s, a);
    return row ? ok(row) : notFound(`ayah ${surah}:${ayah}`);
  });

  router.patch('/qr/ayahs/:surah/:ayah', async (req, env, { surah, ayah }) => {
    const s = parseIntParam(surah);
    const a = parseIntParam(ayah);
    if (!s || !a) return badRequest('Invalid surah or ayah');

    const body = await req.json();
    const result = validateAyahPatch(body);
    if ('error' in result) return badRequest(result.error);

    const updated = await new AyahRepo(env.DB_QR).update(s, a, result.data);
    return updated ? ok(updated) : notFound(`ayah ${surah}:${ayah}`);
  });
}
