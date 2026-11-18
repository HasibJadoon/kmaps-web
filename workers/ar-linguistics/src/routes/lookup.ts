import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import { cached } from '../../../shared/src/cache';
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
  router.get('/al/lookup/roots', (req, env) => cached(req, async () => {
    const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
    if (!q) return badRequest('q param required');
    return ok({ q, roots: await resolveRoots(env.DB_AL, q) });
  }, { browser: 3600, edge: 86400 }));
}

// ── Any query → its roots (the deck search, and anything else that finds by root) ──────────────────────────────────
//
// Read from the root table, not from a letter map in code: a root typed in Arabic (جدل · ج د ل), a word of it (through
// the lemma table: يجادلون → جدل), or in Latin letters — matched against the table's own Latin spellings (simple_lat,
// buckwalter) by their consonants: vowels and ʿ/ʾ marks dropped on both sides, so jdl, jidal, Jdl, j-d-l all reach
// simple_lat 'jdl', and aqb / ʿqb reach 'qb' (the table writes عقب so). Tried in turn, the first that finds a root
// winning: the consonants as typed, a doubled letter as one (munazzal), the first letter off (tanzil → nzl). Or, for
// the few roots that carry one, the English core meaning.

/** A Latin spelling's consonants, as the root table's simple_lat is compared: lowercase, accents and vowels off. */
export function latinSkeleton(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[aeiou\s\-.·'`ʿʾ‘’]/g, '');
}

/** The keys to try for a Latin query, in turn: as typed, doubled letters as one, then the first letter off. */
export function latinKeys(q: string): string[][] {
  const skel = latinSkeleton(q);
  if (!/^[a-z]{2,8}$/.test(skel)) return [];
  const once = skel.replace(/(.)\1+/g, '$1');
  const tiers: string[][] = [[skel], once !== skel ? [once] : []];
  if (skel.length >= 4) tiers.push([...new Set([skel.slice(1), once.slice(1)])].filter((k) => k.length >= 2));
  return tiers.filter((t) => t.length);
}

// ── The root table, kept for a day ────────────────────────────────────────────────────────────────────────────────
// Every root's id, letters and Latin spellings, read once and kept for a day: in this worker's memory, and in the edge
// cache so a fresh worker doesn't read the table again. Arabic roots are looked up by root_normalized, Latin queries
// by simple_lat's consonants (latinSkeleton) and by buckwalter, all in memory.

interface RootRow { id: string; root: string; norm: string; lat: string | null; bw: string | null; n: number; en: string | null }
interface RootIndex { at: number; byNorm: Map<string, RootRow[]>; byLat: Map<string, RootRow[]>; bySkel: Map<string, RootRow[]>;
  byBw: Map<string, RootRow[]>; withMeaning: RootRow[] }

const DAY = 86_400_000;
const INDEX_KEY = 'https://al.internal/lookup/root-index/v1';
let INDEX: RootIndex | null = null;

function indexOf(rows: RootRow[]): RootIndex {
  const add = (m: Map<string, RootRow[]>, k: string | null | undefined, r: RootRow) => {
    if (!k) return;
    const list = m.get(k);
    if (list) list.push(r); else m.set(k, [r]);
  };
  const ix: RootIndex = { at: Date.now(), byNorm: new Map(), byLat: new Map(), bySkel: new Map(), byBw: new Map(), withMeaning: [] };
  for (const r of rows.sort((a, b) => b.n - a.n)) {
    add(ix.byNorm, r.norm, r);
    add(ix.byLat, r.lat, r);
    add(ix.bySkel, r.lat ? latinSkeleton(r.lat) : null, r);
    add(ix.byBw, r.bw, r);
    if (r.en) ix.withMeaning.push(r);
  }
  return ix;
}

async function rootIndex(db: D1Database): Promise<RootIndex> {
  if (INDEX && Date.now() - INDEX.at < DAY) return INDEX;
  const cache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;
  const hit = cache ? await cache.match(INDEX_KEY).catch(() => undefined) : undefined;
  let rows: RootRow[] | null = hit ? await hit.json<RootRow[]>().catch(() => null) : null;
  if (!rows) {
    rows = await query<RootRow>(db,
      `SELECT id, root_text AS root, root_normalized AS norm, simple_lat AS lat, buckwalter AS bw,
              COALESCE(frequency_quran, 0) AS n, meaning_core_en AS en
         FROM ar_ling_roots WHERE root_normalized IS NOT NULL`);
    if (cache) {
      await cache.put(INDEX_KEY, new Response(JSON.stringify(rows), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=86400' },
      })).catch(() => undefined);
    }
  }
  INDEX = indexOf(rows);
  return INDEX;
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
  const ix = await rootIndex(db);
  const found = new Map<string, string>();
  const take = (rows: Array<{ id: string; root: string }> | undefined) => { for (const r of rows ?? []) found.set(r.id, r.root); };
  if (/[ء-ي]/.test(text)) {
    const all = stems(fold(text));
    for (const s of all) if (s.length >= 2 && s.length <= 4) take(ix.byNorm.get(s));
    // and the word's own root, through its lemma — always, since the root table holds a few stray stems (جادل)
    if (all.length) {
      take(await query<{ id: string; root: string }>(db,
        `SELECT DISTINCT r.id, r.root_text AS root FROM ar_ling_root_lemma l JOIN ar_ling_roots r ON r.id = l.root_id
          WHERE l.lemma_text_bare IN (${all.map(() => '?').join(',')}) AND l.root_id IS NOT NULL AND l.id NOT LIKE 'LEM:LEX:%'
            AND COALESCE(l.record_status, 'live') <> 'merged' LIMIT 12`, all));
    }
  } else {
    // the table's own spelling as typed (simple_lat, buckwalter), then its consonants, tier by tier
    take(ix.byLat.get(text.toLowerCase().replace(/[\s\-.·]/g, '')));
    take(ix.byBw.get(text.replace(/[\s\-.·]/g, '')));
    for (const keys of found.size ? [] : latinKeys(text)) {
      for (const k of keys) take(ix.bySkel.get(k)?.slice(0, 12));
      if (found.size) break;
    }
    const plain = text.toLowerCase();
    if (!found.size && plain.length >= 4) take(ix.withMeaning.filter((r) => r.en!.toLowerCase().includes(plain)).slice(0, 12));
  }
  return [...found].map(([id, root]) => ({ id, root }));
}
