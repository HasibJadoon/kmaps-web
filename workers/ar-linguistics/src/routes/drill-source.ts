import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';
import { lexiconItems, glosses, profilesResponse, LEX_TYPES, TITLES } from './drill-lexicon';

// ── What the drills are made of, from the linguistic record ───────────────────
// AL shapes its own data; the drilling surface (the Qurʾān worker's practice) adds
// the āyah, its recitation and the review card. Nothing here is a threshold of its
// own: the level each caller wants arrives as bounds (minFreq/maxFreq, minSteps/maxSteps),
// read by the caller from its labels.
//
//   GET /al/drill/idioms?surah=&from=&to=&n=&minFreq=&maxFreq=
//       verbal idioms (Mir) as they stand in āyāt, each with the verb's other senses —
//       the same verb with another particle or frame — to choose between
//   GET /al/drill/arcs?n=&minSteps=&maxSteps=
//       a root's sense arc, rung by rung, to put back in order
//   GET /al/drill/gram-examples?discipline=NH|SF|BL&minDepth=&maxDepth=&n=&surah=
//       Qurʾānic examples of grammar terms (ar_ling_gram_term_example), each with the term's
//       siblings in its branch of the hierarchy to choose between
//   GET /al/drill/lexicon?roots=&types=&source=&n=&glosses=1
//       what each classical lexicon itself says of the roots (ar_ling_lexicon_fact via its view,
//       Mir's idioms, Sinai, the profiles), shaped as questions — see drill-lexicon.ts for the types;
//       glosses=1 adds each root's Lane headwords with a gloss, for the caller's lemma-family drills
//   GET /al/lexicon/profiles[?source=]
//       each lexicon's own "engine": its markers, vocalisation, structure and formulae (ar_ling_lexicon_profile)

type Tabir = { id: string; root_ar: string; lemma_ar: string | null; expression_ar: string; surface_ar: string | null;
               preposition_ar: string | null; expression_en: string; construction_en: string | null;
               explanation_en: string | null; usage_note_en: string | null; surah: number; ayah: number };

// a gloss Mir's extraction left whole: no "[…]" gaps, not the construction copied in, a real sentence
const CLEAN = `status = 'live' AND expression_type_id = 'arl-et-09' AND surah IS NOT NULL
  AND expression_en IS NOT NULL AND length(expression_en) >= 8 AND expression_en NOT LIKE '%[…]%'
  AND expression_en NOT LIKE '%[...]%' AND expression_en NOT LIKE 'as a verb%' AND expression_en NOT LIKE 'as verb%'
  AND (construction_en IS NULL OR expression_en <> construction_en)`;

const bare = (s: string | null) => (s ?? '').replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا').trim();

export function drillSourceRoutes(router: Router<ArLinguisticsEnv>) {
  router.get('/al/drill/idioms', async (req, env) => {
    const u = new URL(req.url);
    const n = Math.min(20, Math.max(1, Number(u.searchParams.get('n') ?? 8)));
    const surah = Number(u.searchParams.get('surah') ?? 0) || null;
    const from = Number(u.searchParams.get('from') ?? 0) || null;
    const to = Number(u.searchParams.get('to') ?? 0) || null;
    const minFreq = Number(u.searchParams.get('minFreq') ?? 1);
    const maxFreq = Number(u.searchParams.get('maxFreq') ?? 100000);

    const all = (await env.DB_AL.prepare(
      `SELECT id, root_ar, lemma_ar, expression_ar, surface_ar, preposition_ar, expression_en, construction_en,
              explanation_en, usage_note_en, surah, ayah FROM ar_ling_root_lemma_tabir WHERE ${CLEAN}`).all<Tabir>()).results ?? [];
    // how often each sense stands in the Qurʾān: the level a sense belongs to
    const senseKey = (t: Tabir) => `${bare(t.root_ar)}|${bare(t.preposition_ar)}|${t.expression_en.trim().toLowerCase()}`;
    const freq = new Map<string, number>();
    for (const t of all) freq.set(senseKey(t), (freq.get(senseKey(t)) ?? 0) + 1);
    const inScope = all.filter((t) => (surah === null || t.surah === surah) && (!from || !to || (t.ayah >= from && t.ayah <= to))
      && (freq.get(senseKey(t)) ?? 0) >= minFreq && (freq.get(senseKey(t)) ?? 0) <= maxFreq);
    // one per āyah, spread out
    const shuffled = inScope.sort(() => Math.random() - 0.5);
    const seen = new Set<string>();
    const picked: Tabir[] = [];
    for (const t of shuffled) {
      const k = `${t.surah}:${t.ayah}`;
      if (seen.has(k)) continue;
      seen.add(k); picked.push(t);
      if (picked.length >= n) break;
    }
    // the verb's other senses (its range), then senses of other verbs with the same particle
    const senses = (pred: (t: Tabir) => boolean, not: Tabir) => [...new Map(all.filter(pred)
      .filter((t) => t.expression_en.trim().toLowerCase() !== not.expression_en.trim().toLowerCase())
      .map((t) => [t.expression_en.trim().toLowerCase(), { ar: t.expression_ar, en: t.expression_en.trim() }])).values()];
    const items = picked.map((t) => ({
      id: t.id, root: t.root_ar, expressionAr: t.expression_ar, surfaceAr: t.surface_ar, particle: t.preposition_ar,
      en: t.expression_en.trim(), construction: t.construction_en, explanation: t.explanation_en ?? t.usage_note_en ?? null,
      surah: t.surah, ayah: t.ayah, freq: freq.get(senseKey(t)) ?? 1,
      range: senses((x) => bare(x.root_ar) === bare(t.root_ar), t).slice(0, 8),
      sameParticle: t.preposition_ar ? senses((x) => bare(x.preposition_ar) === bare(t.preposition_ar) && bare(x.root_ar) !== bare(t.root_ar), t)
        .sort(() => Math.random() - 0.5).slice(0, 6) : [],
      ref: `VI:${bare(t.root_ar).replace(/\s+/g, '')}|${bare(t.preposition_ar)}`,
    }));
    return ok({ items, pool: inScope.length });
  });

  router.get('/al/drill/lexicon', async (req, env) => {
    const u = new URL(req.url);
    const n = Math.min(40, Math.max(1, Number(u.searchParams.get('n') ?? 8)));
    const types = (u.searchParams.get('types') ?? u.searchParams.get('kinds') ?? 'sense').split(',').map((t) => t.trim()).filter((t) => LEX_TYPES.includes(t));
    const source = u.searchParams.get('source');
    let roots = (u.searchParams.get('roots') ?? u.searchParams.get('root') ?? '').split(',').map((r) => r.trim()).filter(Boolean).slice(0, 80);
    if (!roots.length) {
      // no roots given: Qurʾānic roots the facts cover, at random
      roots = ((await env.DB_AL.prepare(`SELECT root_normalized AS r FROM ar_ling_roots WHERE frequency_quran > 0 ORDER BY random() LIMIT 40`)
        .all<{ r: string }>()).results ?? []).map((x) => x.r).filter(Boolean);
    }
    const res = await lexiconItems(env, roots, types, n, source);
    const g = u.searchParams.get('glosses') === '1' ? await glosses(env, roots) : undefined;
    return ok({ ...res, glosses: g, types, sources: TITLES });
  });

  // (also answered at /al/lexicon/profiles: lexicon.ts's /al/lexicon/:id hands that path over)
  router.get('/al/lexicon-profiles', async (req, env) => profilesResponse(env, new URL(req.url).searchParams.get('source')));

  // how much each drill source holds, for the practice home
  router.get('/al/drill/counts', async (_req, env) => {
    const one = async (sql: string) => ((await env.DB_AL.prepare(sql).first<{ n: number }>())?.n ?? 0);
    const [grammar, balagha, idiom, arc, lexicon] = await Promise.all([
      one(`SELECT COUNT(*) AS n FROM ar_ling_gram_term_example e JOIN ar_ling_gram_term t ON t.id = e.term_id WHERE e.qr_ref IS NOT NULL AND t.discipline IN ('NH','nahw')`),
      one(`SELECT COUNT(*) AS n FROM ar_ling_gram_term_example e JOIN ar_ling_gram_term t ON t.id = e.term_id WHERE e.qr_ref IS NOT NULL AND t.discipline IN ('BL','balagha')`),
      one(`SELECT COUNT(*) AS n FROM ar_ling_root_lemma_tabir WHERE ${CLEAN}`),
      one(`SELECT COUNT(*) AS n FROM ar_ling_sense_arc WHERE status <> 'rejected'`),
      one(`SELECT COUNT(*) AS n FROM ar_ling_lexicon_fact WHERE confidence = 'high' AND fact_kind <> 'authority'`).catch(() => 0),
    ]);
    return ok({ grammar, balagha, idiom, arc, lexicon });
  });

  router.get('/al/drill/gram-examples', async (req, env) => {
    const u = new URL(req.url);
    const n = Math.min(20, Math.max(1, Number(u.searchParams.get('n') ?? 8)));
    const disc = (u.searchParams.get('discipline') ?? 'NH').toUpperCase();
    const minDepth = Number(u.searchParams.get('minDepth') ?? 0);
    const maxDepth = Number(u.searchParams.get('maxDepth') ?? 10);
    const surah = Number(u.searchParams.get('surah') ?? 0) || null;
    // the registry mixes short and long discipline codes: take both
    const codes = { NH: ['NH', 'nahw'], SF: ['SF', 'sarf'], BL: ['BL', 'balagha'] }[disc] ?? [disc];
    type Row = { id: string; term_id: string; example_ar: string; qr_ref: string; gloss_en: string | null; name_ar: string; name_en: string | null;
                 short_en: string | null; definition_en: string | null; category_key: string; parent_term_id: string | null; depth: number };
    const rows = (await env.DB_AL.prepare(
      `WITH RECURSIVE d(id, depth) AS (SELECT id, 0 FROM ar_ling_gram_term WHERE parent_term_id IS NULL
         UNION ALL SELECT t.id, d.depth + 1 FROM ar_ling_gram_term t JOIN d ON t.parent_term_id = d.id)
       SELECT e.id, e.term_id, e.example_ar, e.qr_ref, e.gloss_en, t.name_ar, t.name_en, t.short_en, t.definition_en,
              t.category_key, t.parent_term_id, d.depth
         FROM ar_ling_gram_term_example e JOIN ar_ling_gram_term t ON t.id = e.term_id JOIN d ON d.id = t.id
        WHERE e.qr_ref IS NOT NULL AND t.status = 'live' AND t.discipline IN (${codes.map(() => '?').join(',')})
          AND d.depth BETWEEN ? AND ? ${surah ? `AND e.qr_ref LIKE ?` : ''}
        ORDER BY random() LIMIT ?`).bind(...codes, minDepth, maxDepth, ...(surah ? [`${surah}:%`] : []), n * 3).all<Row>()).results ?? [];
    // one example per term per round, so the round spans the branch
    const seen = new Set<string>();
    const picked = rows.filter((r) => (seen.has(r.term_id) ? false : (seen.add(r.term_id), true))).slice(0, n);
    const cats = [...new Set(picked.map((r) => r.category_key))];
    const siblings = cats.length ? (await env.DB_AL.prepare(
      `SELECT id, name_ar, name_en, category_key, parent_term_id FROM ar_ling_gram_term
        WHERE status = 'live' AND category_key IN (${cats.map(() => '?').join(',')})`).bind(...cats)
      .all<{ id: string; name_ar: string; name_en: string | null; category_key: string; parent_term_id: string | null }>()).results ?? [] : [];
    const items = picked.map((r) => {
      // the choice is made among the term's own branch: its siblings under the same parent first, then its category
      const same = siblings.filter((x) => x.id !== r.term_id && x.parent_term_id === r.parent_term_id && x.category_key === r.category_key);
      const cat = siblings.filter((x) => x.id !== r.term_id && x.category_key === r.category_key && !same.includes(x));
      return {
        id: r.id, termId: r.term_id, nameAr: r.name_ar, nameEn: r.name_en, definition: r.short_en ?? r.definition_en ?? null,
        category: r.category_key, depth: r.depth, exampleAr: r.example_ar, ref: r.qr_ref, gloss: r.gloss_en,
        siblings: [...same.sort(() => Math.random() - 0.5), ...cat.sort(() => Math.random() - 0.5)].slice(0, 6)
          .map((x) => ({ id: x.id, nameAr: x.name_ar, nameEn: x.name_en })),
      };
    });
    return ok({ items });
  });

  router.get('/al/drill/arcs', async (req, env) => {
    const u = new URL(req.url);
    const n = Math.min(20, Math.max(1, Number(u.searchParams.get('n') ?? 8)));
    const minSteps = Number(u.searchParams.get('minSteps') ?? 2);
    const maxSteps = Number(u.searchParams.get('maxSteps') ?? 100);
    const arcs = (await env.DB_AL.prepare(
      `SELECT a.id, a.root_norm, a.arc_en, a.arc_ar, a.is_primary, COUNT(s.step_no) AS steps
         FROM ar_ling_sense_arc a JOIN ar_ling_sense_arc_step s ON s.arc_id = a.id
        WHERE a.status <> 'rejected'
        GROUP BY a.id HAVING steps BETWEEN ? AND ? ORDER BY random() LIMIT ?`).bind(minSteps, maxSteps, n)
      .all<{ id: string; root_norm: string; arc_en: string | null; arc_ar: string | null; is_primary: number; steps: number }>()).results ?? [];
    if (!arcs.length) return ok({ items: [] });
    const steps = (await env.DB_AL.prepare(
      `SELECT s.arc_id, s.step_no, s.note_md, r.sense_key, r.label_ar, r.label_en, r.gloss_ar, r.gloss_en
         FROM ar_ling_sense_arc_step s JOIN ar_ling_root_sense r ON r.id = s.sense_id
        WHERE s.arc_id IN (${arcs.map(() => '?').join(',')}) ORDER BY s.arc_id, s.step_no`).bind(...arcs.map((a) => a.id))
      .all<{ arc_id: string; step_no: number; note_md: string | null; sense_key: string; label_ar: string | null; label_en: string | null;
             gloss_ar: string | null; gloss_en: string | null }>()).results ?? [];
    // a rung's Arabic, as the note quotes it (the lexicon's own words), else the sense's Arabic label
    const arabicOf = (note: string | null, fallback: string | null) => {
      const m = /([؀-ۿ][؀-ۿ\s،:ـًٌٍَُِّْ]{6,})/.exec((note ?? '').replace(/\*\*/g, ''));
      return (m?.[1] ?? fallback ?? '').trim().split(/[.:]/)[0].trim().slice(0, 90);
    };
    const items = arcs.map((a) => ({
      id: a.id, root: a.root_norm, title: a.arc_en, titleAr: a.arc_ar, primary: !!a.is_primary,
      steps: steps.filter((s) => s.arc_id === a.id).map((s) => ({
        n: s.step_no, en: s.label_en ?? s.sense_key, gloss: s.gloss_en, ar: arabicOf(s.note_md, s.label_ar ?? s.gloss_ar),
      })),
    }));
    return ok({ items });
  });
}
