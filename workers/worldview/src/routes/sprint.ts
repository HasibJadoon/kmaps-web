import type { Router } from '../../../shared/src/router';
import { notFound, ok } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { SprintBacklog, SprintCrumb, SprintLine, SprintPage, SprintSource } from '../../../shared/src/contracts/sprint';
import type { WorldviewEnv } from '../env';

/// Worldview's side of the sprint contract (shared/src/contracts/sprint.ts), in levels (owner, 2026-10-31: "isms can
/// have many books and many sessions and passages and resources"; "books can be chapters, passages wise, or session
/// wise"):
///   /wv/sprint/backlog/traditions?type=ideology,movement   the isms, each holding its books
///   /wv/sprint/backlog/tradition/:id                      an ism's books (wv_sources.tradition_id)
///   /wv/sprint/backlog/source/:id?by=chapters|passages|sessions
///                                                         a book broken one of three ways (default: its own
///                                                         meta_json.sprint_by, else whichever it has)
///   /wv/sprint/backlog/unit/:id                           a chapter's sessions
/// and a page for each: an ism, a book, a chapter or phase, a passage, a session.

/// The isms: the traditions the Isms backlog lists.
const ISMS = 'ideology,movement';
/// A tile's mark by what it is: PH01 for a phase, CH01 for a chapter.
const MARK: Record<string, string> = { phase: 'PH', chapter: 'CH', section: 'S', volume: 'V', lecture: 'L' };
const BY = ['chapters', 'passages', 'sessions'] as const;
type By = (typeof BY)[number];

const two = (n: number) => String(n).padStart(2, '0');
const wv = (path: string): SprintSource => ({ module: 'wv', path });

export function sprintRoutes(router: Router<WorldviewEnv>) {
  router.get('/wv/sprint/backlog/traditions', async (req, env) => {
    const typeParam = new URL(req.url).searchParams.get('type') ?? ISMS;
    const types = typeParam.split(',').map((t) => t.trim()).filter(Boolean);
    const rows = await query<{ id: string; title: string; title_ar: string | null; founded_period: string | null;
      geographic_origin: string | null; books: number }>(env.DB_WV,
      `SELECT t.id, t.title, t.title_ar, t.founded_period, t.geographic_origin,
              (SELECT COUNT(*) FROM wv_sources s WHERE s.tradition_id = t.id) AS books
         FROM wv_traditions t WHERE t.tradition_type IN (${types.map(() => '?').join(',')}) ORDER BY t.title`, types);
    const body: SprintBacklog = {
      title: 'Isms backlog',
      subtitle: `${rows.length} worldviews`,
      items: rows.map((r, i) => ({
        unit: `WV:${r.id}`, label: two(i + 1),
        title: r.title, title_ar: r.title_ar, short: r.title,
        ref: [r.founded_period, r.books ? `${r.books} book${r.books === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ') || null,
        page: wv(`sprint/page/tradition/${r.id}`),
        down: wv(`sprint/backlog/tradition/${r.id}`),
      })),
    };
    return ok(body);
  });

  router.get('/wv/sprint/backlog/tradition/:id', async (_req, env, { id }) => {
    const t = await queryOne<{ title: string; title_ar: string | null }>(env.DB_WV, `SELECT title, title_ar FROM wv_traditions WHERE id = ?`, [id]);
    if (!t) return notFound(`tradition ${id}`);
    const rows = await query<{ id: string; title: string; title_ar: string | null; source_type: string; published_year: number | null }>(env.DB_WV,
      `SELECT id, title, title_ar, source_type, published_year FROM wv_sources WHERE tradition_id = ? ORDER BY published_year, title`, [id]);
    const body: SprintBacklog = {
      title: 'Book backlog', subtitle: t.title,
      items: rows.map((r, i) => ({
        unit: `WV:${r.id}`, label: `B${two(i + 1)}`, title: r.title, title_ar: r.title_ar, short: null,
        ref: [r.source_type, r.published_year].filter(Boolean).join(' · ') || null,
        page: wv(`sprint/page/source/${r.id}`), down: wv(`sprint/backlog/source/${r.id}`),
      })),
      up: [isms()],
      page: wv(`sprint/page/tradition/${id}`),
    };
    return ok(body);
  });

  router.get('/wv/sprint/backlog/source/:id', async (req, env, { id }) => {
    const src = await queryOne<{ title: string; tradition_id: string | null; meta_json: string | null }>(env.DB_WV,
      `SELECT title, tradition_id, meta_json FROM wv_sources WHERE id = ?`, [id]);
    if (!src) return notFound(`source ${id}`);
    const [units, chunks, sessions] = await Promise.all([
      count(env, `SELECT COUNT(*) AS n FROM wv_source_units WHERE source_id = ? AND parent_id IS NULL`, id),
      count(env, `SELECT COUNT(*) AS n FROM wv_source_chunks WHERE source_id = ?`, id),
      count(env, `SELECT COUNT(*) AS n FROM wv_reading_sessions WHERE source_id = ?`, id),
    ]);
    const has: Record<By, number> = { chapters: units, passages: chunks, sessions };
    const asked = new URL(req.url).searchParams.get('by') as By | null;
    const own = meta(src.meta_json).sprint_by as By | undefined;
    const by: By = [asked, own].find((b): b is By => !!b && BY.includes(b) && has[b] > 0) ?? BY.find((b) => has[b] > 0) ?? 'chapters';
    const items = by === 'chapters' ? await chapters(env, id) : by === 'passages' ? await passages(env, id) : await sessionsOf(env, 'source_id', id);
    const body: SprintBacklog = {
      title: `${by[0].toUpperCase()}${by.slice(1, -1)} backlog`,
      subtitle: src.title,
      items,
      up: await upTo(env, src.tradition_id),
      views: BY.filter((b) => has[b] > 0).map((b) => ({
        label: `${b[0].toUpperCase()}${b.slice(1)}`, source: wv(`sprint/backlog/source/${id}?by=${b}`), on: b === by,
      })),
      page: wv(`sprint/page/source/${id}`),
    };
    return ok(body);
  });

  router.get('/wv/sprint/backlog/unit/:id', async (_req, env, { id }) => {
    const u = await queryOne<{ title: string; source_id: string; tradition_id: string | null; source: string }>(env.DB_WV,
      `SELECT u.title, u.source_id, s.tradition_id, s.title AS source FROM wv_source_units u JOIN wv_sources s ON s.id = u.source_id WHERE u.id = ?`, [id]);
    if (!u) return notFound(`unit ${id}`);
    const body: SprintBacklog = {
      title: 'Session backlog', subtitle: u.title,
      items: await sessionsOf(env, 'source_unit_id', id),
      up: [...await upTo(env, u.tradition_id), { label: u.source, source: wv(`sprint/backlog/source/${u.source_id}?by=chapters`) }],
      page: wv(`sprint/page/unit/${id}`),
    };
    return ok(body);
  });

  // ── pages

  router.get('/wv/sprint/page/tradition/:id', async (_req, env, { id }) => {
    const t = await queryOne<{ title: string; title_ar: string | null; tradition_type: string; founded_period: string | null;
      geographic_origin: string | null; core_beliefs: string | null; description_md: string | null }>(env.DB_WV,
      `SELECT title, title_ar, tradition_type, founded_period, geographic_origin, core_beliefs, description_md
         FROM wv_traditions WHERE id = ?`, [id]);
    if (!t) return notFound(`tradition ${id}`);
    const [positions, books] = await Promise.all([
      query<{ position_title: string | null; position_text: string }>(env.DB_WV,
        `SELECT position_title, position_text FROM wv_value_positions
          WHERE tradition_id = ? AND COALESCE(status, 'live') != 'deleted' ORDER BY created_at`, [id]),
      query<{ title: string; title_ar: string | null }>(env.DB_WV,
        `SELECT title, title_ar FROM wv_sources WHERE tradition_id = ? ORDER BY published_year, title`, [id]),
    ]);
    const lines: SprintLine[] = [
      ...beliefs(t.core_beliefs).map((b) => line(b)),
      ...positions.map((p) => line(p.position_title ? `${p.position_title} — ${p.position_text}` : p.position_text)),
      ...books.map((b) => ({ mark: '📖', ar: b.title_ar, en: b.title, audio: null })),
    ];
    return ok(page([t.tradition_type.toUpperCase(), t.founded_period, t.geographic_origin].filter(Boolean).join(' · '),
      t.title, t.title_ar,
      t.description_md ?? (lines.length ? null : 'Nothing is recorded for it yet: its beliefs, positions and books come in as it is built.'),
      lines));
  });

  router.get('/wv/sprint/page/source/:id', async (_req, env, { id }) => {
    const s = await queryOne<{ title: string; title_ar: string | null; source_type: string; published_year: number | null;
      publisher: string | null; description_md: string | null }>(env.DB_WV,
      `SELECT title, title_ar, source_type, published_year, publisher, description_md FROM wv_sources WHERE id = ?`, [id]);
    if (!s) return notFound(`source ${id}`);
    const units = await query<{ title: string; meta_json: string | null }>(env.DB_WV,
      `SELECT title, meta_json FROM wv_source_units WHERE source_id = ? AND parent_id IS NULL ORDER BY unit_index, id`, [id]);
    return ok(page([s.source_type.toUpperCase(), s.published_year, s.publisher].filter(Boolean).join(' · '), s.title, s.title_ar,
      s.description_md, units.map((u) => ({ mark: '·', ar: meta(u.meta_json).arabic ?? null, en: u.title, audio: null }))));
  });

  router.get('/wv/sprint/page/unit/:id', async (_req, env, { id }) => {
    const u = await queryOne<{ title: string; unit_type: string; unit_index: number | null; description_md: string | null;
      text_excerpt: string | null; meta_json: string | null; source: string }>(env.DB_WV,
      `SELECT u.title, u.unit_type, u.unit_index, u.description_md, u.text_excerpt, u.meta_json, s.title AS source
         FROM wv_source_units u JOIN wv_sources s ON s.id = u.source_id WHERE u.id = ?`, [id]);
    if (!u) return notFound(`unit ${id}`);
    const m = meta(u.meta_json);
    const blocks = await query<{ text: string | null }>(env.DB_WV,
      `SELECT text FROM wv_unit_blocks WHERE source_unit_id = ? AND text IS NOT NULL ORDER BY order_index`, [id]);
    const lines: SprintLine[] = [
      // its readings, by their Arabic names
      ...(Array.isArray(m.readings) ? m.readings as string[] : []).map((r) => ({ mark: '·', ar: r, en: null, audio: null })),
      ...blocks.map((b) => line(b.text!)),
      ...(blocks.length || !u.text_excerpt ? [] : [line(u.text_excerpt)]),
    ];
    return ok(page(`${u.unit_type.toUpperCase()}${u.unit_index != null ? ` ${u.unit_index + 1}` : ''} · ${u.source}`,
      u.title, (m.arabic as string | undefined) ?? null, u.description_md, lines));
  });

  router.get('/wv/sprint/page/chunk/:id', async (_req, env, { id }) => {
    const c = await queryOne<{ chunk_index: number; heading_norm: string | null; page_no: number | null; text_content: string; source: string }>(env.DB_WV,
      `SELECT c.chunk_index, c.heading_norm, c.page_no, c.text_content, s.title AS source
         FROM wv_source_chunks c JOIN wv_sources s ON s.id = c.source_id WHERE c.id = ?`, [id]);
    if (!c) return notFound(`passage ${id}`);
    return ok(page(`PASSAGE ${c.chunk_index}${c.page_no != null ? ` · p. ${c.page_no}` : ''} · ${c.source}`, c.heading_norm, null, null,
      c.text_content.split(/\n{2,}/).map((t) => t.trim()).filter(Boolean).map((t) => scriptLine(t))));
  });

  router.get('/wv/sprint/page/session/:id', async (_req, env, { id }) => {
    const r = await queryOne<{ title: string | null; session_type: string; status: string; summary_md: string | null; source: string }>(env.DB_WV,
      `SELECT r.title, r.session_type, r.status, r.summary_md, s.title AS source
         FROM wv_reading_sessions r JOIN wv_sources s ON s.id = r.source_id WHERE r.id = ?`, [id]);
    if (!r) return notFound(`session ${id}`);
    const paras = (r.summary_md ?? '').split(/\n{2,}/).map((t) => t.trim()).filter(Boolean);
    return ok(page(`${r.session_type.toUpperCase()} · ${r.status} · ${r.source}`, r.title, null, paras[0] ?? null, paras.slice(1).map((t) => line(t))));
  });
}

// ── the levels

async function chapters(env: WorldviewEnv, sourceId: string) {
  const rows = await query<{ id: string; title: string; unit_type: string; meta_json: string | null; sessions: number }>(env.DB_WV,
    `SELECT u.id, u.title, u.unit_type, u.meta_json,
            (SELECT COUNT(*) FROM wv_reading_sessions r WHERE r.source_unit_id = u.id) AS sessions
       FROM wv_source_units u WHERE u.source_id = ? AND u.parent_id IS NULL ORDER BY u.unit_index, u.id`, [sourceId]);
  return rows.map((r, i) => ({
    unit: `WV:${r.id}`, label: `${MARK[r.unit_type] ?? 'U'}${two(i + 1)}`,
    title: r.title, title_ar: meta(r.meta_json).arabic ?? null, short: null,
    ref: r.sessions ? `${r.sessions} session${r.sessions === 1 ? '' : 's'}` : null,
    page: wv(`sprint/page/unit/${r.id}`),
    // a chapter read in sessions is a level of its own
    down: r.sessions ? wv(`sprint/backlog/unit/${r.id}`) : null,
  }));
}

async function passages(env: WorldviewEnv, sourceId: string) {
  const rows = await query<{ id: string; chunk_index: number; heading_norm: string | null; page_no: number | null; head: string }>(env.DB_WV,
    `SELECT id, chunk_index, heading_norm, page_no, substr(text_content, 1, 80) AS head FROM wv_source_chunks
      WHERE source_id = ? ORDER BY chunk_index LIMIT 400`, [sourceId]);
  return rows.map((r, i) => ({
    unit: `WV:${r.id}`, label: `P${two(i + 1)}`, title: r.heading_norm ?? r.head, title_ar: null, short: null,
    ref: r.page_no != null ? `p. ${r.page_no}` : null, page: wv(`sprint/page/chunk/${r.id}`),
  }));
}

async function sessionsOf(env: WorldviewEnv, col: 'source_id' | 'source_unit_id', id: string) {
  const rows = await query<{ id: string; title: string | null; status: string }>(env.DB_WV,
    `SELECT r.id, r.title, r.status FROM wv_reading_sessions r LEFT JOIN wv_source_units u ON u.id = r.source_unit_id
      WHERE r.${col} = ? ORDER BY COALESCE(u.unit_index, 0), r.title, r.id`, [id]);
  return rows.map((r, i) => ({
    unit: `WV:${r.id}`, label: `S${two(i + 1)}`, title: r.title, title_ar: null, short: null,
    ref: r.status, page: wv(`sprint/page/session/${r.id}`),
  }));
}

/// The levels above a book: the Isms, then its ism — when it belongs to one.
async function upTo(env: WorldviewEnv, traditionId: string | null): Promise<SprintCrumb[]> {
  if (!traditionId) return [];
  const t = await queryOne<{ title: string; tradition_type: string }>(env.DB_WV,
    `SELECT title, tradition_type FROM wv_traditions WHERE id = ?`, [traditionId]);
  if (!t) return [];
  const ism = ISMS.split(',').includes(t.tradition_type);
  return [...(ism ? [isms()] : []), { label: t.title, source: wv(`sprint/backlog/tradition/${traditionId}`) }];
}

function isms(): SprintCrumb { return { label: 'Isms', source: wv(`sprint/backlog/traditions?type=${ISMS}`) }; }

async function count(env: WorldviewEnv, sql: string, id: string): Promise<number> {
  return (await queryOne<{ n: number }>(env.DB_WV, sql, [id]))?.n ?? 0;
}

function page(kicker: string, title: string | null, title_ar: string | null, summary: string | null, lines: SprintLine[]): SprintPage {
  return { kicker, title, title_ar, summary, face: 'ui', listen: null, lines, study: null };
}

const line = (en: string): SprintLine => ({ mark: null, ar: null, en, audio: null });

/// A passage's paragraph: Arabic when it is written in Arabic (a Persian or Arabic couplet), English otherwise.
const scriptLine = (t: string): SprintLine => /[؀-ۿ]/.test(t) && !/[A-Za-z]{4}/.test(t)
  ? { mark: null, ar: t, en: null, audio: null } : line(t);

function meta(raw: string | null): Record<string, unknown> & { arabic?: string } {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

/// core_beliefs as a list: JSON array, or one belief a line.
function beliefs(raw: string | null): string[] {
  if (!raw) return [];
  try { const v = JSON.parse(raw); if (Array.isArray(v)) return v.map(String); } catch { /* plain text */ }
  return raw.split('\n').map((l) => l.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);
}
