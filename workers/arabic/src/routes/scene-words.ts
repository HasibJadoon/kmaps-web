import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import { labels, byKey, type Label } from '../lib/labels';
import type { ArabicEnv } from '../env';

// A scene's words (AR 0045 ar_scene_word): each word's class, its ṣarf, whether it is مشتق or جامد, and its tie
// to the Qurʾān's vocabulary — the lemma or root in km_arabic_linguistic by typed reference, so the word opens
// its lemma card there. Every word, colour and label comes from ar_practice_label (word_class, word_derivation,
// word_link, word_sarf); the analyser's readings are marked provisional.

interface W { line: number; word_index: number; surface: string; lemma_ar: string | null; root: string | null; word_class: string;
              number: string | null; gender: string | null; aspect: string | null; derivation: string | null; link_kind: string;
              al_lemma_ref: string | null; al_root_ref: string | null; sarf_json: string | null; source: string }

type Grade = { grade: string; quran_n: number };

/// How hard each lemma is in the Qurʾān (QR qr_vocab_grade by AL lemma, qr_121), in calls of 100.
/// A Qurʾān worker that is down or older only leaves the grades out.
async function quranGrades(env: ArabicEnv, refs: string[]): Promise<Map<string, Grade>> {
  const out = new Map<string, Grade>();
  if (!env.QURAN || !refs.length) return out;
  const chunks: string[][] = [];
  for (let i = 0; i < refs.length; i += 100) chunks.push(refs.slice(i, i + 100));
  await Promise.all(chunks.map(async (bind_values) => {
    const r = await env.QURAN!.fetch('https://qr/qr/internal/rows', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ table: 'qr_vocab_grade', bind_col: 'al_lemma_ref', bind_value: '', bind_values, limit: 200 }) })
      .then((x) => x.json() as Promise<{ data?: { rows?: Array<Grade & { al_lemma_ref: string }> }; rows?: Array<Grade & { al_lemma_ref: string }> }>)
      .catch(() => null);
    for (const g of r?.data?.rows ?? r?.rows ?? []) if (!out.has(g.al_lemma_ref)) out.set(g.al_lemma_ref, { grade: g.grade, quran_n: g.quran_n });
  }));
  return out;
}

const badge = (l: Label | undefined, key: string) =>
  ({ key, label: l?.label ?? key, labelAr: l?.labelAr ?? null, detail: l?.detail ?? null, color: l?.color ?? null });

export function sceneWordRoutes(router: Router<ArabicEnv>) {
  router.get('/ar/scenes/:unit/:no/words', async (_req, env, { unit, no }) => {
    const rows = await query<W>(env.DB_AR,
      `SELECT * FROM ar_scene_word WHERE unit_id = ? AND scene_no = ? ORDER BY line, word_index`, [unit, Number(no)]);
    if (!rows.length) return notFound(`words of ${unit} scene ${no}`);
    const [L, grades] = await Promise.all([labels(env),
      quranGrades(env, [...new Set(rows.map((r) => r.al_lemma_ref).filter((x): x is string => !!x))])]);
    const G = byKey(L.quran_grade);
    const countWord = (L.word_words ?? []).find((l) => l.key === 'quran_count');
    const C = byKey(L.word_class), D = byKey(L.word_derivation), K = byKey(L.word_link), S = byKey(L.word_sarf);
    const lines = new Map<number, unknown[]>();
    for (const w of rows) {
      let sarf: Record<string, string> = {};
      try { sarf = w.sarf_json ? JSON.parse(w.sarf_json) : {}; } catch { /* none */ }
      const item = {
        index: w.word_index, surface: w.surface, lemma: w.lemma_ar, root: w.root?.includes('#') ? null : w.root,
        class: badge(C.get(w.word_class), w.word_class),
        derivation: w.derivation ? badge(D.get(w.derivation), w.derivation) : null,
        link: badge(K.get(w.link_kind), w.link_kind),
        // what the word is in its line: number, gender, aspect — as the analyser read them
        features: { number: w.number, gender: w.gender, aspect: w.aspect },
        sarf: (L.word_sarf ?? []).filter((l) => sarf[l.key]).map((l) => ({ ...badge(S.get(l.key), l.key), form: sarf[l.key] })),
        lemmaRef: w.al_lemma_ref, rootRef: w.al_root_ref,
        // how hard the lemma is in the Qurʾān, and how often it stands there
        quran: (() => {
          const g = w.al_lemma_ref ? grades.get(w.al_lemma_ref) : undefined;
          if (!g) return null;
          const fill = (t: string | null | undefined) => t ? t.replace('{n}', String(g.quran_n)) : null;
          return { grade: badge(G.get(g.grade), g.grade), count: g.quran_n,
                   countLine: fill(countWord?.label) ?? `${g.quran_n}× in the Qurʾān`, countLineAr: fill(countWord?.labelAr) };
        })(),
        provisional: w.source !== 'authored',
      };
      lines.set(w.line, [...(lines.get(w.line) ?? []), item]);
    }
    const counts = { words: rows.length, quranLemma: rows.filter((r) => r.link_kind === 'lemma').length,
                     quranRoot: rows.filter((r) => r.link_kind === 'root').length };
    const words = Object.fromEntries((L.word_words ?? []).map((l) => [l.key, { label: l.label, labelAr: l.labelAr, detail: l.detail, icon: l.icon }]));
    const fill = (t: string | undefined) => t?.replace('{words}', String(counts.words)).replace('{lemma}', String(counts.quranLemma))
      .replace('{root}', String(counts.quranRoot)) ?? null;
    return ok({ unit, scene: Number(no), counts, countLine: fill((L.word_words ?? []).find((l) => l.key === 'counts')?.label), words,
                legend: { class: (L.word_class ?? []).map((l) => badge(l, l.key)), derivation: (L.word_derivation ?? []).map((l) => badge(l, l.key)),
                          link: (L.word_link ?? []).map((l) => badge(l, l.key)),
                          quranGrade: (L.quran_grade ?? []).map((l) => badge(l, l.key)) },
                lines: [...lines.entries()].map(([line, words]) => ({ line, words })) });
  });
}
