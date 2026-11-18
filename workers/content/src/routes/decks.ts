import { cached } from '../../../shared/src/cache';
import type { Router } from '../../../shared/src/router';
import { notFound, ok } from '../../../shared/src/response';
import type { ContentEnv } from '../env';
import { DeckRepo } from '../repositories/deck.repo';

// Slide decks. A deck is authored content, so it lives in CM like every other
// document; the renderer on each client switches on slide.layout and shapes
// nothing itself. See docs/deck-contract.md.

/// The list's shape: bump it when what a deck summary carries changes, so no older answer is served from the edge.
const LIST_SHAPE = '2026-11-18-term';

export function deckRoutes(router: Router<ContentEnv>) {
  router.get('/cm/decks', async (req, env) => {
    const url = new URL(req.url);
    const repo = new DeckRepo(env.DB_CM);
    // a search finds by root first, through AL's root table: the roots the words can mean
    const rootsOf = env.AR_LINGUISTICS
      ? async (q: string) => {
          const res = await env.AR_LINGUISTICS!.fetch(`https://al/al/lookup/roots?q=${encodeURIComponent(q)}`).catch(() => null);
          if (!res?.ok) return null;
          return ((await res.json()) as { data?: { roots?: Array<{ id: string; root: string }> } }).data?.roots ?? [];
        }
      : undefined;
    // The list and every search, kept at the edge for a day under the decks' version (their latest change and count):
    // a deck published or edited changes the key, so nothing stale is served; the version is the one query asked.
    const keyed = new URL(req.url);
    keyed.searchParams.set('v', await repo.version());
    keyed.searchParams.set('shape', LIST_SHAPE);
    return cached(new Request(keyed.toString(), req), async () => ok(
      await repo.list({
        domain: url.searchParams.get('domain') ?? undefined,
        subdomain: url.searchParams.get('subdomain') ?? undefined,
        q: url.searchParams.get('q') ?? undefined,
        root: url.searchParams.get('root') ?? undefined,
        in: url.searchParams.get('in') ?? undefined,
      }, rootsOf),
    ), { browser: 300, edge: 86400 });
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
