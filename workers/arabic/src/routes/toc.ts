// ─── /ar/toc and /ar/sources routes ───────────────────────────────────────────
// The curriculum table of contents and the sources behind it. Read-only: the
// TOC is edited through migrations, not the API.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import type { ArabicEnv } from '../env';
import { TocRepo, TeachingVariantRepo } from '../repositories/toc.repo';
import { SourceRepo } from '../repositories/source.repo';

export function tocRoutes(router: Router<ArabicEnv>) {

  // GET /ar/toc — the three domains of Arabic linguistics with their counts
  router.get('/ar/toc', async (_req, env) => {
    return ok({ disciplines: await new TocRepo(env.DB_AR).disciplines() });
  });

  // GET /ar/toc/sources — every source, grouped by discipline (Sources card)
  // Declared before /ar/toc/:discipline so "sources" is not read as a code.
  router.get('/ar/toc/sources', async (_req, env) => {
    return ok({ groups: await new SourceRepo(env.DB_AR).grouped() });
  });

  // GET /ar/toc/:discipline — one discipline's full hierarchical TOC
  // Accepts either the code (NH) or the slug (nahw).
  router.get('/ar/toc/:discipline', async (_req, env, { discipline }) => {
    const repo = new TocRepo(env.DB_AR);
    const d = await repo.findDiscipline(discipline);
    if (!d) return notFound(`discipline ${discipline}`);
    return ok(await repo.curriculum(d));
  });

  // GET /ar/toc/node/:id — one topic, its ancestors, children and sources
  router.get('/ar/toc/node/:id', async (_req, env, { id }) => {
    const detail = await new TocRepo(env.DB_AR).node(id);
    return detail ? ok(detail) : notFound(`node ${id}`);
  });

  // ── Sources ────────────────────────────────────────────────────────────────

  // GET /ar/sources?discipline=NH&kind=book
  router.get('/ar/sources', async (req, env) => {
    const url = new URL(req.url);
    const repo = new SourceRepo(env.DB_AR);
    // No filter → the grouped shape the Sources card renders; a filter → a flat
    // list, because a filtered view has already chosen its own grouping.
    const discipline = url.searchParams.get('discipline');
    const kind       = url.searchParams.get('kind');
    if (!discipline && !kind) return ok({ groups: await repo.grouped() });
    return ok({ sources: await repo.list(discipline, kind) });
  });

  // GET /ar/sources/:id — one source and every topic that cites it
  router.get('/ar/sources/:id', async (_req, env, { id }) => {
    const detail = await new SourceRepo(env.DB_AR).findById(id);
    return detail ? ok(detail) : notFound(`source ${id}`);
  });

  // ── Teaching variants ──────────────────────────────────────────────────────
  // One topic retold for one audience. An episode's teaching stage names the
  // variants it uses; before this they were stored and unreachable.

  // GET /ar/teaching-variants?node=&audience=&lang=&ids=a,b,c
  router.get('/ar/teaching-variants', async (req, env) => {
    const url  = new URL(req.url);
    const repo = new TeachingVariantRepo(env.DB_AR);
    const ids  = url.searchParams.get('ids');
    if (ids) {
      const list = ids.split(',').map((s) => s.trim()).filter(Boolean);
      if (!list.length) return badRequest('ids was present but empty');
      return ok({ variants: await repo.byIds(list) });
    }
    return ok({ variants: await repo.list({
      node:     url.searchParams.get('node'),
      audience: url.searchParams.get('audience'),
      lang:     url.searchParams.get('lang'),
    }) });
  });

  // GET /ar/teaching-variants/:id
  router.get('/ar/teaching-variants/:id', async (_req, env, { id }) => {
    const row = await new TeachingVariantRepo(env.DB_AR).findById(id);
    return row ? ok(row) : notFound(`teaching variant ${id}`);
  });

  // GET /ar/nodes/:id/sources — the sources cited at one topic
  router.get('/ar/nodes/:id/sources', async (_req, env, { id }) => {
    if (!id) return badRequest('node id required');
    return ok({ sources: await new TocRepo(env.DB_AR).nodeSources(id) });
  });
}
