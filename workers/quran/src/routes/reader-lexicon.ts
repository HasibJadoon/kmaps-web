import { cached } from '../../../shared/src/cache';
import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import type { QuranEnv } from '../env';
import { lexiconLemma, lexiconRoot } from './practice-sarf';
import { lemmaReaderDoc, rootReaderDoc } from '../reader-lexicon';

// The lexicon's root and lemma pages in the app's one reader (owner, 2026-11-18): the same data the Forms & words
// pages read (/qr/lexicon/root, /qr/lexicon/lemma), written out as reader documents; a root page also names every
// dictionary that files the root (the AL worker's overview, keyed as each book files it), each a door into its entry.
/// The reader pages' shape: bump it when what they carry changes.
const READER_V = '2026-11-18c';

export function readerLexiconRoutes(router: Router<QuranEnv>) {
  // the page's shape is part of the cache key, so a new shape is never served from an older answer
  const shaped = (req: Request) => { const u = new URL(req.url); u.searchParams.set('v', READER_V); return new Request(u.toString(), req); };
  router.get('/qr/reader/root/:root', (req, env, params) => cached(shaped(req), async () => {
    const root = decodeURIComponent(params.root ?? '').trim();
    type Overview = { sources: Array<{ source_slug: string; title_ar?: string; title_short_ar?: string; author?: string;
      author_death_ah?: number | null; sections?: number; root_norm?: string; found_under?: string; isUnbuilt?: boolean }> };
    type Book = { slug: string; title: string; key: string; author?: string | null; death?: number | null };
    // the page and the dictionaries that file the root are independent: fetched together, not one after the other
    const booksOf = async (): Promise<Book[]> => {
      if (!env.AR_LINGUISTICS) return [];
      const r = await env.AR_LINGUISTICS.fetch(`https://al/al/lex/v2/roots/${encodeURIComponent(root)}`).catch(() => null);
      const d = r?.ok ? ((await r.json()) as { data: Overview }).data : null;
      return (d?.sources ?? []).filter((s) => (s.sections ?? 1) > 0).map((s) => ({
        slug: s.source_slug, title: s.title_short_ar ?? s.title_ar ?? s.source_slug, key: s.found_under ?? s.root_norm ?? root,
        author: s.author ?? null, death: s.author_death_ah ?? null,
      }));
    };
    const [page, books] = await Promise.all([lexiconRoot(env, root, false), booksOf()]);
    if (!page) return notFound(`root ${root}`);
    return ok(rootReaderDoc(page, books));
  }, { browser: 60, edge: 3600 }));

  router.get('/qr/reader/lemma/:id', (req, env, params) => cached(shaped(req), async () => {
    const id = decodeURIComponent(params.id ?? '').trim();
    const page = await lexiconLemma(env, id, false);
    return page ? ok(lemmaReaderDoc(page)) : notFound(`lemma ${id}`);
  }, { browser: 60, edge: 3600 }));
}
