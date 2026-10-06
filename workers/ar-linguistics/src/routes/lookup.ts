import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { ArLinguisticsEnv } from '../env';

/// Tap a word while reading and get its root back. This is the one endpoint the
/// reader needs, and it exists because /al/lemmas/search takes a bare stem:
/// `كتاب` resolves, `الأسد` returns nothing, and a reader taps whatever the
/// page prints — with the article, with a conjunction, fully vocalised.
///
/// So the folding happens here, once, rather than in each app.

/// Matches the fold used by migrations 018–022: strip the ḥarakāt and tatweel,
/// then normalise the letters that vary by orthography rather than by root.
function fold(w: string): string {
  return w
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^ء-ي]/g, '');
}

/// Candidate stems, longest first: the word as written, then with the article
/// gone, then with one proclitic gone, then both. Longest-first matters — قال
/// must not be reached by stripping the ف of فقال when قال itself is a word.
function candidates(folded: string): string[] {
  const out = new Set<string>([folded]);
  const strip = (w: string) => {
    if (w.startsWith('ال') && w.length > 3) out.add(w.slice(2));
    if (/^[وفبكل]/.test(w) && w.length > 3) {
      const rest = w.slice(1);
      out.add(rest);
      if (rest.startsWith('ال') && rest.length > 3) out.add(rest.slice(2));
    }
  };
  strip(folded);
  return [...out].sort((a, b) => b.length - a.length);
}

export function lookupRoutes(router: Router<ArLinguisticsEnv>) {

  /// One word in, its root and lemmas out. `matchedAs` says which candidate
  /// actually hit, so a wrong strip is visible rather than silent.
  router.get('/al/lookup', async (req, env) => {
    const url = new URL(req.url);
    const w = (url.searchParams.get('w') ?? '').trim();
    if (!w) return badRequest('w (one Arabic word) param required');

    const folded = fold(w);
    if (!folded) return ok({ word: w, found: false, tried: [] });

    const tried = candidates(folded);
    for (const stem of tried) {
      /// Root first, and only lemmas that hang off a real root: the
      /// LEM:LEX:* rows are surface forms with no root behind them, and
      /// returning one looks like an answer while being none.
      const rows = await query(
        env.DB_AL,
        `SELECT l.id, coalesce(l.lemma_text_canonical, l.lemma_text) AS lemma_ar, l.part_of_speech AS pos,
                l.frequency_quran AS frequency, l.verb_form,
                r.id AS root_id, r.root_text, r.root_normalized,
                r.meaning_core_en AS root_en, r.meaning_core_ar AS root_ar_gloss,
                r.meaning_core_ur AS root_ur, r.root_type
           FROM ar_ling_root_lemma l
           JOIN ar_ling_roots r ON r.id = l.root_id
          WHERE l.lemma_text_bare = ?
            AND l.root_id IS NOT NULL
            AND l.id NOT LIKE 'LEM:LEX:%'
            AND COALESCE(l.record_status, 'live') <> 'merged'
          ORDER BY COALESCE(l.frequency_quran, 0) DESC
          LIMIT 8`,
        [stem],
      );
      if (rows.length) {
        return ok({ word: w, found: true, matchedAs: stem, tried, lemmas: rows });
      }
    }

    /// Nothing. Said plainly, with what was attempted, so the gap is legible.
    return ok({ word: w, found: false, matchedAs: null, tried, lemmas: [] });
  });
}
