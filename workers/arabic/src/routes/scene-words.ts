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

const badge = (l: Label | undefined, key: string) =>
  ({ key, label: l?.label ?? key, labelAr: l?.labelAr ?? null, detail: l?.detail ?? null, color: l?.color ?? null });

export function sceneWordRoutes(router: Router<ArabicEnv>) {
  router.get('/ar/scenes/:unit/:no/words', async (_req, env, { unit, no }) => {
    const rows = await query<W>(env.DB_AR,
      `SELECT * FROM ar_scene_word WHERE unit_id = ? AND scene_no = ? ORDER BY line, word_index`, [unit, Number(no)]);
    if (!rows.length) return notFound(`words of ${unit} scene ${no}`);
    const L = await labels(env);
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
        provisional: w.source !== 'authored',
      };
      lines.set(w.line, [...(lines.get(w.line) ?? []), item]);
    }
    const counts = { words: rows.length, quranLemma: rows.filter((r) => r.link_kind === 'lemma').length,
                     quranRoot: rows.filter((r) => r.link_kind === 'root').length };
    return ok({ unit, scene: Number(no), counts,
                legend: { class: (L.word_class ?? []).map((l) => badge(l, l.key)), derivation: (L.word_derivation ?? []).map((l) => badge(l, l.key)),
                          link: (L.word_link ?? []).map((l) => badge(l, l.key)) },
                lines: [...lines.entries()].map(([line, words]) => ({ line, words })) });
  });
}
