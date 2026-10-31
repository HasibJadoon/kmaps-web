import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import { labels, byKey, type Label } from '../lib/labels';
import type { ArabicEnv } from '../env';
import { softFail } from '../../../shared/src/soft-fail';

// A scene's HIGH-END language — never every verb and noun. Four sections, each from data:
//   idiom    a verb with the particle that changes its meaning, and verbal idioms (ar_scene_lexeme kind verbal_idiom:
//            AL tabir / tadiya), with their meaning from AL (/al/lex/v2/lexemes)
//   feature  expert grammar and balāgha the scene's lines show (ar_scene_vocab.features_json, kept where its term is
//            expert tier — ar_scene_feature_term → ar_ling_gram_term.tier)
//   keyterm  Qurʾān key terms (ar_scene_lexeme kind keyterm: Sinai), with their gloss
//   hard     words that are hard or gharīb in the Qurʾān (ar_scene_word.qr_grade, AR 0051), with their ṣarf
// Lines are counted from 1, as the script view counts them. Every label and colour comes from ar_practice_label.

interface W { line: number; word_index: number; surface: string; lemma_ar: string | null; root: string | null; word_class: string;
              derivation: string | null; link_kind: string; al_lemma_ref: string | null; al_root_ref: string | null; sarf_json: string | null;
              source: string; qr_grade: string | null }
type Hit = { line: number; span_from: number; span_to: number; ref: string; kind: string };
type Lexeme = { phrase?: string; meanings?: Array<{ en: string }>; terms?: Array<{ term: string; ar: string | null; gloss: string | null }> };
type Feature = { line?: number; span?: number[]; feature?: string; term_ar?: string; text?: string; explanation?: string };

const badge = (l: Label | undefined, key: string) =>
  ({ key, label: l?.label ?? key, labelAr: l?.labelAr ?? null, detail: l?.detail ?? null, color: l?.color ?? null });

/// How often each lemma stands in the Qurʾān (QR qr_vocab_grade by AL lemma) — for the hard words' count line only.
async function quranCounts(env: ArabicEnv, refs: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!env.QURAN || !refs.length) return out;
  const r = await env.QURAN.fetch('https://qr/qr/internal/rows', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ table: 'qr_vocab_grade', bind_col: 'al_lemma_ref', bind_value: '', bind_values: refs.slice(0, 200), limit: 200 }) })
    .then((x) => x.json() as Promise<{ data?: { rows?: Array<{ al_lemma_ref: string; quran_n: number }> } }>).catch(() => null);
  for (const g of r?.data?.rows ?? []) if (!out.has(g.al_lemma_ref)) out.set(g.al_lemma_ref, g.quran_n);
  return out;
}

export function sceneWordRoutes(router: Router<ArabicEnv>) {
  router.get('/ar/scenes/:unit/:no/words', async (_req, env, { unit, no }) => {
    const n = Number(no);
    const unitRow = await queryOne<{ script_json: string | null }>(env.DB_AR, `SELECT script_json FROM ar_text_unit WHERE id = ?`, [unit]);
    if (!unitRow?.script_json) return notFound(`scene ${no} of ${unit}`);
    let lines: Array<{ ar?: string }> = [];
    try {
      const doc = JSON.parse(unitRow.script_json) as { scenes?: Array<{ scene_no?: number; lines?: Array<{ ar?: string }> }> };
      lines = (doc.scenes ?? []).find((s, i) => (s.scene_no ?? i + 1) === n)?.lines ?? [];
    } catch { /* none */ }
    const phrase = (line: number, from: number, to: number) => (lines[line]?.ar ?? '').split(/\s+/).slice(from, to + 1).join(' ') || null;

    const [L, hits, words, feats] = await Promise.all([
      labels(env),
      query<Hit>(env.DB_AR, `SELECT line, span_from, span_to, ref, kind FROM ar_scene_lexeme
                              WHERE unit_id = ? AND scene_no = ? AND kind IN ('verbal_idiom', 'keyterm') ORDER BY line, span_from`, [unit, n]).catch(softFail([])),
      query<W>(env.DB_AR, `SELECT * FROM ar_scene_word WHERE unit_id = ? AND scene_no = ? AND qr_grade IN ('hard', 'super')
                            AND word_class IN ('verb', 'noun') ORDER BY line, word_index`, [unit, n]).catch(softFail([])),
      query<{ feature_idx: number; term_id: string; name_ar: string; name_en: string | null; badge_color: string | null; features_json: string | null }>(env.DB_AR,
        `SELECT f.feature_idx, f.term_id, g.name_ar, g.name_en, g.badge_color, v.features_json
           FROM ar_scene_feature_term f JOIN ar_ling_gram_term g ON g.id = f.term_id
           JOIN ar_scene_vocab v ON v.unit_id = f.unit_id AND v.scene_no = f.scene_no
          WHERE f.unit_id = ? AND f.scene_no = ? AND g.tier = 'expert'`, [unit, n]).catch(softFail([])),
    ]);

    // the meanings of the idioms and key terms, from AL
    const refs = [...new Set(hits.map((h) => h.ref.replace(/^AL:/, '')))];
    const lex: Record<string, Lexeme> = refs.length && env.AR_LINGUISTICS
      ? (await env.AR_LINGUISTICS.fetch(`https://al/al/lex/v2/lexemes?refs=${encodeURIComponent(refs.join(','))}`)
          .then((r) => r.json() as Promise<{ data?: { lexemes?: Record<string, Lexeme> } }>).catch(() => null))?.data?.lexemes ?? {}
      : {};
    const lexOf = (ref: string) => lex[ref.replace(/^AL:/, '')] ?? lex[ref] ?? {};
    const seen = new Set<string>();
    const lexItems = (kind: string) => hits.filter((h) => h.kind === kind).flatMap((h) => {
      const k = `${h.line}:${h.span_from}:${h.ref}`;
      if (seen.has(k)) return [];
      seen.add(k);
      const x = lexOf(h.ref);
      const meaning = kind === 'verbal_idiom' ? x.meanings?.[0]?.en ?? null : x.terms?.[0]?.gloss ?? x.terms?.[0]?.term ?? null;
      return [{ kind: kind === 'verbal_idiom' ? 'idiom' : 'keyterm', line: h.line + 1, span: [h.span_from, h.span_to],
                phrase: phrase(h.line, h.span_from, h.span_to), form: x.phrase ?? null, meaning, ref: h.ref }];
    });

    // expert features: the scene's feature rows whose term is expert tier
    const features = feats.flatMap((f) => {
      let all: Feature[] = [];
      try { all = JSON.parse(f.features_json ?? '[]') as Feature[]; } catch { return []; }
      const x = all[f.feature_idx];
      if (!x) return [];
      return [{ kind: 'feature', line: typeof x.line === 'number' ? x.line + 1 : null, span: x.span ?? null, phrase: x.text ?? null,
                feature: x.feature ?? null, explanation: x.explanation ?? null,
                term: { id: f.term_id, nameAr: f.name_ar, nameEn: f.name_en, color: f.badge_color } }];
    });

    // hard Qurʾān words, with their ṣarf and how often the Qurʾān has them
    const counts = await quranCounts(env, [...new Set(words.map((w) => w.al_lemma_ref).filter((x): x is string => !!x))]);
    const C = byKey(L.word_class), D = byKey(L.word_derivation), S = byKey(L.word_sarf), G = byKey(L.quran_grade);
    const countWord = (L.word_words ?? []).find((l) => l.key === 'quran_count');
    const fill = (t: string | null | undefined, n2: number) => (t ? t.replace('{n}', String(n2)) : null);
    const hard = words.map((w) => {
      let sarf: Record<string, string> = {};
      try { sarf = w.sarf_json ? JSON.parse(w.sarf_json) : {}; } catch { /* none */ }
      const nq = w.al_lemma_ref ? counts.get(w.al_lemma_ref) : undefined;
      return {
        kind: 'hard', line: w.line, index: w.word_index, surface: w.surface, lemma: w.lemma_ar, root: w.root?.includes('#') ? null : w.root,
        class: badge(C.get(w.word_class), w.word_class), derivation: w.derivation ? badge(D.get(w.derivation), w.derivation) : null,
        sarf: (L.word_sarf ?? []).filter((l) => sarf[l.key]).map((l) => ({ ...badge(S.get(l.key), l.key), form: sarf[l.key] })),
        quran: { grade: badge(G.get(w.qr_grade ?? ''), w.qr_grade ?? ''), count: nq ?? null,
                 countLine: nq != null ? fill(countWord?.label, nq) : null, countLineAr: nq != null ? fill(countWord?.labelAr, nq) : null },
        lemmaRef: w.al_lemma_ref, rootRef: w.al_root_ref, provisional: w.source !== 'authored',
      };
    });

    const Wd = byKey(L.word_words);
    const section = (key: string, items: unknown[]) => ({ ...badge(Wd.get(key), key), items });
    const sections = [section('sec_idiom', lexItems('verbal_idiom')), section('sec_feature', features),
                      section('sec_keyterm', lexItems('keyterm')), section('sec_hard', hard)].filter((s) => s.items.length);
    const words2 = Object.fromEntries((L.word_words ?? []).map((l) => [l.key, { label: l.label, labelAr: l.labelAr, detail: l.detail, icon: l.icon }]));
    return ok({ unit, scene: n, words: words2, sections });
  });
}
