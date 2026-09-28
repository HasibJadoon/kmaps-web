import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { WorldviewEnv } from '../env';
import { dual } from './prefix';
import { arcCards, type ArcCardOut } from './arcs';

// The Worldview Atlas: the home, as data. One tree in wv_atlas (kmaps-database
// migration 008, written by scripts/worldview/atlas.py): rooms → shelves →
// items. An item is a live arc (served as its arc card), a planned arc (a
// place kept, with its years), a field of Global Terms (with how many terms it
// holds), or one of the app's instruments. Items of a continuous road carry
// `next`, so an arc leads on to the one after it.

interface AtlasRow {
  id: string; parent_id: string | null; kind: string; title: string; title_ar: string | null;
  tagline: string | null; color: string | null; icon: string | null; layout: string | null;
  sort_order: number; arc_id: string | null; domain_slug: string | null; way: string | null;
  era_from: number | null; era_to: number | null; span: string | null; next_id: string | null; status: string;
}

export function atlasRoutes(router: Router<WorldviewEnv>) {
  dual(router, 'get', '/atlas', async (_req, env) => {
    const [rows, cards, fields] = await Promise.all([
      query<AtlasRow>(env.DB_WV, `SELECT * FROM wv_atlas ORDER BY sort_order, id`),
      arcCards(env.DB_WV),
      query<{ slug: string; title: string; title_ar: string | null; description: string | null; terms: number }>(env.DB_WV,
        `SELECT d.slug, d.title, d.title_ar, d.description,
                (SELECT count(*) FROM wv_term t WHERE t.domain_slug = d.slug AND t.status = 'live') AS terms
           FROM wv_domains d`),
    ]);
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
      return { ...base, title: r.title, title_ar: r.title_ar, tagline: r.tagline, span: r.span, way: r.way };
    };

    const rooms = rows.filter((r) => r.kind === 'room').map((room) => {
      const shelves = kids(room.id).map((s) => ({
        id: s.id, title: s.title, title_ar: s.title_ar, tagline: s.tagline, items: kids(s.id).map(item),
      }));
      const all = shelves.flatMap((s) => s.items);
      return {
        id: room.id, title: room.title, title_ar: room.title_ar, tagline: room.tagline,
        color: room.color ?? '#D8B657', icon: room.icon ?? 'circle', layout: room.layout ?? 'shelves',
        counts: {
          live: all.filter((i) => i.kind === 'arc').length,
          planned: all.filter((i) => i.kind === 'planned').length,
          fields: all.filter((i) => i.kind === 'domain').length,
        },
        shelves,
      };
    });
    return ok({ rooms });
  });
}
