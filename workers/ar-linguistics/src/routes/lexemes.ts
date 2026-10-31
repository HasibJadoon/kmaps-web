import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import { cached } from '../../../shared/src/cache';
import type { ArLinguisticsEnv } from '../env';
import { softFail } from '../../../shared/src/soft-fail';

// Lexemes the Arabic worker drills in context (its scenes, its passages), served by
// typed reference so no domain copies another's data:
//   VI:<root>|<particle>  a verbal idiom (Mir's corpus, ar_ling_root_lemma_tabir, grouped
//                         over its Qurʾān occurrences — its range of meanings, each with its āya)
//   TD:<id>               a verb and the particle it takes (ar_ling_root_lemma_tadiya)
//   SK:<entry id>         a key term of the Qurʾān (Sinai 2023, sinai_key_terms)
//   NS:<set id>|<member>  a near-synonym as used, among the others of its set (ar_ling_root_lemma_furuq_*)
// Each comes with three wrong meanings (other idioms with the same particle, other terms)
// for the drill to set beside the right one.

const MARKS = /[ً-ْٰـۖ-ۭ]/g;
export const foldAr = (w: string) => (w ?? '').replace(MARKS, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/[ـ\s]+$/g, '').trim();

interface Tabir { id: string; expression_ar: string; expression_en: string; lemma_ar: string; root_ar: string; preposition_ar: string; surah: number; ayah: number; construction_en: string | null; ayah_translation_en: string | null }

export function lexemeRoutes(router: Router<ArLinguisticsEnv>) {
  router.get('/al/lex/v2/lexemes', (req, env) => cached(req, async () => {
    const refs = (new URL(req.url).searchParams.get('refs') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 60);
    const out: Record<string, unknown> = {};
    const ns = refs.filter((r) => r.startsWith('NS:'));
    if (ns.length) {
      const sets = [...new Set(ns.map((r) => r.slice(3).split('|')[0]))];
      const members = (await env.DB_AL.prepare(
        `SELECT m.id, m.set_id, m.arabic_display, m.arabic_bare, m.basic_gloss, m.nuance_note, m.contrast_note, m.usage_rule, s.set_name, s.canonical_en,
                r.root_normalized AS root
           FROM ar_ling_root_lemma_furuq_member m JOIN ar_ling_root_lemma_furuq_set s ON s.id = m.set_id
           LEFT JOIN ar_ling_root_lemma l ON l.id = m.lemma_id LEFT JOIN ar_ling_roots r ON r.id = l.root_id
          WHERE m.set_id IN (${sets.map(() => '?').join(',')}) ORDER BY m.sort_order`,
      ).bind(...sets).all<{ id: string; set_id: string; arabic_display: string; arabic_bare: string | null; root: string | null; basic_gloss: string | null; nuance_note: string | null;
                            contrast_note: string | null; usage_rule: string | null; set_name: string; canonical_en: string | null }>()).results ?? [];
      for (const ref of ns) {
        const [setId, memberId] = ref.slice(3).split('|');
        const ms = members.filter((m) => m.set_id === setId);
        const used = ms.find((m) => m.id === memberId);
        if (!used || ms.length < 3) continue;
        const note = (m: typeof used) => [m.nuance_note && m.nuance_note !== m.set_name ? m.nuance_note : null, m.contrast_note, m.usage_rule]
          .filter(Boolean).join(' — ') || null;
        // how the classical lexica tell them apart: each member where Lisān, Tāj al-ʿArūs and Lane define it
        const withLexica = await Promise.all(ms.slice(0, 6).map(async (m) => ({
          ar: m.arabic_display, gloss: m.basic_gloss, note: note(m), used: m.id === memberId,
          lexica: m.root ? (await Promise.all(LEXICA.map((src) => define(env, m.root!, src, m.arabic_bare ?? m.arabic_display)))).filter(Boolean) : [],
        })));
        out[ref] = { kind: 'near_synonym', set: used.canonical_en ?? used.set_name, used: used.arabic_display,
                     members: withLexica,
                     distractors: pick(ms.filter((m) => m.id !== memberId).map((m) => m.arabic_display), 3) };
      }
    }
    const vi = refs.filter((r) => r.startsWith('VI:')), td = refs.filter((r) => r.startsWith('TD:')), sk = refs.filter((r) => r.startsWith('SK:'));

    if (vi.length) {
      const rows = (await env.DB_AL.prepare(
        `SELECT id, expression_ar, expression_en, lemma_ar, root_ar, preposition_ar, surah, ayah, construction_en, ayah_translation_en
           FROM ar_ling_root_lemma_tabir WHERE status = 'live' AND expression_type_id = 'arl-et-09' AND preposition_ar IS NOT NULL`,
      ).all<Tabir>()).results ?? [];
      const groups = new Map<string, Tabir[]>();
      for (const r of rows) {
        const k = `VI:${foldAr(r.root_ar).replace(/\s+/g, '')}|${foldAr(r.preposition_ar)}`;   // by root: Mir's lemma field is not always the verb
        groups.set(k, [...(groups.get(k) ?? []), r]);
      }
      for (const ref of vi) {
        const g = groups.get(ref);
        if (!g) continue;
        const prep = foldAr(g[0].preposition_ar);
        const meanings = [...new Map(g.map((r) => [r.expression_en.trim(), r])).values()]
          .map((r) => ({ en: r.expression_en.trim(), ref: `${r.surah}:${r.ayah}`, construction: r.construction_en, ayahEn: r.ayah_translation_en }));
        const own = new Set(meanings.map((m) => m.en));
        const others = [...groups.entries()].filter(([k]) => k !== ref && k.endsWith(`|${prep}`))
          .map(([, rs]) => rs[0].expression_en.trim()).filter((e) => !own.has(e));
        out[ref] = { kind: 'verbal_idiom', phrase: `${g[0].lemma_ar} ${g[0].preposition_ar}`, meanings,
                     source: 'Mir, Verbal Idioms of the Qurʾān', distractors: pick(others, 3),
                     lane: await lane(env, foldAr(g[0].root_ar).replace(/\s+/g, ''), foldAr(g[0].preposition_ar)) };
      }
    }
    if (td.length) {
      const rows = (await env.DB_AL.prepare(
        `SELECT id, verb_ar, harf, meaning_en, qr_ref FROM ar_ling_root_lemma_tadiya WHERE status = 'live' AND harf IS NOT NULL`,
      ).all<{ id: string; verb_ar: string; harf: string; meaning_en: string; qr_ref: string | null }>()).results ?? [];
      const byId = new Map(rows.map((r) => [r.id, r]));
      for (const ref of td) {
        const r = byId.get(ref.slice(3));
        if (!r) continue;
        const others = rows.filter((x) => x.id !== r.id && x.harf === r.harf).map((x) => x.meaning_en);
        out[ref] = { kind: 'verbal_idiom', phrase: `${r.verb_ar} ${r.harf}`,
                     meanings: [{ en: r.meaning_en, ref: r.qr_ref?.replace(/^QR:/, '') ?? null, construction: null }],
                     source: 'K-Maps tadiya', distractors: pick(others, 3) };
      }
    }
    if (sk.length) {
      const rows = (await env.DB_AL.prepare(
        `SELECT id, root_norm, raw_text, entry_text_en, page_start FROM ar_ling_lexicon_entry WHERE source_slug = 'sinai_key_terms'`,
      ).all<{ id: string; root_norm: string; raw_text: string; entry_text_en: string | null; page_start: number | null }>()).results ?? [];
      const glossOf = (r: { raw_text: string }) => {
        try { const o = JSON.parse(r.raw_text); return Object.values(o.terms_gloss ?? {}) as string[]; } catch { return []; }
      };
      for (const ref of sk) {
        const r = rows.find((x) => x.id === ref.slice(3));
        if (!r) continue;
        let terms: Array<{ term: string; ar: string | null; gloss: string | null }> = [];
        try {
          const o = JSON.parse(r.raw_text);
          terms = (o.terms ?? []).map((t: string) => ({ term: t, ar: o.terms_ar?.[t] ?? null, gloss: o.terms_gloss?.[t] ?? null }));
        } catch { /* none */ }
        const text = (r.entry_text_en ?? '').replace(/\s+/g, ' ').trim();
        const excerpt = text.length > 60 ? text.split(/(?<=\.)\s/).slice(0, 2).join(' ').slice(0, 320) : null;
        const others = rows.filter((x) => x.id !== r.id).flatMap(glossOf).filter(Boolean);
        out[ref] = { kind: 'keyterm', root: r.root_norm, terms, excerpt, page: r.page_start, lane: await lane(env, r.root_norm, null),
                     source: 'Sinai, Key Terms of the Qur’an (2023)', distractors: pick(others, 3) };
      }
    }
    return ok({ lexemes: out });
  }));
}

/// Lane's range of meanings for a root: the bracketed English renderings of its article,
/// in order — those after the particle first, when a particle is asked for. Through the
/// view, which carries every key a root is filed under (see CLAUDE.md).
async function lane(env: ArLinguisticsEnv, root: string, particle: string | null) {
  const r = await env.DB_AL.prepare(
    `SELECT raw_text, page_start FROM ar_ling_root_lexicon_entry_v WHERE root_norm = ? AND source_slug = 'lane_lexicon' ORDER BY key_rank LIMIT 1`,
  ).bind(root).first<{ raw_text: string; page_start: number | null }>().catch(softFail(null));
  if (!r?.raw_text) return null;
  const senses = (text: string) => [...text.matchAll(/\[([^\[\]]{12,170})\]/g)].map((m) => m[1].trim())
    // a sense as Lane renders it: opens with a capital, reads as English, not an editor's aside
    .filter((x) => /^[A-Z][a-z]/.test(x) && x.split(/\s+/).length >= 3
      && (x.match(/[\u0600-\u06FF]/g) ?? []).length < x.length * 0.2
      && !/\b(CK|TA|TT|TK|MS|app\.|mistranscri|erroneous|as in the|see art)/i.test(x));
  let withParticle: string[] = [];
  if (particle) {
    const bare = r.raw_text.replace(/[\u064B-\u0652\u0670]/g, '');
    const at = [...bare.matchAll(new RegExp(`\\s${particle}\\b`, 'g'))].map((m) => m.index ?? 0);
    withParticle = at.flatMap((i) => senses(bare.slice(i, i + 400)).slice(0, 1));
  }
  const all = [...new Set([...withParticle, ...senses(r.raw_text)])].slice(0, 6);
  return all.length ? { senses: all, page: r.page_start, source: 'Lane, An Arabic-English Lexicon' } : null;
}

const LEXICA = [
  { slug: 'ibn_manzur_lisan_arab', name: 'Lisān al-ʿArab' },
  { slug: 'zabidi_taj_arus', name: 'Tāj al-ʿArūs' },
  { slug: 'lane_lexicon', name: 'Lane' },
];

/// Where one lexicon defines this word under its root, in the lexicon's own vowelled text: the
/// word's headword definition (the word, then a colon) or else its first mention, to the end of the
/// sentence; in Lane, the first rendering in brackets after it that is Lane's and not an editor's note.
/// Where a word stands in an entry, trying one key after another: as vowelled in the set (its
/// tashkīl must agree), then its bare letters with any vowels, then with or without the article,
/// then the root itself (the entry's headword) — always as a whole word, never inside another.
function findWord(raw: string, word: string, root: string) {
  const M = '[\\u064B-\\u0652\\u0670\\u0640]*';
  const AR = '[\\u0621-\\u064A]';
  const letter = (c: string) => (c === 'ا' ? '[اأإآٱ]' : c === 'ي' ? '[يى]' : c === 'ه' ? '[هة]' : c);
  const bounded = (body: string) => new RegExp(`(?<!${AR}${M})${body}(?!${M}${AR})`, 'g');
  const vowelled = (word ?? '').trim().replace(/[\u0640]/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const bare = foldAr(word).replace(/^ال/, '');
  const loose = (w: string) => [...w].map((c) => letter(c) + M).join('');
  const keys = [
    vowelled && /[\u064B-\u0652]/.test(vowelled) ? new RegExp(`(?<!${AR}${M})${vowelled}(?![\\u064B-\\u0652]|${M}${AR})`, 'g') : null,   // with its tashkīl, exactly
    bare.length >= 2 ? bounded(loose(bare)) : null,                                 // without
    bare.length >= 2 ? bounded(`ال${M}${loose(bare)}`) : null,                      // with the article
    root ? bounded(loose(foldAr(root))) : null,                                     // the root's headword
  ].filter(Boolean) as RegExp[];
  for (const re of keys) {
    const hits = [...raw.matchAll(re)].map((m) => ({ at: m.index ?? 0, end: (m.index ?? 0) + m[0].length }));
    if (hits.length) return hits;
  }
  return [];
}

async function define(env: ArLinguisticsEnv, root: string, src: { slug: string; name: string }, word: string) {
  const r = await env.DB_AL.prepare(
    `SELECT raw_text, page_start FROM ar_ling_root_lexicon_entry_v WHERE root_norm = ? AND source_slug = ? ORDER BY key_rank LIMIT 1`,
  ).bind(root, src.slug).first<{ raw_text: string; page_start: number | null }>().catch(softFail(null));
  if (!r?.raw_text) return null;
  const raw = r.raw_text.replace(/\s+/g, ' ');
  const hits = findWord(raw, word, root);
  if (!hits.length) return null;
  if (src.slug === 'lane_lexicon') {
    for (const h of hits) {
      const m = raw.slice(h.at, h.at + 900).match(/\[([A-Z][a-z][^\[\]]{10,200})\]/);
      if (m && !/\b(CK|TA|TT|TK|MS|app\.|mistranscri|erroneous|as in the|see art)/i.test(m[1])) {
        return { source: src.name, text: m[1].trim(), page: r.page_start };
      }
    }
    return null;
  }
  const head = hits.find((h) => /^\s*[:：]/.test(raw.slice(h.end, h.end + 3))) ?? hits[0];
  let text = raw.slice(head.at, head.at + 320);
  text = text.split(/(?<=[.؛])\s/)[0].replace(/[()\[\]{}﴿﴾]/g, '').slice(0, 240).trim();
  return text.length > 12 ? { source: src.name, text, page: r.page_start } : null;
}

function pick<T>(xs: T[], k: number) {
  const a = [...new Set(xs)];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, k);
}
