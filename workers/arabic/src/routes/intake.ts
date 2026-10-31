import type { Router } from '../../../shared/src/router';
import { ok, created, badRequest, notFound, conflict, unauthorized, forbidden } from '../../../shared/src/response';
import { query, queryOne, execute } from '../../../shared/src/db';
import { actorRef, forwardedReviewer } from '../../../shared/src/auth';
import { labels, byKey, type Label } from '../lib/labels';
import type { ArabicEnv } from '../env';
import { DOMAINS, FLAG, boards, stagesOf, enter, leave, setStage, type Domain, type DomainStage } from '../lib/intake-domains';

// The intake (migrations 0039–0042): the one inbox where everything found on the way to classical
// tafsīr is logged and triaged, then routed to up to three domains — Arabic, Qurʾān, Worldview —
// each of which runs its own pipeline (lib/intake-domains.ts). Every word and colour the
// screens show comes from ar_practice_label (scopes intake, intake_strand, intake_level,
// intake_status, intake_register), resolved here, so the apps only render.

interface Row {
  id: string; parent_id: string | null; kind: string; url: string; platform: string; external_id: string | null;
  title_ar: string | null; title_en: string | null; channel: string | null; seq: number | null; duration_sec: number | null;
  item_count: number | null; register: string; genre_ref: string | null; strand: string; level: string; priority: number;
  status: string; form: string; to_ar: number; to_qr: number; to_wv: number; path_lane: string | null; path_rank: number | null; wv_source_ref: string | null; acq_ref_id: string | null; note: string | null; added_by: string | null; meta_json: string;
  created_at: string; child_count?: number; live_count?: number;
}

type Scopes = Record<string, Label[]>;
const badge = (l: Label | undefined, key: string) => ({
  key, label: l?.label ?? key, labelAr: l?.labelAr ?? null, icon: l?.icon ?? null, color: l?.color ?? null,
});
const fill = (t: string | null | undefined, v: Record<string, string | number>) =>
  (t ?? '').replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));

type Stages = Record<Domain, Map<string, DomainStage>>;

function shape(r: Row, L: Scopes, st?: Stages) {
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
    form: badge(byKey(L.intake_form).get(r.form), r.form),
    // where it goes, and how far each domain has taken it
    domains: (L.intake_domain ?? []).filter((l) => (DOMAINS as readonly string[]).includes(l.key)).map((l) => {
      const d = l.key as Domain, at = st?.[d].get(r.id);
      return { domain: badge(l, d), on: !!(r as unknown as Record<string, number>)[FLAG[d]], stage: at?.stage ?? null, targetRef: at?.targetRef ?? null };
    }),
    wvSourceRef: r.wv_source_ref,
    // its place on the learning path (migration 0043): the lane and the step
    lane: r.path_lane ? badge(byKey(L.intake_lane).get(r.path_lane), r.path_lane) : null,
    pathRank: r.path_rank,
    pathStep: r.path_rank ? fill(W.get('path_rank')?.label, { n: r.path_rank }) : null,
    pathStepAr: r.path_rank ? fill(W.get('path_rank')?.labelAr, { n: r.path_rank }) : null,
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
                0 AS live_count`;

// A source that is already in the app, parked or turned down is not "next" on the learning path.
const OFF_PATH = `('in_app', 'parked', 'rejected')`;
const NEXT_WHERE = `i.parent_id IS NULL AND i.path_rank IS NOT NULL AND i.status NOT IN ${OFF_PATH}`;
const FIRST_CHILD = `(SELECT c.external_id FROM ar_intake_item c WHERE c.parent_id = i.id AND c.platform = 'youtube'
                       AND c.external_id IS NOT NULL ORDER BY c.seq, c.created_at LIMIT 1) AS first_child_ext`;

/** A cover for a source: one it carries (meta_json.thumbnail), else the YouTube still of the video, or of a
 * playlist's first episode. Null when it has none — the renderer then shows its strand's icon. */
export function thumbnailOf(r: Pick<Row, 'kind' | 'platform' | 'external_id' | 'meta_json'> & { first_child_ext?: string | null }): string | null {
  try {
    const m = JSON.parse(r.meta_json || '{}') as Record<string, unknown>;
    const own = m.thumbnail ?? m.cover;
    if (typeof own === 'string' && /^https:\/\//.test(own)) return own;
  } catch { /* fall through */ }
  if (r.platform !== 'youtube') return null;
  const vid = r.kind === 'video' || r.kind === 'short' ? r.external_id : r.first_child_ext;
  return vid && /^[\w-]{6,}$/.test(vid) ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : null;
}

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

const err503 = (d: string) => new Response(JSON.stringify({ ok: false, error: { code: 'unavailable', message: `${d} pipeline unreachable` } }),
  { status: 503, headers: { 'content-type': 'application/json' } });

export function intakeRoutes(router: Router<ArabicEnv>) {
  // The Workspace card: the intake at a glance, shaped for a renderer — a title, the status tiles, each
  // pipeline's stage mix and the next sources on the learning path. Light: counts and three rows.
  router.get('/ar/intake/summary', async (req, env) => {
    if (!actorRef(req)) return unauthorized();
    const L = await labels(env);
    const W = byKey(L.intake), S = byKey(L.intake_status);
    const [counts, next, board] = await Promise.all([
      query<{ status: string; n: number }>(env.DB_AR, `SELECT status, COUNT(1) AS n FROM ar_intake_item WHERE parent_id IS NULL GROUP BY 1`),
      query<Row & { first_child_ext: string | null }>(env.DB_AR,
        `SELECT i.*, ${COUNTS}, ${FIRST_CHILD} FROM ar_intake_item i ${JOINS} WHERE ${NEXT_WHERE} ORDER BY i.path_rank LIMIT 3`),
      boards(env, L),
    ]);
    const n = new Map(counts.map((c) => [c.status, c.n]));
    const tile = (key: string) => ({ ...badge(S.get(key), key), count: n.get(key) ?? 0 });
    const word = (key: string) => { const w = W.get(key); return w ? { label: w.label, labelAr: w.labelAr, detail: w.detail, icon: w.icon } : null; };
    return ok({
      title: word('summary'),
      open: word('summary_open'),
      empty: word('summary_empty'),
      nextTitle: word('next_up'),
      tiles: ['in_app', 'queued', 'logged', 'parked'].map(tile).filter((t) => t.key !== 'parked' || t.count > 0),
      pipelines: (L.intake_domain ?? []).filter((l) => (DOMAINS as readonly string[]).includes(l.key)).map((l) => {
        const stages = board[l.key as Domain];
        return { domain: option(l), total: stages.reduce((a, s) => a + (s.count ?? 0), 0),
                 stages: stages.map((s) => ({ key: s.key, label: s.label, labelAr: s.labelAr, icon: s.icon, color: s.color, count: s.count ?? 0 })) };
      }),
      next: next.map((r) => {
        const eps = r.child_count ?? r.item_count ?? 0;
        return {
          id: r.id, titleAr: r.title_ar, titleEn: r.title_en, channel: r.channel,
          strand: badge(byKey(L.intake_strand).get(r.strand), r.strand),
          level: badge(byKey(L.intake_level).get(r.level), r.level),
          status: badge(S.get(r.status), r.status),
          episodes: eps,
          episodesLabel: eps ? fill(W.get('episodes')?.label, { n: eps }) : null,
          episodesLabelAr: eps ? fill(W.get('episodes')?.labelAr, { n: eps }) : null,
          pathRank: r.path_rank,
          pathStep: r.path_rank ? fill(W.get('path_rank')?.label, { n: r.path_rank }) : null,
          pathStepAr: r.path_rank ? fill(W.get('path_rank')?.labelAr, { n: r.path_rank }) : null,
          thumbnail: thumbnailOf(r),
        };
      }),
    });
  });

  // The intake: its words, the strands with their counts, what is next, and the items asked for.
  router.get('/ar/intake', async (req, env) => {
    if (!actorRef(req)) return unauthorized();
    const p = new URL(req.url).searchParams;
    const L = await labels(env);
    const where: string[] = ['i.parent_id IS NULL'], args: unknown[] = [];
    for (const k of ['strand', 'level', 'status', 'form'] as const) {
      const v = p.get(k); if (v) { where.push(`i.${k} = ?`); args.push(v); }
    }
    const dom = p.get('domain') as Domain | null;
    if (dom && (DOMAINS as readonly string[]).includes(dom)) where.push(`i.${FLAG[dom]} = 1`);
    const q = p.get('q')?.trim();
    if (q) { where.push(`(i.title_ar LIKE ? OR i.title_en LIKE ? OR i.channel LIKE ? OR i.note LIKE ?)`); args.push(...Array(4).fill(`%${q}%`)); }
    const nextSize = byKey(L.intake).get('next_up')?.min ?? 12;
    const [items, next, counts] = await Promise.all([
      query<Row>(env.DB_AR, `SELECT i.*, ${COUNTS} FROM ar_intake_item i ${JOINS} WHERE ${where.join(' AND ')} ORDER BY (i.path_rank IS NULL), i.path_rank, st.min_value, ${ORDER} LIMIT 500`, args),
      // what is next on the learning path (path_rank, migration 0043): the lowest steps still to do
      query<Row>(env.DB_AR, `SELECT i.*, ${COUNTS} FROM ar_intake_item i ${JOINS}
                              WHERE ${NEXT_WHERE}
                              ORDER BY i.path_rank LIMIT ?`, [nextSize]),
      query<{ strand: string; status: string; n: number }>(env.DB_AR,
        `SELECT strand, status, COUNT(1) AS n FROM ar_intake_item GROUP BY 1, 2`),
    ]);
    const tally = (strand: string) => {
      const rows = counts.filter((c) => c.strand === strand);
      const sum = (f: (s: string) => boolean) => rows.filter((c) => f(c.status)).reduce((a, c) => a + c.n, 0);
      return { total: sum(() => true), queued: sum((s) => s === 'queued'), logged: sum((s) => s === 'logged') };
    };
    const ids = [...new Set([...items, ...next].map((r) => r.id))];
    const [st, board] = await Promise.all([stagesOf(env, L, ids), boards(env, L)]);
    return ok({
      words: words(L),
      // each domain's pipeline, stage by stage, with counts
      pipelines: (L.intake_domain ?? []).filter((l) => (DOMAINS as readonly string[]).includes(l.key))
        .map((l) => ({ domain: option(l), stages: board[l.key as Domain] })),
      strands: (L.intake_strand ?? []).map((l) => {
        const c = tally(l.key), line = byKey(L.intake).get('strand_count');
        return { ...option(l), counts: c, countLine: fill(line?.label, c) || null, countLineAr: fill(line?.labelAr, c) || null };
      }),
      levels: (L.intake_level ?? []).map(option),
      statuses: (L.intake_status ?? []).map(option),
      registers: (L.intake_register ?? []).map(option),
      forms: (L.intake_form ?? []).map(option),
      domains: (L.intake_domain ?? []).map(option),
      lanes: (L.intake_lane ?? []).map(option),
      next: next.map((r) => shape(r, L, st)),
      items: items.map((r) => shape(r, L, st)),
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
    const st = await stagesOf(env, L, [item.id]);
    return ok({ words: words(L), pipelines: await boards(env, L).then((b) => (L.intake_domain ?? [])
                  .filter((l) => (DOMAINS as readonly string[]).includes(l.key)).map((l) => ({ domain: option(l), stages: b[l.key as Domain] }))),
                item: shape(item, L, st), children: children.map((r) => shape(r, L)) });
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
    const form = pick('intake_form', b.form, 'explained');
    if (!form) return badRequest('unknown form');
    const doms = Array.isArray(b.domains) ? (b.domains as unknown[]).map(String).filter((d) => (DOMAINS as readonly string[]).includes(d)) : ['ar'];
    if (!strand || !level) return badRequest('unknown strand or level');
    if (!register) return badRequest('only classical or fuṣḥā Arabic is taken');
    const priority = Math.min(5, Math.max(1, Number(b.priority) || 3));
    const dup = await queryOne<{ id: string }>(env.DB_AR, `SELECT id FROM ar_intake_item WHERE url = ?`, [link.url]);
    if (dup) return conflict(byKey(L.intake).get('duplicate')?.detail ?? `already logged: ${dup.id}`);
    const t = await titleOf(link.url, link.platform);
    const id = `IN:${link.platform === 'youtube' ? 'yt' : link.platform}:${link.externalId ?? crypto.randomUUID()}`;
    await execute(env.DB_AR,
      `INSERT INTO ar_intake_item (id, kind, url, platform, external_id, title_ar, channel, register, strand, level, form, to_ar, to_qr, to_wv, priority, status, note, added_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'logged', ?, ?)`,
      [id, link.kind, link.url, link.platform, link.externalId, (b.title as string) || t.title, t.channel,
       register, strand, level, form, +doms.includes('ar'), +doms.includes('qr'), +doms.includes('wv'),
       priority, (b.note as string) || null, me]);
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
    const scoped: Record<string, string> = { status: 'intake_status', strand: 'intake_strand', level: 'intake_level',
      register: 'intake_register', form: 'intake_form' };
    for (const [col, scope] of Object.entries(scoped)) {
      if (b[col] === undefined) continue;
      if (!byKey(L[scope]).has(String(b[col]))) return badRequest(`unknown ${col}`);
      sets.push(`${col} = ?`); args.push(String(b[col]));
    }
    if (b.priority !== undefined) { sets.push('priority = ?'); args.push(Math.min(5, Math.max(1, Number(b.priority) || 3))); }
    if (b.note !== undefined) { sets.push('note = ?'); args.push(b.note ? String(b.note) : null); }
    if (b.wvSourceRef !== undefined) {
      const ref = b.wvSourceRef ? String(b.wvSourceRef) : null;
      if (ref && !/^WV:[\w-]+$/.test(ref)) return badRequest('wvSourceRef is a typed ref, WV:<id>');
      sets.push('wv_source_ref = ?'); args.push(ref);
    }
    if (b.title !== undefined) { sets.push('title_ar = ?'); args.push(b.title ? String(b.title) : null); }
    // routing: which domains take it on
    let doms: Domain[] | null = null;
    if (b.domains !== undefined) {
      if (!Array.isArray(b.domains)) return badRequest('domains is a list: ar, qr, wv');
      doms = (b.domains as unknown[]).map(String).filter((d): d is Domain => (DOMAINS as readonly string[]).includes(d));
      for (const d of DOMAINS) { sets.push(`${FLAG[d]} = ?`); args.push(+doms.includes(d)); }
    }
    // a stage in one domain's pipeline
    const stage = b.stage as { domain?: string; stage?: string; targetRef?: string | null } | undefined;
    if (!sets.length && !stage) return badRequest('nothing to change');
    // keep the pipelines in step with the route and the triage, before anything is written: a domain
    // that has started on the item keeps it, and the change is refused
    const nextStatus = b.status !== undefined ? String(b.status) : row.status;
    const was = DOMAINS.filter((d) => (row as unknown as Record<string, number>)[FLAG[d]]);
    const want = doms ?? was;
    if (row.parent_id === null) {
      const drop = nextStatus === 'queued' ? was.filter((d) => !want.includes(d)) : was;
      for (const d of drop) {
        const r = await leave(env, d, id);
        if (r === 'busy' && (nextStatus === 'queued' || doms)) return conflict(byKey(L.intake).get('unroute_busy')?.detail ?? `${d} has started on it`);
      }
      if (nextStatus === 'queued')
        for (const d of want) if (!(await enter(env, d, { ...row, title: row.title_ar ?? row.title_en }))) return err503(d);
    }
    if (sets.length) {
      await execute(env.DB_AR, `UPDATE ar_intake_item SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`, [...args, id]);
      // a playlist's or channel's strand, level, register, form and route carry to what it holds
      const carry = ['strand', 'level', 'register', 'form'].filter((c) => b[c] !== undefined);
      const cs = [...carry.map((c) => `${c} = ?`), ...(doms ? DOMAINS.map((d) => `${FLAG[d]} = ?`) : [])];
      if (cs.length)
        await execute(env.DB_AR, `UPDATE ar_intake_item SET ${cs.join(', ')}, updated_at = datetime('now') WHERE parent_id = ?`,
          [...carry.map((c) => String(b[c])), ...(doms ? DOMAINS.map((d) => +doms!.includes(d)) : []), id]);
    }
    if (stage) {
      const d = stage.domain as Domain;
      if (!(DOMAINS as readonly string[]).includes(d) || !stage.stage) return badRequest('stage needs {domain, stage}');
      const r = await setStage(env, L, d, id, stage.stage, stage.targetRef);
      if (r.status === 404) return notFound(`${d} pipeline item ${id}`);
      if (r.status >= 400) return badRequest(`unknown ${d} stage`);
    }
    const fresh = await queryOne<Row>(env.DB_AR, `SELECT i.*, ${COUNTS} FROM ar_intake_item i WHERE i.id = ?`, [id]);
    return ok(shape(fresh!, L, await stagesOf(env, L, [id])));
  });
}
