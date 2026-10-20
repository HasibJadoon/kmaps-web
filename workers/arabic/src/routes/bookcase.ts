import type { Router } from '../../../shared/src/router';
import { ok, notFound, unauthorized } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import { actorRef } from '../../../shared/src/auth';
import type { ArabicEnv } from '../env';
import { shelfRows, template, type ShelfRow } from './text';
import { labels, byKey, type Label } from '../lib/labels';
import { BANDS, parseBand, inBand, levelSpan, type Band } from '../lib/levels';

/// The bookcase: the reading shelf, set out ready to draw.
///
/// The app used to fetch every readable work (over a thousand, ~630 KB) and
/// build the shelves itself, with each shelf's icon and colour written into the
/// screen. Now the worker builds them: the shelves come with their first books
/// only, a shelf or a group under it is asked for when it is opened, and the
/// look of each shelf is a row of ar_practice_label (scope 'shelf'), so a new
/// shelf needs no release.
///
/// Two halves. The library (/ar/text/bookcase…) is the same for every reader
/// and is kept. The reader's own shelves — where they are, what they kept,
/// loved, finished — are theirs (/ar/reading/shelves) and never kept.

/// One thing on a shelf: a work you can open, or a group (a series, a sūra's
/// sessions, a band of the classics) that opens to its own shelf.
interface Entry {
  id: string;
  kind: 'work' | 'group';
  titleAr: string | null;
  titleEn: string | null;
  author: string | null;
  died: string | null;
  level: string | null;
  shape: string | null;
  icon: string;
  color: string;
  pages: number;
  /// works under a group (1 for a work)
  count: number;
  hasAudio: boolean;
  hasVideo: boolean;
  firstSeq: number | null;
  /// a group's first titles, for its cover
  preview: string[];
  /// the reader's own: how far through (0–1) and the page they are on
  progress?: number | null;
  atSeq?: number | null;
  marks?: number | null;
}

interface Shelf {
  id: string;
  titleAr: string;
  titleEn: string | null;
  icon: string;
  color: string;
  count: number;
  pages: number;
  levelSpan: string | null;
  items: Entry[];
  /// more items than this answer carries: open the shelf for them all
  more: boolean;
}

interface Node {
  id: string; name: string; nameEn: string | null; icon: string; color: string;
  children: Node[]; work: ShelfRow | null;
}

const GOLD = '#C9A84C';
/// How many books a shelf shows before "see all".
const FIRST = 12;

const pagesOf = (n: Node): number => (n.work?.pages ?? 0) + n.children.reduce((s, c) => s + pagesOf(c), 0);
const countOf = (n: Node): number => (n.work ? 1 : n.children.reduce((s, c) => s + countOf(c), 0));
const worksOf = (n: Node): ShelfRow[] => (n.work ? [n.work] : n.children.flatMap(worksOf));
const year = (w: ShelfRow) => {
  const n = parseInt(String(w.died ?? '').replace('ت ', '').trim(), 10);
  return Number.isFinite(n) ? n : 9999;
};

/// A shelf's or a shape's look, from its label row, else the shelf default.
function look(L: Map<string, Label>, key: string, fallback?: { icon?: string; color?: string }) {
  const l = L.get(key);
  return {
    titleEn: l?.label ?? null, titleAr: l?.labelAr ?? null,
    icon: l?.icon ?? fallback?.icon ?? 'books.vertical',
    color: l?.color ?? fallback?.color ?? GOLD,
    sort: l ? 1 : 0,
  };
}

/// The series' episodes have their own room (Series) and their own path; the
/// library is everything else. (The incomplete Notion import is archived —
/// migration 0070 — so what is live is what was worked through.)
export const inLibrary = (w: ShelfRow) => (w.shape ?? 'prose') !== 'series';

/// The library: one shelf per kind (Stories, the Nights, the Maqāmāt, the
/// Proverbs, the Dīwāns, Songs …) in the order a reader climbs them — the
/// labels' own order — each shelf oldest author first.
function build(rows: ShelfRow[], L: Map<string, Label>): Node[] {
  const shapeLook = (shape: string | null) => look(L, `shape:${shape ?? 'prose'}`, { icon: 'book.closed' });
  const classical = rows.filter(inLibrary).sort((a, b) => year(a) - year(b));
  const shapes = [...L.values()].filter((l) => l.key.startsWith('shape:')).map((l) => l.key.slice(6));
  const order = [...new Set([...shapes, ...classical.map((w) => w.shape ?? 'prose')])];
  const out: Node[] = [];
  for (const shape of order) {
    const items = classical.filter((w) => (w.shape ?? 'prose') === shape);
    if (!items.length) continue;
    const s = shapeLook(shape);
    out.push({
      id: `turath:${shape}`, name: s.titleAr ?? shape, nameEn: s.titleEn, icon: s.icon, color: s.color, work: null,
      children: items.map((w) => ({ id: w.id, name: w.title_ar ?? w.title_en ?? w.id, nameEn: w.title_en,
                                    icon: s.icon, color: s.color, children: [], work: w })),
    });
  }
  return out;
}

function entry(n: Node): Entry {
  const ws = worksOf(n);
  const w = n.work;
  return {
    id: n.id, kind: w ? 'work' : 'group',
    titleAr: w ? (w.title_ar ?? null) : n.name, titleEn: w ? w.title_en : n.nameEn,
    author: w?.author ?? null, died: w?.died ?? null,
    level: w ? (w.level ?? null) : levelSpan(ws.map((x) => x.level)),
    shape: w?.shape ?? null, icon: n.icon, color: n.color,
    pages: pagesOf(n), count: countOf(n),
    hasAudio: ws.some((x) => !!x.audioKey), hasVideo: ws.some((x) => !!x.videoId),
    firstSeq: w?.firstSeq ?? null,
    preview: w ? [] : ws.slice(0, 3).map((x) => x.title_ar ?? x.title_en ?? '').filter(Boolean),
  };
}

function shelf(n: Node, all = false): Shelf {
  const items = n.children.length ? n.children : (n.work ? [n] : []);
  return {
    id: n.id, titleAr: n.name, titleEn: n.nameEn, icon: n.icon, color: n.color,
    count: countOf(n), pages: pagesOf(n), levelSpan: levelSpan(worksOf(n).map((w) => w.level)),
    items: (all ? items : items.slice(0, FIRST)).map(entry),
    more: !all && items.length > FIRST,
  };
}

function find(nodes: Node[], id: string, trail: Node[] = []): { node: Node; trail: Node[] } | null {
  for (const n of nodes) {
    if (n.id === id) return { node: n, trail };
    const hit = find(n.children, id, [...trail, n]);
    if (hit) return hit;
  }
  return null;
}

/// The library for a level band, and with recordings only when asked. Built
/// once a minute per isolate per filter; the responses are kept besides.
let memo: { at: number; key: string; tree: Node[] }[] = [];
async function library(env: ArabicEnv, band: Band, audio: boolean) {
  const key = `${band}|${audio}`;
  const hit = memo.find((m) => m.key === key && Date.now() - m.at < 60_000);
  if (hit) return hit.tree;
  const [rows, all] = await Promise.all([shelfRows(env), labels(env)]);
  const kept = rows.filter((w) => inBand(band, w.level) && (!audio || !!w.audioKey || !!w.videoId));
  const tree = build(kept, byKey(all.shelf));
  memo = [...memo.filter((m) => m.key !== key).slice(-5), { at: Date.now(), key, tree }];
  return tree;
}

/// What the filter bar offers: the level bands (the home's), each with how
/// many works it holds.
function filters(rows: number, band: Band, audio: boolean) {
  return {
    level: band, audio,
    levels: [{ key: 'all', label: 'All', labelAr: 'الكلّ', range: null },
             ...BANDS.map((b) => ({ key: b.key, label: b.label, labelAr: b.labelAr, range: b.range }))],
    works: rows,
  };
}

export function bookcaseRoutes(router: Router<ArabicEnv>) {
  /// The bookcase: every shelf with its first books.
  router.get('/ar/text/bookcase', async (req, env) => {
    const url = new URL(req.url);
    const band = parseBand(url.searchParams.get('level'));
    const audio = url.searchParams.get('audio') === '1';
    const tree = await library(env, band, audio);
    return ok({
      filter: filters(tree.reduce((s, n) => s + countOf(n), 0), band, audio),
      shelves: tree.map((n) => shelf(n)),
    });
  });

  /// One shelf, or one group on it, whole — and the way back up to it.
  router.get('/ar/text/bookcase/shelf', async (req, env) => {
    const url = new URL(req.url);
    const id = url.searchParams.get('id') ?? '';
    const band = parseBand(url.searchParams.get('level'));
    const audio = url.searchParams.get('audio') === '1';
    const hit = find(await library(env, band, audio), id);
    if (!hit) return notFound(`shelf ${id}`);
    return ok({
      shelf: shelf(hit.node, true),
      trail: hit.trail.map((n) => ({ id: n.id, titleAr: n.name, titleEn: n.nameEn })),
    });
  });

  /// A book's profile: what it is before it is opened — the author and their
  /// era, its kind and the template its pages are set in, its level and length,
  /// whether it can be heard, how it opens, and its contents.
  router.get('/ar/text/works/:id/profile', async (_req, env, params) => {
    const id = decodeURIComponent(params.id);
    const [rows, all] = await Promise.all([shelfRows(env, { ids: [id] }), labels(env)]);
    const w = rows[0];
    if (!w) return notFound(`work ${id}`);
    const extra = await queryOne<{ page_template: string | null; subtitle_ar: string | null; register: string | null;
                                   minutes: number | null; recordings: number }>(env.DB_AR,
      `SELECT r.page_template, r.subtitle_ar, r.register,
              (SELECT CAST(ROUND(SUM(a.duration_sec) / 60.0) AS INTEGER) FROM ar_acq_audio a
                WHERE a.acq_ref_id = r.id AND a.status = 'live') AS minutes,
              (SELECT COUNT(*) FROM ar_acq_audio a WHERE a.acq_ref_id = r.id AND a.status = 'live') AS recordings
         FROM ar_acquisition_ref r WHERE r.id = ?`, [id]);
    const kind = look(byKey(all.shelf), `shape:${w.shape ?? 'prose'}`, { icon: 'book.closed' });
    const [toc, first] = await Promise.all([
      query<{ seq: number; title_ar: string }>(env.DB_AR,
        `SELECT seq, title_ar FROM ar_text_unit
          WHERE acq_ref_id = ? AND status = 'live' AND title_ar IS NOT NULL AND title_ar <> ''
          ORDER BY seq LIMIT 60`, [id]),
      queryOne<{ text_ar: string }>(env.DB_AR,
        `SELECT text_ar FROM ar_text_unit WHERE acq_ref_id = ? AND status = 'live' AND seq >= ?
          ORDER BY seq LIMIT 1`, [id, w.firstSeq ?? 1]),
    ]);
    return ok({
      work: {
        id: w.id, titleAr: w.title_ar, titleEn: w.title_en, author: w.author, died: w.died, era: eraOf(w.died),
        level: w.level, register: extra?.register ?? w.register, subtitle: extra?.subtitle_ar ?? null,
        shape: w.shape, kind: { titleAr: kind.titleAr, titleEn: kind.titleEn, icon: kind.icon, color: kind.color },
        pages: w.pages, words: w.words, firstSeq: w.firstSeq, lastSeq: w.lastSeq,
        audio: extra && extra.recordings > 0 ? { recordings: extra.recordings, minutes: extra.minutes } : null,
        hasVideo: !!w.videoId, seriesRef: w.seriesRef,
      },
      template: template(extra?.page_template ?? null, byKey(all.page_template)),
      opening: opening(first?.text_ar ?? ''),
      contents: toc.map((t) => ({ seq: t.seq, titleAr: t.title_ar })),
    });
  });

  /// The reader's own shelves: where they are, what they kept, loved and
  /// finished — from their reading state (the copy every device syncs to).
  router.get('/ar/reading/shelves', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Sign in to see your shelves');
    const states = await query<{ work_id: string; status: string; progress_seq: number | null; favourite: number;
                                 bookmarks_json: string }>(env.DB_AR,
      `SELECT work_id, status, progress_seq, favourite, bookmarks_json
         FROM ar_reading_state WHERE user_id = ? ORDER BY updated_at DESC LIMIT 200`, [user]);
    const [rows, all] = await Promise.all([shelfRows(env, { ids: states.map((s) => s.work_id) }), labels(env)]);
    const L = byKey(all.shelf);
    const byId = new Map(rows.map((w) => [w.id, w]));
    const marks = (j: string) => { try { return (JSON.parse(j) as unknown[]).length; } catch { return 0; } };

    const card = (s: typeof states[number]): Entry | null => {
      const w = byId.get(s.work_id);
      if (!w) return null;
      const look_ = look(L, `shape:${w.shape ?? 'prose'}`, { icon: 'book.closed' });
      const first = w.firstSeq ?? 1, last = w.lastSeq ?? first;
      const at = s.progress_seq ?? null;
      const progress = s.status === 'read' ? 1
        : at && last > first ? Math.max(0, Math.min(1, (at - first) / (last - first))) : null;
      return {
        id: w.id, kind: 'work', titleAr: w.title_ar, titleEn: w.title_en, author: w.author, died: w.died,
        level: w.level, shape: w.shape, icon: look_.icon, color: look_.color, pages: w.pages, count: 1,
        hasAudio: !!w.audioKey, hasVideo: !!w.videoId, firstSeq: w.firstSeq, preview: [],
        progress, atSeq: at, marks: marks(s.bookmarks_json),
      };
    };
    const mine = (key: string, ar: string, en: string, icon: string, pick: (s: typeof states[number]) => boolean): Shelf | null => {
      const items = states.filter(pick).map(card).filter((e): e is Entry => !!e);
      if (!items.length) return null;
      const l = look(L, key, { icon });
      return { id: key, titleAr: l.titleAr ?? ar, titleEn: l.titleEn ?? en, icon: l.icon, color: l.color,
               count: items.length, pages: items.reduce((s, e) => s + e.pages, 0),
               levelSpan: levelSpan(items.map((e) => e.level)), items, more: false };
    };
    const shelves = [
      mine('mine:continue', 'قيد القراءة', 'Continue reading', 'book',
           (s) => s.status !== 'read' && (s.progress_seq ?? 0) > (byId.get(s.work_id)?.firstSeq ?? 1)),
      mine('mine:kept', 'العلامات', 'Bookmarked', 'bookmark', (s) => marks(s.bookmarks_json) > 0),
      mine('mine:loved', 'مكتبتي', 'My shelf', 'heart', (s) => !!s.favourite),
      mine('mine:finished', 'المقروءة', 'Finished', 'checkmark.seal', (s) => s.status === 'read'),
    ].filter((x): x is Shelf => !!x);
    return ok({ shelves });
  });
}

/// "ت 255" → "3rd century AH"; a negative year is before the Hijra.
function eraOf(died: string | null): { year: string; century: string } | null {
  const n = parseInt(String(died ?? '').replace('ت', '').trim(), 10);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return { year: `${-n} BH`, century: 'Pre-Islamic' };
  const c = Math.floor(n / 100) + 1;
  const th = c % 100 >= 11 && c % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[c % 10] ?? 'th';
  return { year: `d. ${n} AH`, century: `${c}${th} century AH` };
}

/// How the book opens: its first lines of text, past the basmala and the
/// edition's furniture — enough to hear its voice before opening it.
function opening(text: string): string[] {
  const lines = text.split(/[\r\n]+/).map((l) => l.replace(/\*+/g, '').trim())
    .filter((l) => l && l !== '﷽' && !/^[\[(（][^\])）]{0,14}[\])）]$/.test(l)   // [١], [من الكامل]
                && !l.startsWith('بسم الله') && !l.endsWith(':') && l.length > 12);  // the basmala, «قال فلان:», a meter's name
  const out: string[] = [];
  let chars = 0;
  for (const l of lines) {
    out.push(l.length > 160 ? l.slice(0, 157) + '…' : l);
    chars += l.length;
    if (out.length >= 4 || chars > 260) break;
  }
  return out;
}
