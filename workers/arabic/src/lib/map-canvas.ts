// ── One canvas for any stop (owner, 2026-10-31: "nested nodes — a node's type can be stop or artifact") ────────────────
// Every level of the Everyday atlas — a world, a district, a place, a sport's side, a room — is a `stop` row in
// ar_map_node, and opens as the same canvas: its own picture (or none), labelled areas (children drawn `inline`,
// such as a city's districts or a house's rooms) and markers for its other children: stops (open as the same canvas),
// artifacts (open a reader by kind) and portals (jump to a stop elsewhere in the tree). This file lays one canvas out
// from the rows: the world's size, the areas, and every marker's place, kept clear of one another.
// The app only draws what this returns.

import { PICTURE, PLAN, W, separate, type Marker } from './everyday-world';

export interface MapRow {
  id: string; parent_id: string | null; type: 'stop' | 'artifact' | 'portal'; kind: string | null; ref: string | null;
  title_ar: string | null; title_en: string | null; icon: string | null; color: string | null; picture_key: string | null;
  picture_brief: string | null; x: number | null; y: number | null; w: number | null; h: number | null; sort_order: number;
  status: string; unlock: string; settings: string; domain: string | null; map_id: string;
}

export interface Settings { inline?: boolean; reveal?: number; default?: boolean; zoom?: { min: number; max: number }; sound?: string; aspect?: number }
export const settingsOf = (r: MapRow): Settings => { try { return JSON.parse(r.settings || '{}'); } catch { return {}; } };

export const treeOf = (rows: MapRow[]) => {
  const kids = new Map<string | null, MapRow[]>();
  for (const r of rows) kids.set(r.parent_id, [...(kids.get(r.parent_id) ?? []), r]);
  for (const list of kids.values()) list.sort((a, b) => a.sort_order - b.sort_order);
  return kids;
};

export interface CanvasZone { row: MapRow; x: number; y: number; w: number; h: number; markers: number; reveal: number; parentZone: string | null }
export interface CanvasMarker { row: MapRow; x: number; y: number; zone: string | null }
export interface Canvas { w: number; h: number; marker: Marker; zones: CanvasZone[]; markers: CanvasMarker[] }

/** At most this share of an area is covered by markers' rooms; a crowded area makes the whole canvas larger. */
const FILL = 0.5;
const GROW_MAX = 3.6;

export function canvasOf(root: MapRow, kids: Map<string | null, MapRow[]>, hasPicture: boolean): Canvas {
  type Rect = { x: number; y: number; w: number; h: number };
  const zones: CanvasZone[] = [];
  const raw: Array<{ row: MapRow; at: Rect | null; zone: string | null; zoneRect: Rect | null }> = [];
  const rootSet = settingsOf(root);
  const baseH = Math.round(W * (rootSet.aspect ?? (hasPicture ? PICTURE.aspect : 1.2)));

  // 1. the tree under this stop, areas and markers, positions as fractions of the whole canvas
  const walk = (parent: MapRow, area: Rect | null, zoneId: string | null) => {
    for (const c of kids.get(parent.id) ?? []) {
      if (c.status === 'hidden') continue;
      const s = settingsOf(c);
      const abs = (x: number | null, y: number | null): Rect | null =>
        x == null || y == null ? null : area ? { x: area.x + x * area.w, y: area.y + y * area.h, w: 0, h: 0 } : { x, y, w: 0, h: 0 };
      if (c.type === 'stop' && s.inline && c.x != null && c.y != null && c.w != null && c.h != null) {
        const r = area ? { x: area.x + c.x * area.w, y: area.y + c.y * area.h, w: c.w * area.w, h: c.h * area.h } : { x: c.x, y: c.y, w: c.w, h: c.h };
        zones.push({ row: c, ...r, markers: 0, reveal: s.reveal ?? 0, parentZone: zoneId });
        walk(c, r, c.id);
      } else {
        raw.push({ row: c, at: abs(c.x, c.y), zone: zoneId, zoneRect: area });
      }
    }
  };
  walk(root, null, null);

  // 2. how big the canvas must be for every area to hold its markers with room to spare
  const m: Marker = raw.some((r) => r.row.type === 'artifact') ? PICTURE.stopMarker : PICTURE.marker;
  const cell = m.w * m.h;
  const inZone = (id: string) => raw.filter((r) => { let z = r.zone; while (z) { if (z === id) return true; z = zones.find((q) => q.row.id === z)?.parentZone ?? null; } return false; }).length;
  for (const z of zones) z.markers = inZone(z.row.id);
  let grow = 1;
  const usable = (W - 2 * PICTURE.pad.x) * (baseH - PICTURE.pad.top - PICTURE.pad.bottom);
  grow = Math.max(grow, Math.sqrt((raw.length * cell) / (FILL * usable)));
  for (const z of zones) if (z.markers) grow = Math.max(grow, Math.sqrt((z.markers * cell) / (FILL * z.w * W * z.h * baseH)));
  grow = Math.min(GROW_MAX, grow);
  const W_ = Math.round(W * grow), H_ = Math.round(baseH * grow);

  // 3. each marker's wish: its own spot, or else laid in its area row by row
  const pts: Array<{ x: number; y: number; i: number }> = [];
  const byZone = new Map<string, number[]>();
  raw.forEach((r, i) => {
    if (r.at) pts.push({ x: r.at.x * W_, y: r.at.y * H_, i });
    else if (r.zone) byZone.set(r.zone, [...(byZone.get(r.zone) ?? []), i]);
    else pts.push({ x: W_ / 2, y: H_ / 2, i });
  });
  for (const [zid, idx] of byZone) {
    const z = zones.find((q) => q.row.id === zid)!;
    const rw = z.w * W_, rh = z.h * H_ - PLAN.titleRoom;
    const cols = Math.max(1, Math.min(idx.length, Math.floor(rw / m.w)));
    const rows = Math.ceil(idx.length / cols);
    idx.forEach((i, k) => {
      const c = k % cols, row = Math.floor(k / cols), inRow = Math.min(cols, idx.length - row * cols);
      const cw = rw / inRow, ch = Math.max(m.h, rh / rows);
      pts.push({ x: z.x * W_ + (c + 0.5) * cw, y: z.y * H_ + PLAN.titleRoom + row * ch + 56, i });
    });
  }
  separate(pts, { x0: PICTURE.pad.x + m.w / 2 - 40, x1: W_ - PICTURE.pad.x - m.w / 2 + 40, y0: PICTURE.pad.top, y1: H_ - PICTURE.pad.bottom }, m.w, m.h);
  const r4 = (n: number) => Math.round(n * 10000) / 10000;
  const markers = pts.sort((a, b) => a.i - b.i).map((p) => ({ row: raw[p.i]!.row, x: r4(p.x / W_), y: r4(p.y / H_), zone: raw[p.i]!.zone }));
  return { w: W_, h: H_, marker: m, zones: zones.map((z) => ({ ...z })), markers };
}
