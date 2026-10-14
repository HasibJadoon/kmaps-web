import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import type { WorldviewEnv } from '../env';
import { dual } from './prefix';
import { RhetoricRepo, type WvRhetoricTerm } from '../repositories/rhetoric.repo';
import { collect } from './rhetoric';
import { arcReview } from './arcs';
import { rhetoricDrills, arcDrills, type ArcItem } from '../lib/wv-drills';

/**
 * WV practice: rounds of drills the app plays (DrillKit). Each drill carries the review card it files when answered,
 * so what is practised in Worldview flows into SRS — and only what is practised.
 *
 *   GET /wv/practice/rhetoric?term=<id|slug>&n=  one entry's drills (or, without term, the list filters' entries)
 *   GET /wv/practice/arc/:id/:phase?n=           a phase's concept → passage drills
 */
const SKILL = {
  rhetoric: { id: 'wv_rhetoric', title: 'Rhetoric', titleAr: 'بلاغة الخطاب', icon: 'quote.bubble', color: '#B388EB' },
  arc: { id: 'wv_arc', title: 'Arc review', titleAr: 'مراجعة', icon: 'point.topleft.down.to.point.bottomright.curvepath', color: '#B388EB' },
};

export function practiceRoutes(router: Router<WorldviewEnv>) {
  dual(router, 'get', '/practice/rhetoric', async (req, env) => {
    const url = new URL(req.url);
    const n = Math.min(30, Math.max(1, Number(url.searchParams.get('n') ?? '10') || 10));
    const want = url.searchParams.get('term');
    // the pool the wrong answers come from: every live entry
    const all = new URL(url); for (const k of [...all.searchParams.keys()]) all.searchParams.delete(k);
    const pool = await collect(env, all);
    let terms: WvRhetoricTerm[];
    if (want) {
      const t = pool.terms.find((x) => x.id === want || x.slug === want) ?? await new RhetoricRepo(env.DB_WV).findTerm(want);
      if (!t) return notFound(`rhetoric term ${want}`);
      terms = [t];
    } else {
      terms = (await collect(env, url)).terms;
    }
    const usages = want ? await new RhetoricRepo(env.DB_WV).listUsagesForTerm(terms[0].id) : pool.usages;
    const items = rhetoricDrills(terms, pool.terms, pool.devices, usages);
    return ok({ skill: SKILL.rhetoric, items: want ? items.slice(0, n) : spread(items, n), stage: [] });
  });

  dual(router, 'get', '/practice/arc/:id/:phase', async (req, env, { id, phase }) => {
    const n = Math.min(30, Math.max(1, Number(new URL(req.url).searchParams.get('n') ?? '10') || 10));
    const r = await arcReview(env, id, phase);
    const items = arcDrills(id, phase, r.title, r.items as ArcItem[]);
    return ok({ skill: SKILL.arc, items: spread(items, n), stage: [] });
  });
}

/// n of them, taken across the set rather than from its head
function spread<T>(xs: T[], n: number): T[] {
  if (xs.length <= n) return xs;
  const step = xs.length / n;
  return Array.from({ length: n }, (_, i) => xs[Math.floor(i * step)]);
}
