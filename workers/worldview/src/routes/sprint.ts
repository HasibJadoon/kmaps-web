import type { Router } from '../../../shared/src/router';
import { notFound, ok } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { SprintBacklog, SprintLine, SprintPage } from '../../../shared/src/contracts/sprint';
import type { WorldviewEnv } from '../env';

/// Worldview's side of the sprint contract (shared/src/contracts/sprint.ts). Two kinds of backlog, named by the
/// study's data:
///   /wv/sprint/backlog/traditions?type=ideology,movement   the isms — traditions of those types, a tile each
///   /wv/sprint/backlog/source/:id                         a source's top-level units — an arc's phases, a book's chapters
/// and a page for each: an ism's beliefs and the positions recorded for it; a unit's description, readings and text.

/// A tile's mark by what it is: PH01 for a phase, CH01 for a chapter.
const MARK: Record<string, string> = { phase: 'PH', chapter: 'CH', section: 'S', volume: 'V', lecture: 'L' };

export function sprintRoutes(router: Router<WorldviewEnv>) {
  router.get('/wv/sprint/backlog/traditions', async (req, env) => {
    const types = (new URL(req.url).searchParams.get('type') ?? 'ideology').split(',').map((t) => t.trim()).filter(Boolean);
    const rows = await query<{ id: string; title: string; title_ar: string | null; founded_period: string | null; geographic_origin: string | null }>(env.DB_WV,
      `SELECT id, title, title_ar, founded_period, geographic_origin FROM wv_traditions
        WHERE tradition_type IN (${types.map(() => '?').join(',')}) ORDER BY title`, types);
    const body: SprintBacklog = {
      title: 'Isms backlog',
      subtitle: `${rows.length} worldviews`,
      items: rows.map((r, i) => ({
        unit: `WV:${r.id}`,
        label: String(i + 1).padStart(2, '0'),
        title: r.title, title_ar: r.title_ar, short: r.title,
        ref: [r.founded_period, r.geographic_origin].filter(Boolean).join(' · ') || null,
        page: { module: 'wv', path: `sprint/page/tradition/${r.id}` },
      })),
    };
    return ok(body);
  });

  router.get('/wv/sprint/backlog/source/:id', async (_req, env, { id }) => {
    const src = await queryOne<{ title: string }>(env.DB_WV, `SELECT title FROM wv_sources WHERE id = ?`, [id]);
    if (!src) return notFound(`source ${id}`);
    const rows = await query<{ id: string; title: string; unit_type: string; unit_index: number | null; meta_json: string | null }>(env.DB_WV,
      `SELECT id, title, unit_type, unit_index, meta_json FROM wv_source_units
        WHERE source_id = ? AND parent_id IS NULL ORDER BY unit_index, id`, [id]);
    const kind = rows[0]?.unit_type ?? 'unit';
    const body: SprintBacklog = {
      title: `${kind[0].toUpperCase()}${kind.slice(1)} backlog`,
      subtitle: src.title,
      items: rows.map((r, i) => ({
        unit: `WV:${r.id}`,
        label: `${MARK[r.unit_type] ?? 'U'}${String(i + 1).padStart(2, '0')}`,
        title: r.title, title_ar: meta(r.meta_json).arabic ?? null, short: null, ref: null,
        page: { module: 'wv', path: `sprint/page/unit/${r.id}` },
      })),
    };
    return ok(body);
  });

  router.get('/wv/sprint/page/tradition/:id', async (_req, env, { id }) => {
    const t = await queryOne<{ title: string; title_ar: string | null; tradition_type: string; founded_period: string | null;
      geographic_origin: string | null; core_beliefs: string | null; description_md: string | null }>(env.DB_WV,
      `SELECT title, title_ar, tradition_type, founded_period, geographic_origin, core_beliefs, description_md
         FROM wv_traditions WHERE id = ?`, [id]);
    if (!t) return notFound(`tradition ${id}`);
    const positions = await query<{ position_title: string | null; position_text: string }>(env.DB_WV,
      `SELECT position_title, position_text FROM wv_value_positions
        WHERE tradition_id = ? AND COALESCE(status, 'live') != 'deleted' ORDER BY created_at`, [id]);
    const lines: SprintLine[] = [
      ...beliefs(t.core_beliefs).map((b) => ({ mark: null, ar: null, en: b, audio: null })),
      ...positions.map((p) => ({ mark: null, ar: null, en: p.position_title ? `${p.position_title} — ${p.position_text}` : p.position_text, audio: null })),
    ];
    const body: SprintPage = {
      kicker: [t.tradition_type.toUpperCase(), t.founded_period, t.geographic_origin].filter(Boolean).join(' · '),
      title: t.title, title_ar: t.title_ar,
      summary: t.description_md ?? (lines.length ? null : 'Nothing is recorded for it yet: its beliefs and positions come in as it is built.'),
      face: 'ui', listen: null, lines, study: null,
    };
    return ok(body);
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
      ...blocks.map((b) => ({ mark: null, ar: null, en: b.text, audio: null })),
      ...(blocks.length || !u.text_excerpt ? [] : [{ mark: null, ar: null, en: u.text_excerpt, audio: null }]),
    ];
    const body: SprintPage = {
      kicker: `${u.unit_type.toUpperCase()}${u.unit_index != null ? ` ${u.unit_index + 1}` : ''} · ${u.source}`,
      title: u.title, title_ar: (m.arabic as string | undefined) ?? null, summary: u.description_md,
      face: 'ui', listen: null, lines, study: null,
    };
    return ok(body);
  });
}

function meta(raw: string | null): Record<string, unknown> & { arabic?: string } {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

/// core_beliefs as a list: JSON array, or one belief a line.
function beliefs(raw: string | null): string[] {
  if (!raw) return [];
  try { const v = JSON.parse(raw); if (Array.isArray(v)) return v.map(String); } catch { /* plain text */ }
  return raw.split('\n').map((l) => l.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);
}
