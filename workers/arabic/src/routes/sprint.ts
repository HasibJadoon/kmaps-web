import type { Router } from '../../../shared/src/router';
import { notFound, ok } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { SprintBacklog, SprintLine, SprintPage } from '../../../shared/src/contracts/sprint';
import type { ArabicEnv } from '../env';

/// Arabic's side of the sprint contract (shared/src/contracts/sprint.ts). Four kinds of backlog, as the study's
/// data names one (owner, 2026-10-31: "series, or books/sources, or daily Arabic, or classes"):
///   /ar/sprint/backlog/series/:id    a series' episodes (ar_acquisition_ref children of a series)
///   /ar/sprint/backlog/work/:id      a book or source by chapters (part_no) or pages (?by=pages); ?part=N a chapter's pages
///   /ar/sprint/backlog/daily         the daily readings, ?domain= narrows them
///   /ar/sprint/backlog/class/:id     a class book's lessons (ar_lesson children; ?spine= for a book's top)
/// and the page of each unit: its Arabic, its English where there is one, and its audio where there is one.

const two = (n: number) => String(n).padStart(2, '0');

export function sprintRoutes(router: Router<ArabicEnv>) {
  // ── the Arabic stream's queue: its four kinds, each a level of its own
  router.get('/ar/sprint/backlog/kinds', async () => ok({
    title: 'Arabic backlog', subtitle: 'Series · Books · Daily · Classes',
    items: [
      { key: 'series', label: 'SER', title: 'Series', title_ar: 'المسلسلات' },
      { key: 'books', label: 'BK', title: 'Books', title_ar: 'الكتب' },
      { key: 'daily', label: 'DLY', title: 'Daily Arabic', title_ar: 'العربية اليومية' },
      { key: 'classes', label: 'CLS', title: 'Classes', title_ar: 'الدروس' },
    ].map((k) => ({ unit: `AR:kind:${k.key}`, label: k.label, title: k.title, title_ar: k.title_ar, short: k.title, ref: null,
      page: null, down: { module: 'ar', path: k.key === 'daily' ? 'sprint/backlog/daily' : `sprint/backlog/${k.key}` }, pullable: false })),
  } satisfies SprintBacklog));

  const UP_KINDS = [{ label: 'Arabic', source: { module: 'ar', path: 'sprint/backlog/kinds' } }];

  router.get('/ar/sprint/backlog/series', async (_req, env) => {
    const rows = await query<{ id: string; title_ar: string | null; title_en: string | null; n: number }>(env.DB_AR,
      `SELECT p.id, p.title_ar, p.title_en, (SELECT COUNT(*) FROM ar_acquisition_ref c WHERE c.parent_ref = p.id) AS n
         FROM ar_acquisition_ref p WHERE p.medium = 'series' ORDER BY p.sort_order, p.title_en`);
    return ok({ title: 'Series backlog', subtitle: `${rows.length} series`, up: UP_KINDS,
      items: rows.map((r, i) => ({ unit: `AR:${r.id}`, label: `SR${two(i + 1)}`, title: r.title_en ?? r.title_ar, title_ar: r.title_ar,
        short: null, ref: `${r.n} episodes`, page: null, down: { module: 'ar', path: `sprint/backlog/series/${r.id}` } })),
    } satisfies SprintBacklog);
  });

  router.get('/ar/sprint/backlog/books', async (_req, env) => {
    const rows = await query<{ id: string; title_ar: string | null; title_en: string | null; n: number }>(env.DB_AR,
      `SELECT r.id, r.title_ar, r.title_en, COUNT(u.id) AS n FROM ar_acquisition_ref r JOIN ar_text_unit u ON u.acq_ref_id = r.id
        WHERE r.medium = 'text' GROUP BY r.id HAVING n > 1 ORDER BY r.sort_order, r.title_en, r.title_ar LIMIT 300`);
    return ok({ title: 'Book backlog', subtitle: `${rows.length} books`, up: UP_KINDS,
      items: rows.map((r, i) => ({ unit: `AR:${r.id}`, label: `BK${two(i + 1)}`, title: r.title_en ?? r.title_ar, title_ar: r.title_ar,
        short: null, ref: `${r.n} pages`, page: { module: 'ar', path: `sprint/page/work/${r.id}` }, down: { module: 'ar', path: `sprint/backlog/work/${r.id}` } })),
    } satisfies SprintBacklog);
  });

  router.get('/ar/sprint/backlog/classes', async (_req, env) => {
    const rows = await query<{ spine: string; discipline: string | null; n: number; title_ar: string | null }>(env.DB_AR,
      `SELECT spine, MIN(discipline) AS discipline, COUNT(*) AS n,
              (SELECT l2.title_ar FROM ar_lesson l2 WHERE l2.spine = l.spine AND l2.parent_id IS NULL ORDER BY l2.sort_order LIMIT 1) AS title_ar
         FROM ar_lesson l GROUP BY spine ORDER BY n DESC`);
    return ok({ title: 'Class backlog', subtitle: `${rows.length} class books`, up: UP_KINDS,
      items: rows.map((r, i) => ({ unit: `AR:spine:${r.spine}`, label: `CL${two(i + 1)}`, title: r.spine.replace(/_/g, ' '), title_ar: null,
        short: null, ref: `${r.n} lessons · ${r.discipline ?? ''}`.trim(), page: null,
        down: { module: 'ar', path: `sprint/backlog/class/x?spine=${encodeURIComponent(r.spine)}` } })),
    } satisfies SprintBacklog);
  });

  // ── series → episodes
  router.get('/ar/sprint/backlog/series/:id', async (_req, env, { id }) => {
    const s = await queryOne<{ title_ar: string | null; title_en: string | null }>(env.DB_AR,
      `SELECT title_ar, title_en FROM ar_acquisition_ref WHERE id = ?`, [id]);
    if (!s) return notFound(`series ${id}`);
    const rows = await query<{ id: string; title_ar: string | null; title_en: string | null }>(env.DB_AR,
      `SELECT id, title_ar, title_en FROM ar_acquisition_ref WHERE parent_ref = ? ORDER BY sort_order, created_at, id`, [id]);
    return ok({
      title: 'Episode backlog', subtitle: s.title_en ?? s.title_ar,
      up: [...UP_KINDS, { label: 'Series', source: { module: 'ar', path: 'sprint/backlog/series' } }],
      items: rows.map((r, i) => ({ unit: `AR:${r.id}`, label: `E${two(i + 1)}`, title: r.title_en ?? r.title_ar, title_ar: r.title_ar,
        short: null, ref: null, page: { module: 'ar', path: `sprint/page/work/${r.id}` } })),
    } satisfies SprintBacklog);
  });

  // ── a book or source → its chapters (its part numbers) or its pages; a chapter → its pages
  router.get('/ar/sprint/backlog/work/:id', async (req, env, { id }) => {
    const w = await queryOne<{ title_ar: string | null; title_en: string | null }>(env.DB_AR,
      `SELECT title_ar, title_en FROM ar_acquisition_ref WHERE id = ?`, [id]);
    if (!w) return notFound(`work ${id}`);
    const q = new URL(req.url).searchParams;
    const part = q.get('part');
    const chapters = await query<{ part_no: number; n: number; title_ar: string | null; page_from: number | null }>(env.DB_AR,
      `SELECT part_no, COUNT(*) AS n, MIN(title_ar) AS title_ar, MIN(page_no) AS page_from FROM ar_text_unit
        WHERE acq_ref_id = ? AND part_no IS NOT NULL GROUP BY part_no ORDER BY part_no`, [id]);
    const name = w.title_en ?? w.title_ar;
    const self = (by: string) => ({ module: 'ar', path: `sprint/backlog/work/${id}?by=${by}` });
    const views = chapters.length > 1
      ? [{ label: 'Chapters', source: self('chapters'), on: !part && q.get('by') !== 'pages' },
         { label: 'Pages', source: self('pages'), on: !part && q.get('by') === 'pages' }]
      : undefined;
    if (!part && chapters.length > 1 && q.get('by') !== 'pages') {
      return ok({
        title: 'Chapter backlog', subtitle: name, views,
        items: chapters.map((c, i) => ({ unit: `AR:${id}:part:${c.part_no}`, label: `CH${two(i + 1)}`, title: c.title_ar ?? `Part ${c.part_no}`,
          title_ar: c.title_ar, short: null, ref: `${c.n} page${c.n === 1 ? '' : 's'}`,
          page: { module: 'ar', path: `sprint/page/work/${id}?part=${c.part_no}` },
          down: { module: 'ar', path: `sprint/backlog/work/${id}?part=${c.part_no}` } })),
      } satisfies SprintBacklog);
    }
    const rows = await query<{ id: string; seq: number; page_no: number | null; title_ar: string | null }>(env.DB_AR,
      `SELECT id, seq, page_no, title_ar FROM ar_text_unit WHERE acq_ref_id = ? ${part ? 'AND part_no = ?' : ''} ORDER BY seq LIMIT 400`,
      part ? [id, Number(part)] : [id]);
    return ok({
      title: 'Page backlog', subtitle: part ? `${name} · part ${part}` : name, views: part ? undefined : views,
      up: part ? [{ label: name ?? id, source: self('chapters') }] : undefined,
      items: rows.map((r, i) => ({ unit: `AR:${r.id}`, label: two(i + 1), title: r.title_ar ?? `Page ${r.page_no ?? i + 1}`, title_ar: r.title_ar,
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
      title: 'Daily backlog', subtitle: 'Daily Arabic', up: UP_KINDS,
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
      title: 'Lesson backlog', subtitle: root?.title_en ?? root?.title_ar ?? spine?.replace(/_/g, ' ') ?? null,
      up: [...UP_KINDS, { label: 'Classes', source: { module: 'ar', path: 'sprint/backlog/classes' } }],
      items: rows.map((r, i) => ({ unit: `AR:${r.id}`, label: `C${two(i + 1)}`, title: r.title_en ?? r.title_ar, title_ar: r.title_ar,
        short: null, ref: r.page_start != null ? `p. ${r.page_start}` : null,
        page: { module: 'ar', path: `sprint/page/lesson/${r.id}` } })),
    } satisfies SprintBacklog);
  });

  // ── pages
  router.get('/ar/sprint/page/work/:id', async (req, env, { id }) => {
    const w = await queryOne<{ title_ar: string | null; title_en: string | null; note_ar: string | null }>(env.DB_AR,
      `SELECT title_ar, title_en, note_ar FROM ar_acquisition_ref WHERE id = ?`, [id]);
    if (!w) return notFound(`work ${id}`);
    const part = new URL(req.url).searchParams.get('part');
    const parts = await query<{ text_ar: string | null; script_json: string | null }>(env.DB_AR,
      `SELECT text_ar, script_json FROM ar_text_unit WHERE acq_ref_id = ? ${part ? 'AND part_no = ?' : ''} ORDER BY seq LIMIT 60`,
      part ? [id, Number(part)] : [id]);
    return ok(page(part ? `PART ${part}` : 'EPISODE', w.title_en ?? w.title_ar, w.title_ar, w.note_ar, parts.flatMap((p) => linesOf(p.text_ar, p.script_json))));
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
