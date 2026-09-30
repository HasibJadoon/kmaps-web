import type { Router } from '../../../shared/src/router';
import { ok, badRequest, notFound } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { features, profiles, sources, choiceLabel, cleanText, type TFeature } from '../lib/translation-choices';

// ── Translation choices ──────────────────────────────────────────────────────
// How the English translators render an Arabic feature, measured across the whole Qurʾān
// (qr_052; computed by kmaps-resources/scripts/quran/translation_choices.py).
//
//   GET /qr/translation/features            the registry, each feature's overall distribution
//   GET /qr/translation/profiles?feature=   each translation's distribution over the feature's choices
//                                           (no feature: every feature, each translation's top choice)
//   GET /qr/translation/ayah/:s/:a          every English rendering of the āyah, with each detected choice
//
// Kept by the 'rest' cache version (src/index.ts): the script updates the registry last.

export function translationChoiceRoutes(router: Router<QuranEnv>) {
  router.get('/qr/translation/features', async (_req, env) => {
    const [fs, dist] = await Promise.all([
      features(env),
      query<{ feature: string; choice: string; n: number }>(env.DB_QR,
        `SELECT feature, choice, SUM(n) AS n FROM qr_translation_profile GROUP BY feature, choice`),
    ]);
    return ok({
      features: fs.map((f) => {
        const mine = dist.filter((d) => d.feature === f.key);
        const all = mine.reduce((s, d) => s + d.n, 0) || 1;
        return {
          key: f.key, label: f.label, labelAr: f.labelAr, detail: f.detail, arabicDetector: f.arabicDetector,
          scope: f.scope, window: f.window, nAyat: f.nAyat, nRenderings: f.nRows, computedAt: f.computedAt,
          choices: f.choices.map((c) => {
            const n = mine.find((d) => d.choice === c.key)?.n ?? 0;
            return { key: c.key, label: c.label, regex: c.regex ?? null, flags: c.flags ?? null, max: c.max ?? null, n, share: round(n / all) };
          }),
          compare: f.compare.map((q) => q.ask),
        };
      }),
    });
  });

  router.get('/qr/translation/profiles', async (req, env) => {
    const key = new URL(req.url).searchParams.get('feature');
    const [fs, src] = await Promise.all([features(env), sources(env)]);
    const byKey = new Map(fs.map((f) => [f.key, f]));
    if (key && !byKey.has(key)) return badRequest(`unknown feature ${key}; one of ${fs.map((f) => f.key).join(', ')}`);
    const rows = await profiles(env, key ?? undefined);
    const bySource = new Map<string, typeof rows>();
    for (const r of rows) bySource.set(r.source_id, [...(bySource.get(r.source_id) ?? []), r]);
    const name = (id: string) => src.get(id)?.translator ?? id;
    if (key) {
      const f = byKey.get(key)!;
      return ok({
        feature: { key: f.key, label: f.label, labelAr: f.labelAr, detail: f.detail, nAyat: f.nAyat,
                   choices: f.choices.map((c) => ({ key: c.key, label: c.label })) },
        translators: [...bySource.entries()].map(([id, rs]) => {
          const top = [...rs].sort((a, b) => b.share - a.share)[0];
          return { sourceId: id, translator: name(id), edition: src.get(id)?.edition ?? null, total: rs[0].total, top: top.choice,
                   choices: f.choices.map((c) => { const r = rs.find((x) => x.choice === c.key);
                     return { key: c.key, n: r?.n ?? 0, share: r?.share ?? 0, lift: r?.lift ?? null }; }) };
        }).sort((a, b) => a.translator.localeCompare(b.translator)),
      });
    }
    return ok({
      features: fs.map((f) => ({ key: f.key, label: f.label, choices: f.choices.map((c) => ({ key: c.key, label: c.label })) })),
      translators: [...bySource.entries()].map(([id, rs]) => {
        const per: Record<string, { top: string; share: number; total: number; dist: Record<string, number> }> = {};
        for (const f of fs) {
          const mine = rs.filter((r) => r.feature === f.key);
          if (!mine.length) continue;
          const top = [...mine].sort((a, b) => b.share - a.share)[0];
          per[f.key] = { top: top.choice, share: top.share, total: top.total, dist: Object.fromEntries(mine.map((r) => [r.choice, r.share])) };
        }
        return { sourceId: id, translator: name(id), features: per };
      }).sort((a, b) => a.translator.localeCompare(b.translator)),
    });
  });

  router.get('/qr/translation/ayah/:surah/:ayah', async (_req, env, { surah, ayah }) => {
    const s = Number(surah), a = Number(ayah);
    if (!Number.isInteger(s) || !Number.isInteger(a) || s < 1 || s > 114 || a < 1) return badRequest('surah 1–114 and an āyah');
    const [fs, ayahRow, words, spots, texts, choices] = await Promise.all([
      features(env),
      query<{ text: string | null; name_en: string | null }>(env.DB_QR,
        `SELECT q.text_uthmani AS text, su.name_en FROM qr_ayah q LEFT JOIN qr_surah su ON su.id = q.surah WHERE q.surah = ? AND q.ayah = ?`, [s, a]),
      query<{ word_index: number; word_text: string }>(env.DB_QR,
        `SELECT word_index, word_text FROM qr_word_occurrence WHERE surah = ? AND ayah = ? ORDER BY word_index`, [s, a]),
      query<{ feature: string; word_indexes: string; ar_words: string | null }>(env.DB_QR,
        `SELECT feature, word_indexes, ar_words FROM qr_translation_feature_ayah WHERE surah = ? AND ayah = ?`, [s, a]),
      // from each English source to its rendering: CROSS JOIN keeps the sources outermost, so each
      // rendering is one lookup on the unique (source_id, surah, ayah) index, not a scan
      query<{ id: string; translator: string; text: string }>(env.DB_QR,
        `SELECT src.id, src.translator_name AS translator, t.translation_text AS text
           FROM qr_translation_source src CROSS JOIN qr_translation t ON t.source_id = src.id AND t.surah = ? AND t.ayah = ?
          WHERE src.language = 'en' ORDER BY src.translator_name`, [s, a]),
      query<{ feature: string; source_id: string; choice: string; evidence: string | null; value: number | null }>(env.DB_QR,
        `SELECT feature, source_id, choice, evidence, value FROM qr_translation_choice WHERE surah = ? AND ayah = ?`, [s, a]),
    ]);
    if (!ayahRow.length) return notFound(`no āyah ${s}:${a}`);
    const byKey = new Map(fs.map((f) => [f.key, f]));
    const present = fs.filter((f) => spots.some((x) => x.feature === f.key));
    const bySource = new Map<string, Record<string, unknown>>();
    for (const c of choices) {
      const f = byKey.get(c.feature);
      if (!f) continue;
      const m = bySource.get(c.source_id) ?? {};
      m[c.feature] = { choice: c.choice, label: choiceLabel(f, c.choice), evidence: c.evidence, value: c.value };
      bySource.set(c.source_id, m);
    }
    return ok({
      surah: s, ayah: a, title: `${ayahRow[0].name_en ?? 'Surah ' + s} ${s}:${a}`, ar: ayahRow[0].text,
      words: words.map((w) => ({ i: w.word_index, t: w.word_text })),
      features: present.map((f: TFeature) => {
        const x = spots.find((y) => y.feature === f.key)!;
        const mine = choices.filter((c) => c.feature === f.key);
        const tally: Record<string, number> = {};
        for (const c of mine) tally[c.choice] = (tally[c.choice] ?? 0) + 1;
        return { key: f.key, label: f.label, labelAr: f.labelAr, wordIndexes: x.word_indexes ? x.word_indexes.split(',').map(Number) : [],
                 arWords: x.ar_words || null,
                 choices: f.choices.filter((c) => tally[c.key]).map((c) => ({ key: c.key, label: c.label, n: tally[c.key] })) };
      }),
      translations: texts.map((t) => ({ sourceId: t.id, translator: t.translator, text: cleanText(t.text), choices: bySource.get(t.id) ?? {} })),
    });
  });
}

const round = (x: number) => Math.round(x * 1000) / 1000;
