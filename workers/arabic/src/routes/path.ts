import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest, unauthorized } from '../../../shared/src/response';
import { query, queryOne, execute } from '../../../shared/src/db';
import { actorRef } from '../../../shared/src/auth';
import type { ArabicEnv } from '../env';
import { parseBand, type Band } from '../lib/levels';
import { labels, byKey, skillCard, type Label } from '../lib/labels';
import { sceneRound } from './scenes';

// ── The path: units, one after another, level after level ───────────────────
// A unit is one scripted episode. Its steps: preview its key words, watch it scene by
// scene, drill each scene, pass its check. Within a series the units open in order; a
// level opens when enough of the one before is done. Every number and every label is
// data (ar_practice_label: setting, path); the progress is the learner's (ar_learner_unit).

const BANDS: Array<Exclude<Band, 'all'>> = ['basic', 'middle', 'advanced'];
const LEVELS: Record<string, string[]> = { basic: ['A1', 'A2'], middle: ['B1', 'B2'], advanced: ['C1', 'C2'] };

interface UnitRow { unit: string; work: string; level: string; title: string | null; episode: number | null; series: string | null; scenes: number }
interface Progress { unit_id: string; band: string; stage: string; scenes_json: string; best_score: number | null }

const setting = (L: Record<string, Label[]>, key: string, dflt: number) => byKey(L.setting).get(key)?.min ?? dflt;
const fill = (t: string | null | undefined, v: Record<string, string | number>) =>
  (t ?? '').replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));

async function unitsOf(env: ArabicEnv, band: string) {
  const lv = LEVELS[band] ?? [];
  return query<UnitRow>(env.DB_AR,
    `SELECT t.id AS unit, r.id AS work, r.level, COALESCE(json_extract(t.script_json, '$.title_ar'), r.title_ar) AS title,
            json_extract(t.script_json, '$.episode') AS episode,
            COALESCE(json_extract(t.script_json, '$.series_ar'), r.title_ar) AS series,
            json_array_length(json_extract(t.script_json, '$.scenes')) AS scenes
       FROM ar_text_unit t JOIN ar_acquisition_ref r ON r.id = t.acq_ref_id
      WHERE t.script_json IS NOT NULL AND json_valid(t.script_json) AND r.level IN (${lv.map(() => '?').join(',')})
        AND EXISTS (SELECT 1 FROM ar_acq_audio a WHERE a.acq_ref_id = r.id AND a.status = 'live' AND a.object_key NOT LIKE 'youtube:%')
      ORDER BY series, episode`, lv);
}

async function progressOf(env: ArabicEnv, me: string | null) {
  if (!me) return new Map<string, Progress>();
  const rows = await query<Progress>(env.DB_AR,
    `SELECT unit_id, band, stage, scenes_json, best_score FROM ar_learner_unit WHERE user_id = ?`, [me]);
  return new Map(rows.map((r) => [r.unit_id, r]));
}

export function pathRoutes(router: Router<ArabicEnv>) {
  // A level's path: its series, their units in order, each open, locked or done; and whether the level is open.
  router.get('/ar/path', async (req, env) => {
    const band = parseBand(new URL(req.url).searchParams.get('level'));
    const b = band === 'all' ? 'basic' : band;
    const me = actorRef(req);
    const [L, prog] = await Promise.all([labels(env), progressOf(env, me)]);
    const pass = setting(L, 'unit_pass_score', 80), share = setting(L, 'level_unlock_share', 80);
    const P = byKey(L.path);

    // is this level open? the one before must be done to the share
    const at = BANDS.indexOf(b);
    let levelOpen = true, gate: Record<string, number> | null = null;
    const placed = me ? await queryOne<{ score: number }>(env.DB_AR,
      `SELECT score FROM ar_learner_level WHERE user_id = ? AND band = ?`, [me, b]) : null;
    if (at > 0 && !placed) {
      const before = await unitsOf(env, BANDS[at - 1]);
      const done = before.filter((u) => (prog.get(u.unit)?.best_score ?? 0) >= pass).length;
      const need = Math.ceil((before.length * share) / 100);
      levelOpen = before.length === 0 || done >= need;
      gate = { n: share, done, need };
    }
    const units = await unitsOf(env, b);
    const bySeries = new Map<string, UnitRow[]>();
    for (const u of units) bySeries.set(u.series ?? u.work, [...(bySeries.get(u.series ?? u.work) ?? []), u]);
    const series = [...bySeries.entries()].map(([name, us]) => {
      let previousDone = true;
      return {
        series: name, level: us[0].level,
        units: us.map((u) => {
          const p = prog.get(u.unit);
          const done = (p?.best_score ?? 0) >= pass;
          const status = done ? 'done' : levelOpen && previousDone ? 'open' : 'locked';
          previousDone = done;
          const drilled = p ? (JSON.parse(p.scenes_json) as number[]).length : 0;
          return { unit: u.unit, title: u.title, episode: u.episode, scenes: u.scenes, status,
                   stage: p?.stage ?? null, drilled, score: p?.best_score ?? null };
        }),
      };
    });
    const total = units.length, done = units.filter((u) => (prog.get(u.unit)?.best_score ?? 0) >= pass).length;
    const lockedCard = P.get('level_locked');
    return ok({
      level: b, open: levelOpen, signedIn: !!me, pass,
      progress: { done, total },
      card: P.get('card') ? skillCard(P.get('card')!) : null,
      locked: !levelOpen && lockedCard ? { ...skillCard(lockedCard), tagline: fill(lockedCard.detail, gate ?? {}) } : null,
      steps: ['preview', 'watch', 'drill', 'check', 'review'].map((k) => P.get(k)).filter(Boolean).map((x) => skillCard(x!)),
      lockedLabel: P.get('locked') ? skillCard(P.get('locked')!) : null,
      placement: !levelOpen && P.get('placement') ? skillCard(P.get('placement')!) : null,
      placed: !!placed,
      srsDeck: P.get('srs_deck') ? { title: P.get('srs_deck')!.label, description: P.get('srs_deck')!.detail } : null,
      series,
    });
  });

  // A unit: its scenes (which are drilled) and its preview — the key items met before watching.
  router.get('/ar/path/unit/:unit', async (req, env, { unit }) => {
    const me = actorRef(req);
    const L = await labels(env);
    const row = await queryOne<{ script_json: string; level: string; audio: string | null }>(env.DB_AR,
      `SELECT t.script_json, r.level, (SELECT a.object_key FROM ar_acq_audio a WHERE a.acq_ref_id = r.id AND a.status = 'live'
              AND a.object_key NOT LIKE 'youtube:%' LIMIT 1) AS audio
         FROM ar_text_unit t JOIN ar_acquisition_ref r ON r.id = t.acq_ref_id WHERE t.id = ? AND t.script_json IS NOT NULL`, [unit]);
    if (!row) return notFound(`unit ${unit}`);
    const doc = JSON.parse(row.script_json) as { title_ar?: string; title_en?: string; series_ar?: string; episode?: number;
      scenes: Array<{ scene_no: number; title_ar?: string; title_en?: string; icon?: string; summary_en?: string;
                      lines: Array<{ ar: string; en?: string; start: number; end: number; speaker?: string }> }> };
    const url = row.audio ? `/api/ar/audio/${encodeURI(row.audio)}` : null;
    const p = me ? await queryOne<Progress>(env.DB_AR,
      `SELECT unit_id, band, stage, scenes_json, best_score FROM ar_learner_unit WHERE user_id = ? AND unit_id = ?`, [me, unit]) : null;
    const drilled = new Set(p ? JSON.parse(p.scenes_json) as number[] : []);

    // the preview: the key items the unit was read for, hardest first, each heard in its line
    const size = setting(L, 'unit_preview_size', 8);
    const reads = await query<{ scene_no: number; vocab_json: string | null }>(env.DB_AR,
      `SELECT scene_no, vocab_json FROM ar_scene_vocab WHERE unit_id = ?`, [unit]).catch(() => []);
    const rank: Record<string, number> = { hard: 0, good: 1, easy: 2 };
    const cand = reads.flatMap((r) => {
      try { return (JSON.parse(r.vocab_json ?? '[]') as Array<{ line: number; word: string; gloss: string; lemma?: string; tier?: string; note?: string }>)
        .map((v) => ({ ...v, scene: r.scene_no })); } catch { return []; }
    }).sort((a, b) => (rank[a.tier ?? 'good'] ?? 1) - (rank[b.tier ?? 'good'] ?? 1));
    const seen = new Set<string>();
    const preview = [];
    for (const v of cand) {
      if (preview.length >= size || seen.has(v.lemma ?? v.word)) continue;
      const sc = doc.scenes.find((x) => x.scene_no === v.scene);
      const l = sc?.lines[v.line];
      if (!l) continue;
      seen.add(v.lemma ?? v.word);
      preview.push({ word: v.word, lemma: v.lemma ?? null, gloss: v.gloss, note: v.note ?? null, tier: v.tier ?? null,
                     line: l.ar, en: l.en ?? null, clip: url ? { url, start: l.start, end: l.end } : null, scene: v.scene });
    }
    return ok({
      unit, level: row.level, title: doc.title_ar ?? null, titleEn: doc.title_en ?? null, series: doc.series_ar ?? null, episode: doc.episode ?? null,
      stage: p?.stage ?? 'preview', score: p?.best_score ?? null, pass: setting(L, 'unit_pass_score', 80),
      steps: ['preview', 'watch', 'drill', 'check'].map((k) => byKey(L.path).get(k)).filter(Boolean).map((x) => skillCard(x!)),
      preview,
      scenes: doc.scenes.map((s) => ({ no: s.scene_no, title: s.title_ar ?? null, titleEn: s.title_en ?? null, icon: s.icon ?? null,
                                       summary: s.summary_en ?? null, lines: s.lines.length, drilled: drilled.has(s.scene_no) })),
    });
  });

  // The unit check: a mixed round across several of its scenes.
  router.get('/ar/path/unit/:unit/check', async (req, env, { unit }) => {
    const L = await labels(env);
    const size = setting(L, 'unit_check_size', 12);
    const n = await queryOne<{ n: number }>(env.DB_AR,
      `SELECT json_array_length(json_extract(script_json, '$.scenes')) AS n FROM ar_text_unit WHERE id = ?`, [unit]);
    if (!n?.n) return notFound(`unit ${unit}`);
    const picks = Array.from({ length: n.n }, (_, i) => i + 1).sort(() => Math.random() - 0.5).slice(0, 4);
    const rounds = await Promise.all(picks.map((no) => sceneRound(env, unit, String(no), null, 6)));
    const good = rounds.filter((r): r is Exclude<typeof r, Response> => !(r instanceof Response));
    if (!good.length) return badRequest('no scenes to check');
    const card = byKey(L.path).get('check');
    const items = good.flatMap((r) => r.items).sort(() => Math.random() - 0.5).slice(0, size);
    const res = ok({ skill: card ? skillCard(card) : good[0].skill, level: good[0].level, items, srsDeck: good[0].srsDeck });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  });

  // Placement: a mixed test from a level's units — pass it and the level opens without the one before.
  router.get('/ar/path/placement', async (req, env) => {
    const band = parseBand(new URL(req.url).searchParams.get('level'));
    const b = band === 'all' ? 'middle' : band;
    const L = await labels(env);
    const size = setting(L, 'placement_size', 15);
    const units = (await unitsOf(env, b)).sort(() => Math.random() - 0.5).slice(0, 5);
    const rounds = await Promise.all(units.map((u) => sceneRound(env, u.unit, String(1 + Math.floor(Math.random() * Math.max(1, u.scenes))), null, 4)));
    const good = rounds.filter((r): r is Exclude<typeof r, Response> => !(r instanceof Response));
    if (!good.length) return badRequest('nothing to place with at this level yet');
    const card = byKey(L.path).get('placement');
    const res = ok({ skill: card ? skillCard(card) : good[0].skill, level: b, srsDeck: good[0].srsDeck,
                     items: good.flatMap((r) => r.items).sort(() => Math.random() - 0.5).slice(0, size) });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  });

  router.post('/ar/path/placement', async (req, env) => {
    const me = actorRef(req);
    if (!me) return unauthorized('Sign in to keep your level');
    const body = await req.json().catch(() => null) as { band?: string; score?: number } | null;
    if (!body?.band || !BANDS.includes(body.band as never) || typeof body.score !== 'number') return badRequest('band and score are required');
    const pass = setting(await labels(env), 'unit_pass_score', 80);
    const placed = body.score >= pass;
    if (placed) {
      await execute(env.DB_AR,
        `INSERT INTO ar_learner_level (user_id, band, score) VALUES (?, ?, ?)
         ON CONFLICT (user_id, band) DO UPDATE SET score = MAX(score, excluded.score)`, [me, body.band, Math.round(body.score)]);
    }
    return ok({ band: body.band, placed, pass });
  });

  // Progress: a step reached, a scene drilled, a check scored.
  router.post('/ar/path/unit/:unit/progress', async (req, env, { unit }) => {
    const me = actorRef(req);
    if (!me) return unauthorized('Sign in to keep your progress');
    const body = await req.json().catch(() => null) as { band?: string; stage?: string; scene?: number; score?: number } | null;
    if (!body?.band || !BANDS.includes(body.band as never)) return badRequest('band is required');
    const cur = await queryOne<Progress>(env.DB_AR,
      `SELECT unit_id, band, stage, scenes_json, best_score FROM ar_learner_unit WHERE user_id = ? AND unit_id = ?`, [me, unit]);
    const order = ['preview', 'watch', 'drill', 'check', 'done'];
    const L = await labels(env);
    const pass = setting(L, 'unit_pass_score', 80);
    const scenes = new Set(cur ? JSON.parse(cur.scenes_json) as number[] : []);
    if (typeof body.scene === 'number') scenes.add(body.scene);
    const best = Math.max(cur?.best_score ?? 0, typeof body.score === 'number' ? Math.round(body.score) : 0) || null;
    let stage = [cur?.stage ?? 'preview', body.stage ?? 'preview'].sort((a, b) => order.indexOf(b) - order.indexOf(a))[0];
    if ((best ?? 0) >= pass) stage = 'done';
    await execute(env.DB_AR,
      `INSERT INTO ar_learner_unit (user_id, unit_id, band, stage, scenes_json, best_score, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT (user_id, unit_id) DO UPDATE SET stage = excluded.stage, scenes_json = excluded.scenes_json,
         best_score = excluded.best_score, updated_at = excluded.updated_at`,
      [me, unit, body.band, stage, JSON.stringify([...scenes].sort((a, b) => a - b)), best]);
    return ok({ unit, stage, best, done: stage === 'done', pass });
  });
}
