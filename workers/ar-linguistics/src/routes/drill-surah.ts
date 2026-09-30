import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';

// ── What a surah's expression drills need from the linguistic record ─────────
// The Qurʾān worker knows where each word stands (km_quran qr_drill_anchor, placed by
// kmaps-resources scripts/quran/surah_expr_drills.py); AL gives what the sources say of it.
//
//   GET /al/drill/nearsyn?sets=<set id>,…
//       each furūq near-synonym set: its name, how far it is reviewed (most are AI-assisted drafts —
//       the drill says so), and every member with its gloss and the notes that tell it apart
//   GET /al/drill/keyterms?entries=<entry id>,…
//       Sinai's entries (Key Terms of the Qurʾān, through ar_ling_root_lexicon_entry_v): the root, its
//       terms with their Arabic and gloss, the page, and the article's opening point
//   GET /al/drill/defs?w=<root>~<word>,…&src=lane,lisan,taj,mufradat
//       where each lexicon defines the word under its root: the headword's own sentence (Lisān, Tāj,
//       al-Rāghib) or Lane's first rendering after it. Every key the root is filed under is read —
//       the view's own (geminate ↔ biliteral) and the weak and hamza spellings (دعو = دعا = دعي,
//       هدي = هدى, امن = ءمن), both sides folded alike.

const MARKS = /[ً-ْٰـۖ-ۭ]/g;
const foldAr = (w: string | null | undefined) => (w ?? '').replace(MARKS, '').replace(/[ٱأإآءؤئ]/g, 'ا').replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه').replace(/[^ء-ي]/g, '');

/// every spelling a root may be filed under: as spelled, the geminate and the biliteral, the weak
/// radical as و, ي, ا or ى, the hamza on its seats
export function rootKeys(root: string): string[] {
  const r = (root ?? '').replace(MARKS, '').replace(/ٱ/g, 'ا').trim();
  const out = new Set<string>([r]);
  const f = foldAr(r);
  if (!f) return [...out];
  out.add(f);
  if (f.length === 3 && f[1] === f[2]) out.add(f.slice(0, 2));
  if (f.length === 2) out.add(f + f[1]);
  if (f.length === 4 && f.slice(0, 2) === f.slice(2)) { out.add(f.slice(0, 2)); out.add(f.slice(0, 2) + f[1]); }
  const W = ['و', 'ي', 'ا', 'ى'];
  if (f.length === 3 && 'ويا'.includes(f[2])) for (const c of W) out.add(f.slice(0, 2) + c);
  if (f.length === 3 && 'وي'.includes(f[1])) { out.add(f[0] + 'ا' + f[2]); }
  for (let i = 0; i < f.length; i++) if (f[i] === 'ا') for (const h of ['ء', 'أ', 'ئ', 'ؤ']) out.add(f.slice(0, i) + h + f.slice(i + 1));
  return [...out].filter(Boolean);
}

/// a headword as spelled, for matching a word to it: the dagger alif written out, hamza and madd one alif, no article
const headKey = (w: string | null | undefined) => { const f = foldAr((w ?? '').replace(/\u0670/g, 'ا')).replace(/ا+/g, 'ا'); return f.length > 3 ? f.replace(/^ال/, '') : f; };

/// a word's inner vowels (not the last letter's, which the case moves): رَبّ → "a", رُبّ → "u", كِتَاب → "i a"
function vowels(w: string | null | undefined) {
  const out: string[] = [];
  const t = (w ?? '').replace(/[\u0640\u0670]/g, '');
  const letters = [...t].map((c, i) => ({ c, i })).filter((x) => /[\u0621-\u064A]/.test(x.c));
  for (const { i } of letters.slice(0, -1)) {
    const m = t.slice(i + 1).match(/^[\u064B-\u0652]*/)?.[0] ?? '';
    out.push(m.includes('\u064E') ? 'a' : m.includes('\u064F') ? 'u' : m.includes('\u0650') ? 'i' : '');
  }
  return out.join(' ').trim();
}

const SOURCES: Record<string, { slug: string; name: string }> = {
  lane: { slug: 'lane_lexicon', name: 'Lane' },
  lisan: { slug: 'ibn_manzur_lisan_arab', name: 'Lisān al-ʿArab' },
  taj: { slug: 'zabidi_taj_arus', name: 'Tāj al-ʿArūs' },
  mufradat: { slug: 'raghib_mufradat', name: 'al-Rāghib, al-Mufradāt' },
};

export function drillSurahRoutes(router: Router<ArLinguisticsEnv>) {
  router.get('/al/drill/nearsyn', async (req, env) => {
    const sets = (new URL(req.url).searchParams.get('sets') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 40);
    if (!sets.length) return ok({ sets: {} });
    const ph = sets.map(() => '?').join(',');
    const [ss, ms] = await Promise.all([
      env.DB_AL.prepare(`SELECT id, set_name, canonical_en, canonical_ar, short_summary, description_md, source_status, confidence, review_status
                           FROM ar_ling_root_lemma_furuq_set WHERE id IN (${ph})`).bind(...sets)
        .all<{ id: string; set_name: string; canonical_en: string | null; canonical_ar: string | null; short_summary: string | null;
               description_md: string | null; source_status: string | null; confidence: string | null; review_status: string | null }>(),
      env.DB_AL.prepare(`SELECT m.id, m.set_id, m.arabic_display, m.arabic_bare, m.basic_gloss, m.nuance_note, m.contrast_note, m.usage_rule,
                                m.quran_usage_pattern, m.source_status, m.confidence, r.root_normalized AS root
                           FROM ar_ling_root_lemma_furuq_member m
                           LEFT JOIN ar_ling_root_lemma l ON l.id = m.lemma_id LEFT JOIN ar_ling_roots r ON r.id = l.root_id
                          WHERE m.set_id IN (${ph}) ORDER BY m.set_id, m.sort_order`).bind(...sets)
        .all<{ id: string; set_id: string; arabic_display: string | null; arabic_bare: string | null; basic_gloss: string | null;
               nuance_note: string | null; contrast_note: string | null; usage_rule: string | null; quran_usage_pattern: string | null;
               source_status: string | null; confidence: string | null; root: string | null }>(),
    ]);
    const out: Record<string, unknown> = {};
    for (const s of ss.results ?? []) {
      const name = s.canonical_en ?? s.set_name;
      // a note is only a note when it says more than the set's own name (the drafts repeat it)
      const said = (x: string | null) => (x && x.trim() && x.trim().toLowerCase() !== s.set_name.trim().toLowerCase()
        && x.trim().toLowerCase() !== (s.canonical_en ?? '').trim().toLowerCase() ? x.trim() : null);
      out[s.id] = {
        name, nameAr: s.canonical_ar, summary: said(s.short_summary), sourceStatus: s.source_status, reviewStatus: s.review_status,
        confidence: s.confidence,
        // a member is an Arabic word: not a stray letter, not an Urdu gloss (پانا) the drafts carry
        members: (ms.results ?? []).filter((m) => m.set_id === s.id && m.arabic_display && foldAr(m.arabic_display).length >= 2
                                                   && !/[پچژگیکےںہ]/.test(m.arabic_display)).map((m) => ({
          id: m.id, ar: m.arabic_display, bare: m.arabic_bare, root: m.root, gloss: said(m.basic_gloss),
          note: said(m.nuance_note), contrast: said(m.contrast_note), rule: said(m.usage_rule), pattern: said(m.quran_usage_pattern),
          status: m.source_status,
        })),
      };
    }
    return ok({ sets: out });
  });

  router.get('/al/drill/keyterms', async (req, env) => {
    const ids = (new URL(req.url).searchParams.get('entries') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 40);
    if (!ids.length) return ok({ entries: {} });
    const rows = (await env.DB_AL.prepare(
      `SELECT entry_id, root_norm, found_under, key_rank, raw_text, substr(entry_text_en, 1, 1200) AS head, page_start
         FROM ar_ling_root_lexicon_entry_v WHERE source_slug = 'sinai_key_terms' AND entry_id IN (${ids.map(() => '?').join(',')})
        ORDER BY key_rank`).bind(...ids)
      .all<{ entry_id: string; root_norm: string; found_under: string; key_rank: number; raw_text: string; head: string | null; page_start: number | null }>()).results ?? [];
    const out: Record<string, unknown> = {};
    for (const r of rows) {
      if (out[r.entry_id]) continue;
      let terms: Array<{ t: string; ar: string | null; gloss: string | null }> = [];
      try {
        const o = JSON.parse(r.raw_text);
        terms = (o.terms ?? []).map((t: string) => ({ t, ar: o.terms_ar?.[t] ?? null, gloss: (o.terms_gloss?.[t] ?? null)?.replace(/^[\s-]+/, '') ?? null }));
      } catch { /* a stub without JSON */ }
      const text = (r.head ?? '').replace(/\s+/g, ' ').trim();
      out[r.entry_id] = { root: r.root_norm, filedUnder: r.found_under, page: r.page_start, terms,
                          excerpt: text.length > 60 ? text.split(/(?<=\.)\s/).slice(0, 2).join(' ').slice(0, 360) : null,
                          source: 'Sinai, Key Terms of the Qurʾān (2023)' };
    }
    return ok({ entries: out });
  });

  router.get('/al/drill/defs', async (req, env) => {
    const u = new URL(req.url);
    const want = (u.searchParams.get('w') ?? '').split(',').map((s) => s.trim()).filter((s) => s.includes('~')).slice(0, 60)
      .map((s) => { const [root, word] = s.split('~'); return { root, word, key: s }; });
    const srcs = (u.searchParams.get('src') ?? 'lane,lisan,taj,mufradat').split(',').map((s) => SOURCES[s.trim()]).filter(Boolean);
    if (!want.length || !srcs.length) return ok({ defs: {} });
    const keysOf = new Map(want.map((w) => [w.root, rootKeys(w.root)]));
    const allKeys = [...new Set([...keysOf.values()].flat())];   // (bound as one JSON list: D1 takes 100 parameters at most)
    // one read for every root and source: the view carries each root under all the keys it is filed under
    // (Lane is read from his senses below: only his page is wanted from the entry, not its long text)
    const rows = (await env.DB_AL.prepare(
      `SELECT root_norm, key_rank, source_slug, CASE WHEN source_slug = 'lane_lexicon' THEN NULL ELSE raw_text END AS raw_text, page_start
         FROM ar_ling_root_lexicon_entry_v
        WHERE root_norm IN (SELECT value FROM json_each(?)) AND source_slug IN (SELECT value FROM json_each(?))`)
      .bind(JSON.stringify(allKeys), JSON.stringify(srcs.map((s) => s.slug)))
      .all<{ root_norm: string; key_rank: number; source_slug: string; raw_text: string | null; page_start: number | null }>()).results ?? [];
    // Lane's senses as the facts layer reads them (headword → its senses, in his order): a word's first sense
    // under its own headword, never the first rendering after the root's verb
    const lane = srcs.some((x) => x.slug === 'lane_lexicon') ? (await env.DB_AL.prepare(
      `SELECT root_norm, headword_ar, value_en, seq, confidence FROM ar_ling_root_lexicon_fact_v
        WHERE root_norm IN (SELECT value FROM json_each(?)) AND source_slug = 'lane_lexicon' AND fact_kind = 'sense' AND value_en IS NOT NULL`)
      .bind(JSON.stringify(allKeys)).all<{ root_norm: string; headword_ar: string; value_en: string; seq: number; confidence: string }>()).results ?? [] : [];
    const defs: Record<string, Array<{ source: string; text: string; page: number | null; key: string }>> = {};
    for (const w of want) {
      const keys = keysOf.get(w.root) ?? [];
      const out: Array<{ source: string; text: string; page: number | null; key: string }> = [];
      const wk = headKey(w.word);
      const wv = vowels(w.word);
      // (a headword vowelled otherwise is another word: رُبٌّ is not رَبّ)
      const sense = lane.filter((f) => keys.includes(f.root_norm) && headKey(f.headword_ar) === wk && /^(\(?[A-Z])/.test(f.value_en.trim())
                                       && (!wv || !vowels(f.headword_ar) || vowels(f.headword_ar) === wv)
                                       && !f.value_en.includes('◊') && !APPARATUS.test(f.value_en) && f.value_en.trim().split(/\s+/).length >= 2)
        // the headword vowelled as the word is first (رَبّ is not رُبّ, "inspissated juice"), then the surer, then Lane's order
        .sort((a, b) => ((vowels(a.headword_ar) === vowels(w.word) ? 0 : 1) - (vowels(b.headword_ar) === vowels(w.word) ? 0 : 1))
          || ((a.confidence === 'high' ? 0 : 1) - (b.confidence === 'high' ? 0 : 1)) || (a.seq - b.seq))[0];
      for (const src of srcs) {
        if (src.slug === 'lane_lexicon') {
          const page = rows.find((r) => r.source_slug === src.slug && keys.includes(r.root_norm))?.page_start ?? null;
          if (sense) out.push({ source: src.name, text: sense.value_en.trim().replace(/[\s:;,.]+$/, ''), page, key: sense.root_norm });
          continue;
        }
        // the root as spelled first, then the view's other keys, then the weak and hamza spellings
        const mine = rows.filter((r) => r.source_slug === src.slug && keys.includes(r.root_norm) && r.raw_text)
          .sort((a, b) => (keys.indexOf(a.root_norm) - keys.indexOf(b.root_norm)) || (a.key_rank - b.key_rank));
        for (const r of mine) {
          const d = define(r.raw_text!, w.word, w.root, src.slug);
          if (d) { out.push({ source: src.name, text: d, page: r.page_start, key: r.root_norm }); break; }
        }
      }
      defs[w.key] = out;
    }
    return ok({ defs });
  });
}

/// Where a word stands in an entry: as vowelled, then its bare letters with any vowels, then with the
/// article — always as a whole word, never inside another.
function findWord(raw: string, word: string, root: string) {
  const M = '[\\u064B-\\u0652\\u0670\\u0640]*';
  const AR = '[\\u0621-\\u064A]';
  const letter = (c: string) => (c === 'ا' ? '[اأإآٱءئؤ]' : c === 'ي' ? '[يى]' : c === 'ه' ? '[هة]' : c);
  const bounded = (body: string) => new RegExp(`(?<!${AR}${M})${body}(?!${M}${AR})`, 'g');
  const vowelled = (word ?? '').trim().replace(/[ـ]/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const bare = foldAr(word).replace(/^ال/, '');
  const loose = (w: string) => [...w].map((c) => letter(c) + M).join('');
  const keys = [
    vowelled && /[ً-ْ]/.test(vowelled) ? new RegExp(`(?<!${AR}${M})${vowelled}(?![\\u064B-\\u0652]|${M}${AR})`, 'g') : null,
    bare.length >= 2 ? bounded(loose(bare)) : null,
    bare.length >= 2 ? bounded(`ال${M}${loose(bare)}`) : null,
  ].filter(Boolean) as RegExp[];   // (not the root's headword: a word the entry does not name is not defined by it)
  for (const re of keys) {
    const hits = [...raw.matchAll(re)].map((m) => ({ at: m.index ?? 0, end: (m.index ?? 0) + m[0].length }));
    if (hits.length) return hits;
  }
  return [];
}

// Lane's apparatus, not a sense: his sigla and cross-references ("accord. to the M; but in the Ḳ …", "i. q.")
const APPARATUS = /\b(CK|TA|TT|TK|MS|app\.|mistranscri|erroneous|as in the|see art)|accord\. to|\b(in|of) the [ḲṢMKS]\b|\bi\. q\b|^\(?(and|or|as also|see)\b/i;

function define(rawText: string, word: string, root: string, slug: string): string | null {
  const raw = rawText.replace(/\s+/g, ' ');
  const hits = findWord(raw, word, root);
  if (!hits.length) return null;
  if (slug === 'lane_lexicon') {
    for (const h of hits) {
      const m = raw.slice(h.at, h.at + 900).match(/\[([A-Z][a-z][^[\]]{10,200})\]/);
      if (m && !APPARATUS.test(m[1])) return m[1].trim();
    }
    return null;
  }
  const head = hits.find((h) => /^\s*[:：]/.test(raw.slice(h.end, h.end + 3))) ?? hits[0];
  const text = raw.slice(head.at, head.at + 320).split(/(?<=[.؛])\s/)[0].replace(/[()[\]{}﴿﴾]/g, '').slice(0, 240).trim();
  return text.length > 12 ? text : null;
}
