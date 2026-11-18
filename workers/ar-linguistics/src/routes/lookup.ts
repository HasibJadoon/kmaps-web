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

  /// Any query → the roots it can mean (see resolveRoots): GET /al/lookup/roots?q=jdl
  router.get('/al/lookup/roots', async (req, env) => {
    const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
    if (!q) return badRequest('q param required');
    return ok({ q, roots: await resolveRoots(env.DB_AL, q) });
  });
}

// ── Any query → its roots (the deck search, and anything else that finds by root) ──────────────────────────────────
//
// A root however it is typed: جدل · ج د ل · جَدَلَ; a word of it (جادلهم → its lemma → جدل); its Latin letters — jdl,
// ʿqb, ghfr, a word's consonants (jidal → جدل), a leading vowel standing for ا ع ء (alh → اله, aqb → عقب); the root
// table's own buckwalter / simple_lat; or, for the few roots that carry one, its English core meaning.

const DIGRAPHS: Record<string, string[]> = { sh: ['ش'], kh: ['خ'], gh: ['غ'], th: ['ث'], dh: ['ذ', 'ظ'] };
const SINGLE: Record<string, string[]> = {
  b: ['ب'], t: ['ت', 'ط'], j: ['ج'], d: ['د', 'ض'], r: ['ر'], z: ['ز', 'ظ'], s: ['س', 'ص'], f: ['ف'], q: ['ق'], k: ['ك'],
  l: ['ل'], m: ['م'], n: ['ن'], h: ['ه', 'ح'], w: ['و'], y: ['ي'], g: ['غ', 'ج'], x: ['خ'], c: ['ع'],
  'ʿ': ['ع'], '‘': ['ع'], '`': ['ع'], "'": ['ع', 'ء'], 'ʾ': ['ء'], '’': ['ء', 'ع'], 'ḥ': ['ح'], 'ṣ': ['ص'], 'ḍ': ['ض'],
  'ṭ': ['ط'], 'ẓ': ['ظ'], 'š': ['ش'], 'ḫ': ['خ'], 'ġ': ['غ'], 'ṯ': ['ث'], 'ḏ': ['ذ'],
};
const VOWEL = /[aeiouāīūâîûáíú]/;

/** Every Arabic root a Latin spelling can stand for (2–4 letters). A doubled letter is read both ways: a shadda
 *  (munazzal → نزل) or a root's own doubled letter (shdd → شدد). */
export function latinVariants(query: string): string[] {
  const q = query.trim().toLowerCase().replace(/[\s\-.·]/g, '');
  const once = q.replace(/(.)\1+/g, '$1');
  return [...new Set([...spellings(q), ...(once !== q ? spellings(once) : [])])];
}

function spellings(q: string): string[] {
  if (!q || q.length > 14 || /[؀-ۿ0-9]/.test(q)) return [];
  let out: string[] = [''];
  for (let i = 0; i < q.length;) {
    const ch = q[i]!;
    if (VOWEL.test(ch)) {
      // a word's first vowel may be the root's first letter (alh, aqb, ilm); a vowel inside is only a vowel
      if (i === 0) out = out.flatMap((o) => [o, o + 'ا', o + 'ع', o + 'ء']);
      i += 1;
      continue;
    }
    const two = DIGRAPHS[q.slice(i, i + 2)];
    const opts = two ?? SINGLE[ch];
    if (!opts) return [];
    out = out.flatMap((o) => opts.map((a) => o + a));
    if (out.length > 128) return [];
    i += two ? 2 : 1;
  }
  // a word's prefix letter dropped too (tanzil → نزل, masir → صير): ت م ي ن ا
  const withPrefixOff = out.flatMap((o) => (/^[تمينا]/.test(o) && o.length >= 4 ? [o, o.slice(1)] : [o]));
  return [...new Set(withPrefixOff.filter((r) => r.length >= 2 && r.length <= 4))];
}

/// A word's stems with its clitics off: the prefixes /al/lookup strips, one verb or participle prefix, and the common
/// pronoun and plural endings. Lookups match whole lemmas, so a wrong strip finds nothing rather than a wrong root.
function stems(folded: string): string[] {
  const out = new Set<string>();
  // and one present-tense or participle prefix (يجادلون, مجادله): ي ت ن ا م
  const bases = candidates(folded).flatMap((c) => (/^[يتنام]/.test(c) && c.length > 3 ? [c, c.slice(1)] : [c]));
  for (const c of bases) {
    out.add(c);
    for (const suf of ['هما', 'كما', 'هم', 'هن', 'كم', 'كن', 'نا', 'ها', 'ني', 'وا', 'ون', 'ين', 'ات', 'ان', 'ه', 'ك', 'ي', 'ت']) {
      if (c.endsWith(suf) && c.length - suf.length >= 2) out.add(c.slice(0, -suf.length));
    }
  }
  return [...out];
}

export interface ResolvedRoot { id: string; root: string }

export async function resolveRoots(db: D1Database, q: string): Promise<ResolvedRoot[]> {
  const text = q.trim();
  if (!text) return [];
  const found = new Map<string, string>();
  const take = (rows: Array<{ id: string; root_text: string }>) => { for (const r of rows) found.set(r.id, r.root_text); };
  const inList = (n: number) => Array.from({ length: n }, () => '?').join(',');
  if (/[ء-ي]/.test(text)) {
    const f = fold(text);
    const all = stems(f);
    const asRoot = all.filter((s) => s.length >= 2 && s.length <= 4);
    if (asRoot.length) {
      take(await query<{ id: string; root_text: string }>(db,
        `SELECT id, root_text FROM ar_ling_roots WHERE root_normalized IN (${inList(asRoot.length)})`, asRoot));
    }
    // and the word's own root, through its lemma — always, since the root table holds a few stray stems (جادل)
    if (all.length) {
      take(await query<{ id: string; root_text: string }>(db,
        `SELECT DISTINCT r.id, r.root_text FROM ar_ling_root_lemma l JOIN ar_ling_roots r ON r.id = l.root_id
          WHERE l.lemma_text_bare IN (${inList(all.length)}) AND l.root_id IS NOT NULL AND l.id NOT LIKE 'LEM:LEX:%'
            AND COALESCE(l.record_status, 'live') <> 'merged' LIMIT 12`, all));
    }
  } else {
    const plain = text.toLowerCase().replace(/[\s\-.·]/g, '');
    const vs = latinVariants(text);
    take(await query<{ id: string; root_text: string }>(db,
      `SELECT id, root_text FROM ar_ling_roots
        WHERE simple_lat = ? OR buckwalter = ?${vs.length ? ` OR root_normalized IN (${inList(vs.length)})` : ''}
        ORDER BY COALESCE(frequency_quran, 0) DESC LIMIT 24`, [plain, text.trim(), ...vs]));
    if (!found.size && plain.length >= 4) {
      take(await query<{ id: string; root_text: string }>(db,
        `SELECT id, root_text FROM ar_ling_roots WHERE meaning_core_en LIKE ? LIMIT 12`, [`%${plain}%`]));
    }
  }
  return [...found].map(([id, root]) => ({ id, root }));
}
