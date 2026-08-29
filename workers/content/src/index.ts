// ─── km-content-worker entry point ────────────────────────────────────────────
// Owns DB_CM (km_content). All authored artifacts: documents, notes, captures,
// highlights, sources. ACL via CORE service binding (never grows its own ACL).

import { Router } from '../../shared/src/router';
import { sense, readRows, type SenseRequest, type RowsRequest } from '../../shared/src/sense';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { ContentEnv } from './env';

import { documentRoutes } from './routes/documents';
import { noteRoutes } from './routes/notes';
import { docSpaceRoutes } from './routes/docspace';
import { cmCaptureRoutes } from './routes/captures';
import { highlightRoutes } from './routes/highlights';
import { cmSourceRoutes } from './routes/sources';

const router = new Router<ContentEnv>();

router.get('/health', async (_req, env) =>
  ok({ domain: 'content', db: 'DB_CM', db_ok: await dbHealth(env.DB_CM) }),
);

documentRoutes(router);   // CM documents, blocks, links, versions
noteRoutes(router);        // GET/POST/PATCH /cm/notes (legacy annotations)
docSpaceRoutes(router);    // GET/POST/PATCH/DELETE /cm/docspace (owner-scoped notes)
cmCaptureRoutes(router);     // GET/POST /cm/captures
highlightRoutes(router);   // GET/POST/DELETE /cm/highlights
cmSourceRoutes(router);    // GET/POST /cm/sources

// The sensor engine's reader for this database. Internal-only: reached
// through km-core-worker's service binding, never via a public module path.
// The rows a carrier holds for one scope — same bridge, same whitelist.
router.post('/cm/internal/rows', async (req, env) => {
  const body = await req.json<RowsRequest>().catch(() => null);
  if (!body) return ok({ ok: false, error: 'bad request' });
  return ok(await readRows(env.DB_CM, body));
});

router.post('/cm/internal/sense', async (req, env) => {
  const body = await req.json<SenseRequest>().catch(() => null);
  if (!body) return ok({ ok: false, error: 'bad request' });
  return ok(await sense(env.DB_CM, body));
});

export default {
  fetch: (request: Request, env: ContentEnv) => router.handle(request, env),
} satisfies ExportedHandler<ContentEnv>;
