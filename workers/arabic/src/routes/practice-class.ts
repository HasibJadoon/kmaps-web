import type { Router } from '../../../shared/src/router';
import { attachGt } from '../../../shared/src/gt-attach';
import { ok, badRequest, notFound } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
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
              episode: number | null; scenes_json: string | null; video_url: string | null };
type Scene = { no: number; titleEn: string | null; titleAr: string | null; start: number | null; end: number | null;
               lines: Array<{ start: number; end: number; ar: string }> };

const kindOf = (n: Label) => String(n.extra?.kind ?? 'step');
const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
const perScene = (n: Label) => n.extra?.per === 'scene';

const SEP = '@';
export const sceneKey = (step: string, no: number) => `${step}${SEP}${no}`;
export const splitKey = (key: string): { step: string; scene: number | null; part: string | null } => {
  const i = key.indexOf(SEP);
  if (i < 0) return { step: key, scene: null, part: null };
  const [no, part] = key.slice(i + 1).split('#');
  const n = Number(no);
  return { step: key.slice(0, i), scene: Number.isInteger(n) && n > 0 ? n : null, part: part || null };
};

const unitOf = (env: ArabicEnv, id: string) => queryOne<Unit>(env.DB_AR,
  `SELECT t.id, r.level, COALESCE(json_extract(t.script_json, '$.title_ar'), r.title_ar) AS title_ar,
          json_extract(t.script_json, '$.title_en') AS title_en,
          COALESCE(json_extract(t.script_json, '$.series_ar'), r.title_ar) AS series,
          json_extract(t.script_json, '$.episode') AS episode,
          json_extract(t.script_json, '$.scenes') AS scenes_json,
          json_extract(t.script_json, '$.video_url') AS video_url
     FROM ar_text_unit t JOIN ar_acquisition_ref r ON r.id = t.acq_ref_id
    WHERE t.id = ? AND t.script_json IS NOT NULL AND json_valid(t.script_json)`, [id]);

/// A scene's title without its number ("Scene 2 — …"): the number is shown on its own.
const titled = (t?: string | null) => (t ?? '').replace(/^\s*(Scene\s+\d+|المشهد\s+\S+)\s*[—–:-]\s*/u, '').trim() || null;

export function scenesOf(u: Unit): Scene[] {
  try {
    type Raw = { scene_no: number; title_en?: string; title_ar?: string; start?: number; end?: number; lines?: Array<{ start?: number; end?: number; ar?: string; w?: unknown }> };
    const xs = JSON.parse(u.scenes_json ?? '[]') as Raw[];
    const sec = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : null);
    return xs.filter((x) => Number.isInteger(x.scene_no))
      .map((x) => ({ no: x.scene_no, titleEn: titled(x.title_en), titleAr: titled(x.title_ar),
                     start: sec(x.start ?? x.lines?.[0]?.start), end: sec(x.end ?? x.lines?.[(x.lines?.length ?? 1) - 1]?.end),
                     // the Arabic as it is heard, line by line — the watch node's captions (no English while watching)
                     lines: (x.lines ?? []).filter((l) => l.ar && sec(l.start) != null && sec(l.end) != null)
                       .map((l) => ({ start: Number(l.start), end: Number(l.end), ar: String(l.ar),
                                      // each word's [start, end], so the spoken word lights as it is heard
                                      ...(Array.isArray(l.w) ? { w: l.w } : {}) })) }));
  } catch { return []; }
}

/** What builds a scene's pool: bump POOL_V when the drills a round makes change (new kinds, new data), and every kept
 *  pool is rebuilt on its next read. */
const POOL_V = '2026-10-17b';   // after a bump, warm every unit's path once (each unit's first read builds its pools)
const poolDef = (node: Label) => `${POOL_V}:${num(node.extra?.max, 40)}`;

/** One scene's drills for the class, built: the scene's round drawn large, seeded by unit and scene. */
async function buildPool(env: ArabicEnv, node: Label, unit: string, no: number): Promise<Drill[]> {
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

/** Every scene's kept pool of a unit, in one read; scenes missing or built by another def are built now and kept. */
async function keptPools(env: ArabicEnv, node: Label, unit: string, nos: number[], fresh = false): Promise<Map<number, Drill[]>> {
  const def = poolDef(node);
  const rows = fresh ? [] : await query<{ scene_no: number; def: string; items_json: string }>(env.DB_AR,
    `SELECT scene_no, def, items_json FROM ar_class_pool WHERE unit_id = ?`, [unit]).catch(() => []);
  const out = new Map<number, Drill[]>();
  for (const r of rows) if (r.def === def && nos.includes(r.scene_no)) { try { out.set(r.scene_no, JSON.parse(r.items_json)); } catch { /* rebuild */ } }
  const missing = nos.filter((n) => !out.has(n));
  // built four scenes at a time: a long episode (up to 80 scenes) all at once overruns D1 and a request's subrequests
  const built: Drill[][] = [];
  for (let i = 0; i < missing.length; i += 4) built.push(...await Promise.all(missing.slice(i, i + 4).map((n) => buildPool(env, node, unit, n))));
  missing.forEach((n, i) => out.set(n, built[i]));
  if (missing.length) {
    await env.DB_AR.batch(missing.map((n, i) => env.DB_AR.prepare(
      `INSERT INTO ar_class_pool (unit_id, scene_no, def, items_json, counts_json, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT (unit_id, scene_no) DO UPDATE SET def = excluded.def, items_json = excluded.items_json,
         counts_json = excluded.counts_json, updated_at = excluded.updated_at`)
      .bind(unit, n, def, JSON.stringify(built[i]), JSON.stringify(sorts(built[i]))))).catch(() => null);
  }
  return out;
}

/** A pool's drills counted by sort (id prefix and bucket) — what the path needs to count each part, kept small. */
const sortOf = (d: Drill) => `${String(d.id ?? '').split(':')[0]}|${(d as { bucket?: string }).bucket ?? ''}`;
const sorts = (xs: Drill[]) => xs.reduce<Record<string, number>>((a, d) => { const k = sortOf(d); a[k] = (a[k] ?? 0) + 1; return a; }, {});

/** The path's counts: each scene's drills by sort, read from the kept rows alone (no drills); a scene not kept yet is
 *  built and kept. */
async function keptCounts(env: ArabicEnv, node: Label, unit: string, nos: number[], fresh = false): Promise<Map<number, Record<string, number>>> {
  const def = poolDef(node);
  const rows = fresh ? [] : await query<{ scene_no: number; def: string; counts_json: string }>(env.DB_AR,
    `SELECT scene_no, def, counts_json FROM ar_class_pool WHERE unit_id = ?`, [unit]).catch(() => []);
  const out = new Map<number, Record<string, number>>();
  for (const r of rows) {
    if (r.def !== def || !nos.includes(r.scene_no)) continue;
    try { const c = JSON.parse(r.counts_json); if (Object.keys(c).length) out.set(r.scene_no, c); } catch { /* rebuild */ }
  }
  const missing = nos.filter((n) => !out.has(n));
  if (missing.length) for (const [n, xs] of await keptPools(env, node, unit, missing, fresh)) out.set(n, sorts(xs));
  return out;
}

/** How many of a scene's drills each part takes, from its counts by sort (the same rule as parted). */
function partCounts(parts: Part[], counts: Record<string, number>): Map<string, number> {
  const out = new Map<string, number>(parts.map((p) => [p.key, 0]));
  for (const [k, n] of Object.entries(counts)) {
    const [prefix, bucket] = k.split('|');
    const p = parts.find((x) => {
      const take = x.extra?.take; const b = x.extra?.bucket as string | undefined;
      return (take === '*' || (Array.isArray(take) && take.includes(prefix))) && (!b || b === bucket);
    });
    if (p) out.set(p.key, out.get(p.key)! + n);
  }
  return out;
}

async function scenePool(env: ArabicEnv, node: Label, unit: string, no: number, fresh = false): Promise<Drill[]> {
  return (await keptPools(env, node, unit, [no], fresh)).get(no) ?? [];
}

/** A scene's drills, parted for the path: listening, its verbs, its nouns, its lines — the parts and what each takes
 *  are ar_practice_label rows (scope 'scene_part', extra {take: [id prefixes] | '*', bucket?}), in their order. A drill
 *  goes to the first part that takes it; '*' takes what is left. No parts: the scene is one node, as before. */
type Part = Label;
const partsOf = (L: Record<string, Label[]>): Part[] => L.scene_part ?? [];
function parted(parts: Part[], items: Drill[]): Map<string, Drill[]> {
  const out = new Map<string, Drill[]>(parts.map((p) => [p.key, []]));
  for (const d of items) {
    const prefix = String(d.id ?? '').split(':')[0];
    const bucket = (d as { bucket?: string }).bucket ?? null;
    const p = parts.find((x) => {
      const take = x.extra?.take; const b = x.extra?.bucket as string | undefined;
      const hit = take === '*' || (Array.isArray(take) && take.includes(prefix));
      return hit && (!b || b === bucket);
    });
    if (p) out.get(p.key)!.push(d);
  }
  return out;
}
const partKey = (scene: string, part: string) => `${scene}#${part}`;

/** A drill's card carries a copy of the drill to replay in review (gt-attach) — over half of every node's bytes. A
 *  device that asks for slim (&slim=1) gets the drill once, its card marked `drill: true`, and makes the copy itself
 *  when it files the card (DrillKit DrillRaw); an older device gets the copy as before. */
function slimmed(items: Drill[], slim: boolean): Drill[] {
  if (!slim) return items;
  return items.map((d) => {
    const srs = d.srs as { extra?: Record<string, unknown> } | undefined;
    if (!srs?.extra) return d;
    const ex: Record<string, unknown> = { ...srs.extra };
    if (ex.drill) ex.drill = true;
    // the clip and its timed words, where they are the drill's own, go too: the device puts them back from the drill
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    if (ex.words && same(ex.words, d.words)) { delete ex.words; ex.words_from_drill = true; }
    if (ex.audio && same(ex.audio, d.audio)) { delete ex.audio; ex.audio_from_drill = true; }
    return { ...d, srs: { ...srs, extra: ex } };
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
async function pools(env: ArabicEnv, L: Record<string, Label[]>, u: Unit, scenes: Scene[], fresh = false) {
  const out = new Map<string, Drill[]>();
  const steps = stepNodes(L).filter(perScene);
  const kept = await Promise.all(steps.map((n) => keptPools(env, n, u.id, scenes.map((s) => s.no), fresh)));
  const piles = kept.map((m) => scenes.map((s) => m.get(s.no) ?? []));
  const parts = partsOf(L);
  steps.forEach((n, j) => scenes.forEach((s, i) => {
    const k = sceneKey(n.key, s.no);
    if (!parts.length) { out.set(k, piles[j][i]); return; }
    for (const [p, xs] of parted(parts, piles[j][i])) out.set(partKey(k, p), xs);
  }));
  return out;
}

export function practiceClassRoutes(router: Router<ArabicEnv>) {
  router.get('/ar/practice/class/path', async (req, env) => {
    const id = new URL(req.url).searchParams.get('unit');
    if (!id) return badRequest('unit is required');
    const [L, u] = await Promise.all([labels(env), unitOf(env, id)]);
    if (!u) return notFound(`unit ${id}`);
    const scenes = scenesOf(u);
    const fresh = new URL(req.url).searchParams.get('refresh') === '1';
    const stepsPer = stepNodes(L).filter(perScene);
    const countsBy = new Map(await Promise.all(stepsPer.map(async (n) =>
      [n.key, await keptCounts(env, n, u.id, scenes.map((s) => s.no), fresh)] as const)));
    // a scene with no drills is left off the path, as an empty step is
    const nodes = (L.class_node ?? []).flatMap((n) => {
      if (kindOf(n) !== 'step') return [nodeCard(n, 0)];
      if (!perScene(n)) return [];
      const parts = partsOf(L);
      return scenes.flatMap((s) => {
        const c = countsBy.get(n.key)?.get(s.no) ?? {};
        const per = partCounts(parts, c);
        const counts = parts.map((p) => ({ p, k: per.get(p.key) ?? 0 })).filter((x) => x.k > 0);
        const k = parts.length ? counts.reduce((a, x) => a + x.k, 0) : Object.values(c).reduce((a, x) => a + x, 0);
        if (!k) return [];
        const label = sceneLabel(L, n, s);
        // the scene's video first (a watch node: that scene alone, its end opens the drills) — the node carries its
        // clip, so any device draws and plays it from the path alone
        const yt = (u.video_url ?? '').match(/(?:[?&]v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1] ?? null;
        const ww = (L.class_ui ?? []).find((l) => l.key === 'watch_scene');
        const watch = yt && s.start != null && s.end != null && s.end > s.start
          ? [{ ...nodeCard({ ...label, key: `${label.key}#watch`, label: ww?.label ?? label.label, labelAr: ww?.labelAr ?? label.labelAr,
                             icon: ww?.icon ?? 'play.rectangle', extra: { kind: 'listen' } }, 0, label.detail),
               content: 'video', video: { youtube: yt, start: s.start, end: s.end, title: label.detail ?? label.label, titleAr: s.titleAr,
                        captions: s.lines } }]
          : [];
        if (!parts.length) return [...watch, nodeCard(label, k, label.detail)];
        // then the scene's drills, part by part: each opens the next, the last opens the next scene
        const fill = (t: string | null | undefined) => (t ?? '').replace('{n}', String(s.no));
        return [...watch, ...counts.map(({ p, k: m }) => nodeCard({ ...label, key: partKey(label.key, p.key), label: fill(p.label),
                                                                   labelAr: fill(p.labelAr), icon: p.icon ?? label.icon,
                                                                   color: p.color ?? label.color }, m, label.detail))];
      });
    });
    const any = [...countsBy.values()].some((m) => [...m.values()].some((c) => Object.values(c).some((x) => x > 0)));
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
    const { step, scene, part } = splitKey(key);
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
      items = await scenePool(env, base, u.id, s.no, q.get('refresh') === '1');
      if (part) items = parted(partsOf(L), items).get(part) ?? [];
      node = sceneLabel(L, base, s);
      if (part) node = { ...node, key };
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
                     items: slimmed(await attachGt(env.DB_AR, items), q.get('slim') === '1'), bands: bandsOf(L), stage: L.stage ?? [] });
    return res;
  });
}
