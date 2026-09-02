import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest } from '../../../shared/src/response';
import { query, queryOne, execute } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';

/// The curriculum is a tree, not a list: فنّ → باب/قسم → فصل → مسألة. It is
/// the syllabus each discipline is actually taught in, and every node points
/// back at the page of the book it is read from — so a topic is never a bare
/// heading with nothing behind it.

const NODE_COLS = `id, parent_id, discipline, node_type, name_ar, name_en, name_ur,
                   definition_ar, sort_order, depth, path, status, al_refs_json,
                   teach_order, difficulty, track_id`;

interface NodeRow {
  id: string;
  parent_id: string | null;
  node_type: string;
  name_ar: string;
  name_en: string | null;
  definition_ar: string | null;
  sort_order: number;
  depth: number;
  status: string;
  al_refs_json: string | null;
  [k: string]: unknown;
}

/// `al_refs_json` was filled by two different passes and holds two shapes: a
/// book keyed to its volume:page, `{"ghalayini":"3:167"}`, and a bare list of
/// AL page-group ids, `["GPG:1687:1734524"]`. Both mean "read it here", so the
/// payload settles them into one form the app does not have to branch on.
function readingRefs(raw: string | null): { book: string; locator: string }[] {
  if (!raw) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (Array.isArray(parsed)) {
    return parsed.filter((x): x is string => typeof x === 'string')
      .map((ref) => ({ book: 'al', locator: ref }));
  }
  if (parsed && typeof parsed === 'object') {
    return Object.entries(parsed as Record<string, unknown>)
      .filter(([, v]) => typeof v === 'string')
      .map(([book, locator]) => ({ book, locator: locator as string }));
  }
  return [];
}

export function curriculumRoutes(router: Router<ArabicEnv>) {

  /// The five reading tracks — Basic/Advanced Naḥw, Basic/Advanced Ṣarf, and
  /// Balāgha. The syllabus tree says what a science *contains*; a track says
  /// what to read *first*, which used to live only in the reader's head. It is
  /// registry data now: `ar_curriculum_track` names the track and
  /// `ar_grammar_node.track_id` marks the chapter that opens it, so every
  /// client gets the same order without inventing one.
  router.get('/ar/tracks', async (_req, env) => {
    const tracks = await query<Record<string, unknown>>(
      env.DB_AR,
      `SELECT t.id, t.slug, t.title, t.title_ar, t.discipline, t.level,
              t.description_md, t.sort_order,
              d.name_ar AS discipline_ar, d.name_en AS discipline_en, d.accent,
              (SELECT COUNT(*) FROM ar_grammar_node n WHERE n.track_id = t.id) AS chapters
         FROM ar_curriculum_track t
         LEFT JOIN ar_discipline d ON d.code = t.discipline
        WHERE t.discipline IS NOT NULL AND t.is_public = 1
        ORDER BY t.sort_order, t.slug`,
      [],
    );

    // How much reading each track actually is: every topic under its chapters.
    const counted = await Promise.all(tracks.map(async (t) => ({
      ...t,
      topics: await subtreeCount(env.DB_AR, t.id as string),
    })));

    return ok({ tracks: counted });
  });

  /// One track, opened: its chapters in teaching order, each with the subtree
  /// under it, so the page can be read as a table of contents.
  router.get('/ar/tracks/:slug', async (_req, env, { slug }) => {
    const track = await queryOne<Record<string, unknown>>(
      env.DB_AR,
      `SELECT t.id, t.slug, t.title, t.title_ar, t.discipline, t.level,
              t.description_md,
              d.name_ar AS discipline_ar, d.name_en AS discipline_en, d.accent
         FROM ar_curriculum_track t
         LEFT JOIN ar_discipline d ON d.code = t.discipline
        WHERE t.slug = ?`,
      [slug ?? ''],
    );
    if (!track) return notFound(`track ${slug}`);

    // The whole discipline is read once and assembled in memory: these trees
    // are a few hundred rows, and a recursive CTE per chapter would be three
    // round trips to say the same thing.
    const rows = await query<NodeRow>(
      env.DB_AR,
      `SELECT ${NODE_COLS},
              (SELECT COUNT(*) FROM ar_node_source s WHERE s.node_id = n.id) AS sources,
              (SELECT COUNT(*) FROM ar_node_gram_term g WHERE g.node_id = n.id) AS terms
         FROM ar_grammar_node n
        WHERE discipline = ?
        ORDER BY depth, sort_order, id`,
      [track.discipline as string],
    );

    const kids = new Map<string | null, NodeRow[]>();
    for (const r of rows) {
      const list = kids.get(r.parent_id) ?? [];
      list.push(r);
      kids.set(r.parent_id, list);
    }
    const build = (parent: string | null): unknown[] =>
      (kids.get(parent) ?? []).map((n) => shape(n, build(n.id)));

    const chapters = rows
      .filter((n) => n.track_id === track.id)
      .sort((a, b) => (a.teach_order as number ?? 99) - (b.teach_order as number ?? 99))
      .map((n) => shape(n, build(n.id)));

    // The same count the list gives, so two screens never disagree about how
    // much reading a track is.
    return ok({ track, chapters, topics: await subtreeCount(env.DB_AR, track.id as string) });
  });

  /// The whole tree for one discipline (NH / SF / BL), nested, with the count
  /// of books cited at each node. One call: the outline is small enough that
  /// paging it would only make the reader wait twice.
  router.get('/ar/curriculum/:code', async (_req, env, { code }) => {
    const discipline = (code ?? '').toUpperCase();
    const spine = await queryOne<{ code: string; name_ar: string; name_en: string;
                                  accent: string | null; root_node_id: string | null }>(
      env.DB_AR,
      `SELECT code, slug, name_ar, name_en, name_ur, tagline_en, accent,
              root_node_id, container_id,
              (SELECT COUNT(*) FROM ar_learning_source s WHERE s.discipline = d.code) AS sources
         FROM ar_discipline d WHERE code = ?`,
      [discipline],
    );
    if (!spine) return notFound(`discipline ${discipline}`);

    const rows = await query<NodeRow>(
      env.DB_AR,
      `SELECT ${NODE_COLS},
              (SELECT COUNT(*) FROM ar_node_source s WHERE s.node_id = n.id) AS sources,
              (SELECT COUNT(*) FROM ar_node_gram_term g WHERE g.node_id = n.id) AS terms
         FROM ar_grammar_node n
        WHERE discipline = ?
        ORDER BY depth, sort_order, id`,
      [discipline],
    );

    const kids = new Map<string | null, NodeRow[]>();
    for (const r of rows) {
      const list = kids.get(r.parent_id) ?? [];
      list.push(r);
      kids.set(r.parent_id, list);
    }
    const build = (parent: string | null): unknown[] =>
      (kids.get(parent) ?? []).map((n) => {
        const children = build(n.id);
        return {
          id: n.id,
          type: n.node_type,
          nameAr: n.name_ar,
          nameEn: n.name_en,
          definitionAr: n.definition_ar,
          depth: n.depth,
          status: n.status,
          sources: n.sources ?? 0,
          terms: n.terms ?? 0,
          readIn: readingRefs(n.al_refs_json),
          // A leaf is where the reading actually happens; the app draws it
          // differently from a heading, so it should not have to count.
          leafCount: children.length ? countLeaves(children) : 0,
          children,
        };
      });

    const tree = build(null);
    return ok({
      discipline: spine,
      total: rows.length,
      byType: tally(rows, (r) => r.node_type),
      tree,
    });
  });

  /// The lesson tree — دروس, not terms. A term (مضاعف) is a thing the language
  /// has; a lesson (باب المضاعف) is an hour of teaching about it. The tree is
  /// cut from a دروس book's own أبواب — جامع الدروس العربية — so its shape is a
  /// teacher's, and every lesson carries the GT terms it teaches.
  router.get('/ar/lessons', async (req, env) => {
    const url = new URL(req.url);
    const parent = url.searchParams.get('parent');
    // A caller that only wants one level says so; the map, which draws the
    // whole shape at once, still gets the whole shape.
    const level = parent !== null || url.searchParams.get('depth') === '0';

    // The counts used to be two correlated subqueries per lesson — sixteen
    // hundred of them for one page of eight hundred rows, which is most of
    // what the route spent its time on. Two grouped joins do the same work
    // once each.
    const rows = await query<Record<string, unknown>>(
      env.DB_AR,
      `SELECT l.id, l.parent_id, l.bab_id, l.discipline, l.title_ar, l.title_en,
              l.depth, l.sort_order, l.volume_no, l.page_start, l.page_count,
              l.accent, l.node_id, l.spine, l.external_url AS externalUrl,
              COALESCE(t.n, 0) AS terms,
              COALESCE(r.n, 0) AS readings,
              (SELECT COUNT(*) FROM ar_lesson k
                WHERE k.parent_id = l.id AND k.status = 'live') AS childCount
         FROM ar_lesson l
         LEFT JOIN (SELECT lesson_id, COUNT(*) AS n FROM ar_lesson_term
                     GROUP BY lesson_id) t ON t.lesson_id = l.id
         LEFT JOIN (SELECT lesson_id, COUNT(*) AS n FROM ar_lesson_reading
                     GROUP BY lesson_id) r ON r.lesson_id = l.id
        WHERE l.status = 'live'
          ${level ? (parent ? 'AND l.parent_id = ?' : 'AND l.parent_id IS NULL') : ''}
        ORDER BY l.spine, l.sort_order`,
      level && parent ? [parent] : [],
    );

    const kids = new Map<string | null, Record<string, unknown>[]>();
    for (const row of rows) {
      const list = kids.get((row.parent_id as string | null) ?? null) ?? [];
      list.push(row);
      kids.set((row.parent_id as string | null) ?? null, list);
    }
    const build = (node: string | null): unknown[] =>
      (kids.get(node) ?? []).map((row) => ({ ...row, children: build(row.id as string) }));

    return ok(
      {
        spine: 'ghalayini_jami_durus',
        total: rows.length,
        lazy: level,
        lessons: level ? rows.map((row) => ({ ...row, children: [] })) : build(null),
      },
      // The lesson tree changes when a book is ingested, not when a reader
      // opens it, so it is worth holding at the edge.
      { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=600' } },
    );
  });

  /// One lesson: what it teaches (its GT terms), where to read it in the دروس
  /// book itself, and the classical أبواب that treat the same ground.
  router.get('/ar/lessons/:id', async (_req, env, { id }) => {
    const lesson = await queryOne<Record<string, unknown>>(
      env.DB_AR,
      `SELECT id, parent_id, bab_id, discipline, title_ar, title_en, depth,
              sort_order, volume_no, page_start, page_count, accent, node_id, spine,
              external_url AS externalUrl
         FROM ar_lesson WHERE id = ?`,
      [id ?? ''],
    );
    if (!lesson) return notFound(`lesson ${id}`);

    const [terms, readings, kids, parent] = await Promise.all([
      query<Record<string, unknown>>(
        env.DB_AR,
        `SELECT t.term_id AS id, t.origin, g.name_ar AS nameAr, g.name_en AS nameEn,
                g.category_key AS categoryKey, g.badge_color AS color
           FROM ar_lesson_term t
           JOIN ar_ling_gram_term g ON g.id = t.term_id
          WHERE t.lesson_id = ? AND g.status = 'live'
          ORDER BY t.sort_order`,
        [id ?? ''],
      ),
      query<Record<string, unknown>>(
        env.DB_AR,
        `SELECT source_slug AS sourceSlug, bab_id AS babId, title_ar AS titleAr,
                volume_no AS volumeNo, page_start AS pageStart, term_id AS termId
           FROM ar_lesson_reading WHERE lesson_id = ?`,
        [id ?? ''],
      ),
      query<Record<string, unknown>>(
        env.DB_AR,
        `SELECT id, title_ar AS titleAr, title_en AS titleEn, accent, page_start AS pageStart
           FROM ar_lesson WHERE parent_id = ? AND status = 'live' ORDER BY sort_order`,
        [id ?? ''],
      ),
      lesson.parent_id
        ? queryOne<Record<string, unknown>>(
            env.DB_AR,
            `SELECT id, title_ar AS titleAr, title_en AS titleEn FROM ar_lesson WHERE id = ?`,
            [lesson.parent_id as string],
          )
        : Promise.resolve(null),
    ]);

    return ok({ lesson, parent, children: kids, terms, readings });
  });

  /// Everything the *learning* side knows about one GT term: the topics that
  /// teach it, and every source those topics are read from — books already in
  /// the library, recorded lessons, links. The registry's own record (AL) says
  /// what the term is; this says where a learner meets it.
  router.get('/ar/terms/:id/sources', async (_req, env, { id }) => {
    const termId = id ?? '';

    const nodes = await query<Record<string, unknown>>(
      env.DB_AR,
      `SELECT n.id, n.name_ar AS nameAr, n.name_en AS nameEn, n.node_type AS type,
              n.discipline, l.relation, l.note_ar AS noteAr
         FROM ar_node_gram_term l
         JOIN ar_grammar_node n ON n.id = l.node_id
        WHERE l.term_id = ?
        ORDER BY n.depth, n.sort_order`,
      [termId],
    );

    // The sources those topics are read from, each said once, with the topics
    // that cite it counted — a lesson cited by four topics is one lesson.
    const sources = await query<Record<string, unknown>>(
      env.DB_AR,
      `SELECT s.id, s.source_kind AS sourceKind, s.title_ar AS titleAr,
              s.title_en AS titleEn, s.author_ar AS authorAr, s.author_en AS authorEn,
              s.death_year AS deathYear, s.url, s.platform, s.authority,
              s.al_source_slug AS alSourceSlug,
              COUNT(DISTINCT ns.node_id) AS cited,
              MIN(ns.locator) AS locator,
              MIN(ns.timestamp_s) AS timestampS
         FROM ar_node_gram_term l
         JOIN ar_node_source ns ON ns.node_id = l.node_id
         JOIN ar_learning_source s ON s.id = ns.source_id
        WHERE l.term_id = ?
        GROUP BY s.id
        ORDER BY (s.source_kind = 'book') DESC, cited DESC`,
      [termId],
    );

    return ok({ term: termId, nodes, sources });
  });

  /// One node, with the line of headings above it and the books that teach it.
  router.get('/ar/nodes/:id', async (_req, env, { id }) => {
    const node = await queryOne<NodeRow>(
      env.DB_AR, `SELECT ${NODE_COLS} FROM ar_grammar_node WHERE id = ?`, [id],
    );
    if (!node) return notFound(`node ${id}`);

    const ancestry: NodeRow[] = [];
    let cursor = node.parent_id;
    for (let i = 0; cursor && i < 12; i++) {
      const up = await queryOne<NodeRow>(
        env.DB_AR, `SELECT ${NODE_COLS} FROM ar_grammar_node WHERE id = ?`, [cursor],
      );
      if (!up) break;
      ancestry.unshift(up);
      cursor = up.parent_id;
    }

    const [children, sources, terms] = await Promise.all([
      query<NodeRow>(
        env.DB_AR,
        `SELECT ${NODE_COLS} FROM ar_grammar_node WHERE parent_id = ? ORDER BY sort_order, id`,
        [id],
      ),
      query<Record<string, unknown>>(
        env.DB_AR,
        `SELECT s.id, s.source_kind, s.title_ar, s.title_en, s.author_ar, s.author_en,
                s.death_year, s.url, s.platform, s.authority,
                ns.locator, ns.role, ns.timestamp_s, ns.note_ar
           FROM ar_node_source ns
           JOIN ar_learning_source s ON s.id = ns.source_id
          WHERE ns.node_id = ?
          ORDER BY ns.sort_order, s.id`,
        [id],
      ),
      // The GT registry belongs to AL; AR keeps a reference copy precisely so
      // this join is local instead of a call across databases.
      query<Record<string, unknown>>(
        env.DB_AR,
        `SELECT t.id, t.term_key, t.category_key, t.name_ar AS nameAr,
                t.name_en AS nameEn, t.badge_color AS color, l.relation, l.note_ar AS noteAr
           FROM ar_node_gram_term l
           JOIN ar_ling_gram_term t ON t.id = l.term_id
          WHERE l.node_id = ? AND t.status = 'live'
          ORDER BY l.sort_order, t.id`,
        [id],
      ),
    ]);

    return ok({
      terms,
      node: {
        id: node.id, type: node.node_type, nameAr: node.name_ar, nameEn: node.name_en,
        definitionAr: node.definition_ar, depth: node.depth, status: node.status,
        discipline: node.discipline, readIn: readingRefs(node.al_refs_json),
      },
      ancestry: ancestry.map((a) => ({ id: a.id, nameAr: a.name_ar, nameEn: a.name_en, type: a.node_type })),
      children: children.map((c) => ({
        id: c.id, type: c.node_type, nameAr: c.name_ar, nameEn: c.name_en,
        status: c.status, definitionAr: c.definition_ar,
      })),
      sources,
    });
  });

  /// Attach a source to a topic. Anything a reader can point at counts — a
  /// classical book already in the library, a lecture on YouTube, a PDF, a web
  /// page. A source that is not in the registry yet is created as it is
  /// attached, so nobody has to file a book before citing it.
  ///
  /// Authoring, so it is behind the token: only the GET registry paths are
  /// public.
  router.post('/ar/nodes/:id/sources', async (req, env, { id }) => {
    const node = await queryOne<{ id: string; discipline: string }>(
      env.DB_AR, `SELECT id, discipline FROM ar_grammar_node WHERE id = ?`, [id],
    );
    if (!node) return notFound(`node ${id}`);

    const b = await req.json() as Record<string, unknown>;
    const str = (k: string): string | null => {
      const v = b[k];
      return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
    };

    let sourceId = str('sourceId');

    if (!sourceId) {
      const url = str('url');
      const title = str('titleEn') ?? str('titleAr');
      if (!title && !url) return badRequest('sourceId, or a title or url, is required');

      // The kind is what decides the icon and how the locator reads, so infer
      // it from the link when the caller has not said.
      const kind = str('sourceKind') ?? inferKind(url);
      sourceId = `SRC:usr:${crypto.randomUUID().slice(0, 12)}`;
      await execute(
        env.DB_AR,
        `INSERT INTO ar_learning_source
           (id, source_kind, title_ar, title_en, author_ar, author_en, url,
            platform, edition, lang, discipline, authority, notes_md)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sourceId, kind, str('titleAr'), str('titleEn'), str('authorAr'), str('authorEn'),
         url, platformOf(url), str('edition'), str('lang'),
         str('discipline') ?? node.discipline, str('authority') ?? 'user', str('notesMd')],
      );
    } else {
      const exists = await queryOne<{ id: string }>(
        env.DB_AR, `SELECT id FROM ar_learning_source WHERE id = ?`, [sourceId],
      );
      if (!exists) return notFound(`source ${sourceId}`);
    }

    const at = typeof b.timestampS === 'number' ? Math.max(0, Math.round(b.timestampS)) : null;
    await execute(
      env.DB_AR,
      `INSERT OR REPLACE INTO ar_node_source
         (node_id, source_id, locator, role, timestamp_s, note_ar, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT MAX(sort_order) + 1 FROM ar_node_source
                                            WHERE node_id = ?), 0))`,
      [id, sourceId, str('locator'), str('role') ?? 'reference', at, str('noteAr'), id],
    );

    return created(await queryOne<Record<string, unknown>>(
      env.DB_AR,
      `SELECT s.id, s.source_kind, s.title_ar, s.title_en, s.author_ar, s.author_en,
              s.url, s.platform, s.authority, ns.locator, ns.role, ns.timestamp_s, ns.note_ar
         FROM ar_node_source ns JOIN ar_learning_source s ON s.id = ns.source_id
        WHERE ns.node_id = ? AND ns.source_id = ?`,
      [id, sourceId],
    ));
  });

  /// Detach one. The source itself stays in the library; only the citation goes.
  router.delete('/ar/nodes/:id/sources/:sourceId', async (_req, env, { id, sourceId }) => {
    await execute(
      env.DB_AR,
      `DELETE FROM ar_node_source WHERE node_id = ? AND source_id = ?`,
      [id, sourceId],
    );
    return ok({ detached: true, node: id, source: sourceId });
  });

  /// One book, and the syllabus it is cited in. A library card that cannot be
  /// opened is a bibliography; this is what opening it means here — the places
  /// in the curriculum that read from it.
  router.get('/ar/sources/:id', async (_req, env, { id }) => {
    const source = await queryOne<Record<string, unknown>>(
      env.DB_AR,
      `SELECT id, source_kind, title_ar, title_en, author_ar, author_en, death_year,
              url, platform, edition, locator, lang, discipline, authority,
              al_source_slug, notes_md, meta_json
         FROM ar_learning_source WHERE id = ?`,
      [id],
    );
    if (!source) return notFound(`source ${id}`);

    const cited = await query<Record<string, unknown>>(
      env.DB_AR,
      `SELECT n.id, n.name_ar AS nameAr, n.name_en AS nameEn, n.node_type AS type,
              n.depth, n.discipline, ns.locator, ns.role, ns.timestamp_s AS at,
              ns.note_ar AS noteAr
         FROM ar_node_source ns
         JOIN ar_grammar_node n ON n.id = ns.node_id
        WHERE ns.source_id = ?
        ORDER BY n.discipline, n.depth, n.sort_order`,
      [id],
    );

    return ok({ source, cited });
  });
}

/// One node as every screen wants it. The curriculum tree and a track's
/// chapters are the same thing at two entry points, so they are shaped once.
function shape(n: NodeRow, children: unknown[]): Record<string, unknown> {
  return {
    id: n.id,
    type: n.node_type,
    nameAr: n.name_ar,
    nameEn: n.name_en,
    definitionAr: n.definition_ar,
    depth: n.depth,
    status: n.status,
    sources: n.sources ?? 0,
    terms: n.terms ?? 0,
    teachOrder: n.teach_order ?? null,
    difficulty: n.difficulty ?? null,
    trackId: n.track_id ?? null,
    readIn: readingRefs(n.al_refs_json),
    leafCount: children.length ? countLeaves(children) : 0,
    children,
  };
}

/// Every topic under a track's chapters, counted in the database rather than
/// by walking the tree in the worker.
async function subtreeCount(db: D1Database, trackId: string): Promise<number> {
  const row = await queryOne<{ n: number }>(
    db,
    `WITH RECURSIVE under(id) AS (
       SELECT id FROM ar_grammar_node WHERE track_id = ?
       UNION ALL
       SELECT c.id FROM ar_grammar_node c JOIN under u ON c.parent_id = u.id
     )
     SELECT COUNT(*) AS n FROM under`,
    [trackId],
  );
  return row?.n ?? 0;
}

function countLeaves(children: unknown[]): number {
  let n = 0;
  for (const child of children as { children?: unknown[]; leafCount?: number }[]) {
    if (!child.children?.length) n += 1;
    else n += child.leafCount ?? 0;
  }
  return n;
}

function tally<T>(rows: T[], pick: (row: T) => string | null): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = pick(row);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

/// What kind of thing a link points at. A reader pasting a YouTube URL should
/// not have to say it is a video.
function inferKind(url: string | null): string {
  if (!url) return 'note';
  const at = url.toLowerCase();
  if (at.includes('youtube.') || at.includes('youtu.be') || at.includes('vimeo.')) return 'video';
  if (at.endsWith('.pdf') || at.includes('/pdf')) return 'pdf';
  if (at.includes('docs.google.') || at.includes('notion.')) return 'doc';
  if (at.includes('archive.org') || at.includes('shamela') || at.includes('waqfeya')) return 'book';
  return 'web';
}

function platformOf(url: string | null): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}
