import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import { softFail } from '../../../shared/src/soft-fail';
import type { ArabicEnv } from '../env';
import { labels } from '../lib/labels';
import { PATH_PIECES, PATH_WORDS, pathPiece } from './rooms';

// ── The Qurʾān path's content, by surah ──────────────────────────────────────
// Owner 2026-11-11: "Surah → day → the same 4 final artifacts and audio … this will cover the entire Qurʾān". AR owns the
// content: each published day (ar_daily_reading of the 'quran' domain, path-dNNN-<piece>), its three pieces (Story, Series, Poem — owner 2026-11-12) and their
// FINAL films per language (ar_path_film, migration 0090: a phone mp4, the same piece as audio, a poster; each language's
// film is its own — a poem keeps its own poet, bed and look). The quran worker is the front door (/qr/path/surahs…): it
// owns the surahs and passages and merges them with this. The app only renders.

const media = (k: string | null | undefined) => (k ? `/api/ar/audio/${k}` : null);

/// The screens' words (the app shows these, never its own).
const QP_WORDS = { day: PATH_WORDS.day, dayOne: 'day', days: 'days', playAll: 'Play all', listen: 'Listen', watch: 'Watch', read: 'Read', soon: 'Coming soon' };

interface Surah { no: number; nameAr: string; nameEn: string; translit: string; ayahs: number }

/// The 114 surahs from the quran worker (its display names when it has them), kept for an hour in the isolate.
let surahMemo: { at: number; data: Surah[] } | null = null;
async function surahs(env: ArabicEnv): Promise<Surah[]> {
  if (surahMemo && Date.now() - surahMemo.at < 3_600_000) return surahMemo.data;
  type Row = { id: number; name_ar: string; name_en: string; name_transliteration?: string | null; ayah_count: number;
               name_ar_vowelled?: string | null; name_translit?: string | null; name_meaning_en?: string | null };
  const r = env.QURAN
    ? await env.QURAN.fetch('https://qr/qr/surahs').then((x) => x.json() as Promise<{ data?: Row[] }>).catch(softFail({ data: [] as Row[] }, 'qr/surahs'))
    : { data: [] as Row[] };
  const data = (r.data ?? []).map((s) => ({ no: s.id, nameAr: s.name_ar_vowelled || s.name_ar, nameEn: s.name_meaning_en || s.name_en,
                                            translit: s.name_translit || s.name_transliteration || s.name_en, ayahs: s.ayah_count }));
  if (data.length) surahMemo = { at: Date.now(), data };
  return data;
}

/// The languages a film can be in, in the labels' order (scope 'storybook_lang'): code, the toggle's word, how it runs.
async function langs(env: ArabicEnv) {
  const L = (await labels(env).catch(softFail({} as Awaited<ReturnType<typeof labels>>, 'labels'))).storybook_lang ?? [];
  return L.map((l) => ({ code: l.key, label: l.labelAr || l.label, dir: ((l.extra ?? {}) as { dir?: string }).dir ?? 'ltr' }));
}

type Meta = { day?: number; surah?: number; passage?: string; core?: { core_en?: string; core_ar?: string } };

/// Every published day of the path: its surah (meta.surah, else the passage "Q s:a–b"), passage, core and pieces in order.
async function pathDays(env: ArabicEnv) {
  const rows = await query<{ slug: string; title_en: string; title_ar: string; cover_key: string | null; sort_order: number | null; body_md: string | null }>(env.DB_AR,
    `SELECT r.slug, r.title_en, r.title_ar, r.cover_key, r.sort_order, r.body_md
       FROM ar_daily_reading r JOIN ar_curriculum_domain d ON d.id = r.domain_id
      WHERE d.slug = 'quran' AND r.is_published = 1`).catch(softFail([] as never[], 'ar_daily_reading quran'));
  const days = new Map<number, { day: number; surah: number | null; passage: string | null; coreAr: string | null; coreEn: string | null;
                                 pieces: Array<{ order: number; slug: string; title: string; titleAr: string; cover: string | null }> }>();
  for (const r of rows) {
    const m = /```meta\n([\s\S]*?)\n```/.exec(r.body_md ?? '');
    let meta: Meta = {};
    try { meta = m ? (JSON.parse(m[1]!) as Meta) : {}; } catch { meta = {}; }
    const day = meta.day ?? Number(/^path-d(\d+)/.exec(r.slug)?.[1] ?? NaN);
    if (!Number.isFinite(day)) continue;
    const piece = pathPiece(r.slug);
    const d = days.get(day) ?? { day, surah: null, passage: null, coreAr: null, coreEn: null, pieces: [] };
    d.passage ??= meta.passage ?? null;
    d.surah ??= meta.surah ?? (Number(/Q\s*(\d+)\s*:/.exec(meta.passage ?? '')?.[1]) || null);
    d.coreAr ??= meta.core?.core_ar ?? null;
    d.coreEn ??= meta.core?.core_en ?? null;
    d.pieces.push({ order: piece?.order ?? 10 + (r.sort_order ?? 0), slug: r.slug, title: r.title_en, titleAr: r.title_ar,
                    cover: r.cover_key ? media(r.cover_key) : (/"img":\s*"([^"]+)"/.exec(r.body_md ?? '')?.[1] ?? null) });
    days.set(day, d);
  }
  return [...days.values()].sort((a, b) => a.day - b.day).map((d) => ({ ...d, pieces: d.pieces.sort((a, b) => a.order - b.order) }));
}

export function quranPathRoutes(router: Router<ArabicEnv>) {
  /// Per surah: how many published days and the first day's cover (the quran worker adds the names) + the words and languages.
  router.get('/ar/quran/path/summary', async (_req, env) => {
    const [days, L] = await Promise.all([pathDays(env), langs(env)]);
    const by = new Map<number, { no: number; days: number; cover: string | null }>();
    for (const d of days) {
      if (!d.surah) continue;
      const x = by.get(d.surah) ?? { no: d.surah, days: 0, cover: d.pieces.find((p) => p.cover)?.cover ?? null };
      x.days += 1; by.set(d.surah, x);
    }
    return ok({ title: PATH_WORDS.title, titleAr: PATH_WORDS.titleAr, tagline: PATH_WORDS.tagline, words: QP_WORDS, langs: L,
                surahs: [...by.values()].sort((a, b) => a.no - b.no) });
  });

  /// One surah's days (?surah=N): each day's four pieces with their final films per language.
  router.get('/ar/quran/path', async (req, env) => {
    const n = Number(new URL(req.url).searchParams.get('surah'));
    if (!Number.isInteger(n) || n < 1 || n > 114) return notFound('no such surah');
    const [days, L] = await Promise.all([pathDays(env), langs(env)]);
    const mine = days.filter((d) => d.surah === n);
    const ids = mine.flatMap((d) => d.pieces.map((p) => `ARDR:${p.slug}`));
    const films = ids.length
      ? await query<{ reading_id: string; lang: string; video_key: string; audio_key: string | null; poster_key: string | null;
                      seconds: number | null; width: number | null; height: number | null }>(env.DB_AR,
          `SELECT reading_id, lang, video_key, audio_key, poster_key, seconds, width, height FROM ar_path_film
            WHERE status = 'live' AND reading_id IN (${ids.map(() => '?').join(',')})`, ids).catch(softFail([] as never[], 'ar_path_film'))
      : [];
    const of = new Map<string, Record<string, unknown>>();
    for (const f of films) {
      const m = of.get(f.reading_id) ?? {};
      m[f.lang] = { video: media(f.video_key), audio: media(f.audio_key), poster: media(f.poster_key), seconds: f.seconds, width: f.width, height: f.height };
      of.set(f.reading_id, m);
    }
    return ok({
      surah: n, words: QP_WORDS, langs: L,
      days: mine.map((d) => ({
        day: d.day, label: `${PATH_WORDS.day} ${d.day}`, passage: d.passage, coreAr: d.coreAr, coreEn: d.coreEn,
        pieces: d.pieces.map((p) => {
          const piece = pathPiece(p.slug);
          return { id: `ARDR:${p.slug}`, slug: p.slug, piece: piece ? { en: piece.en, ar: piece.ar } : null, icon: piece?.icon ?? 'book.fill',
                   title: p.title, titleAr: p.titleAr, cover: p.cover, films: of.get(`ARDR:${p.slug}`) ?? {} };
        }),
      })),
    });
  });
}
