import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';

// ── The grammar books' citations of a surah, for the Qurʾān atlas ─────────────
// The Quran worker's surah layers (/qr/atlas/surah/:s/{sarf,nahw,balagha}/citations) read these
// over the AR_LINGUISTICS binding:
//
//   GET  /al/gram/adima/by-surah/:s         ʿUḍayma's citations of the surah's āyāt (ar_ling_adima_entry),
//                                           ?discipline=NH|SF &from&to (āyah range) &page&per — each with the
//                                           heading path he files it under, his pattern / meaning / term,
//                                           volume and page
//   GET  /al/gram/term-examples/by-surah/:s the registry's Qurʾānic shawāhid of a term (ar_ling_gram_term_example)
//                                           in the surah, ?from&to
//   POST /al/gram/citation-meta             {chunks, slugs} → each chunk's discipline and each book's name
//                                           (ar_ling_gram_chunk, ar_ling_source)

const int = (v: string | null, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : d;
};

export function gramBySurahRoutes(router: Router<ArLinguisticsEnv>) {
  router.get('/al/gram/adima/by-surah/:s', async (req, env, { s }) => {
    const surah = Number(s);
    if (!Number.isInteger(surah) || surah < 1 || surah > 114) return badRequest('surah');
    const u = new URL(req.url);
    const disc = u.searchParams.get('discipline');
    const from = int(u.searchParams.get('from'), 1), to = int(u.searchParams.get('to'), 999);
    const per = Math.min(100, int(u.searchParams.get('per'), 40)), page = int(u.searchParams.get('page'), 1);
    const where = `surah = ? AND ayah BETWEEN ? AND ?${disc ? ' AND discipline = ?' : ''}`;
    const args: unknown[] = [surah, from, to, ...(disc ? [disc] : [])];
    const [total, rows] = await Promise.all([
      env.DB_AL.prepare(`SELECT COUNT(*) AS n FROM ar_ling_adima_entry WHERE ${where}`).bind(...args).first<{ n: number }>(),
      env.DB_AL.prepare(
        `SELECT id, discipline, volume_no, page_no, chapter_ar, section_ar, head_ar, pattern_ar, pattern_term_id,
                meaning_ar, meaning_term_id, section_term_id, quote_ar, surah, ayah, word_index, word_ar
           FROM ar_ling_adima_entry WHERE ${where} ORDER BY ayah, seq LIMIT ? OFFSET ?`)
        .bind(...args, per, (page - 1) * per).all<Record<string, unknown>>(),
    ]);
    return ok({ total: total?.n ?? 0, page, per, items: rows.results ?? [] });
  });

  router.get('/al/gram/term-examples/by-surah/:s', async (req, env, { s }) => {
    const surah = Number(s);
    if (!Number.isInteger(surah) || surah < 1 || surah > 114) return badRequest('surah');
    const u = new URL(req.url);
    const from = int(u.searchParams.get('from'), 1), to = int(u.searchParams.get('to'), 999);
    const rows = (await env.DB_AL.prepare(
      `SELECT id, term_id, example_ar, gloss_en, qr_ref, source_ref
         FROM ar_ling_gram_term_example
        WHERE example_kind = 'quran' AND qr_ref LIKE ? ORDER BY sort_order`)
      .bind(`${surah}:%`).all<{ id: string; term_id: string; example_ar: string; gloss_en: string | null; qr_ref: string; source_ref: string | null }>())
      .results ?? [];
    const items = rows.filter((r) => {
      const a = Number(r.qr_ref.split(':')[1]?.split('-')[0]);
      return a >= from && a <= to;
    });
    return ok({ total: items.length, items });
  });

  router.post('/al/gram/citation-meta', async (req, env) => {
    const body = await req.json<{ chunks?: string[]; slugs?: string[] }>().catch(() => null);
    const chunks = [...new Set((body?.chunks ?? []).filter((x) => typeof x === 'string'))].slice(0, 2000);
    const slugs = [...new Set((body?.slugs ?? []).filter((x) => typeof x === 'string'))].slice(0, 200);
    const disciplines: Record<string, string> = {};
    for (let i = 0; i < chunks.length; i += 90) {
      const part = chunks.slice(i, i + 90);
      const rows = (await env.DB_AL.prepare(
        `SELECT id, discipline FROM ar_ling_gram_chunk WHERE id IN (${part.map(() => '?').join(',')})`)
        .bind(...part).all<{ id: string; discipline: string }>()).results ?? [];
      for (const r of rows) disciplines[r.id] = r.discipline;
    }
    const books: Record<string, { title: string | null; titleAr: string; author: string | null; deathAh: number | null }> = {};
    for (let i = 0; i < slugs.length; i += 90) {
      const part = slugs.slice(i, i + 90);
      const rows = (await env.DB_AL.prepare(
        `SELECT slug, title_ar, title_en, author_name, author_death_ah FROM ar_ling_source
          WHERE slug IN (${part.map(() => '?').join(',')})`)
        .bind(...part).all<{ slug: string; title_ar: string; title_en: string | null; author_name: string | null; author_death_ah: number | null }>())
        .results ?? [];
      for (const r of rows) books[r.slug] ??= { title: r.title_en, titleAr: r.title_ar, author: r.author_name, deathAh: r.author_death_ah };
    }
    return ok({ disciplines, books });
  });
}
