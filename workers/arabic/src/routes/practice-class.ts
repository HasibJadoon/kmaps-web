import type { Router } from '../../../shared/src/router';
import { attachGt } from '../../../shared/src/gt-attach';
import { ok, badRequest, notFound } from '../../../shared/src/response';
import { queryOne } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';
import { labels, byKey, type Label } from '../lib/labels';
import { sceneRound, seeded } from './scenes';

// ── The Class: an episode studied as one lesson (drill-engine plan 4.3) ───────
// The same class as the Qurʾān's (quran/src/routes/practice-class.ts), over the Arabic path's units:
// a unit (one scripted episode) is a class, and its path is the class_node label rows in order
// (AR 0060). The step run per scene is one node per scene, each holding that scene's drills; then
// practice, review and the episode check. A scene's drills are drawn with a generator seeded by the
// unit and scene, so every draw of a class deals the same drills: the path's counts, a node's
// sprints and a practice set named by drill ids always agree. What the learner did lives in CORE
// (/core/drill/class*); watching and the key-word preview stay on the unit page (the guidebook).
//
//   GET /ar/practice/class/path?unit=ARTX:…   the class's nodes, how many drills each holds
//   GET /ar/practice/class/node?unit=…&node=scenes@3   a node's drills, whole. check: drawn across
//       every scene; review: &steps=scenes@1,scenes@2 (the nodes passed); practice: &refs=<drill ids>

type Drill = Record<string, unknown>;
type Unit = { id: string; level: string; title_ar: string | null; title_en: string | null; series: string | null;
              episode: number | null; scenes_json: string | null };
type Scene = { no: number; titleEn: string | null; titleAr: string | null };

const kindOf = (n: Label) => String(n.extra?.kind ?? 'step');
const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
const perScene = (n: Label) => n.extra?.per === 'scene';

const SEP = '@';
export const sceneKey = (step: string, no: number) => `${step}${SEP}${no}`;
export const splitKey = (key: string): { step: string; scene: number | null } => {
  const i = key.indexOf(SEP);
  if (i < 0) return { step: key, scene: null };
  const n = Number(key.slice(i + 1));
  return { step: key.slice(0, i), scene: Number.isInteger(n) && n > 0 ? n : null };
};

const unitOf = (env: ArabicEnv, id: string) => queryOne<Unit>(env.DB_AR,
  `SELECT t.id, r.level, COALESCE(json_extract(t.script_json, '$.title_ar'), r.title_ar) AS title_ar,
          json_extract(t.script_json, '$.title_en') AS title_en,
          COALESCE(json_extract(t.script_json, '$.series_ar'), r.title_ar) AS series,
          json_extract(t.script_json, '$.episode') AS episode,
          json_extract(t.script_json, '$.scenes') AS scenes_json
     FROM ar_text_unit t JOIN ar_acquisition_ref r ON r.id = t.acq_ref_id
    WHERE t.id = ? AND t.script_json IS NOT NULL AND json_valid(t.script_json)`, [id]);

/// A scene's title without its number ("Scene 2 — …"): the number is shown on its own.
const titled = (t?: string | null) => (t ?? '').replace(/^\s*(Scene\s+\d+|المشهد\s+\S+)\s*[—–:-]\s*/u, '').trim() || null;

export function scenesOf(u: Unit): Scene[] {
  try {
    const xs = JSON.parse(u.scenes_json ?? '[]') as Array<{ scene_no: number; title_en?: string; title_ar?: string }>;
    return xs.filter((x) => Number.isInteger(x.scene_no))
      .map((x) => ({ no: x.scene_no, titleEn: titled(x.title_en), titleAr: titled(x.title_ar) }));
  } catch { return []; }
}

/** One scene's drills for the class: the scene's round drawn large, seeded by unit and scene. */
async function scenePool(env: ArabicEnv, node: Label, unit: string, no: number): Promise<Drill[]> {
  const r = await sceneRound(env, unit, String(no), null, num(node.extra?.max, 40), seeded(`${unit}#${no}`)).catch(() => null);
  if (!r || r instanceof Response) return [];
  const seen = new Set<string>();
  return (r.items as Drill[]).filter((d) => {
    const id = String(d.id ?? '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** Piles taken from in turn, so a mixed sprint is not all one scene; seeded, so the same each time. */
export function interleave<T>(piles: T[][], n: number): T[] {
  const qs = piles.map((p) => [...p]);
  const out: T[] = [];
  while (out.length < n && qs.some((q) => q.length)) {
    for (const q of qs) if (q.length && out.length < n) out.push(q.shift()!);
  }
  return out;
}

function sceneLabel(L: Record<string, Label[]>, step: Label, s: Scene): Label {
  const w = (L.class_ui ?? []).find((l) => l.key === 'scene_n');
  const fill = (t: string | null | undefined) => (t ?? '').replace('{n}', String(s.no));
  return { ...step, key: sceneKey(step.key, s.no),
           label: w ? fill(w.label) : `${step.label} ${s.no}`, labelAr: w ? fill(w.labelAr) : step.labelAr,
           detail: s.titleEn ?? s.titleAr ?? step.detail };
}

/** The node rows as the device draws them (the Qurʾān's shape: DrillKit ClassNode). */
const nodeCard = (n: Label, drills: number, detail: string | null = null) => {
  const sprint = num(n.extra?.sprint, 12);
  const kind = kindOf(n);
  return {
    key: n.key, kind, step: n.extra?.step ?? null,
    title: n.label, titleAr: n.labelAr ?? '', tagline: n.detail ?? '', icon: n.icon ?? 'circle', color: n.color ?? '#D8B657',
    drills, sprint, sprints: kind === 'step' ? Math.max(1, Math.ceil(drills / sprint)) : 1,
    pass: n.extra?.pass ?? null, detail,
  };
};

const bandsOf = (L: Record<string, Label[]>) =>
  (L.class_band ?? []).map((b) => ({ stars: Number(b.extra?.stars ?? 0), min: Number(b.min ?? 0) })).filter((b) => b.stars > 0);

/** The class's card, in the shape the device reads a class scope (DrillKit ClassPassage): the episode
 *  stands where a passage would — its number, and its scenes as the range. */
const unitCard = (u: Unit, scenes: Scene[]) => ({
  id: u.id, surah: 0, number: u.episode ?? 1, from: scenes[0]?.no ?? 1, to: scenes[scenes.length - 1]?.no ?? 1,
  label: u.series, title: u.title_en ?? u.title_ar, titleAr: u.title_ar,
});

const stepNodes = (L: Record<string, Label[]>) => (L.class_node ?? []).filter((n) => kindOf(n) === 'step');

/** Every step's pools: a per-scene step by scene, keyed by node key — every step and scene drawn at once. */
async function pools(env: ArabicEnv, L: Record<string, Label[]>, u: Unit, scenes: Scene[]) {
  const out = new Map<string, Drill[]>();
  const steps = stepNodes(L).filter(perScene);
  const piles = await Promise.all(steps.map((n) => Promise.all(scenes.map((s) => scenePool(env, n, u.id, s.no)))));
  steps.forEach((n, j) => scenes.forEach((s, i) => out.set(sceneKey(n.key, s.no), piles[j][i])));
  return out;
}

export function practiceClassRoutes(router: Router<ArabicEnv>) {
  router.get('/ar/practice/class/path', async (req, env) => {
    const id = new URL(req.url).searchParams.get('unit');
    if (!id) return badRequest('unit is required');
    const [L, u] = await Promise.all([labels(env), unitOf(env, id)]);
    if (!u) return notFound(`unit ${id}`);
    const scenes = scenesOf(u);
    const held = await pools(env, L, u, scenes);
    // a scene with no drills is left off the path, as an empty step is
    const nodes = (L.class_node ?? []).flatMap((n) => {
      if (kindOf(n) !== 'step') return [nodeCard(n, 0)];
      if (!perScene(n)) return [];
      return scenes.flatMap((s) => {
        const k = held.get(sceneKey(n.key, s.no))?.length ?? 0;
        if (!k) return [];
        const label = sceneLabel(L, n, s);
        return [nodeCard(label, k, label.detail)];
      });
    });
    const any = [...held.values()].some((p) => p.length > 0);
    return ok({ passage: unitCard(u, scenes), nodes: any ? nodes : [], bands: bandsOf(L),
                words: L.class_ui ?? [], stage: L.stage ?? [], round: null });
  });

  router.get('/ar/practice/class/node', async (req, env) => {
    const q = new URL(req.url).searchParams;
    const id = q.get('unit');
    const key = q.get('node');
    if (!id || !key) return badRequest('unit and node are required');
    const [L, u] = await Promise.all([labels(env), unitOf(env, id)]);
    if (!u) return notFound(`unit ${id}`);
    const { step, scene } = splitKey(key);
    const base = byKey(L.class_node).get(step);
    if (!base || (kindOf(base) === 'step' && (!perScene(base) || scene == null))) return badRequest(`unknown node ${key}`);
    const scenes = scenesOf(u);
    const kind = kindOf(base);
    const size = num(base.extra?.sprint, 12);
    let node = base;
    let items: Drill[];
    if (kind === 'step') {
      const s = scenes.find((x) => x.no === scene);
      if (!s) return notFound(`scene ${scene} of ${id}`);
      items = await scenePool(env, base, u.id, s.no);
      node = sceneLabel(L, base, s);
    } else {
      const all = await pools(env, L, u, scenes);
      if (kind === 'practice') {
        const refs = new Set((q.get('refs') ?? '').split(',').filter(Boolean));
        items = [...all.values()].flat().filter((d) => refs.has(String(d.id)));
      } else if (kind === 'review') {
        const wanted = new Set((q.get('steps') ?? '').split(',').filter(Boolean));
        items = interleave([...all.entries()].filter(([k]) => wanted.has(k)).map(([, p]) => p), size);
      } else {
        // the check: across every scene in turn, a sprint's worth
        items = interleave([...all.values()], size);
      }
    }
    const res = ok({ passage: unitCard(u, scenes), node: nodeCard(node, items.length, kind === 'step' ? node.detail : null),
                     items: await attachGt(env.DB_AR, items), bands: bandsOf(L), stage: L.stage ?? [] });
    return res;
  });
}
