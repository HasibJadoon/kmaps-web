import type { Router } from '../../../shared/src/router';
import { ok, notFound, unauthorized } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import { actorRef } from '../../../shared/src/auth';
import type { ArabicEnv } from '../env';
import { ANCESTRY } from '../lib/ancestry';
import { BANDS, bandOf, inBand, levelSpan, parseBand, bare, type Band } from '../lib/levels';

// ── The Arabic home, as rooms ────────────────────────────────────────────────
// Like the Worldview Atlas: a home of rooms, a room of collections (a series,
// a podcast, a poet) or of works, a collection of works — each screen asks for
// its own slice. Every readable work goes to one room by the rules in ar_room
// (its series first, then its shape, then its genre; the fallback room takes
// the rest). The level (?level=basic|middle|advanced) filters every slice.
// A work carries what the reader needs to open it: id, shape, first page.

interface Work {
  id: string; titleAr: string | null; titleEn: string | null; author: string | null; died: string | null;
  genreRef: string | null; register: string | null; level: string | null; shape: string | null;
  verseForm: string | null; pages: number; words: number | null; firstSeq: number | null;
  audioKey: string | null; series: string | null; seriesRef: string | null; seriesParent: string | null;
  episodeOrder: number | null; videoId: string | null; episode: number | null;
}
interface RoomRow {
  id: string; title_en: string; title_ar: string; tagline: string | null; color: string; icon: string;
  layout: string; sort_order: number; rules_json: string;
}
interface Rules { series?: string[]; shapes?: string[]; genres?: string[]; fallback?: boolean }

async function loadWorks(env: ArabicEnv): Promise<Work[]> {
  return query<Work>(env.DB_AR,
    `${ANCESTRY}
     SELECT r.id, r.title_ar AS titleAr, r.title_en AS titleEn, r.author, r.note_ar AS died,
            r.genre_ref AS genreRef, r.register, r.level,
            json_extract(r.meta_json, '$.shape') AS shape, r.verse_form AS verseForm,
            COUNT(t.id) AS pages, SUM(t.word_count) AS words,
            COALESCE(json_extract(r.meta_json, '$.open_at'), MIN(t.seq)) AS firstSeq,
            (SELECT a.object_key FROM ar_acq_audio a
              WHERE a.status = 'live' AND (a.acq_ref_id = r.id OR a.title_ar = r.title_ar)
              ORDER BY (a.acq_ref_id = r.id) DESC LIMIT 1) AS audioKey,
            COALESCE(pc.name_ar, p.name) AS series, p.ar_no AS seriesRef,
            COALESCE(gpc.name_ar, gp.name) AS seriesParent,
            CAST(substr(e.ar_no, 4) AS INTEGER) AS episodeOrder,
            json_extract(r.meta_json, '$.video.id') AS videoId,
            json_extract(r.meta_json, '$.episode') AS episode
       FROM ar_acquisition_ref r
       JOIN ar_text_unit t ON t.acq_ref_id = r.id AND t.status = 'live'
       LEFT JOIN ar_acq_entry e ON e.ar_no = json_extract(r.meta_json, '$.ar_no')
       LEFT JOIN ar_acq_entry p ON p.ar_no = e.parent_ar_no
       LEFT JOIN ar_acq_entry gp ON gp.ar_no = p.parent_ar_no
       LEFT JOIN ar_acq_category pc ON pc.id = p.ar_no
       LEFT JOIN ar_acq_category gpc ON gpc.id = gp.ar_no
       LEFT JOIN path ON path.start_ar_no = e.ar_no
      WHERE r.status = 'live' AND COALESCE(path.trail, '') NOT LIKE 'مفردات%'
      GROUP BY r.id`);
}

async function loadRooms(env: ArabicEnv) {
  const rows = await query<RoomRow>(env.DB_AR, `SELECT * FROM ar_room ORDER BY sort_order`);
  return rows.map((r) => {
    let rules: Rules = {};
    try { rules = JSON.parse(r.rules_json || '{}'); } catch { rules = {}; }
    return { id: r.id, title: r.title_en, titleAr: r.title_ar, tagline: r.tagline, color: r.color, icon: r.icon,
             layout: r.layout, rules };
  });
}
type Room = Awaited<ReturnType<typeof loadRooms>>[number];

/// Every work, in its one room.
function assign(works: Work[], rooms: Room[]): Map<string, Work[]> {
  const out = new Map<string, Work[]>(rooms.map((r) => [r.id, []]));
  const fallback = rooms.find((r) => r.rules.fallback);
  const passes: Array<(r: Room, w: Work) => boolean> = [
    (r, w) => !!w.series && (r.rules.series ?? []).includes(w.series),
    (r, w) => !!w.shape && (r.rules.shapes ?? []).includes(w.shape),
    (r, w) => !!w.genreRef && (r.rules.genres ?? []).includes(w.genreRef),
  ];
  for (const w of works) {
    let home: Room | undefined;
    for (const pass of passes) { home = rooms.find((r) => pass(r, w)); if (home) break; }
    home = home ?? fallback;
    if (home) out.get(home.id)!.push(w);
  }
  return out;
}

const title = (w: Work) => w.titleAr ?? w.titleEn ?? w.id;
const hijri = (died: string | null) => {
  const m = (died ?? '').match(/-?\d+/);
  return m ? Number(m[0]) : null;
};

function workCard(w: Work) {
  return {
    kind: 'work', id: w.id, title: title(w), titleEn: w.titleAr ? w.titleEn : null, author: w.author, died: w.died,
    level: w.level, band: bandOf(w.level), shape: w.shape ?? 'prose', firstSeq: w.firstSeq ?? 1, pages: w.pages,
    words: w.words, hasAudio: !!w.audioKey, hasVideo: !!w.videoId, episode: w.episode ?? w.episodeOrder,
    series: w.series,
  };
}

const collectionKey = (w: Work) => w.seriesRef ? `S:${w.seriesRef}` : w.series ? `N:${w.series}` : null;
const episodeSort = (a: Work, b: Work) =>
  (a.episode ?? a.episodeOrder ?? 9e9) - (b.episode ?? b.episodeOrder ?? 9e9) || title(a).localeCompare(title(b), 'ar');

/// A room's works as entries: a collection per series, the rest as works.
function entriesOf(works: Work[]) {
  const groups = new Map<string, Work[]>();
  const single: Work[] = [];
  for (const w of works) {
    const k = collectionKey(w);
    if (k) groups.set(k, [...(groups.get(k) ?? []), w]); else single.push(w);
  }
  const collections = [...groups.entries()].map(([id, ws]) => {
    const sorted = [...ws].sort(episodeSort);
    return {
      kind: 'collection', id, title: ws[0].series ?? id, subtitle: ws[0].seriesParent, count: ws.length,
      level: levelSpan(ws.map((w) => w.level)), hasVideo: ws.some((w) => w.videoId), hasAudio: ws.some((w) => w.audioKey),
      preview: sorted.slice(0, 3).map(title), first: workCard(sorted[0]),
    };
  }).sort((a, b) => b.count - a.count);
  // a series of one is just a work
  const works1 = collections.filter((c) => c.count === 1).map((c) => c.first);
  return [...collections.filter((c) => c.count > 1), ...[...single.map(workCard), ...works1]
    .sort((a, b) => (hijri(a.died) ?? 9e9) - (hijri(b.died) ?? 9e9) || a.title.localeCompare(b.title, 'ar'))];
}

/// Works by the Hijri century their author died in (negative: before Islam).
function centuriesOf(works: Work[]) {
  const buckets = new Map<number | null, Work[]>();
  for (const w of works) {
    const y = hijri(w.died);
    const c = y == null ? null : y <= 0 ? 0 : Math.ceil(y / 100);
    buckets.set(c, [...(buckets.get(c) ?? []), w]);
  }
  const ord = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
  return [...buckets.entries()]
    .sort((a, b) => (a[0] ?? 99) - (b[0] ?? 99))
    .map(([c, ws]) => ({
      century: c,
      label: c == null ? 'Undated' : c === 0 ? 'Before Islam' : `${ord(c)} century AH`,
      labelAr: c == null ? 'غير مؤرّخ' : c === 0 ? 'الجاهلية' : `القرن ${c} الهجري`,
      entries: ws.sort((a, b) => (hijri(a.died) ?? 0) - (hijri(b.died) ?? 0)).map(workCard),
    }));
}

/// The Everyday fluency map (owner, 2026-10-25): its places in journey order (ar_curriculum_domain.map_order), each
/// with its picture and what it holds — a day's themes and words, and reading lessons. A place with nothing yet is
/// still on the map, marked as coming.
async function dailyDomains(env: ArabicEnv) {
  return query<{ slug: string; title: string; title_ar: string | null; description: string | null; themes: number; words: number;
                 readings: number; map_order: number; cover_key: string | null;
                 district: string | null; map_x: number | null; map_y: number | null }>(env.DB_AR,
    `SELECT d.slug, d.title, d.title_ar, d.description, d.map_order, d.cover_key, d.district, d.map_x, d.map_y,
            (SELECT COUNT(*) FROM ar_daily_theme t WHERE t.domain_id = d.id AND t.is_published = 1) AS themes,
            (SELECT COUNT(*) FROM ar_daily_word w JOIN ar_daily_theme t ON t.id = w.theme_id AND t.is_published = 1
              WHERE t.domain_id = d.id) AS words,
            (SELECT COUNT(*) FROM ar_daily_reading r WHERE r.domain_id = d.id AND r.is_published = 1) AS readings
       FROM ar_curriculum_domain d
      WHERE d.map_order IS NOT NULL
      ORDER BY d.map_order`);
}
const DAILY_LEVEL = 'A2';   // every daily theme is written at A2 (ar_daily_theme.level)

function roomOut(r: Room, works: Work[], extra: { count?: number; preview?: string[] } = {}) {
  const entries = r.layout === 'daily' ? [] : entriesOf(works);
  return {
    id: r.id, title: r.title, titleAr: r.titleAr, tagline: r.tagline, color: r.color, icon: r.icon, layout: r.layout,
    count: extra.count ?? works.length,
    collections: entries.filter((e) => e.kind === 'collection').length,
    level: levelSpan(works.map((w) => w.level)),
    preview: extra.preview ?? entries.slice(0, 3).map((e) => e.title),
  };
}

export function roomRoutes(router: Router<ArabicEnv>) {
  // The home: the levels (with how much each holds), and the rooms at this level.
  router.get('/ar/atlas/home', async (req, env) => {
    const band = parseBand(new URL(req.url).searchParams.get('level'));
    const [works, rooms, domains, pool] = await Promise.all([
      loadWorks(env), loadRooms(env), dailyDomains(env),
      query<{ band: string; n: number }>(env.DB_AR, `SELECT band, COUNT(*) AS n FROM ar_practice_pool GROUP BY band`)]);
    const shown = works.filter((w) => inBand(band, w.level));
    const byRoom = assign(shown, rooms);
    const dailyOn = inBand(band, DAILY_LEVEL);
    return ok({
      level: band,
      levels: [
        { key: 'all', label: 'All', labelAr: 'الكل', range: 'A1–C1', blurb: 'Everything, at every level', count: works.length },
        ...BANDS.map((b) => ({ ...b, cefr: undefined, count: works.filter((w) => bandOf(w.level) === b.key).length })),
      ],
      rooms: rooms
        .map((r) => r.layout === 'daily'
          ? roomOut(r, [], { count: dailyOn ? domains.filter((d) => d.themes + d.readings > 0).length : 0,
                             preview: dailyOn ? domains.filter((d) => d.themes + d.readings > 0).slice(0, 3).map((d) => d.title) : [] })
          : roomOut(r, byRoom.get(r.id) ?? []))
        .filter((r) => r.count > 0),
      stats: {
        works: shown.length,
        pages: shown.reduce((n, w) => n + (w.pages ?? 0), 0),
        words: shown.reduce((n, w) => n + (w.words ?? 0), 0),
        lines: pool.filter((p) => band === 'all' || p.band === band).reduce((n, p) => n + p.n, 0),
      },
    });
  });

  // A room: its collections and works at this level (or, for the library, by
  // century; for Everyday, its domains).
  router.get('/ar/atlas/room', async (req, env) => {
    const url = new URL(req.url);
    const band = parseBand(url.searchParams.get('level'));
    const id = url.searchParams.get('id') ?? '';
    const rooms = await loadRooms(env);
    const room = rooms.find((r) => r.id === id);
    if (!room) return notFound(`room ${id}`);
    if (room.layout === 'daily') {
      const domains = inBand(band, DAILY_LEVEL) ? await dailyDomains(env) : [];
      return ok({
        room: roomOut(room, [], { count: domains.length }),
        entries: domains.map((d) => ({ kind: 'domain', id: d.slug, title: d.title, titleAr: d.title_ar,
                                       subtitle: d.description, count: d.words, themes: d.themes, readings: d.readings,
                                       cover: d.cover_key ? `/api/ar/audio/${d.cover_key}` : null, stop: d.map_order,
                                       open: d.themes + d.readings > 0, district: d.district, x: d.map_x, y: d.map_y,
                                       level: DAILY_LEVEL })),
        // the town the places stand in: its picture, size and districts (ar_room.rules_json.map)
        map: (room.rules as Record<string, unknown>).map ?? null,
        // every room answers with the same shape: the app reads `centuries` on all of them, and its absence here
        // made Everyday fail to load ("This room could not be fetched", owner 2026-10-25)
        centuries: [],
      });
    }
    const works = (assign((await loadWorks(env)).filter((w) => inBand(band, w.level)), rooms).get(room.id) ?? []);
    return ok({
      room: roomOut(room, works),
      entries: room.layout === 'centuries' ? [] : entriesOf(works),
      centuries: room.layout === 'centuries' ? centuriesOf(works) : [],
    });
  });

  // A collection (a series, a podcast, a poet's songs): its works in order.
  router.get('/ar/atlas/collection', async (req, env) => {
    const url = new URL(req.url);
    const band = parseBand(url.searchParams.get('level'));
    const id = url.searchParams.get('id') ?? '';
    const [works, rooms] = await Promise.all([loadWorks(env), loadRooms(env)]);
    const all = works.filter((w) => collectionKey(w) === id).sort(episodeSort);
    if (!all.length) return notFound(`collection ${id}`);
    const inRoom = [...assign(all, rooms).entries()].find(([, ws]) => ws.length)?.[0];
    const room = rooms.find((r) => r.id === inRoom);
    const shown = all.filter((w) => inBand(band, w.level));
    return ok({
      collection: { id, title: all[0].series ?? id, subtitle: all[0].seriesParent, count: all.length,
                    level: levelSpan(all.map((w) => w.level)), hasVideo: all.some((w) => w.videoId),
                    room: room ? { id: room.id, title: room.title, titleAr: room.titleAr, color: room.color, icon: room.icon } : null },
      // at another level, the whole series still opens: a series is not cut in half
      works: (shown.length ? shown : all).map(workCard),
    });
  });

  // Search every work and collection by name, series or author.
  router.get('/ar/atlas/search', async (req, env) => {
    const url = new URL(req.url);
    const band = parseBand(url.searchParams.get('level'));
    const q = bare((url.searchParams.get('q') ?? '').toLowerCase());
    if (q.length < 2) return ok({ collections: [], works: [] });
    const [works, rooms] = await Promise.all([loadWorks(env), loadRooms(env)]);
    const shown = works.filter((w) => inBand(band, w.level));
    const hit = (...xs: Array<string | null>) => xs.some((x) => x && bare(x.toLowerCase()).includes(q));
    const byRoom = assign(shown, rooms);
    const roomOfWork = new Map<string, Room>();
    for (const r of rooms) for (const w of byRoom.get(r.id) ?? []) roomOfWork.set(w.id, r);
    const where = (w: Work) => { const r = roomOfWork.get(w.id); return r ? { id: r.id, title: r.title, color: r.color } : null; };
    const seen = new Set<string>();
    const collections = shown.filter((w) => collectionKey(w) && hit(w.series, w.seriesParent))
      .filter((w) => { const k = collectionKey(w)!; if (seen.has(k)) return false; seen.add(k); return true; })
      .map((w) => ({ id: collectionKey(w), title: w.series, subtitle: w.seriesParent,
                     count: shown.filter((x) => collectionKey(x) === collectionKey(w)).length, room: where(w) }));
    return ok({
      collections: collections.slice(0, 20),
      works: shown.filter((w) => hit(w.titleAr, w.titleEn, w.author)).slice(0, 60)
        .map((w) => ({ ...workCard(w), room: where(w) })),
    });
  });

  // Continue: the reader's own recent works (private — never kept).
  router.get('/ar/atlas/continue', async (req, env) => {
    const me = actorRef(req);
    if (!me) return unauthorized('Sign in to continue where you left off');
    const rows = await query<{ work_id: string; status: string; progress_seq: number | null; updated_at: string }>(env.DB_AR,
      `SELECT work_id, status, progress_seq, updated_at FROM ar_reading_state
        WHERE user_id = ? AND status != 'read' ORDER BY updated_at DESC LIMIT 12`, [me]);
    if (!rows.length) return ok({ works: [] });
    const works = new Map((await loadWorks(env)).map((w) => [w.id, w]));
    return ok({
      works: rows.filter((r) => works.has(r.work_id)).map((r) => {
        const w = works.get(r.work_id)!;
        return { ...workCard(w), progressSeq: r.progress_seq, fraction: w.pages ? Math.min(1, (r.progress_seq ?? 0) / w.pages) : 0,
                 updatedAt: r.updated_at };
      }),
    });
  });
}
