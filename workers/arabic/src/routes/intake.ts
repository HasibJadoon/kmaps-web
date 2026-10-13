import type { Router } from '../../../shared/src/router';
import { ok, created, badRequest, notFound, conflict, unauthorized, forbidden } from '../../../shared/src/response';
import { query, queryOne, execute } from '../../../shared/src/db';
import { actorRef, forwardedReviewer } from '../../../shared/src/auth';
import { labels, byKey, type Label } from '../lib/labels';
import type { ArabicEnv } from '../env';

// The intake queue (migration 0039): everything found for the climb toward classical tafsīr,
// logged before it is scraped, then worked through the pipeline. Every word and colour the
// screens show comes from ar_practice_label (scopes intake, intake_strand, intake_level,
// intake_status, intake_register), resolved here, so the apps only render.

interface Row {
  id: string; parent_id: string | null; kind: string; url: string; platform: string; external_id: string | null;
  title_ar: string | null; title_en: string | null; channel: string | null; seq: number | null; duration_sec: number | null;
  item_count: number | null; register: string; genre_ref: string | null; strand: string; level: string; priority: number;
  status: string; acq_ref_id: string | null; note: string | null; added_by: string | null; meta_json: string;
  created_at: string; child_count?: number; live_count?: number;
}

type Scopes = Record<string, Label[]>;
const badge = (l: Label | undefined, key: string) => ({
  key, label: l?.label ?? key, labelAr: l?.labelAr ?? null, icon: l?.icon ?? null, color: l?.color ?? null,
});
const fill = (t: string | null | undefined, v: Record<string, string | number>) =>
  (t ?? '').replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));

function shape(r: Row, L: Scopes) {
  const W = byKey(L.intake);
  let meta: Record<string, unknown> = {};
  try { meta = JSON.parse(r.meta_json || '{}'); } catch { /* keep empty */ }
  const n = r.child_count ?? r.item_count ?? 0;
  return {
    id: r.id, kind: r.kind, url: r.url, platform: r.platform,
    title: r.title_ar ?? r.title_en ?? r.url, titleEn: r.title_en, channel: r.channel,
    subtitle: n ? fill(W.get('episodes')?.label, { n }) : null,
    subtitleAr: n ? fill(W.get('episodes')?.labelAr, { n }) : null,
    seq: r.seq, durationSec: r.duration_sec, priority: r.priority, note: r.note,
    childCount: r.child_count ?? 0, liveCount: r.live_count ?? 0,
    strand: badge(byKey(L.intake_strand).get(r.strand), r.strand),
    level: badge(byKey(L.intake_level).get(r.level), r.level),
    status: badge(byKey(L.intake_status).get(r.status), r.status),
    register: badge(byKey(L.intake_register).get(r.register), r.register),
    acqRefId: r.acq_ref_id, sent: meta.sent === true, createdAt: r.created_at,
  };
}

const option = (l: Label) => ({ key: l.key, label: l.label, labelAr: l.labelAr, detail: l.detail, icon: l.icon, color: l.color });
const words = (L: Scopes) => Object.fromEntries((L.intake ?? []).map((l) => [l.key,
  { label: l.label, labelAr: l.labelAr, detail: l.detail, icon: l.icon }]));

const ORDER = `lv.min_value, i.priority DESC, s.min_value DESC, i.created_at`;
const JOINS = `JOIN ar_practice_label st ON st.scope = 'intake_strand' AND st.key = i.strand
               JOIN ar_practice_label lv ON lv.scope = 'intake_level'  AND lv.key = i.level
               JOIN ar_practice_label s  ON s.scope  = 'intake_status' AND s.key  = i.status`;
const COUNTS = `(SELECT COUNT(1) FROM ar_intake_item c WHERE c.parent_id = i.id) AS child_count,
                (SELECT COUNT(1) FROM ar_intake_item c WHERE c.parent_id = i.id AND c.status = 'live') AS live_count`;

/** What a pasted link is: its platform, kind and the id it is known by there. */
export function readLink(raw: string): { url: string; platform: string; kind: string; externalId: string | null } | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.replace(/^(www\.|m\.)/, '');
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    return id ? { url: `https://youtu.be/${id}`, platform: 'youtube', kind: 'video', externalId: id } : null;
  }
  if (host === 'youtube.com' || host === 'music.youtube.com') {
    const list = u.searchParams.get('list'), v = u.searchParams.get('v');
    if (u.pathname === '/playlist' && list)
      return { url: `https://www.youtube.com/playlist?list=${list}`, platform: 'youtube', kind: 'playlist', externalId: list };
    if (u.pathname === '/watch' && v) return { url: `https://youtu.be/${v}`, platform: 'youtube', kind: 'video', externalId: v };
    const short = u.pathname.match(/^\/shorts\/([\w-]{6,})/);
    if (short) return { url: `https://youtu.be/${short[1]}`, platform: 'youtube', kind: 'short', externalId: short[1] };
    const ch = u.pathname.match(/^\/(@[^/]+|channel\/[\w-]+|c\/[^/]+|user\/[^/]+)/);
    if (ch) {
      const id = ch[1].split('/').pop()!;
      return { url: `https://www.youtube.com/${ch[1]}`, platform: 'youtube', kind: 'channel', externalId: id };
    }
    return null;
  }
  return { url: u.toString(), platform: host, kind: 'page', externalId: null };
}

async function titleOf(url: string, platform: string): Promise<{ title: string | null; channel: string | null }> {
  if (platform !== 'youtube') return { title: null, channel: null };
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`);
    if (!r.ok) return { title: null, channel: null };
    const j = await r.json() as { title?: string; author_name?: string };
    return { title: j.title ?? null, channel: j.author_name ?? null };
  } catch { return { title: null, channel: null }; }
}

export function intakeRoutes(router: Router<ArabicEnv>) {
  // The intake: its words, the strands with their counts, what is next, and the items asked for.
  router.get('/ar/intake', async (req, env) => {
    if (!actorRef(req)) return unauthorized();
    const p = new URL(req.url).searchParams;
    const L = await labels(env);
    const where: string[] = ['i.parent_id IS NULL'], args: unknown[] = [];
    for (const k of ['strand', 'level', 'status'] as const) {
      const v = p.get(k); if (v) { where.push(`i.${k} = ?`); args.push(v); }
    }
    const q = p.get('q')?.trim();
    if (q) { where.push(`(i.title_ar LIKE ? OR i.title_en LIKE ? OR i.channel LIKE ? OR i.note LIKE ?)`); args.push(...Array(4).fill(`%${q}%`)); }
    const nextSize = byKey(L.intake).get('next_up')?.min ?? 12;
    const [items, next, counts] = await Promise.all([
      query<Row>(env.DB_AR, `SELECT i.*, ${COUNTS} FROM ar_intake_item i ${JOINS} WHERE ${where.join(' AND ')} ORDER BY st.min_value, ${ORDER} LIMIT 500`, args),
      // every strand moves at once: the first few of each, easiest first within it, taken in turn
      query<Row>(env.DB_AR, `SELECT * FROM (
          SELECT i.*, ${COUNTS}, st.min_value AS strand_step,
                 ROW_NUMBER() OVER (PARTITION BY i.strand ORDER BY ${ORDER}) AS turn
            FROM ar_intake_item i ${JOINS}
           WHERE i.parent_id IS NULL AND json_extract(s.extra_json, '$.active') = 1 AND i.status <> 'logged')
         WHERE turn <= ? ORDER BY turn, strand_step`,
        [Math.max(1, Math.ceil(nextSize / Math.max(1, (L.intake_strand ?? []).length)))]),
      query<{ strand: string; status: string; n: number }>(env.DB_AR,
        `SELECT strand, status, COUNT(1) AS n FROM ar_intake_item GROUP BY 1, 2`),
    ]);
    const tally = (strand: string) => {
      const rows = counts.filter((c) => c.strand === strand);
      const sum = (f: (s: string) => boolean) => rows.filter((c) => f(c.status)).reduce((a, c) => a + c.n, 0);
      return { total: sum(() => true), live: sum((s) => s === 'live'), logged: sum((s) => s === 'logged') };
    };
    return ok({
      words: words(L),
      strands: (L.intake_strand ?? []).map((l) => ({ ...option(l), counts: tally(l.key) })),
      levels: (L.intake_level ?? []).map(option),
      statuses: (L.intake_status ?? []).map(option),
      registers: (L.intake_register ?? []).map(option),
      next: next.map((r) => shape(r, L)),
      items: items.map((r) => shape(r, L)),
    });
  });

  // One item and what it holds, in their order.
  router.get('/ar/intake/:id', async (req, env, { id }) => {
    if (!actorRef(req)) return unauthorized();
    const L = await labels(env);
    const item = await queryOne<Row>(env.DB_AR, `SELECT i.*, ${COUNTS} FROM ar_intake_item i WHERE i.id = ?`, [id]);
    if (!item) return notFound(`intake item ${id}`);
    const children = await query<Row>(env.DB_AR,
      `SELECT i.*, 0 AS child_count, 0 AS live_count FROM ar_intake_item i WHERE i.parent_id = ? ORDER BY i.seq, i.created_at`, [id]);
    return ok({ words: words(L), item: shape(item, L), children: children.map((r) => shape(r, L)) });
  });

  // Log something new: a link, and optionally why it is good and where it sits.
  router.post('/ar/intake', async (req, env) => {
    const me = actorRef(req);
    if (!me) return unauthorized();
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    const link = readLink(String(b.url ?? ''));
    if (!link) return badRequest('a link is needed');
    const L = await labels(env);
    const pick = (scope: string, v: unknown, dflt: string) => {
      const k = typeof v === 'string' ? v : dflt;
      return byKey(L[scope]).has(k) ? k : null;
    };
    const strand = pick('intake_strand', b.strand, 'lugha'), level = pick('intake_level', b.level, 'middle');
    const register = pick('intake_register', b.register, 'fusha_muasira');
    if (!strand || !level) return badRequest('unknown strand or level');
    if (!register) return badRequest('only classical or fuṣḥā Arabic is taken');
    const priority = Math.min(5, Math.max(1, Number(b.priority) || 3));
    const dup = await queryOne<{ id: string }>(env.DB_AR, `SELECT id FROM ar_intake_item WHERE url = ?`, [link.url]);
    if (dup) return conflict(byKey(L.intake).get('duplicate')?.detail ?? `already logged: ${dup.id}`);
    const t = await titleOf(link.url, link.platform);
    const id = `IN:${link.platform === 'youtube' ? 'yt' : link.platform}:${link.externalId ?? crypto.randomUUID()}`;
    await execute(env.DB_AR,
      `INSERT INTO ar_intake_item (id, kind, url, platform, external_id, title_ar, channel, register, strand, level, priority, status, note, added_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'logged', ?, ?)`,
      [id, link.kind, link.url, link.platform, link.externalId, (b.title as string) || t.title, t.channel,
       register, strand, level, priority, (b.note as string) || null, me]);
    const row = await queryOne<Row>(env.DB_AR, `SELECT i.*, ${COUNTS} FROM ar_intake_item i WHERE i.id = ?`, [id]);
    return created(shape(row!, L));
  });

  // Triage: move it along the pipeline, re-place it, or say why it is good. A reviewer may change
  // anything; anyone else only what they logged themselves.
  router.patch('/ar/intake/:id', async (req, env, { id }) => {
    const me = actorRef(req);
    if (!me) return unauthorized();
    const row = await queryOne<Row>(env.DB_AR, `SELECT * FROM ar_intake_item WHERE id = ?`, [id]);
    if (!row) return notFound(`intake item ${id}`);
    if (!forwardedReviewer(req) && row.added_by !== me) return forbidden();
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    const L = await labels(env);
    const sets: string[] = [], args: unknown[] = [];
    const scoped: Record<string, string> = { status: 'intake_status', strand: 'intake_strand', level: 'intake_level', register: 'intake_register' };
    for (const [col, scope] of Object.entries(scoped)) {
      if (b[col] === undefined) continue;
      if (!byKey(L[scope]).has(String(b[col]))) return badRequest(`unknown ${col}`);
      sets.push(`${col} = ?`); args.push(String(b[col]));
    }
    if (b.priority !== undefined) { sets.push('priority = ?'); args.push(Math.min(5, Math.max(1, Number(b.priority) || 3))); }
    if (b.note !== undefined) { sets.push('note = ?'); args.push(b.note ? String(b.note) : null); }
    if (b.title !== undefined) { sets.push('title_ar = ?'); args.push(b.title ? String(b.title) : null); }
    if (!sets.length) return badRequest('nothing to change');
    // a playlist's or channel's strand, level and register carry to what it holds
    const carry = ['strand', 'level', 'register'].filter((c) => b[c] !== undefined);
    await execute(env.DB_AR, `UPDATE ar_intake_item SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`, [...args, id]);
    if (carry.length)
      await execute(env.DB_AR, `UPDATE ar_intake_item SET ${carry.map((c) => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE parent_id = ?`,
        [...carry.map((c) => String(b[c])), id]);
    const fresh = await queryOne<Row>(env.DB_AR, `SELECT i.*, ${COUNTS} FROM ar_intake_item i WHERE i.id = ?`, [id]);
    return ok(shape(fresh!, L));
  });
}
