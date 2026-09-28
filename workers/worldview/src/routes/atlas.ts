import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
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

    const item = (r: AtlasRow) => {
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
      // a planned strand carries its researched detail (summary, figures, works, themes, sources)
      let detail: unknown = null;
      if (r.kind === 'planned' && r.meta_json) { try { detail = JSON.parse(r.meta_json); } catch { detail = null; } }
      return { ...base, title: r.title, title_ar: r.title_ar, tagline: r.tagline, span: r.span, way: r.way, detail };
    };
    return { rows, item, kids };
}

// A year → its century: 1..n for AD, -1..-n for BC (there is no year 0).
function centuryOf(y: number): number {
  return y > 0 ? Math.floor((y - 1) / 100) + 1 : -(Math.floor(-y / 100) + 1);
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
  const span = a < 0 && b > 0 ? `${yearText(a)} – AD ${yearText(b)}` : `${yearText(a)} – ${yearText(b)}`;
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

export function atlasRoutes(router: Router<WorldviewEnv>) {
  dual(router, 'get', '/atlas', async (_req, env) => {
    const { rows, item, kids } = await loadAtlas(env);
    const items = (parent: string) => kids(parent).map(item).filter((x) => x != null);

    const rooms = rows.filter((r) => r.kind === 'room').map((room) => {
      const shelves = kids(room.id).map((s) => {
        const its = items(s.id);
        return { id: s.id, title: s.title, title_ar: s.title_ar, tagline: s.tagline, ...shelfSpan(s, its), items: its };
      });
      const all = shelves.flatMap((s) => s.items);
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
    return ok({ rooms });
  });

  // Century by century: every dated item in the Atlas, placed in the century it
  // begins in. An item shelved in several rooms is listed once, with each shelf
  // it stands on in `shelves`; its colour is its first room's.
  dual(router, 'get', '/atlas/centuries', async (_req, env) => {
    const { rows, item } = await loadAtlas(env);
    const byId = new Map(rows.map((r) => [r.id, r]));
    const seen = new Map<string, { item: NonNullable<ReturnType<typeof item>>; century: number; shelves: { id: string; title: string; room: string; color: string }[] }>();
    for (const r of rows) {
      if (r.era_from == null || (r.kind !== 'planned' && r.kind !== 'arc')) continue;
      const shelf = r.parent_id ? byId.get(r.parent_id) : undefined;
      const room = shelf?.parent_id ? byId.get(shelf.parent_id) : undefined;
      if (!shelf || !room || shelf.kind !== 'shelf') continue;
      const where = { id: shelf.id, title: shelf.title, room: room.title, color: room.color ?? '#D8B657' };
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
    const centuries = [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([c, list]) => ({
      century: c, ...centuryLabel(c),
      entries: list.sort((a, b) => a.era_from - b.era_from).map(({ item, shelves }) => ({ item, shelves })),
    }));
    return ok({ centuries });
  });
}
