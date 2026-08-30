import type { Router } from '../../../shared/src/router';
import { badRequest, ok } from '../../../shared/src/response';
import { parseIntParam, parsePagination } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import { ProjectionRepo, type DocLink, type WorldviewNode } from '../repositories/projection.repo';

function parseSurahId(id: string): number | null {
  const surahId = parseIntParam(id);
  return surahId && surahId >= 1 && surahId <= 114 ? surahId : null;
}

function hub(surahId: number, documents: number) {
  return {
    ok: true,
    surahId,
    counts: {
      nodes: null as number | null,
      sources: null as number | null,
      notes: null as number | null,
      documents,
    },
  };
}

function mapNode(row: WorldviewNode, edgeCount = 0) {
  return {
    id: row.id,
    title: row.label_en,
    node_type: row.node_type,
    text_plain: row.summary_md ?? undefined,
    summary: row.summary_md ?? undefined,
    slug: row.label_en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    status: 'active',
    edge_count: edgeCount,
    evidence_count: row.source_claim_id ? 1 : 0,
    quran_link_count: 1,
  };
}

function mapDocLink(row: DocLink) {
  return {
    id: row.id,
    title: row.cm_doc_ref,
    doc_type: row.link_type,
    summary: row.note_md ?? undefined,
    status: 'active',
    block_count: 0,
    node_count: 0,
  };
}

async function listNodes(env: QuranEnv, surahId: number, request: Request) {
  const page = await new ProjectionRepo(env.DB_QR).worldviewNodes(
    { surah: surahId },
    parsePagination(new URL(request.url)),
  );

  return page;
}

export function worldviewRoutes(router: Router<QuranEnv>) {
  router.get('/qr/surahs/:id/worldview', async (request, env, { id }) => {
    const surahId = parseSurahId(id);
    if (!surahId) return badRequest('Invalid surah ID');

    const repo = new ProjectionRepo(env.DB_QR);

    const documents = await repo.docLinksForSurah(surahId);
    return ok(hub(surahId, documents.length));
  });

  router.get('/qr/surahs/:id/worldview/nodes', async (request, env, { id }) => {
    const surahId = parseSurahId(id);
    if (!surahId) return badRequest('Invalid surah ID');

    return ok({ ok: true, surahId, total: null, nodes: [], unmeasured: true });
  });

  router.get('/qr/surahs/:id/worldview/documents', async (_request, env, { id }) => {
    const surahId = parseSurahId(id);
    if (!surahId) return badRequest('Invalid surah ID');

    const documents = await new ProjectionRepo(env.DB_QR).docLinksForSurah(surahId);

    return ok({
      ok: true,
      surahId,
      total: documents.length,
      documents: documents.map(mapDocLink),
    });
  });

  router.get('/qr/surahs/:id/worldview/sources', async (_request, _env, { id }) => {
    const surahId = parseSurahId(id);
    if (!surahId) return badRequest('Invalid surah ID');
    return ok({ ok: true, surahId, total: null, sources: [], unmeasured: true });
  });

  router.get('/qr/surahs/:id/worldview/notes', async (_request, _env, { id }) => {
    const surahId = parseSurahId(id);
    if (!surahId) return badRequest('Invalid surah ID');
    return ok({ ok: true, surahId, total: null, notes: [], unmeasured: true });
  });

  router.get('/qr/surahs/:id/worldview/podcasts', async (_request, _env, { id }) => {
    const surahId = parseSurahId(id);
    if (!surahId) return badRequest('Invalid surah ID');
    return ok({ ok: true, surahId, total: 0, items: [], podcasts: [] });
  });

  router.get('/qr/surahs/:id/worldview/links', async (_request, _env, { id }) => {
    const surahId = parseSurahId(id);
    if (!surahId) return badRequest('Invalid surah ID');
    return ok({ ok: true, surahId, total: 0, links: [] });
  });
}
