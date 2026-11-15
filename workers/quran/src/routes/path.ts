import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import { softFail } from '../../../shared/src/soft-fail';
import type { QuranEnv } from '../env';
import { SurahRepo } from '../repositories/surah.repo';

// ── The Qurʾān day by day, by surah — the front door ─────────────────────────
// Owner 2026-11-11: "Surah → day → the same 4 final artifacts and audio … this will cover the entire Qurʾān", and "put
// this in Quran … what's best for the architecture". QR owns the structure (the 114 surahs, their study passages); AR owns
// the content (the days' four pieces, their final films per language — /ar/quran/path…). These routes merge the two, so
// the app's Quran section talks to one worker. The app only renders.

type Surah = { id: number; name_ar: string; name_en: string; name_transliteration?: string | null; ayah_count: number;
               name_ar_vowelled?: string | null; name_translit?: string | null; name_meaning_en?: string | null };
const surahOut = (s: Surah) => ({ no: s.id, nameAr: s.name_ar_vowelled || s.name_ar, nameEn: s.name_meaning_en || s.name_en,
                                   translit: s.name_translit || s.name_transliteration || s.name_en, ayahs: s.ayah_count });

async function fromArabic<T>(env: QuranEnv, path: string, fallback: T): Promise<T> {
  if (!env.ARABIC) return fallback;
  const r = await env.ARABIC.fetch(`https://ar${path}`).then((x) => (x.ok ? (x.json() as Promise<{ data?: T }>) : { data: fallback }))
    .catch(softFail({ data: fallback }, `ar${path}`));
  return r.data ?? fallback;
}

/// A day's passage "Q 1:1–7" as [from, to] (the to optional).
const rangeOf = (p: string | null | undefined) => {
  const m = /Q\s*\d+\s*:\s*(\d+)(?:\s*[–-]\s*(\d+))?/.exec(p ?? '');
  return m ? [Number(m[1]), Number(m[2] ?? m[1])] as const : null;
};

type Summary = { title: string; titleAr: string; tagline: string; words: Record<string, string>; langs: unknown[];
                 surahs: Array<{ no: number; days: number; cover: string | null }> };
type Days = { surah: number; words: Record<string, string>; langs: unknown[]; days: Array<Record<string, unknown> & { passage?: string | null }> };

export function pathRoutes(router: Router<QuranEnv>) {
  /// All 114 surahs, each with how many days it has; a surah with a day is ready and carries its first day's cover.
  router.get('/qr/path/surahs', async (_req, env) => {
    const [all, sum] = await Promise.all([
      new SurahRepo(env.DB_QR).listAll() as Promise<Surah[]>,
      fromArabic<Summary | null>(env, '/ar/quran/path/summary', null),
    ]);
    const by = new Map((sum?.surahs ?? []).map((s) => [s.no, s]));
    return ok({
      title: sum?.title ?? '', titleAr: sum?.titleAr ?? '', tagline: sum?.tagline ?? '', words: sum?.words ?? {}, langs: sum?.langs ?? [],
      surahs: all.map((s) => {
        const x = by.get(s.id);
        const nd = x?.days ?? 0;
        // the count as the app shows it ("1 day", "12 days") — words from the content side, the grammar here, not in the app
        const daysLabel = nd ? `${nd} ${nd === 1 ? (sum?.words?.dayOne ?? 'day') : (sum?.words?.days ?? 'days')}` : null;
        return { ...surahOut(s), days: nd, daysLabel, ready: nd > 0, cover: x?.cover ?? null };
      }),
    });
  });

  /// One surah: its days with their four pieces and final films per language, each day with its study passage (the
  /// passage of qr_surah_study_passage that covers the most of the day's āyāt), so the app can open it.
  router.get('/qr/path/surahs/:no', async (_req, env, { no }) => {
    const n = Number(no);
    if (!Number.isInteger(n) || n < 1 || n > 114) return notFound('no such surah');
    const [s, got, passages] = await Promise.all([
      new SurahRepo(env.DB_QR).findById(n) as Promise<Surah | null>,
      fromArabic<Days | null>(env, `/ar/quran/path?surah=${n}`, null),
      query<{ id: number; passage_no: number; ayah_from: number; ayah_to: number; label: string | null; title_en: string | null }>(env.DB_QR,
        `SELECT id, passage_no, ayah_from, ayah_to, label, title_en FROM qr_surah_study_passage WHERE surah = ? ORDER BY passage_no`, [n])
        .catch(softFail([] as never[], 'qr_surah_study_passage')),
    ]);
    if (!s) return notFound('no such surah');
    const studyOf = (p: string | null | undefined) => {
      const r = rangeOf(p);
      if (!r) return null;
      let best: (typeof passages)[number] | null = null, cover = 0;
      for (const x of passages) {
        const c = Math.min(r[1], x.ayah_to) - Math.max(r[0], x.ayah_from) + 1;
        if (c > cover) { cover = c; best = x; }
      }
      return best ? { passageId: best.id, passageNo: best.passage_no, ayahFrom: best.ayah_from, ayahTo: best.ayah_to,
                      label: best.title_en || best.label || `${n}:${best.ayah_from}–${best.ayah_to}` } : null;
    };
    return ok({
      surah: surahOut(s), words: got?.words ?? {}, langs: got?.langs ?? [],
      days: (got?.days ?? []).map((d) => ({ ...d, study: studyOf(d.passage) })),
    });
  });
}
