import type { Router } from '../../../shared/src/router';
import { notFound, ok } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { SprintBacklog, SprintLine, SprintPage } from '../../../shared/src/contracts/sprint';
import type { ArabicEnv } from '../env';

/// Arabic's side of the sprint contract (shared/src/contracts/sprint.ts). Four kinds of backlog, as the study's
/// data names one (owner, 2026-10-31: "series, or books/sources, or daily Arabic, or classes"):
///   /ar/sprint/backlog/series/:id    a series' episodes (ar_acquisition_ref children of a series)
///   /ar/sprint/backlog/work/:id      a book or source's parts (its ar_text_unit rows)
///   /ar/sprint/backlog/daily         the daily readings, ?domain= narrows them
///   /ar/sprint/backlog/class/:id     a class book's lessons (ar_lesson children; ?spine= for a book's top)
/// and the page of each unit: its Arabic, its English where there is one, and its audio where there is one.

const two = (n: number) => String(n).padStart(2, '0');

export function sprintRoutes(router: Router<ArabicEnv>) {
  // ── series → episodes
  router.get('/ar/sprint/backlog/series/:id', async (_req, env, { id }) => {
    const s = await queryOne<{ title_ar: string | null; title_en: string | null }>(env.DB_AR,
      `SELECT title_ar, title_en FROM ar_acquisition_ref WHERE id = ?`, [id]);
    if (!s) return notFound(`series ${id}`);
    const rows = await query<{ id: string; title_ar: string | null; title_en: string | null }>(env.DB_AR,
      `SELECT id, title_ar, title_en FROM ar_acquisition_ref WHERE parent_ref = ? ORDER BY sort_order, created_at, id`, [id]);
    return ok({
      title: 'Episode backlog', subtitle: s.title_en ?? s.title_ar,
      items: rows.map((r, i) => ({ unit: `AR:${r.id}`, label: `E${two(i + 1)}`, title: r.title_en ?? r.title_ar, title_ar: r.title_ar,
        short: null, ref: null, page: { module: 'ar', path: `sprint/page/work/${r.id}` } })),
    } satisfies SprintBacklog);
  });

  // ── a book or source → its parts
  router.get('/ar/sprint/backlog/work/:id', async (_req, env, { id }) => {
    const w = await queryOne<{ title_ar: string | null; title_en: string | null }>(env.DB_AR,
      `SELECT title_ar, title_en FROM ar_acquisition_ref WHERE id = ?`, [id]);
    if (!w) return notFound(`work ${id}`);
    const rows = await query<{ id: string; seq: number; part_no: number | null; page_no: number | null; title_ar: string | null }>(env.DB_AR,
      `SELECT id, seq, part_no, page_no, title_ar FROM ar_text_unit WHERE acq_ref_id = ? ORDER BY seq LIMIT 400`, [id]);
    return ok({
      title: 'Part backlog', subtitle: w.title_en ?? w.title_ar,
      items: rows.map((r, i) => ({ unit: `AR:${r.id}`, label: `${two(i + 1)}`, title: r.title_ar ?? `Part ${i + 1}`, title_ar: r.title_ar,
        short: null, ref: r.page_no != null ? `p. ${r.page_no}` : null,
        page: { module: 'ar', path: `sprint/page/part/${r.id}` } })),
    } satisfies SprintBacklog);
  });

  // ── daily Arabic → its readings
  router.get('/ar/sprint/backlog/daily', async (req, env) => {
    const domain = new URL(req.url).searchParams.get('domain');
    const rows = await query<{ slug: string; title_en: string | null; title_ar: string | null; level: string | null; lines: number | null }>(env.DB_AR,
      `SELECT slug, title_en, title_ar, level, lines FROM ar_daily_reading
        WHERE is_published = 1 ${domain ? 'AND domain_id = ?' : ''} ORDER BY sort_order, id`, domain ? [domain] : []);
    return ok({
      title: 'Daily backlog', subtitle: 'Daily Arabic',
      items: rows.map((r, i) => ({ unit: `AR:daily:${r.slug}`, label: `D${two(i + 1)}`, title: r.title_en, title_ar: r.title_ar,
        short: r.title_en, ref: [r.level, r.lines ? `${r.lines} lines` : null].filter(Boolean).join(' · ') || null,
        page: { module: 'ar', path: `sprint/page/daily/${r.slug}` } })),
    } satisfies SprintBacklog);
  });

  // ── a class book → its lessons
  router.get('/ar/sprint/backlog/class/:id', async (req, env, { id }) => {
    const spine = new URL(req.url).searchParams.get('spine');
    const root = await queryOne<{ title_ar: string | null; title_en: string | null }>(env.DB_AR,
      `SELECT title_ar, title_en FROM ar_lesson WHERE id = ?`, [id]);
    const rows = await query<{ id: string; title_ar: string | null; title_en: string | null; page_start: number | null }>(env.DB_AR,
      spine ? `SELECT id, title_ar, title_en, page_start FROM ar_lesson WHERE spine = ? AND parent_id IS NULL ORDER BY sort_order, id`
            : `SELECT id, title_ar, title_en, page_start FROM ar_lesson WHERE parent_id = ? ORDER BY sort_order, id`, [spine ?? id]);
    if (!rows.length) return notFound(`class ${id}`);
    return ok({
      title: 'Class backlog', subtitle: root?.title_en ?? root?.title_ar ?? spine,
      items: rows.map((r, i) => ({ unit: `AR:${r.id}`, label: `C${two(i + 1)}`, title: r.title_en ?? r.title_ar, title_ar: r.title_ar,
        short: null, ref: r.page_start != null ? `p. ${r.page_start}` : null,
        page: { module: 'ar', path: `sprint/page/lesson/${r.id}` } })),
    } satisfies SprintBacklog);
  });

  // ── pages
  router.get('/ar/sprint/page/work/:id', async (_req, env, { id }) => {
    const w = await queryOne<{ title_ar: string | null; title_en: string | null; note_ar: string | null }>(env.DB_AR,
      `SELECT title_ar, title_en, note_ar FROM ar_acquisition_ref WHERE id = ?`, [id]);
    if (!w) return notFound(`work ${id}`);
    const parts = await query<{ text_ar: string | null; script_json: string | null }>(env.DB_AR,
      `SELECT text_ar, script_json FROM ar_text_unit WHERE acq_ref_id = ? ORDER BY seq LIMIT 60`, [id]);
    return ok(page('EPISODE', w.title_en ?? w.title_ar, w.title_ar, w.note_ar, parts.flatMap((p) => linesOf(p.text_ar, p.script_json))));
  });

  router.get('/ar/sprint/page/part/:id', async (_req, env, { id }) => {
    const p = await queryOne<{ title_ar: string | null; text_ar: string | null; script_json: string | null; seq: number; page_no: number | null }>(env.DB_AR,
      `SELECT title_ar, text_ar, script_json, seq, page_no FROM ar_text_unit WHERE id = ?`, [id]);
    if (!p) return notFound(`part ${id}`);
    return ok(page(`PART ${p.seq}${p.page_no != null ? ` · p. ${p.page_no}` : ''}`, p.title_ar, p.title_ar, null, linesOf(p.text_ar, p.script_json)));
  });

  router.get('/ar/sprint/page/daily/:slug', async (_req, env, { slug }) => {
    const r = await queryOne<{ title_en: string | null; title_ar: string | null; subtitle_en: string | null; level: string | null; body_md: string | null }>(env.DB_AR,
      `SELECT title_en, title_ar, subtitle_en, level, body_md FROM ar_daily_reading WHERE slug = ?`, [slug]);
    if (!r) return notFound(`reading ${slug}`);
    // each ```read block is a line: its Arabic, its English, its own recording
    const lines: SprintLine[] = [];
    for (const m of (r.body_md ?? '').matchAll(/```read\n([\s\S]*?)\n```/g)) {
      try {
        const l = JSON.parse(m[1]) as { ar?: string; en?: string; audio?: string };
        if (l.ar) lines.push({ mark: null, ar: l.ar, en: l.en ?? null, audio: l.audio ? { url: l.audio, start: 0, end: 0 } : null });
      } catch { /* a block that does not parse is left out */ }
    }
    const p = page(`DAILY${r.level ? ` · ${r.level}` : ''}`, r.title_en, r.title_ar, r.subtitle_en, lines);
    if (lines.some((l) => l.audio)) p.listen = { label: 'Listen to it all', detail: `${lines.length} lines` };
    return ok(p);
  });

  router.get('/ar/sprint/page/lesson/:id', async (_req, env, { id }) => {
    const l = await queryOne<{ title_ar: string | null; title_en: string | null; page_start: number | null; spine: string | null }>(env.DB_AR,
      `SELECT title_ar, title_en, page_start, spine FROM ar_lesson WHERE id = ?`, [id]);
    if (!l) return notFound(`lesson ${id}`);
    const kids = await query<{ title_ar: string | null; title_en: string | null }>(env.DB_AR,
      `SELECT title_ar, title_en FROM ar_lesson WHERE parent_id = ? ORDER BY sort_order, id`, [id]);
    return ok(page(`CLASS${l.page_start != null ? ` · p. ${l.page_start}` : ''}`, l.title_en ?? l.title_ar, l.title_ar, null,
      kids.filter((k) => k.title_ar).map((k) => ({ mark: '·', ar: k.title_ar, en: k.title_en, audio: null }))));
  });
}

function page(kicker: string, title: string | null, title_ar: string | null, summary: string | null, lines: SprintLine[]): SprintPage {
  return { kicker, title, title_ar, summary, face: 'ui', listen: null, lines, study: null };
}

/// A part's lines: its script's lines when it has one (Arabic, English), else its text a paragraph a line.
function linesOf(text: string | null, script: string | null): SprintLine[] {
  if (script) {
    try {
      const s = JSON.parse(script) as { lines?: Array<{ ar?: string; en?: string }> } | Array<{ ar?: string; en?: string }>;
      const ls = Array.isArray(s) ? s : s.lines ?? [];
      const out = ls.filter((l) => l.ar).map((l) => ({ mark: null, ar: l.ar!, en: l.en ?? null, audio: null }));
      if (out.length) return out;
    } catch { /* fall back to the text */ }
  }
  // the text is often markdown (page headings, file links, rules): keep the lines that hold Arabic, marks stripped
  return (text ?? '').split(/\n+/)
    .map((t) => t.replace(/\[[^\]]*\]\([^)]*\)/g, '').replace(/^#+\s*/, '').replace(/[*_{}]/g, '').trim())
    .filter((t) => /[\u0621-\u064A]/.test(t)).slice(0, 80)
    .map((t) => ({ mark: null, ar: t, en: null, audio: null }));
}
