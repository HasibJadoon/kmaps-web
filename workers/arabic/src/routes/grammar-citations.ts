import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import type { ArabicEnv } from '../env';

// ── The grammar books' Qurʾān quotations of one surah, for the Qurʾān atlas ───
// GET /ar/grammar-citations/by-surah/:s?from&to — every sentence mined from a grammar book
// (ar_grammar_sentence, kind 'quran') whose āyah is in the surah (and the range), with its book,
// volume, page, section (bab), the book's words around it and the term it illustrates where tied.
// ʿUḍayma's Dirāsāt is left out: the atlas reads him whole from AL (ar_ling_adima_entry). Read by
// the Quran worker over its ARABIC binding, which pages and files each by discipline.

export function grammarCitationRoutes(router: Router<ArabicEnv>) {
  router.get('/ar/grammar-citations/by-surah/:s', async (req, env, { s }) => {
    const surah = Number(s);
    if (!Number.isInteger(surah) || surah < 1 || surah > 114) return badRequest('surah');
    const u = new URL(req.url);
    const from = Number(u.searchParams.get('from') ?? 1) || 1, to = Number(u.searchParams.get('to') ?? 999) || 999;
    const rows = (await env.DB_AR.prepare(
      `SELECT id, text_ar, qr_ref, term_id, origin, source_slug, chunk_id, volume_no, page_no, bab_title_ar, context_ar
         FROM ar_grammar_sentence
        WHERE kind = 'quran' AND qr_ref LIKE ? AND source_slug IS NOT NULL AND source_slug <> 'adima_dirasat'`)
      .bind(`${surah}:%`).all<{ qr_ref: string } & Record<string, unknown>>()).results ?? [];
    const items = rows
      .map((r) => ({ ...r, ayah: Number(r.qr_ref.split(':')[1]) }))
      .filter((r) => r.ayah >= from && r.ayah <= to)
      .sort((a, b) => a.ayah - b.ayah);
    return ok({ total: items.length, items });
  });
}
