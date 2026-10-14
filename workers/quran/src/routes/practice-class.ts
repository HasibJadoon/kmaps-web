import type { Router } from '../../../shared/src/router';
import { ok, badRequest, notFound } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { labels, byKey, type Label } from '../lib/labels';
import { drawSkill, type Scope } from './practice';
import { interleave } from './practice-kit';
import { listenWorks, lineDrills, parseLineRef, sentenceDrills, parseSentenceRef } from './practice-tafsirq';

// ── The Class: a passage studied as one lesson ─────────────────────────────────
// What the class is: its path of graded sprints, in the order the class_node label rows give
// (qr_067), and every drill each step holds over the passage — all of a step's skills, drawn
// whole, not sampled. What the learner did lives in CORE (/core/drill/class*); the device
// puts the two together (locks, rings, stars). The same for every reader, so kept (index.ts).
//
//   GET /qr/practice/class/surah?surah=40           the sūra's passages, in order: its units
//   GET /qr/practice/class/path?passage=QR:SP:40:1-3 the unit's nodes, how many drills each holds
//   GET /qr/practice/class/node?passage=…&node=words  a node's drills, whole: the device cuts the
//       sprints and keeps them. check: drawn from every step; review: &steps=read,words;
//       practice: &refs=<drill ids> (the class's to-perfect set, from CORE — a tafsīr line
//       marked in the listen gate is named by its line ref and drawn as its listen drill)
//   GET /qr/practice/class/listen?passage=…&node=listen  the listen gate: each work the node
//       names, its recordings over the passage with every line timed; one sprint per work, run
//       when that work is heard to the node's `heard` percent

type Passage = { id: string; surah: number; passage_no: number; ayah_from: number; ayah_to: number;
                 label: string | null; title_en: string | null; title_ar: string | null };
type Drill = Record<string, unknown>;

const passageOf = (env: QuranEnv, id: string) => queryOne<Passage>(env.DB_QR,
  `SELECT id, surah, passage_no, ayah_from, ayah_to, label, title_en, title_ar
     FROM qr_surah_study_passage WHERE id = ?`, [id]);

const scopeOf = (p: Passage): Scope => ({ surah: p.surah, from: p.ayah_from, to: p.ayah_to });
const kindOf = (n: Label) => String(n.extra?.kind ?? 'step');
const skillsOf = (n: Label) => (Array.isArray(n.extra?.skills) ? n.extra!.skills as string[] : []);
const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

/** Every drill a step holds over the passage: each of its skills drawn whole, once each by id. */
async function stepPool(env: QuranEnv, L: Record<string, Label[]>, node: Label, scope: Scope): Promise<Drill[]> {
  const max = num(node.extra?.max, 30);
  const only = (node.extra?.only ?? {}) as Record<string, string[]>;
  const piles = await Promise.all(skillsOf(node).map((s) => drawSkill(env, L, s, 'all', max, scope, null, only[s]).catch(() => [] as Drill[])));
  const seen = new Set<string>();
  // the skills interleaved, so a sprint is not all one kind of drill
  return interleave(piles, Number.MAX_SAFE_INTEGER).filter((d) => {
    const id = String(d.id ?? '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

const stepNodes = (L: Record<string, Label[]>) => (L.class_node ?? []).filter((n) => kindOf(n) === 'step');

/** The node rows as the device draws them. A listen node's sprints are its works, given. */
const nodeCard = (n: Label, drills: number, works = 0) => {
  const sprint = num(n.extra?.sprint, 12);
  const kind = kindOf(n);
  return {
    key: n.key, kind, step: n.extra?.step ?? null,
    title: n.label, titleAr: n.labelAr ?? '', tagline: n.detail ?? '', icon: n.icon ?? 'circle', color: n.color ?? '#D8B657',
    drills, sprint,
    sprints: kind === 'step' ? Math.max(1, Math.ceil(drills / sprint)) : kind === 'listen' ? Math.max(1, works) : 1,
    pass: n.extra?.pass ?? n.extra?.heard ?? null,
  };
};

const worksOf = (n: Label) => (Array.isArray(n.extra?.works) ? n.extra!.works as string[] : []);
const listenOf = (env: QuranEnv, n: Label, p: Passage) => listenWorks(env, worksOf(n), { surah: p.surah, from: p.ayah_from, to: p.ayah_to });

const bandsOf = (L: Record<string, Label[]>) =>
  (L.class_band ?? []).map((b) => ({ stars: Number(b.extra?.stars ?? 0), min: Number(b.min ?? 0) })).filter((b) => b.stars > 0);

const passageCard = (p: Passage) => ({
  id: p.id, surah: p.surah, number: p.passage_no, from: p.ayah_from, to: p.ayah_to,
  label: p.label, title: p.title_en, titleAr: p.title_ar,
});

/** One full round over a unit (qr_127): each style of `unit_round` in its order, `n` of its drills, the styles with
 *  nothing over the passage left out. Not kept: a round is dealt afresh each time (it is not under /class/). */
async function unitRound(env: QuranEnv, L: Record<string, Label[]>, scope: Scope): Promise<{ items: Drill[]; styles: unknown[] }> {
  const rows = L.unit_round ?? [];          // in their sort order, as labels() reads them
  const piles = await Promise.all(rows.map((r) => drawSkill(env, L, r.key, 'all', num(r.extra?.n, 2) * 4, scope).catch(() => [] as Drill[])));
  const seen = new Set<string>();
  const items: Drill[] = [], styles: unknown[] = [];
  rows.forEach((r, i) => {
    const take = piles[i].filter((d) => { const id = String(d.id ?? ''); if (!id || seen.has(id)) return false; seen.add(id); return true; })
      .sort(() => Math.random() - 0.5).slice(0, num(r.extra?.n, 2));
    if (!take.length) return;
    items.push(...take);
    styles.push({ id: r.key, title: r.label, titleAr: r.labelAr ?? '', icon: r.icon ?? 'circle', color: r.color ?? '#D8B657', count: take.length });
  });
  return { items, styles };
}

export function practiceClassRoutes(router: Router<QuranEnv>) {
  router.get('/qr/practice/round', async (req, env) => {
    const id = new URL(req.url).searchParams.get('passage');
    if (!id) return badRequest('passage is required');
    const [L, p] = await Promise.all([labels(env), passageOf(env, id)]);
    if (!p) return notFound(`passage ${id}`);
    const { items, styles } = await unitRound(env, L, scopeOf(p));
    const head = (L.class_ui ?? []).find((l) => l.key === 'full_round');
    return ok({
      skill: { id: 'unit_round', title: head?.label ?? 'One full round', titleAr: head?.labelAr ?? '', tagline: head?.detail ?? '',
               icon: head?.icon ?? 'circle.hexagongrid', color: head?.color ?? '#D8B657', count: items.length },
      items, styles, stage: L.stage ?? [],
    });
  });

  router.get('/qr/practice/class/surah', async (req, env) => {
    const surah = Number(new URL(req.url).searchParams.get('surah'));
    if (!Number.isInteger(surah) || surah < 1 || surah > 114) return badRequest('surah 1–114');
    const [L, rows, name] = await Promise.all([
      labels(env),
      query<Passage>(env.DB_QR,
        `SELECT id, surah, passage_no, ayah_from, ayah_to, label, title_en, title_ar
           FROM qr_surah_study_passage WHERE surah = ? AND status = 'live' ORDER BY passage_no`, [surah]),
      queryOne<{ name_ar: string; name_en: string; name_transliteration: string }>(env.DB_QR,
        'SELECT name_ar, name_en, name_transliteration FROM qr_surah WHERE id = ?', [surah]),
    ]);
    return ok({
      surah: { id: surah, nameAr: name?.name_ar ?? null, name: name?.name_transliteration ?? name?.name_en ?? null },
      passages: rows.map(passageCard),
      words: L.class_ui ?? [],
    });
  });

  router.get('/qr/practice/class/path', async (req, env) => {
    const id = new URL(req.url).searchParams.get('passage');
    if (!id) return badRequest('passage is required');
    const [L, p] = await Promise.all([labels(env), passageOf(env, id)]);
    if (!p) return notFound(`passage ${id}`);
    const scope = scopeOf(p);
    const steps = stepNodes(L);
    const listens = (L.class_node ?? []).filter((n) => kindOf(n) === 'listen');
    const [pools, heard, round] = await Promise.all([
      Promise.all(steps.map((n) => stepPool(env, L, n, scope))),
      Promise.all(listens.map((n) => listenOf(env, n, p).catch(() => []))),
      unitRound(env, L, scope).catch(() => ({ items: [] as Drill[], styles: [] as unknown[] })),
    ]);
    // the full round, shown only when the unit has drills for it — and only the styles it has
    const head = (L.class_ui ?? []).find((l) => l.key === 'full_round');
    const fullRound = round.items.length
      ? { title: head?.label ?? 'One full round', titleAr: head?.labelAr ?? '', icon: head?.icon ?? 'circle.hexagongrid',
          color: head?.color ?? '#D8B657', styles: round.styles }
      : null;
    const held = new Map(steps.map((n, i) => [n.key, pools[i].length]));
    const works = new Map(listens.map((n, i) => [n.key, heard[i].length]));
    // a step none of whose skills has a drill for this passage is left off its path; so is a
    // listen gate none of whose works is recorded over it
    const nodes = (L.class_node ?? [])
      .filter((n) => kindOf(n) === 'step' ? (held.get(n.key) ?? 0) > 0 : kindOf(n) === 'listen' ? (works.get(n.key) ?? 0) > 0 : true)
      .map((n) => nodeCard(n, held.get(n.key) ?? 0, works.get(n.key) ?? 0));
    return ok({
      passage: passageCard(p),
      nodes: [...held.values()].some((n) => n > 0) ? nodes : [],
      bands: bandsOf(L),
      words: L.class_ui ?? [],
      stage: L.stage ?? [],
      round: fullRound,
    });
  });

  router.get('/qr/practice/class/node', async (req, env) => {
    const u = new URL(req.url);
    const id = u.searchParams.get('passage');
    const key = u.searchParams.get('node');
    if (!id || !key) return badRequest('passage and node are required');
    const [L, p] = await Promise.all([labels(env), passageOf(env, id)]);
    if (!p) return notFound(`passage ${id}`);
    const node = byKey(L.class_node).get(key);
    if (!node) return badRequest(`unknown node ${key}`);
    const scope = scopeOf(p);
    const kind = kindOf(node);
    const size = num(node.extra?.sprint, 12);

    let items: Drill[];
    if (kind === 'step') {
      items = await stepPool(env, L, node, scope);
    } else {
      const wanted = kind === 'review'
        ? new Set((u.searchParams.get('steps') ?? '').split(',').filter(Boolean))
        : null;
      const steps = stepNodes(L).filter((n) => !wanted || wanted.has(n.key));
      const pools = await Promise.all(steps.map((n) => stepPool(env, L, n, scope)));
      if (kind === 'practice') {
        const refs = new Set((u.searchParams.get('refs') ?? '').split(',').filter(Boolean));
        items = pools.flat().filter((d) => refs.has(String(d.id)));
        // lines marked in the listen gate are drills of no step: drawn by their refs
        const found = new Set(items.map((d) => String(d.id)));
        const lines = [...refs].filter((r) => !found.has(r) && parseLineRef(r));
        if (lines.length) items = [...items, ...await lineDrills(env, lines, scope)];
        // sentences marked "not understood" in the commentary's Understanding step: first, by their refs
        const sents = [...refs].filter((r) => !found.has(r) && parseSentenceRef(r));
        if (sents.length) items = [...await sentenceDrills(env, sents, scope), ...items];
      } else {
        // check and review: drawn across the steps in turn, a sprint's worth
        items = interleave(pools.map(shuffle), size);
      }
    }
    return ok({ passage: passageCard(p), node: nodeCard(node, items.length), items, bands: bandsOf(L), stage: L.stage ?? [] });
  });

  router.get('/qr/practice/class/listen', async (req, env) => {
    const u = new URL(req.url);
    const id = u.searchParams.get('passage');
    const key = u.searchParams.get('node') ?? 'listen';
    if (!id) return badRequest('passage is required');
    const [L, p] = await Promise.all([labels(env), passageOf(env, id)]);
    if (!p) return notFound(`passage ${id}`);
    const node = byKey(L.class_node).get(key);
    if (!node || kindOf(node) !== 'listen') return badRequest(`not a listen node: ${key}`);
    const works = await listenOf(env, node, p);
    return ok({ passage: passageCard(p), node: nodeCard(node, 0, works.length), works,
                heard: num(node.extra?.heard, 90), words: L.class_ui ?? [] });
  });
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
