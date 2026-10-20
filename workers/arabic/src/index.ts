import { Router } from '../../shared/src/router';
import { withSwr, familyVersionsNow, type SwrRoute } from '../../shared/src/swr';
import { FAMILIES } from './cache-families';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { ArabicEnv } from './env';

import { audioRoutes } from './routes/audio';
import { vendorAudioRoutes } from './routes/vendor-audio';
import { textRoutes } from './routes/text';
import { bookcaseRoutes } from './routes/bookcase';
import { readingRoutes } from './routes/reading';
import { acquisitionRoutes } from './routes/acquisition';
import { containerRoutes } from './routes/containers';
import { libraryRoutes } from './routes/library';
import { curriculumRoutes } from './routes/curriculum';
import { vocabularyRoutes } from './routes/vocabulary';
import { lessonRoutes } from './routes/lessons';
import { grammarRoutes } from './routes/grammar';
import { grammarCitationRoutes } from './routes/grammar-citations';
import { grammarPathRoutes } from './routes/grammar-path';
import { exerciseRoutes } from './routes/exercises';
import { dailyRoutes } from './routes/daily';
import { roomRoutes } from './routes/rooms';
import { practiceRoutes } from './routes/practice';
import { drillSourceRoutes } from './routes/drill-source';
import { ttsRoutes } from './routes/tts';
import { wordRoutes } from './routes/words';
import { sceneRoutes } from './routes/scenes';
import { pathRoutes } from './routes/path';
import { practiceClassRoutes } from './routes/practice-class';
import { intakeRoutes } from './routes/intake';
import { learnPathRoutes } from './routes/learn-path';
import { sceneWordRoutes } from './routes/scene-words';
import { expertTermRoutes } from './routes/expert-terms';

const router = new Router<ArabicEnv>();

router.get('/health', async (_req, env) =>
  ok({ domain: 'arabic', db: 'DB_AR', db_ok: await dbHealth(env.DB_AR) }),
);

// The gateway forwards /api/<module>/… with the module segment intact, so a
// worker only ever sees a prefixed path. Bare /health is reachable over the
// service binding but 404s from outside; this alias is the public one.
router.get('/ar/health', async (_req, env) =>
  ok({ domain: 'arabic', db: 'DB_AR', db_ok: await dbHealth(env.DB_AR) }),
);

// Literal-prefix routes first: the router is first-match-wins, and a
// ':id' pattern registered earlier would swallow them.
audioRoutes(router);
vendorAudioRoutes(router);
acquisitionRoutes(router);
bookcaseRoutes(router);   // before textRoutes: /ar/text/bookcase is a literal
textRoutes(router);
readingRoutes(router);

containerRoutes(router);
libraryRoutes(router);
curriculumRoutes(router);
lessonRoutes(router);
vocabularyRoutes(router);
grammarCitationRoutes(router);
grammarPathRoutes(router);   // before grammarRoutes: /ar/grammar/:id would take /ar/grammar/path
grammarRoutes(router);
exerciseRoutes(router);
dailyRoutes(router);
roomRoutes(router);
practiceRoutes(router);
practiceClassRoutes(router);
drillSourceRoutes(router);
ttsRoutes(router);
wordRoutes(router);
sceneWordRoutes(router);   // before sceneRoutes: /ar/scenes/:unit/:no would not take …/words, but keep it plain
sceneRoutes(router);
pathRoutes(router);
intakeRoutes(router);
learnPathRoutes(router);
expertTermRoutes(router);

// The version beacon the app checks at launch and on return: never kept.
router.get('/ar/corpus-version', async (_req, env) => {
  const families = await familyVersionsNow(env.DB_AR, FAMILIES);
  const res = ok({ version: families.content, families });
  res.headers.set('Cache-Control', 'max-age=30');
  return res;
});

// ── Which reads are kept, and for how long (shared/src/swr.ts) ────────────────
// The public side of Arabic — the curriculum, lessons, texts, the library, the
// acquisition shelf, the daily themes — is the same for every reader, so it is
// kept a month, keyed on the content version (cache-families.ts): a write to
// any content table moves it, and the next read rebuilds. The learner's own
// side (today, progress, reading state, SRS) and the audio streams are never
// kept.
const CONTENT = { fresh: 30 * 86400, stale: 90 * 86400, family: 'content' };
const KEPT: SwrRoute[] = [
  { re: /^\/ar\/(acq|text|sources|disciplines|curriculum|nodes|tracks|terms|lessons)(\/|$)/, ...CONTENT },
  // the rooms and the skill list (not /ar/atlas/continue — the reader's own — nor a practice session, drawn fresh)
  { re: /^\/ar\/atlas\/(home|room|collection|search)$/, ...CONTENT },
  { re: /^\/ar\/practice\/home$/, ...CONTENT },
  // the class: what an episode's lesson is, the same for every reader and drawn seeded, so kept as content
  { re: /^\/ar\/practice\/class\//, ...CONTENT },
  // the scripted scenes and a scene's words (not a scene's practice round, drawn fresh)
  { re: /^\/ar\/scenes(\/[^/]+(\/\d+(\/words)?)?)?$/, ...CONTENT },
  { re: /^\/ar\/daily\/(themes|domains)(\/|$)/, ...CONTENT },
];

export default {
  fetch: (request: Request, env: ArabicEnv, ctx: ExecutionContext) =>
    withSwr(request, ctx, KEPT, (r) => router.handle(r, env), { tag: 'x-ar-cache', db: env.DB_AR, families: FAMILIES }),
} satisfies ExportedHandler<ArabicEnv>;
