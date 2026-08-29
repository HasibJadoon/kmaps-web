// ─── /wv/positions — what each worldview says, and where ──────────────────────
//
// Two ends of one question. A reader on a passage asks what has been said about
// these āyāt; a reader comparing asks what every worldview says about one
// concept. Both are the same table, and both are one query because the concept
// id is global.

import type { Router } from '../../../shared/src/router';
import { ok, created, badRequest, notFound } from '../../../shared/src/response';
import { cached } from '../../../shared/src/cache';
import type { WorldviewEnv } from '../env';
import { PositionRepo } from '../repositories/position.repo';

/** Authored content: it changes when someone records a position, not on a
 *  clock. Same TTL the study steps use, and ?refresh=1 bypasses it. */
const CORPUS_TTL = { browser: 14400, edge: 86400 };

function parseScope(surah: string, range: string) {
  const s = Number(surah);
  const m = /^(\d+)(?:-(\d+))?$/.exec(range);
  if (!s || !m) return null;
  const from = Number(m[1]);
  return { s, from, to: m[2] ? Number(m[2]) : from };
}

export function positionRoutes(router: Router<WorldviewEnv>) {

  // GET /wv/positions/passage/40/1-3 — everything said about these āyāt
  router.get('/wv/positions/passage/:surah/:range', (req, env, { surah, range }) =>
    cached(req, async () => {
      const sc = parseScope(surah, range);
      if (!sc) return badRequest('Expected /passage/{surah}/{from}[-{to}]');
      const repo = new PositionRepo(env.DB_WV);
      const [positions, concepts] = await Promise.all([
        repo.forPassage(sc.s, sc.from, sc.to),
        // What the passage already touches, so the reader picks a concept
        // rather than inventing one — the difference between a list and a form.
        repo.conceptsForPassage(sc.s, sc.from, sc.to),
      ]);
      return ok({ surah: sc.s, ayahFrom: sc.from, ayahTo: sc.to, concepts, positions });
    }, CORPUS_TTL),
  );

  // GET /wv/positions/concept/CN:theology:tawhid — the comparison itself
  router.get('/wv/positions/concept/:ref', (req, env, { ref }) =>
    cached(req, async () => {
      if (!ref?.startsWith('CN:')) return badRequest('Expected a CN: concept id');
      const rows = await new PositionRepo(env.DB_WV).forConcept(ref);
      return ok({ concept: ref, worldviews: rows.length, positions: rows });
    }, CORPUS_TTL),
  );

  // GET /wv/positions/:id/sources
  router.get('/wv/positions/:id/sources', async (_req, env, { id }) => {
    const rows = await new PositionRepo(env.DB_WV).sources(id);
    return ok(rows);
  });

  // POST /wv/positions — record one, from wherever the reader is
  router.post('/wv/positions', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    const conceptRef  = String(b.concept_ref ?? '');
    const traditionId = String(b.tradition_id ?? '');
    const text        = String(b.position_text ?? '').trim();
    if (!conceptRef.startsWith('CN:')) return badRequest('concept_ref must be a CN: id');
    if (!traditionId) return badRequest('tradition_id required');
    if (!text)        return badRequest('position_text required');

    const row = await new PositionRepo(env.DB_WV).create({
      conceptRef, traditionId, text,
      title: String(b.position_title ?? '').trim() || text.slice(0, 80),
      positionType: b.position_type ? String(b.position_type) : undefined,
      surah:    b.surah     != null ? Number(b.surah)     : null,
      ayahFrom: b.ayah_from != null ? Number(b.ayah_from) : null,
      ayahTo:   b.ayah_to   != null ? Number(b.ayah_to)   : null,
    });
    return row ? created(row) : notFound('position after insert');
  });
}
