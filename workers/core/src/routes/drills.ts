import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query } from '../../../shared/src/db';
import type { CoreEnv } from '../env';
import { softFail } from '../../../shared/src/soft-fail';
import { SrsRepo, TAFSIR_CARD } from '../repositories/srs.repo';

// ── The authored drill bank (core 052) ──────────────────────────────────────────────────────────────────────────
//
//   GET /core/cyb/drills?domain=QR&work=QR:SURAH:44&from=1&to=8&kind=…&skill=…&limit=…&concepts=…
//        (no work and no āyāt: `concepts` whole concepts, least met by this learner first)
//        the live authored drills of a lesson (its work, and for the Qurʾān its āyāt), each as dealt with its gid —
//        a lesson deals them among its own
//   GET /core/cyb/drills/bank
//        the Drill Bank to browse (owner 2026-11-26: "Banks its own view"): every live drill by stream → group → lesson
//        (work), with how many this learner has done — read only; drills are done in their lesson or path
//   GET /core/cyb/drills/bank/work?work=…&offset=…
//        one lesson's drills to browse: prompt, choices, answer, explanation, its āyah or line, and whether done
//   GET /core/cyb/drills/audit
//        every AGR:DRL rule run over the bank: how many drills break it (0 expected) — a drill goes live only clean

interface DrillRow { gid: string; domain: string | null; skill: string | null; work_ref: string | null; intro_ayah: number | null; payload_json: string }
interface RuleRow { id: string; rule_md: string; severity: string; check_sql: string | null; expected: number }

export async function auditDrills(db: D1Database): Promise<Array<{ id: string; rule: string; severity: string; found: number | null; ok: boolean }>> {
  const rules = await query<RuleRow>(db,
    `SELECT id, rule_md, severity, check_sql, expected FROM cyb_agent_rule WHERE id LIKE 'AGR:DRL:%' AND status = 'live' ORDER BY id`);
  return Promise.all(rules.map(async (r) => {
    let found: number | null = null;
    if (r.check_sql) {
      const row = await db.prepare(r.check_sql).first<Record<string, number>>().catch(softFail(null));
      found = row ? Number(Object.values(row)[0]) : null;
    }
    return { id: r.id, rule: r.rule_md, severity: r.severity, found, ok: found === (r.expected ?? 0) };
  }));
}

/** An authored drill as dealt: its payload, its gid, and the card the app files the answer on — the drill itself is the
 *  card's content (no faces of its own: front/back are the prompt and answer, for lists), its lesson the work. */
export function withCard(r: Pick<DrillRow, 'gid' | 'skill' | 'work_ref' | 'payload_json'> & { domain?: string | null }) {
  const d = JSON.parse(r.payload_json) as Record<string, unknown>;
  const module = r.domain ?? r.gid.split(':')[1] ?? 'AR';
  const text = (v: unknown) => (typeof v === 'string' ? v : Array.isArray(v) ? (v as unknown[]).join(' ') : '');
  const srs = {
    // the card's kind from the drill's science (the card table's own list): grammar, vocabulary, else a passage
    module, resourceType: /^DRL:[A-Z]+:(BL|NH|SF):/.test(r.gid) ? 'grammar' : /^DRL:[A-Z]+:DL:/.test(r.gid) ? 'vocabulary' : 'passage',
    resourceRef: r.gid, cardKind: (d.kind as string) ?? null,
    frontText: text(d.prompt) || text(d.instruction) || r.gid, backText: text(d.answer) || '—',
    cardTemplate: (d.interaction as string) ?? (d.kind as string) ?? null,
    extra: { drill: d, ...(r.work_ref ? { group: { workId: r.work_ref } } : {}) },
  };
  return { ...d, gid: r.gid, skill: r.skill, srs };
}


// ── The Drill Bank's names, shaped here (the app only shows them) ─────────────────────────────────────────────────
const STREAMS: Record<string, string> = { QR: 'Qurʾān', TF: 'Tafsīr', AR: 'Arabic', WV: 'Worldview' };
/** The review streams, always all four and in this order; each says how its review is filtered (module, step). */
const REVIEW_STREAMS: Array<{ key: string; module: string; step: string | null }> = [
  { key: 'QR', module: 'QR', step: 'quran_stream' }, { key: 'TF', module: 'QR', step: 'tafsir_stream' },
  { key: 'AR', module: 'AR', step: null }, { key: 'WV', module: 'WV', step: null },
];
const STREAM_LOOK: Record<string, { color: string; icon: string; labelAr: string }> = {
  QR: { color: '#D8B657', icon: 'book.closed.fill', labelAr: 'القُرْآن' },
  AR: { color: '#5DA9E9', icon: 'character.book.closed.fill', labelAr: 'العَرَبِيَّة' },
  WV: { color: '#9C89B8', icon: 'globe.europe.africa.fill', labelAr: 'الرُّؤْيَة' },
  TF: { color: '#E8A87C', icon: 'text.quote', labelAr: 'التَّفْسِير' },
};
/** A group's symbol: its kind of lesson. */
function groupIcon(g: string): string {
  if (g === 'QR:SURAH') return 'text.book.closed.fill';
  if (g === 'QR:TAFSIR') return 'books.vertical.fill';
  if (g.startsWith('GT:balagha')) return 'sparkles';
  if (g === 'AR:reading') return 'text.bubble.fill';
  if (g === 'AR:scene') return 'film.fill';
  if (g === 'GT:harf_maani') return 'link';
  if (g === 'GT:irab_role' || g === 'GT:sentence_role') return 'list.bullet.indent';
  return 'textformat.abc';
}
const GROUPS: Record<string, string> = {
  'QR:SURAH': 'By sūra', 'QR:TAFSIR': 'Tafsīr · Ibn ʿĀshūr', 'AR:reading': 'Reading', 'AR:scene': 'Scenes',
  'AR:ARDT': 'Arabic texts', 'GT:balagha_maani': 'Balāgha · al-maʿānī', 'GT:balagha_bayan': 'Balāgha · al-bayān',
  'GT:balagha_badi': 'Balāgha · al-badīʿ', 'GT:harf_maani': 'Meanings of the particles', 'GT:idafa_kind': 'Kinds of iḍāfa',
  'GT:irab_role': 'Iʿrāb roles', 'GT:inflection_class': 'Inflection classes', 'GT:sentence_role': 'Sentence roles',
  'GT:sigha_maani': 'Meanings of the forms', 'GT:phonotactic': 'Sound patterns', 'GT:pos': 'Parts of speech',
};
/** A work's group: its first two parts (QR:SURAH, GT:balagha_maani, AR:scene). */
function groupOf(work: string): string { return work.split(':').slice(0, 2).join(':'); }
const pretty = (s: string) => s.replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
/** A work's own name, from its reference: Sūra 40 · Scene 7 · Moon light · the term's slug. */
function workLabel(work: string): string {
  const parts = work.split(':');
  if (parts[0] === 'QR' && parts[1] === 'SURAH') return `Sūra ${parts[2]}`;
  if (parts[0] === 'QR' && parts[1] === 'TAFSIR') return pretty(parts.slice(2).join(' '));
  if (parts[0] === 'AR' && parts[1] === 'scene') return `Scene ${parts[parts.length - 1]}`;
  return pretty(parts.slice(2).join(' ') || work);
}

export function drillBankRoutes(router: Router<CoreEnv>) {
  router.get('/core/cyb/drills', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const u = new URL(req.url);
    const p = (k: string) => u.searchParams.get(k);
    const where = [`status = 'live'`];
    const args: unknown[] = [];
    if (p('domain')) { where.push('domain = ?'); args.push(p('domain')); }
    if (p('kind')) { where.push('kind = ?'); args.push(p('kind')); }
    if (p('skill')) { where.push('skill = ?'); args.push(p('skill')); }
    const from = Number(p('from')), to = Number(p('to'));
    const ayat = from > 0 && to >= from;
    // the lesson: the drill's own place, or any other place it is met (core 055 cyb_drill_place)
    if (p('work') || ayat) {
      const own = [p('work') ? 'work_ref = ?' : null, ayat ? 'intro_ayah BETWEEN ? AND ?' : null].filter(Boolean).join(' AND ');
      const other = [p('work') ? 'pl.work_ref = ?' : null, ayat ? 'pl.intro_ayah BETWEEN ? AND ?' : null].filter(Boolean).join(' AND ');
      const bind = [...(p('work') ? [p('work')] : []), ...(ayat ? [from, to] : [])];
      where.push(`((${own}) OR EXISTS (SELECT 1 FROM cyb_drill_place pl WHERE pl.gid = cyb_drill.gid AND ${other}))`);
      args.push(...bind, ...bind);
    }
    const limit = Math.min(500, Math.max(1, Number(p('limit')) || 200));
    // no lesson given (a skill's own practice — the grammar concepts): whole concepts, the ones this learner has met
    // least first, then at random — so a round climbs one concept's steps and the bank is walked through, not its
    // first rows over and over
    if (!p('work') && !ayat) {
      const n = Math.min(40, Math.max(1, Number(p('concepts')) || 6));
      // a concept begun comes first (its next steps), then the ones never met; a concept met through is left to review
      const works = await query<{ work_ref: string }>(env.DB_CORE,
        `SELECT d.work_ref, COUNT(c.id) AS met, COUNT(*) AS n FROM cyb_drill d
           LEFT JOIN core_srs_card c ON c.drill_gid = d.gid AND c.user_ref = ?
          WHERE ${where.map((w) => 'd.' + w).join(' AND ')} AND d.work_ref IS NOT NULL
          GROUP BY d.work_ref HAVING met < n
          ORDER BY CASE WHEN met > 0 THEN 0 ELSE 1 END, met, random() LIMIT ${n}`, [ctx.userId, ...args]);
      if (works.length) {
        where.push(`work_ref IN (${works.map(() => '?').join(',')})`);
        args.push(...works.map((w) => w.work_ref));
      }
      // a drill the learner already holds comes back through review or the bank, not as new
      where.push(`NOT EXISTS (SELECT 1 FROM core_srs_card c WHERE c.drill_gid = cyb_drill.gid AND c.user_ref = ?)`);
      args.push(ctx.userId);
    }
    // a lesson (a passage): its drills go round robin until each is right three times (core GRADUATE_AFTER), then live
    // in review — so it deals what has not graduated, the least practised first, by level within a round; and says how
    // far through the passage the learner is (met · graduated · total)
    let lesson: { total: number; met: number; graduated: number } | null = null;
    let order = 'intro_ayah, gid';
    const lessonArgs: unknown[] = [];
    if (p('work') || ayat) {
      const scope = where.join(' AND ');
      const counts = await query<{ total: number; met: number; graduated: number }>(env.DB_CORE,
        `SELECT COUNT(*) AS total,
                SUM(EXISTS (SELECT 1 FROM core_srs_card c WHERE c.drill_gid = cyb_drill.gid AND c.user_ref = ?)) AS met,
                SUM(EXISTS (SELECT 1 FROM core_srs_card c WHERE c.drill_gid = cyb_drill.gid AND c.user_ref = ? AND c.card_state <> 'new')) AS graduated
           FROM cyb_drill WHERE ${scope}`, [ctx.userId, ctx.userId, ...args]);
      lesson = { total: counts[0]?.total ?? 0, met: counts[0]?.met ?? 0, graduated: counts[0]?.graduated ?? 0 };
      const begun = await query<{ root: string }>(env.DB_CORE,
        `SELECT DISTINCT COALESCE(json_extract(d.payload_json, '$.links.root'), d.work_ref) AS root
           FROM core_srs_card c JOIN cyb_drill d ON d.gid = c.drill_gid WHERE c.user_ref = ? AND d.domain = ?`,
        [ctx.userId, p('domain') ?? 'QR']);
      // graduated drills live in review; the rest go ROUND ROBIN — fewest right answers in the lesson first (never met =
      // none), so every drill comes round before any comes again; within a round, begun roots first, by step
      where.push(`NOT EXISTS (SELECT 1 FROM core_srs_card c WHERE c.drill_gid = cyb_drill.gid AND c.user_ref = ? AND c.card_state <> 'new')`);
      args.push(ctx.userId);
      order = `(SELECT COUNT(*) FROM core_srs_review r JOIN core_srs_card c ON c.id = r.card_id
                 WHERE c.drill_gid = cyb_drill.gid AND c.user_ref = ? AND r.state_before = 'new' AND r.rating >= 3),
               CASE WHEN COALESCE(json_extract(payload_json, '$.links.root'), work_ref) IN (SELECT value FROM json_each(?)) THEN 0 ELSE 1 END,
               COALESCE(json_extract(payload_json, '$.step'), 9), intro_ayah, gid`;
      lessonArgs.push(ctx.userId, JSON.stringify(begun.map((b) => b.root)));
    }
    const rows = await query<DrillRow>(env.DB_CORE,
      `SELECT gid, domain, skill, work_ref, intro_ayah, payload_json FROM cyb_drill WHERE ${where.join(' AND ')}
        ORDER BY ${order} LIMIT ${limit}`, [...args, ...lessonArgs]);
    return ok({ drills: rows.map((r) => withCard(r)), ...(lesson ? { lesson } : {}) });
  });


  router.get('/core/cyb/drills/bank', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    // each tab asks for its own part (owner 2026-11-27: lazy): 'review' — the four streams' counts only; 'bank' — the tree;
    // none — both, as older apps ask
    const part = new URL(req.url).searchParams.get('part');
    const wantBank = part !== 'review', wantReview = part !== 'bank';
    const rows = !wantBank ? [] : await query<{ domain: string; work_ref: string; n: number; mine: number }>(env.DB_CORE,
      `SELECT d.domain, d.work_ref, COUNT(*) AS n,
              SUM(EXISTS (SELECT 1 FROM core_srs_card c WHERE c.drill_gid = d.gid AND c.user_ref = ?)) AS mine
         FROM cyb_drill d WHERE d.status = 'live' AND d.work_ref IS NOT NULL
        GROUP BY d.domain, d.work_ref`, [ctx.userId]);
    const streams = new Map<string, { key: string; label: string; count: number; mine: number;
      groups: Map<string, { key: string; label: string; count: number; mine: number; works: Array<{ work: string; label: string; count: number; mine: number }> }> }>();
    for (const r of rows) {
      const sk = r.work_ref.startsWith('QR:TAFSIR') ? 'TF' : r.domain;
      const s = streams.get(sk) ?? { key: sk, label: STREAMS[sk] ?? sk, count: 0, mine: 0, groups: new Map() };
      streams.set(sk, s);
      const gk = groupOf(r.work_ref);
      const g = s.groups.get(gk) ?? { key: gk, label: GROUPS[gk] ?? pretty(gk.split(':').pop() ?? gk), count: 0, mine: 0, works: [] };
      s.groups.set(gk, g);
      g.works.push({ work: r.work_ref, label: workLabel(r.work_ref), count: r.n, mine: r.mine ?? 0 });
      g.count += r.n; g.mine += r.mine ?? 0; s.count += r.n; s.mine += r.mine ?? 0;
    }
    const num = (w: string) => Number(w.split(':').pop()) || 0;
    // the same four streams as review, in the same order, an empty one shown too (owner 2026-11-27: "based on 4")
    if (wantBank) for (const { key } of REVIEW_STREAMS) if (!streams.has(key)) streams.set(key, { key, label: STREAMS[key] ?? key, count: 0, mine: 0, groups: new Map() });
    const rank = (k: string) => { const i = REVIEW_STREAMS.findIndex((x) => x.key === k); return i < 0 ? 99 : i; };
    const out = [...streams.values()].sort((a, b) => rank(a.key) - rank(b.key) || b.count - a.count).map((s) => ({
      key: s.key, label: s.label, count: s.count, mine: s.mine, ...(STREAM_LOOK[s.key] ?? { color: '#D8B657', icon: 'square.stack.3d.up.fill', labelAr: null }),
      groups: [...s.groups.values()].sort((a, b) => b.count - a.count).map((g) => ({
        ...g, icon: groupIcon(g.key), works: g.works.sort((a, b) => (num(a.work) - num(b.work)) || a.label.localeCompare(b.label)),
      })),
    }));
    // the Review side of the hub: what is due now and what is in the learner's queue, per stream (drills only)
    // a card's stream: Tafsīr when it was filed from a tafsīr drill, else its module
    const streamOf = `CASE WHEN module = 'QR' AND ${TAFSIR_CARD} THEN 'TF' ELSE module END`;
    const [due, queued] = !wantReview ? [[], []] as Array<Array<{ module: string; n: number }>> : await Promise.all([
      query<{ module: string; n: number }>(env.DB_CORE,
        `SELECT ${streamOf} AS module, COUNT(*) AS n FROM core_srs_card
          WHERE user_ref = ? AND suspended = 0 AND leech = 0 AND card_state <> 'new' AND is_drill = 1
            AND (next_review_at IS NULL OR next_review_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
          GROUP BY 1`, [ctx.userId]).catch(softFail([] as Array<{ module: string; n: number }>)),
      query<{ module: string; n: number }>(env.DB_CORE,
        `SELECT ${streamOf} AS module, COUNT(*) AS n FROM core_srs_card
          WHERE user_ref = ? AND suspended = 0 AND card_state <> 'new' AND is_drill = 1 GROUP BY 1`, [ctx.userId]).catch(softFail([] as Array<{ module: string; n: number }>)),
    ]);
    const by = (rows: Array<{ module: string; n: number }>) => {
      const m: Record<string, number> = {};
      for (const r of rows) m[String(r.module).toUpperCase()] = (m[String(r.module).toUpperCase()] ?? 0) + (Number(r.n) || 0);
      return m;
    };
    const dueBy = by(due), queuedBy = by(queued);
    const review = {
      due: Object.values(dueBy).reduce((a, b) => a + b, 0), queued: Object.values(queuedBy).reduce((a, b) => a + b, 0),
      streams: REVIEW_STREAMS.map(({ key: k, module, step }) => ({ key: k, label: STREAMS[k] ?? k, due: dueBy[k] ?? 0, queued: queuedBy[k] ?? 0,
        module, step, ...(STREAM_LOOK[k] ?? { color: '#D8B657', icon: 'square.stack.3d.up.fill', labelAr: null }) })),
    };
    // the hub's words (the app only shows them)
    const words = {
      review: 'Review', bank: 'Bank', due: '{n} due', none_due: 'Nothing due', queued: '{n} in your queue',
      review_now: 'Review now', review_all: 'Everything due, mixed', together: 'Review together',
      together_detail: 'One asks, one answers', bank_lead: 'Every drill, by stream and lesson. Done in its path, then it comes back here for review.',
      done: '{n} done', drills: '{n} drills', lessons: '{n} lessons', open_path: 'Open in the Path',
    };
    return ok({ streams: out, review: wantReview ? review : null, words });
  });

  router.get('/core/cyb/drills/bank/work', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const u = new URL(req.url);
    const work = u.searchParams.get('work');
    if (!work) return ok({ drills: [], total: 0 });
    const offset = Math.max(0, Number(u.searchParams.get('offset')) || 0);
    const [rows, count] = await Promise.all([
      query<{ gid: string; kind: string | null; skill: string | null; intro_surah: number | null; intro_ayah: number | null; payload_json: string; mine: number }>(env.DB_CORE,
        `SELECT d.gid, d.kind, d.skill, d.intro_surah, d.intro_ayah, d.payload_json,
                EXISTS (SELECT 1 FROM core_srs_card c WHERE c.drill_gid = d.gid AND c.user_ref = ?) AS mine
           FROM cyb_drill d WHERE d.status = 'live' AND d.work_ref = ?
          ORDER BY d.intro_ayah, d.gid LIMIT 100 OFFSET ?`, [ctx.userId, work, offset]),
      query<{ n: number }>(env.DB_CORE, `SELECT COUNT(*) AS n FROM cyb_drill WHERE status = 'live' AND work_ref = ?`, [work]),
    ]);
    const str = (v: unknown) => (typeof v === 'string' ? v : Array.isArray(v) ? (v as unknown[]).map(String).join(' ') : null);
    const drills = rows.map((r) => {
      const d = JSON.parse(r.payload_json) as Record<string, unknown>;
      const opts = Array.isArray(d.options) ? (d.options as unknown[]).map((o) => (typeof o === 'string' ? o : str((o as Record<string, unknown>)?.text) ?? JSON.stringify(o))) : [];
      return {
        gid: r.gid, kind: r.kind, skill: r.skill, surah: r.intro_surah, ayah: r.intro_ayah, done: !!r.mine,
        instruction: str(d.instruction), prompt: str(d.prompt), options: opts, answer: str(d.answer),
        explanation: str(d.explanation), ref: str(d.ref),
      };
    });
    return ok({ work, label: workLabel(work), total: count[0]?.n ?? 0, drills });
  });

  router.get('/core/cyb/drills/audit', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const [rules, counts] = await Promise.all([
      auditDrills(env.DB_CORE),
      query<{ status: string; n: number }>(env.DB_CORE, `SELECT status, count(*) AS n FROM cyb_drill GROUP BY status`),
    ]);
    return ok({ bank: Object.fromEntries(counts.map((c) => [c.status, c.n])), rules, clean: rules.every((r) => r.ok) });
  });
}
