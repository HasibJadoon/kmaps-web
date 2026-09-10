import { Router } from '../../shared/src/router';
import { sense, readRows, type SenseRequest, type RowsRequest } from '../../shared/src/sense';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { ContentEnv } from './env';

import { documentRoutes } from './routes/documents';
import { deckRoutes } from './routes/decks';
import { assetRoutes } from './routes/assets';
import { noteRoutes } from './routes/notes';
import { docSpaceRoutes } from './routes/docspace';
import { cmCommentRoutes } from './routes/comments';
import { cmCaptureRoutes } from './routes/captures';
import { highlightRoutes } from './routes/highlights';
import { cmSourceRoutes } from './routes/sources';

const router = new Router<ContentEnv>();

router.get('/health', async (_req, env) =>
  ok({ domain: 'content', db: 'DB_CM', db_ok: await dbHealth(env.DB_CM) }),
);

documentRoutes(router);
deckRoutes(router);
assetRoutes(router);
noteRoutes(router);
docSpaceRoutes(router);
cmCaptureRoutes(router);
cmCommentRoutes(router);
highlightRoutes(router);
cmSourceRoutes(router);

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
