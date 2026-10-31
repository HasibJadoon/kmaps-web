// ── Everyday as worlds (owner, 2026-10-31: "khan academy kids style full canvas") ──────────────────────────
// Each Everyday map is one big illustrated world the learner pans and pinches around: its painted picture at the
// top, then a winding trail down through its places, district by district, ending at the portals of its sub-maps.
// The Everyday room itself is a world too, with the era maps standing on it as islands.
//
// The app only draws what this file lays out: every node's place on the world, the trail's curves, the district
// bands, the scenery and the colours. It is laid out from what the data already holds — a place's district and
// its stop on the journey (ar_curriculum_domain.district, map_order), the districts' order (ar_map.districts_json)
// and the maps' order and parents (ar_map.sort_order, parent_id) — so a new place lands on the trail by itself.
//
// Units: a world is W wide (1000) and as tall as its trail needs; every position the app gets is a fraction of
// the world's width (x) and height (y), sizes are in world units.

export const W = 1000;

/** A node's picture side, the trail's step between two places, and the extra room a district's sign takes. */
const PLACE = { node: 240, step: 340, sign: 400, top: 400, gateW: 820, after: 420 };
/** On the room's world the maps are bigger and fewer. */
const ISLAND = { node: 380, step: 620, top: 560, after: 300 };

/** The trail swings between three lanes (x as a fraction of the width): a gentle S down the world. Two places in a
 *  row are always a lane apart, so a place's name never sits under the next one's picture. */
const LANES = [0.5, 0.8, 0.5, 0.2];
const ISLAND_LANES = [0.3, 0.7];

export interface Palette {
  /** the ground under everything, the district bands over it (in turn), the trail and its edge and centre line */
  ground: string; bands: string[]; path: string; pathEdge: string; dash: string;
  /** the name plates, their text, and the three states of a node */
  plate: string; ink: string; open: string; done: string; locked: string;
  /** the land an island stands on (the room's world) */
  land: string;
}

const PALETTES: Record<string, Palette> = {
  // the modern town and the village: grass, a sandy road
  msa: { ground: '#8FCF6E', bands: ['#9FD97F', '#86C766', '#A8DE8A', '#93D173', '#7FBF62'], path: '#FFF4D8',
         pathEdge: '#D9B979', dash: '#F2A93B', plate: '#FFFDF6', ink: '#2E2A22', open: '#FFB020', done: '#3FAE5A',
         locked: '#A3ACB0', land: '#9FD97F' },
  // early Arabia and the Qurʾān's lands: warm sand, oases
  early: { ground: '#EBC889', bands: ['#F2D6A0', '#E6BE7C', '#F5DEAE', '#E2B672', '#EFCF94'], path: '#FFF7E6',
           pathEdge: '#C99A57', dash: '#D9682B', plate: '#FFFBF2', ink: '#3A2A18', open: '#F59E0B', done: '#3FAE5A',
           locked: '#B4A890', land: '#F2D6A0' },
  // the classical city: garden green and stone
  classical: { ground: '#A9D29A', bands: ['#B7DBA8', '#9CC98C', '#C2E1B4', '#A3CE93'], path: '#FBF1DD',
               pathEdge: '#C4A46E', dash: '#B5651D', plate: '#FFFDF6', ink: '#2B2A22', open: '#FFB020', done: '#3FAE5A',
               locked: '#A3ACB0', land: '#B7DBA8' },
  // the room's world: a bright sea the era maps stand in
  atlas: { ground: '#7FCDEB', bands: [], path: '#FFFFFF', pathEdge: '#5DB4D6', dash: '#FFFFFF', plate: '#FFFDF6',
           ink: '#1F2A30', open: '#FFB020', done: '#3FAE5A', locked: '#A3ACB0', land: '#F4E3B5' },
};
PALETTES.quranic = PALETTES.early;

/** What grows and stands beside the trail, by era: an SF Symbol and its colour. */
const SCENERY: Record<string, Array<[string, string]>> = {
  msa: [['tree.fill', '#3F8F46'], ['tree.fill', '#2F7A3D'], ['leaf.fill', '#4FA34F'], ['house.fill', '#E8834A'],
        ['building.2.fill', '#7C93B5'], ['car.fill', '#E2574C'], ['bicycle', '#3D6FB6'], ['cloud.fill', '#FFFFFF']],
  early: [['tent.fill', '#C8553D'], ['mountain.2.fill', '#B98547'], ['leaf.fill', '#5E9A4B'], ['tree.fill', '#4F8A3F'],
          ['sun.max.fill', '#FFB703'], ['drop.fill', '#3BA7C9'], ['cloud.fill', '#FFFFFF']],
  classical: [['building.columns.fill', '#C9A46A'], ['tree.fill', '#3F8F46'], ['book.closed.fill', '#B5473A'],
              ['moon.stars.fill', '#E0A93B'], ['leaf.fill', '#4FA34F']],
  atlas: [['cloud.fill', '#FFFFFF'], ['sailboat.fill', '#F2F2F2'], ['fish.fill', '#FF9F43'], ['bird.fill', '#FFFFFF']],
};
SCENERY.quranic = SCENERY.early;

const eraKey = (era: string) => (PALETTES[era] ? era : 'msa');

/** The words the worlds show, kept with the layout. */
export const WORLD_WORDS = {
  explored: 'Explored',
  soon: 'Coming soon',
  eras: { quranic: 'Qurʾānic history', early: 'Early society', classical: 'Classical', msa: 'Modern Standard' } as Record<string, string>,
  reading: (n: number) => `${n} reading${n === 1 ? '' : 's'}`,
  words: (n: number) => `${n} words`,
  placesOpen: (open: number, all: number) => (all === 0 ? 'Coming soon' : `${open} of ${all} places open`),
};

/** A cubic step of the trail: two control points, then the point reached (all fractions of the world). */
export type Curve = [number, number, number, number, number, number];
export interface Trail { start: [number, number]; curves: Curve[] }
export interface Scenery { icon: string; tint: string; x: number; y: number; size: number }
export interface Band { key: string; title: string; titleAr: string | null; x: number; y: number; top: number; bottom: number; tint: string }
export interface Spot { x: number; y: number }

export interface World {
  w: number; h: number; node: number; palette: Palette; path: Trail; scenery: Scenery[];
  /** where the map's own painted picture stands, at the top of the world */
  gate: { x: number; y: number; w: number; h: number } | null;
  bands: Band[];
  spots: Map<string, Spot>;
}

export interface WorldPlace { id: string; district: string | null; stop: number }
export interface WorldDistrict { key: string; title: string; titleAr?: string | null }

/** A small seeded generator, so a world's scenery stands in the same place on every visit. */
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const r4 = (n: number) => Math.round(n * 10000) / 10000;

/** The trail through the given points (world units), as S-curves that leave and arrive upright. */
function trail(pts: Array<[number, number]>, h: number): Trail {
  const n = (p: [number, number]): [number, number] => [r4(p[0] / W), r4(p[1] / h)];
  const curves: Curve[] = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]!, [bx, by] = pts[i]!, dy = (by - ay) / 2;
    curves.push([r4(ax / W), r4((ay + dy) / h), r4(bx / W), r4((by - dy) / h), r4(bx / W), r4(by / h)]);
  }
  return { start: pts.length ? n(pts[0]!) : [0.5, 0], curves };
}

/** Scenery on the free side of each stop: away from the node, its name and the trail. */
function scenery(era: string, seed: string, stops: Array<[number, number]>, node: number, h: number,
                 avoid: Array<{ y0: number; y1: number }>): Scenery[] {
  const kinds = SCENERY[eraKey(era)] ?? SCENERY.msa!;
  const rand = rng(seed);
  const out: Scenery[] = [];
  const free = (y: number, s: number) => avoid.every((a) => y + s / 2 < a.y0 || y - s / 2 > a.y1);
  for (const [x, y] of stops) {
    // the sides of the world this stop leaves empty
    const sides = x > 0.65 * W ? [[0.06, 0.3]] : x < 0.35 * W ? [[0.7, 0.94]] : [[0.05, 0.16], [0.84, 0.95]];
    for (const [a, b] of sides) {
      const count = 1 + Math.floor(rand() * 2);
      for (let k = 0; k < count; k++) {
        const [icon, tint] = kinds[Math.floor(rand() * kinds.length)]!;
        const size = node * (0.28 + rand() * 0.22);
        const sy = y + (rand() - 0.5) * node * 0.9 + (k ? node * 0.55 : 0);
        if (sy < size || sy > h - size || !free(sy, size)) continue;
        out.push({ icon, tint, x: r4((a! + rand() * (b! - a!)) * 1), y: r4(sy / h), size: Math.round(size) });
      }
    }
  }
  return out;
}

/** One map's world: the picture at the top, then its places down the trail district by district, then the
 *  portals to its sub-maps. Places outside every district walk last, before the portals. */
export function mapWorld(slug: string, era: string, hasPicture: boolean, districts: WorldDistrict[],
                         places: WorldPlace[], portals: string[]): World {
  const order = new Map(districts.map((d, i) => [d.key, i]));
  const rank = (p: WorldPlace) => order.get(p.district ?? '') ?? districts.length;
  const walk = [...places].sort((a, b) => rank(a) - rank(b) || a.stop - b.stop);

  const gateH = hasPicture ? Math.round(PLACE.gateW * 1.125) : 0;   // the pictures are 1024×1152
  let y = PLACE.top + gateH;
  const pts: Array<[number, number]> = [];
  const stops: Array<[number, number]> = [];
  const spots = new Map<string, Spot>();
  const signs: Array<{ d: WorldDistrict; y: number; lane: number }> = [];
  const pal = PALETTES[eraKey(era)]!;
  if (hasPicture) pts.push([W / 2, PLACE.top + gateH - 40]);

  let lane = 0, last: string | null | undefined;
  for (const p of walk) {
    const d = districts[rank(p)];
    if (d && d.key !== last) {   // a district's sign, on the side the trail is not
      const prevX = pts.length ? pts[pts.length - 1]![0] : W / 2;
      const nextX = LANES[lane % LANES.length]! * W;
      signs.push({ d, y: y + 130, lane: (prevX + nextX) / 2 > W / 2 ? 0.3 : 0.7 });
      y += PLACE.sign;
    }
    last = d?.key;
    const x = LANES[lane % LANES.length]! * W;
    pts.push([x, y]); stops.push([x, y]);
    spots.set(p.id, { x, y });
    lane += 1; y += PLACE.step;
  }
  for (const id of portals) {   // the sub-maps wait at the end of the trail
    const x = LANES[lane % LANES.length]! * W;
    pts.push([x, y]); stops.push([x, y]);
    spots.set(id, { x, y });
    lane += 1; y += PLACE.step;
  }
  const h = Math.round(y - PLACE.step + PLACE.node + PLACE.after);

  // each district's band runs from its sign to the next one's
  const bands: Band[] = signs.map((s, i) => {
    const top = s.y - 110, bottom = i + 1 < signs.length ? signs[i + 1]!.y - 110 : h;
    return { key: s.d.key, title: s.d.title, titleAr: s.d.titleAr ?? null, x: s.lane, y: r4(s.y / h),
             top: r4(Math.max(0, top) / h), bottom: r4(bottom / h), tint: pal.bands[i % Math.max(1, pal.bands.length)] ?? pal.ground };
  });
  const avoid = [...signs.map((s) => ({ y0: s.y - 70, y1: s.y + 70 })), { y0: 0, y1: PLACE.top + gateH }];
  return {
    w: W, h, node: PLACE.node, palette: pal, path: trail(pts, h),
    scenery: scenery(era, slug, stops, PLACE.node, h, avoid),
    gate: hasPicture ? { x: 0.5, y: r4((PLACE.top + gateH / 2) / h), w: r4(PLACE.gateW / W), h: r4(gateH / h) } : null,
    bands, spots: new Map([...spots].map(([k, v]) => [k, { x: r4(v.x / W), y: r4(v.y / h) }])),
  };
}

/** The room's world: the top-level maps, in their order, as islands down a sea route. */
export function atlasWorld(maps: string[]): World {
  const pts: Array<[number, number]> = [];
  const spots = new Map<string, Spot>();
  let y = ISLAND.top;
  maps.forEach((slug, i) => {
    const x = ISLAND_LANES[i % ISLAND_LANES.length]! * W;
    pts.push([x, y]); spots.set(slug, { x, y });
    y += ISLAND.step;
  });
  const h = Math.round(y - ISLAND.step + ISLAND.node + ISLAND.after);
  return {
    w: W, h, node: ISLAND.node, palette: PALETTES.atlas!, path: trail(pts, h),
    scenery: scenery('atlas', 'everyday-atlas', pts, ISLAND.node * 0.8, h, []),
    gate: null, bands: [], spots: new Map([...spots].map(([k, v]) => [k, { x: r4(v.x / W), y: r4(v.y / h) }])),
  };
}

/** The parts of a world the app reads (the spots go onto the places and maps themselves). */
export function worldOut(w: World) {
  return { w: w.w, h: w.h, node: w.node, palette: w.palette, path: w.path, scenery: w.scenery, gate: w.gate };
}
