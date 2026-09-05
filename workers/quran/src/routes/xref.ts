import type { Router } from '../../../shared/src/router';
import { badRequest, ok } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';

// The verse-reference gateway. Every domain that points at a verse — a deck
// slide, a lexicon lens, a worldview claim — writes a qr_citation row rather
// than keeping its own verse pointer, so this one route answers "what cites
// this āyah?" for all of them, and returns the āyah text alongside so a tap
// can show something without a second call.

interface CitationRow {
  id: string;
  from_domain: string;
  from_layer: string;
  from_id: string;
  to_ref: string;
  to_kind: string;
  relation: string;
  source_slug: string | null;
  quote_ar: string | null;
}

interface AyahRow {
  surah: number;
  ayah: number;
  text_uthmani: string | null;
  text_uthmani_clean: string | null;
  translation: string | null;
}

/**
 * "34:33" → {surah:34, from:33, to:33}; "40:2-3" → {surah:40, from:2, to:3}.
 * Returns null on anything else, so a bad ref is a 400 rather than an empty
 * result that looks like "no citations".
 */
function parseRef(ref: string): { surah: number; from: number; to: number } | null {
  const m = ref.trim().match(/^(\d+):(\d+)(?:-(\d+))?$/);
  if (!m) return null;
  const surah = Number(m[1]);
  const from = Number(m[2]);
  const to = m[3] ? Number(m[3]) : from;
  if (!surah || !from || to < from) return null;
  return { surah, from, to };
}

export function xrefRoutes(router: Router<QuranEnv>) {
  router.get('/qr/xref', async (req, env) => {
    const url = new URL(req.url);
    const toRef = url.searchParams.get('to_ref');
    if (!toRef) return badRequest('to_ref param required, e.g. to_ref=34:33');

    const parsed = parseRef(toRef);
    if (!parsed) return badRequest(`to_ref must look like 34:33 or 40:2-3, got "${toRef}"`);

    const where = ['to_ref = ?', `status = 'live'`];
    const params: unknown[] = [toRef];

    // Optional narrowing, so a caller can ask only for what its own domain or
    // layer contributed (e.g. from_layer=slide for deck citations).
    const fromDomain = url.searchParams.get('from_domain');
    if (fromDomain) { where.push('from_domain = ?'); params.push(fromDomain); }
    const fromLayer = url.searchParams.get('from_layer');
    if (fromLayer) { where.push('from_layer = ?'); params.push(fromLayer); }

    const citations = await query<CitationRow>(
      env.DB_QR,
      `SELECT id, from_domain, from_layer, from_id, to_ref, to_kind, relation, source_slug, quote_ar
         FROM qr_citation
        WHERE ${where.join(' AND ')}
        ORDER BY from_domain, from_layer, from_id`,
      params,
    );

    const ayat = await query<AyahRow>(
      env.DB_QR,
      `SELECT surah, ayah, text_uthmani, text_uthmani_clean, translation
         FROM qr_ayah
        WHERE surah = ? AND ayah BETWEEN ? AND ?
        ORDER BY ayah ASC`,
      [parsed.surah, parsed.from, parsed.to],
    );

    return ok({
      to_ref: toRef,
      surah: parsed.surah,
      ayah_from: parsed.from,
      ayah_to: parsed.to,
      ayat,
      citations,
      citation_count: citations.length,
    });
  });
}
