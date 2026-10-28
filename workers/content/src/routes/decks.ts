import type { Router } from '../../../shared/src/router';
import { notFound, ok } from '../../../shared/src/response';
import type { ContentEnv } from '../env';
import { DeckRepo } from '../repositories/deck.repo';

// Slide decks. A deck is authored content, so it lives in CM like every other
// document; the renderer on each client switches on slide.layout and shapes
// nothing itself. See docs/deck-contract.md.

export function deckRoutes(router: Router<ContentEnv>) {
  router.get('/cm/decks', async (req, env) => {
    const url = new URL(req.url);
    const repo = new DeckRepo(env.DB_CM);
    return ok(
      await repo.list({
        domain: url.searchParams.get('domain') ?? undefined,
        subdomain: url.searchParams.get('subdomain') ?? undefined,
        q: url.searchParams.get('q') ?? undefined,
      }),
    );
  });

  // Declared before /cm/decks/:slug so the literal wins over the parameter.
  router.get('/cm/decks/folders', async (_req, env) => {
    return ok(await new DeckRepo(env.DB_CM).folders());
  });

  router.get('/cm/decks/:slug', async (_req, env, params) => {
    const deck = await new DeckRepo(env.DB_CM).find(params.slug);
    if (!deck) return notFound(`deck ${params.slug}`);
    return ok(deck);
  });
}
