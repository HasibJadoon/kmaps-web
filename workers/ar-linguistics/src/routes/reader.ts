import type { Router } from '../../../shared/src/router';
import { notFound, ok } from '../../../shared/src/response';
import { cached } from '../../../shared/src/cache';
import type { ArLinguisticsEnv } from '../env';
import { gramWindow } from './grammar';
import { lexEntryResponse } from './lexicon_v2';
import { arabicNum, gramPagesMarkdown, lexEntryMarkdown, lexHeaderMarkdown, type LexEntryPayload, type ReaderAddress, type ReaderDocument } from '../reader';

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

  // GET /al/reader/entry/:source/:root — a dictionary's article on a root, in the one reader: its sections as bands
  // with their printed pages, English/Urdu as lanes, footnotes, shawāhid, Qurʾān citations and corrections; the same
  // root in every other dictionary as its siblings (keyed as each book files it); the roots either side in this book as
  // prev/next; search over this book's roots.
  router.get('/al/reader/entry/:source/:root', (req, env, params) => cached(req, async () => {
    const source = params.source!, requested = params.root!;
    const res = await lexEntryResponse(env, source, requested);
    if (!res.ok) return res;
    const p = ((await res.json()) as { data: LexEntryPayload }).data;
    const root = p.entry.root_norm ?? requested;
    const { body: article, lanes } = lexEntryMarkdown(p);
    // the book's own header on this root, when it has one (11 entries so far), above the article
    const ds = await env.DB_AL.prepare(
      `SELECT d.root_entry_id, d.ds_json FROM ar_ling_lexicon_entry_ds d JOIN ar_ling_lexicon_entry e ON e.id = d.root_entry_id
        WHERE e.root_norm = ? AND e.source_slug = ?`,
    ).bind(root, source).first<{ root_entry_id: string; ds_json: string | null }>();
    let header = '';
    if (ds) {
      let layout = {};
      try { layout = JSON.parse(ds.ds_json ?? '{}'); } catch { layout = {}; }
      const rows = (await env.DB_AL.prepare(
        `SELECT id, parent_block_id, title_ar, text_plain, data_json FROM ar_ling_lexicon_block
          WHERE root_entry_id = ? AND origin = 'derived' ORDER BY block_seq`,
      ).bind(ds.root_entry_id).all<{ id: string; parent_block_id: string | null; title_ar: string | null; text_plain: string | null; data_json: string | null }>()).results ?? [];
      header = lexHeaderMarkdown(layout, rows);
      if (/\n@en /.test(header) && !lanes.includes('en')) lanes.push('en');
      if (/\n@ur /.test(header) && !lanes.includes('ur')) lanes.push('ur');
    }
    const body = [header, article].filter(Boolean).join('\n\n');
    const entryAddr = (title: string, slug: string, key: string): ReaderAddress =>
      ({ title, module: 'al', path: `reader/entry/${encodeURIComponent(slug)}/${encodeURIComponent(key)}` });

    // every dictionary that files this root, under the key that book uses, oldest first
    const sib = (await env.DB_AL.prepare(
      `SELECT v.source_slug, MIN(v.key_rank) AS rank, v.found_under, s.title_ar, s.title_short_ar, s.author_death_ah
         FROM ar_ling_root_lexicon_entry_v v JOIN ar_ling_source s ON s.slug = v.source_slug
        WHERE v.root_norm = ? GROUP BY v.source_slug ORDER BY COALESCE(s.author_death_ah, 9999)`,
    ).bind(root).all<{ source_slug: string; found_under: string; title_ar: string; title_short_ar: string | null; author_death_ah: number | null }>()).results ?? [];

    // the roots either side in this book's index
    const side = async (cmp: '<' | '>', order: 'DESC' | 'ASC') => env.DB_AL.prepare(
      `SELECT root_norm, root_text FROM ar_ling_lexicon_entry WHERE source_slug = ? AND root_norm ${cmp} ? ORDER BY root_norm ${order} LIMIT 1`,
    ).bind(source, root).first<{ root_norm: string; root_text: string | null }>();
    const [pr, nx] = await Promise.all([side('<', 'DESC'), side('>', 'ASC')]);

    const book = p.meta.title_ar ?? source;
    const pages = p.entry.page_start != null
      ? `ص ${arabicNum(p.entry.page_start)}${p.entry.page_end && p.entry.page_end !== p.entry.page_start ? `–${arabicNum(p.entry.page_end)}` : ''}` : null;
    const doc: ReaderDocument = {
      docId: `AL:ENTRY:${source}:${root}`,
      title: p.entry.root_text ?? root,
      kicker: 'Dictionary',
      kickerAr: p.meta.title_short_ar ?? book,
      badge: pages,
      facts: [book, p.meta.author, p.meta.author_death_ah ? `ت ${arabicNum(p.meta.author_death_ah)}هـ` : null].filter((x): x is string => !!x),
      body: body || 'لم يُبنَ هذا المدخل بعد.',
      lanes,
      siblings: sib.map((r) => entryAddr(r.title_short_ar ?? r.title_ar, r.source_slug, r.found_under)),
      siblingsLabel: 'In every dictionary',
      prev: pr ? entryAddr(pr.root_text ?? pr.root_norm, source, pr.root_norm) : null,
      next: nx ? entryAddr(nx.root_text ?? nx.root_norm, source, nx.root_norm) : null,
      search: { title: `Roots in ${p.meta.title_short_ar ?? book}`, module: 'al', path: `reader/search/roots/${encodeURIComponent(source)}` },
      cite: [book, p.meta.author].filter(Boolean).join(' · '),
      marks: { ref: `ALL:${source}:${root}`, domain: 'lexicon' },
    };
    return ok(doc);
  }));

  // GET /al/reader/search/roots/:source?q= — the roots of one dictionary that begin with q, each opening its entry.
  router.get('/al/reader/search/roots/:source', async (req, env, params) => {
    const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
    if (!q) return ok({ hits: [] });
    const rows = (await env.DB_AL.prepare(
      `SELECT root_norm, root_text, page_start FROM ar_ling_lexicon_entry WHERE source_slug = ? AND root_norm LIKE ? ORDER BY root_norm LIMIT 60`,
    ).bind(params.source, q + '%').all<{ root_norm: string; root_text: string | null; page_start: number | null }>()).results ?? [];
    return ok({ hits: rows.map((r) => ({
      title: r.root_text ?? r.root_norm,
      snippet: r.page_start != null ? `ص ${arabicNum(r.page_start)}` : null,
      address: { title: r.root_text ?? r.root_norm, module: 'al', path: `reader/entry/${encodeURIComponent(params.source!)}/${encodeURIComponent(r.root_norm)}` },
    })) });
  });
}
