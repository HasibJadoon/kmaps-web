import type { Router } from '../../../shared/src/router';
import { notFound, ok } from '../../../shared/src/response';
import { cached } from '../../../shared/src/cache';
import type { ArLinguisticsEnv } from '../env';
import { gramWindow } from './grammar';
import { arabicNum, gramPagesMarkdown, type ReaderAddress, type ReaderDocument } from '../reader';

const PAGES = 12;

// GET /al/reader/book/:slug?bab=&page= — a grammar book (or one باب of it) as the app's one reader reads it: a window
// of printed pages with their folios and footnotes, the next window as `more`, the book's top-level abwāb as its
// contents (each opening its own window), the abwāb either side as prev/next, copy citing the book and its author.
export function alReaderRoutes(router: Router<ArLinguisticsEnv>): void {
  router.get('/al/reader/book/:slug', (req, env, params) => cached(req, async () => {
    const url = new URL(req.url);
    const slug = params.slug!;
    const bab = url.searchParams.get('bab');
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const book = await env.DB_AL.prepare(
      `SELECT s.slug, s.title_ar, s.title_en, s.author_name, s.author_en, s.author_death_ah, e.edition_label
         FROM ar_ling_source s LEFT JOIN ar_ling_source_edition e ON e.source_id = s.id
        WHERE s.slug = ? LIMIT 1`,
    ).bind(slug).first<{ slug: string; title_ar: string; title_en: string | null; author_name: string | null;
                         author_en: string | null; author_death_ah: number | null; edition_label: string | null }>();
    if (!book) return notFound(`book ${slug}`);

    const win = await gramWindow(env, slug, bab, page, PAGES);
    const here = bab ? await env.DB_AL.prepare(
      `SELECT id, title_ar, matn_order FROM ar_ling_gram_bab WHERE id = ? AND source_slug = ?`,
    ).bind(bab, slug).first<{ id: string; title_ar: string; matn_order: number }>() : null;

    const address = (title: string, q: string): ReaderAddress =>
      ({ title, module: 'al', path: `reader/book/${encodeURIComponent(slug)}${q}` });
    const babQ = bab ? `bab=${encodeURIComponent(bab)}&` : '';

    // the abwāb either side of this one (a whole-book reading has none: it runs on by `more`)
    let prev: ReaderAddress | null = null, next: ReaderAddress | null = null;
    if (here) {
      const side = async (cmp: '<' | '>', order: 'DESC' | 'ASC') => env.DB_AL.prepare(
        `SELECT id, title_ar FROM ar_ling_gram_bab WHERE source_slug = ? AND matn_order ${cmp} ? ORDER BY matn_order ${order} LIMIT 1`,
      ).bind(slug, here.matn_order).first<{ id: string; title_ar: string }>();
      const p = await side('<', 'DESC'), n = await side('>', 'ASC');
      if (p) prev = address(p.title_ar, `?bab=${encodeURIComponent(p.id)}`);
      if (n) next = address(n.title_ar, `?bab=${encodeURIComponent(n.id)}`);
    }

    const tops = (await env.DB_AL.prepare(
      `SELECT id, title_ar FROM ar_ling_gram_bab WHERE source_slug = ? AND depth = 0 ORDER BY matn_order LIMIT 400`,
    ).bind(slug).all<{ id: string; title_ar: string }>()).results ?? [];

    const author = book.author_name ?? book.author_en;
    const doc: ReaderDocument = {
      docId: `AL:BOOK:${slug}${bab ? `:${bab}` : ''}:${page}`,
      title: here?.title_ar ?? book.title_ar,
      kicker: 'Grammar book',
      kickerAr: here ? book.title_ar : null,
      badge: win.total ? `${arabicNum(win.total)} صفحة` : null,
      facts: [author, book.author_death_ah ? `ت ${arabicNum(book.author_death_ah)}هـ` : null, book.edition_label]
        .filter((x): x is string => !!x),
      body: gramPagesMarkdown(win.pages) || 'ليس في هذا الموضع نصّ بعد.',
      more: win.has_more ? address('', `?${babQ}page=${page + 1}`) : null,
      prev, next,
      contents: tops.map((t) => ({ title: t.title_ar, level: 1, address: address(t.title_ar, `?bab=${encodeURIComponent(t.id)}`) })),
      cite: [book.title_ar, author].filter(Boolean).join(' · '),
      // notes on a page file under the book and the page's anchor (cm_notes, domain linguistics)
      marks: { ref: `ALB:${slug}`, domain: 'linguistics' },
    };
    return ok(doc);
  }));
}
