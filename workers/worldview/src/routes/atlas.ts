import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import { memo } from '../cache';
import type { WorldviewEnv } from '../env';
import { dual } from './prefix';
import { arcCards, type ArcCardOut } from './arcs';
import { SourceRepo } from '../repositories/source.repo';

// The Worldview Atlas: the home, as data. One tree in wv_atlas (kmaps-database
// migration 008, written by scripts/worldview/atlas.py): rooms → shelves →
// items. An item is a live arc (served as its arc card), a planned arc (a
// place kept, with its years), a field of Global Terms (with how many terms it
// holds), one of the app's instruments, a single source (a book, a dīwān, an
// article, a lecture — served in the Library's own shape, with how many units
// it has), or a collection of sources (its sources are its children).
// Items of a continuous road carry `next`, so an arc leads on to the one after it.
// A shelf may carry its years too: an age on the road says when it is.

interface AtlasRow {
  id: string; parent_id: string | null; kind: string; title: string; title_ar: string | null;
  tagline: string | null; color: string | null; icon: string | null; layout: string | null;
  sort_order: number; arc_id: string | null; domain_slug: string | null; way: string | null;
  era_from: number | null; era_to: number | null; span: string | null; next_id: string | null; status: string;
  source_id: string | null; meta_json: string | null;
}

// The whole tree, loaded once per request: every row, and the function that
// turns an item row into the shape the app reads.
async function loadAtlas(env: WorldviewEnv) {
    const [rows, cards, fields, sourceRows, unitCounts] = await Promise.all([
      query<AtlasRow>(env.DB_WV, `SELECT * FROM wv_atlas ORDER BY sort_order, id`),
      arcCards(env.DB_WV),
      query<{ slug: string; title: string; title_ar: string | null; description: string | null; terms: number }>(env.DB_WV,
        `SELECT d.slug, d.title, d.title_ar, d.description,
                (SELECT count(*) FROM wv_term t WHERE t.domain_slug = d.slug AND t.status = 'live') AS terms
           FROM wv_domains d`),
      query<{ id: string }>(env.DB_WV, `SELECT DISTINCT source_id AS id FROM wv_atlas WHERE source_id IS NOT NULL`),
      query<{ source_id: string; units: number }>(env.DB_WV,
        `SELECT source_id, count(*) AS units FROM wv_source_units
          WHERE source_id IN (SELECT source_id FROM wv_atlas WHERE source_id IS NOT NULL) GROUP BY source_id`),
    ]);
    const repo = new SourceRepo(env.DB_WV);
    const sourceList = (await Promise.all(sourceRows.map((r) => repo.findById(r.id)))).filter((x) => x != null);
    const units = new Map(unitCounts.map((u) => [u.source_id, u.units]));
    const source = new Map(sourceList.map((x) => [x.id, { ...x, units: units.get(x.id) ?? 0 }]));
    const card = new Map(cards.map((c) => [c.id, c]));
    const field = new Map(fields.map((f) => [f.slug, f]));
    const kids = (id: string) => rows.filter((r) => r.parent_id === id);
    const byId = new Map(rows.map((r) => [r.id, r]));
    const meta = (r: AtlasRow): { ref?: string; view?: string[] } => {
      if (!r.meta_json) return {};
      try { return JSON.parse(r.meta_json); } catch { return {}; }
    };

    const item = (r: AtlasRow): any => {
      // a link: the thing itself, from its one home
      if (r.kind === 'ref') {
        const target = meta(r).ref ? byId.get(meta(r).ref as string) : undefined;
        return target ? item(target) : null;
      }
      const base = { id: r.id, kind: r.kind, status: r.status, next: r.next_id, era_from: r.era_from, era_to: r.era_to };
      if (r.kind === 'arc' && r.arc_id && card.has(r.arc_id)) {
        const { shelf: _s, order: _o, ...c } = card.get(r.arc_id) as ArcCardOut;
        return { ...base, title: c.title, title_ar: c.title_ar, tagline: c.tagline, span: c.span, arc: c };
      }
      if (r.kind === 'domain' && r.domain_slug) {
        const f = field.get(r.domain_slug);
        return { ...base, title: f?.title ?? r.title, title_ar: f?.title_ar ?? r.title_ar, tagline: f?.description ?? r.tagline,
                 span: null, domain: { slug: r.domain_slug, terms: f?.terms ?? 0 } };
      }
      if (r.kind === 'source') {
        const x = r.source_id ? source.get(r.source_id) : undefined;
        if (!x) return null;              // a source no longer on file is left off, not shown broken
        const year = x.published_year ? String(x.published_year) : null;
        return { ...base, title: x.title, title_ar: x.title_ar, tagline: (x as { author?: string | null }).author ?? r.tagline,
                 span: year, source: x };
      }
      if (r.kind === 'collection') {
        const members = kids(r.id).map((k) => (k.source_id ? source.get(k.source_id) : undefined)).filter((x) => x != null);
        return { ...base, title: r.title, title_ar: r.title_ar, tagline: r.tagline, span: `${members.length} books`,
                 sources: members };
      }
      // a group: a timeline within the timeline
      if (r.kind === 'group') {
        const members = kids(r.id).map(item).filter((x) => x != null);
        return { ...base, title: r.title, title_ar: r.title_ar, tagline: r.tagline, span: r.span, items: members };
      }
      // a planned strand carries only a note of its researched detail here — whether it has one, and
      // how many figures and works; the detail itself comes from GET /atlas/detail when it is opened
      let overview: { figures: number; works: number } | null = null;
      if (r.kind === 'planned' && r.meta_json) {
        try {
          const d = JSON.parse(r.meta_json);
          if (d?.summary) overview = { figures: d.figures?.length ?? 0, works: d.works?.length ?? 0 };
        } catch { overview = null; }
      }
      return { ...base, title: r.title, title_ar: r.title_ar, tagline: r.tagline, span: r.span, way: r.way, overview };
    };
    // An age holds nothing of its own. It is a view: its years, and the shelves it
    // gathers from. Each source becomes a group holding only what overlaps the
    // age's years; a source with groups of its own keeps them nested inside it —
    // unless it is named with "/*", when each of its groups stands on its own in
    // the age. A thing shown once in an age is not shown again further down it.
    const ageView = (age: AtlasRow) => {
      const e0 = age.era_from ?? -1e6, e1 = age.era_to ?? 1e6;
      const shown = new Set<string>();
      const inAge = (i: any) => {
        if (i == null || (i.kind !== 'planned' && i.kind !== 'arc') || i.era_from == null) return false;
        const to = i.era_to ?? i.era_from;
        return i.era_from <= e1 && to >= e0 && !shown.has(i.id);
      };
      const make = (id: string, src: AtlasRow, path: string, members: AtlasRow[]): any => {
        const list: any[] = [];
        for (const m of members) {
          if (m.kind === 'group') {
            const sub = make(`${id}~${m.id}`, m, '', kids(m.id));
            if (sub) list.push(sub);
          } else {
            const it = item(m);
            if (inAge(it)) { shown.add(it.id); list.push(it); }
          }
        }
        if (!list.length) return null;
        list.sort((a, b) => (a.era_from ?? 0) - (b.era_from ?? 0));
        const leaves = flat(list);
        const sp = shelfSpan({ ...src, span: null } as AtlasRow, leaves);
        return { id, kind: 'group', status: 'live', next: null, era_from: sp.era_from, era_to: sp.era_to,
                 title: src.title, title_ar: src.title_ar, tagline: path, span: sp.span, items: list };
      };
      const out: any[] = [];
      for (const spec of meta(age).view ?? []) {
        const spread = spec.endsWith('/*');
        const src = byId.get(spread ? spec.slice(0, -2) : spec);
        if (!src) continue;
        const room = src.parent_id ? byId.get(src.parent_id) : undefined;
        if (spread) {
          const loose = kids(src.id).filter((k) => k.kind !== 'group');
          const g = make(`${age.id}~${src.id}`, src, room?.title ?? '', loose);
          if (g) out.push(g);
          for (const sub of kids(src.id).filter((k) => k.kind === 'group')) {
            const gg = make(`${age.id}~${sub.id}`, sub, `${room?.title ?? ''} › ${src.title}`, kids(sub.id));
            if (gg) out.push(gg);
          }
        } else {
          const g = make(`${age.id}~${src.id}`, src, room?.title ?? '', kids(src.id));
          if (g) out.push(g);
        }
      }
      return out;
    };

    return { rows, item, kids, meta, ageView };
}

// Items of a shelf with its groups opened, each thing once — for counting.
function flat(items: any[]): any[] {
  const seen = new Set<string>();
  const walk = (xs: any[]): any[] => xs.flatMap((i) => (i.kind === 'group' ? walk(i.items ?? []) : [i]));
  return walk(items).filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

// A year → its century: 1..n for AD, -1..-n for BC (there is no year 0).
function centuryOf(y: number): number {
  // 1–100 is the 1st century; 100–1 BC is the 1st century BC, 3100–3001 BC the 31st
  return y > 0 ? Math.floor((y - 1) / 100) + 1 : -Math.ceil(-y / 100);
}

// Years as said: 2025 and later is "today", before year 1 is BC.
function yearText(y: number): string { return y < 0 ? `${-y} BC` : y >= 2025 ? 'today' : String(y); }

// A shelf's years: its own if written, else the reach of its dated items, so
// every shelf can stand on its room's timeline.
function shelfSpan(s: AtlasRow, items: { era_from: number | null; era_to: number | null }[]) {
  if (s.span) return { era_from: s.era_from, era_to: s.era_to, span: s.span };
  const from = items.map((i) => i.era_from).filter((y): y is number => y != null);
  const to = items.map((i) => i.era_to ?? i.era_from).filter((y): y is number => y != null);
  if (!from.length) return { era_from: null, era_to: null, span: null };
  const a = Math.min(...from), b = Math.max(...to);
  // AD only marks a number after a BC start; "today" needs no era
  const span = a < 0 && b > 0 && b < 2025 ? `${yearText(a)} – AD ${yearText(b)}` : `${yearText(a)} – ${yearText(b)}`;
  return { era_from: a, era_to: b, span };
}

function ordinal(n: number): string {
  const t = n % 100;
  const s = t >= 11 && t <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${s}`;
}

function centuryLabel(c: number) {
  if (c > 0) return { label: `${ordinal(c)} century`, range: `${(c - 1) * 100 + 1} – ${c * 100}` };
  const n = -c;
  return { label: `${ordinal(n)} century BC`, range: `${n * 100} – ${(n - 1) * 100 + 1} BC` };
}

// ── the built Atlas, cached ─────────────────────────────────────────────────
// Building the tree (links, groups, ages, arc cards, sources) takes seconds, so
// it is built once per version of the data behind it and kept: in this
// isolate's memory, and in wv_atlas_cache for the next isolate. The version
// moves when atlas.py is applied (wv_atlas), when a source changes (wv_sources),
// when terms are added (wv_term), and on the hour, as a floor for anything else.

type Built = Record<string, unknown>;

// the one cache helper (cache.ts), in the atlas family
const cached = (env: WorldviewEnv, key: string, build: () => Promise<Built>) => memo(env, 'atlas', key, build);

async function buildAtlas(env: WorldviewEnv): Promise<Built> {
    const { rows, item, kids, meta, ageView } = await loadAtlas(env);
    const items = (parent: string) => kids(parent).map(item).filter((x) => x != null);

    const rooms = rows.filter((r) => r.kind === 'room').map((room) => {
      const shelves = kids(room.id).map((s) => {
        const its = meta(s).view ? ageView(s) : items(s.id);
        return { id: s.id, title: s.title, title_ar: s.title_ar, tagline: s.tagline, ...shelfSpan(s, its), items: its };
      });
      const all = flat(shelves.flatMap((s) => s.items));
      return {
        id: room.id, title: room.title, title_ar: room.title_ar, tagline: room.tagline,
        color: room.color ?? '#D8B657', icon: room.icon ?? 'circle', layout: room.layout ?? 'shelves',
        counts: {
          live: all.filter((i) => i.kind === 'arc').length,
          planned: all.filter((i) => i.kind === 'planned').length,
          fields: all.filter((i) => i.kind === 'domain').length,
          sources: all.filter((i) => i.kind === 'source').length
            + all.reduce((n, i) => n + ((i as { sources?: unknown[] }).sources?.length ?? 0), 0),
        },
        shelves,
      };
    });
    return { rooms };
}

async function buildCenturies(env: WorldviewEnv): Promise<Built> {
    const { rows, item } = await loadAtlas(env);
    const byId = new Map(rows.map((r) => [r.id, r]));
    const seen = new Map<string, { item: NonNullable<ReturnType<typeof item>>; century: number; shelves: { id: string; title: string; room: string; color: string }[] }>();
    for (const r of rows) {
      if (r.era_from == null || (r.kind !== 'planned' && r.kind !== 'arc')) continue;
      let shelf = r.parent_id ? byId.get(r.parent_id) : undefined;
      const grp = shelf?.kind === 'group' ? shelf : undefined;
      if (grp) shelf = grp.parent_id ? byId.get(grp.parent_id) : undefined;
      const room = shelf?.parent_id ? byId.get(shelf.parent_id) : undefined;
      if (!shelf || !room || shelf.kind !== 'shelf') continue;
      const where = { id: shelf.id, title: grp ? `${shelf.title} › ${grp.title}` : shelf.title,
                      room: room.title, color: room.color ?? '#D8B657' };
      const key = r.kind === 'arc' && r.arc_id ? r.arc_id : `${r.title.toLowerCase()}|${r.era_from}`;
      const had = seen.get(key);
      if (had) { had.shelves.push(where); continue; }
      const it = item(r);
      if (!it) continue;
      seen.set(key, { item: it, century: centuryOf(r.era_from), shelves: [where] });
    }
    const groups = new Map<number, { item: unknown; shelves: unknown[]; era_from: number }[]>();
    for (const v of seen.values()) {
      const list = groups.get(v.century) ?? [];
      list.push({ item: v.item, shelves: v.shelves, era_from: (v.item as { era_from: number }).era_from });
      groups.set(v.century, list);
    }
    const centuries = [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([c, list]) => {
      // which rooms the century's entries come from, most first — the outer list shows this
      const rooms = new Map<string, { room: string; color: string; count: number }>();
      for (const e of list) {
        const s = e.shelves[0] as { room: string; color: string };
        const r = rooms.get(s.room) ?? { room: s.room, color: s.color, count: 0 };
        r.count += 1; rooms.set(s.room, r);
      }
      return {
        century: c, ...centuryLabel(c),
        rooms: [...rooms.values()].sort((a, b) => b.count - a.count),
        entries: list.sort((a, b) => a.era_from - b.era_from).map(({ item, shelves }) => ({ item, shelves })),
      };
    });
    return { centuries };
}

// ── lazy slices of the built Atlas ──────────────────────────────────────────
// The home needs only the rooms; a room, its shelves as cards; a shelf, its
// items. Each screen asks for its own slice, from the one cached build.

type Room = { id: string; layout: string; shelves: Shelf[]; [k: string]: unknown };
type Shelf = { id: string; items: any[]; [k: string]: unknown };

function shelfCard(s: Shelf, withItems: boolean) {
  const inner = flat(s.items);
  return {
    ...s,
    count: inner.length,
    live: inner.filter((i) => i.kind === 'arc').length,
    preview: inner.slice(0, 3).map((i) => i.title),
    items: withItems ? s.items : [],
  };
}

const fold = (t: unknown) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f\u02bf\u02be'’]/g, '').toLowerCase();

export function atlasRoutes(router: Router<WorldviewEnv>) {
  // The whole tree — for older app builds and the Global Terms fields.
  dual(router, 'get', '/atlas', async (_req, env) => ok(await cached(env, 'atlas', () => buildAtlas(env))));

  // The home: the rooms, with their counts; no shelves.
  // Each slice is kept on its own too, so a fresh isolate reads a few KB,
  // not the whole built tree.
  const tree = async (env: WorldviewEnv) => ((await cached(env, 'atlas', () => buildAtlas(env))) as { rooms: Room[] }).rooms;

  dual(router, 'get', '/atlas/home', async (_req, env) => ok(await cached(env, 'home', async () => ({
    rooms: (await tree(env)).map((r) => ({ ...r, shelf_count: r.shelves.length, shelves: [] })),
  }))));

  // A room: its shelves as cards (count, live, a preview) — items only for a
  // room laid out as tiles, whose screen shows them directly.
  dual(router, 'get', '/atlas/room', async (req, env) => {
    const id = new URL(req.url).searchParams.get('id') ?? '';
    const slice = await cached(env, `room:${id}`, async () => {
      const room = (await tree(env)).find((r) => r.id === id);
      return room ? { room: { ...room, shelves: room.shelves.map((s) => shelfCard(s, room.layout === 'tiles')) } } : {};
    });
    return slice.room ? ok(slice) : notFound('Atlas room');
  });

  // A shelf (or an age): everything on it.
  dual(router, 'get', '/atlas/shelf', async (req, env) => {
    const id = new URL(req.url).searchParams.get('id') ?? '';
    const slice = await cached(env, `shelf:${id}`, async () => {
      for (const room of await tree(env)) {
        const shelf = room.shelves.find((s) => s.id === id);
        if (shelf) return { shelf, room: { id: room.id, title: room.title, color: room.color } };
      }
      return {};
    });
    return slice.shelf ? ok(slice) : notFound('Atlas shelf');
  });

  // Search the Atlas by name, Arabic name, line or years. Ages are views of the
  // other rooms, so they are not searched twice; each thing is found once.
  dual(router, 'get', '/atlas/search', async (req, env) => {
    const q = fold(new URL(req.url).searchParams.get('q')).trim();
    if (!q) return ok({ rooms: [], shelves: [], items: [] });
    const { rooms } = (await cached(env, 'atlas', () => buildAtlas(env))) as { rooms: Room[] };
    const hit = (...xs: unknown[]) => xs.some((x) => fold(x).includes(q));
    const where = (r: Room) => ({ id: r.id, title: r.title, color: r.color });
    const seen = new Set<string>();
    const out = { rooms: [] as unknown[], shelves: [] as unknown[], items: [] as unknown[] };
    for (const room of rooms) {
      if (hit(room.title, room.title_ar, room.tagline)) out.rooms.push({ ...room, shelves: [] });
      for (const shelf of room.shelves) {
        const isView = shelf.items.length > 0 && shelf.items.every((i) => i.kind === 'group' && String(i.id).includes('~'));
        if (hit(shelf.title, shelf.title_ar, shelf.tagline)) out.shelves.push({ shelf: shelfCard(shelf, false), room: where(room) });
        if (isView) continue;
        for (const it of flat(shelf.items)) {
          const key = it.arc?.id ?? it.id;
          if (seen.has(key) || !hit(it.title, it.title_ar, it.tagline, it.span)) continue;
          seen.add(key);
          out.items.push({ item: it, room: where(room), shelf: { id: shelf.id, title: shelf.title } });
        }
      }
    }
    out.items = out.items.slice(0, 80);
    return ok(out);
  });

  // One strand's researched detail: summary, figures, works, themes, sources.
  dual(router, 'get', '/atlas/detail', async (req, env) => {
    const id = new URL(req.url).searchParams.get('id') ?? '';
    const rows = await query<{ meta_json: string | null }>(env.DB_WV,
      `SELECT meta_json FROM wv_atlas WHERE id = ? AND kind = 'planned'`, [id]);
    let detail: unknown = null;
    try { detail = rows[0]?.meta_json ? JSON.parse(rows[0].meta_json) : null; } catch { detail = null; }
    return ok({ id, detail });
  });

  // Century by century: every dated item in the Atlas, placed in the century it
  // begins in. An item shelved in several rooms is listed once, with each shelf
  // it stands on in `shelves`; its colour is its first room's.
  dual(router, 'get', '/atlas/centuries', async (_req, env) => ok(await cached(env, 'centuries', () => buildCenturies(env))));
}
