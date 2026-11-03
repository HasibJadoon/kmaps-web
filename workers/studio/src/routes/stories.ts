import type { Router } from '../../../shared/src/router';
import { ok, unauthorized, notFound, badRequest } from '../../../shared/src/response';
import { query, queryOne, execute } from '../../../shared/src/db';
import type { StudioEnv } from '../env';
import { actorRef } from '../auth';

/// Story films as production projects (migration 0015): the script line by line, the picture each line is drawn from
/// (prompt, seed, cast), the review's status and issues, and the bytes in R2 under story/<sha256>. Written by
/// kmaps-resources scripts/series/publish_story_project.py; the app reviews it here and flags what is wrong.

interface StoryRow {
  id: string; code: string | null; title_en: string; title_ar: string | null; synopsis: string | null; style: string | null;
  notes_json: string; steps_json?: string | null; reviewed_at: string | null; updated_at: string;
}
/** A production step: script, pictures, animation, voice, edit, delivery — and how far it is. */
interface Step { key: string; label: string; icon: string; status: 'done' | 'active' | 'todo'; done: number; total: number; detail: string }
interface ShotRow {
  stem: string; page_no: number; line_no: number; scene_en: string | null; speaker: string; text_ar: string;
  text_en: string; prompt: string | null; seed: number | null; people_json: string; image_sha: string | null;
  clip_sha: string | null; status: string; issues_json: string; updated_at: string;
}
interface Issue { text: string; by: string; at: string }

const parse = <T>(s: string | null | undefined, fallback: T): T => {
  try { return s ? JSON.parse(s) as T : fallback; } catch { return fallback; }
};

function shapeShot(r: ShotRow) {
  return {
    stem: r.stem, page: r.page_no, line: r.line_no, scene_en: r.scene_en, speaker: r.speaker,
    text_ar: r.text_ar, text_en: r.text_en, prompt: r.prompt, seed: r.seed,
    people: parse<string[]>(r.people_json, []), image_sha: r.image_sha, clip_sha: r.clip_sha,
    status: r.status, issues: parse<Issue[]>(r.issues_json, []), updated_at: r.updated_at,
  };
}

export function storyRoutes(router: Router<StudioEnv>) {

  /// Every story with its counts by status, newest first.
  router.get('/st/stories', async (req, env) => {
    if (!actorRef(req)) return unauthorized('Authenticated user required');
    const rows = await query<StoryRow & { shots: number; ok_n: number; redrawing_n: number; fix_n: number; cover_sha: string | null }>(env.DB_ST,
      `SELECT s.id, s.code, s.title_en, s.title_ar, s.synopsis, s.steps_json, s.reviewed_at, s.updated_at,
              COUNT(h.stem) AS shots,
              SUM(h.status = 'ok') AS ok_n, SUM(h.status = 'redrawing') AS redrawing_n, SUM(h.status = 'fix') AS fix_n,
              (SELECT image_sha FROM st_story_shot WHERE story_id = s.id ORDER BY page_no, line_no LIMIT 1) AS cover_sha
         FROM st_story s LEFT JOIN st_story_shot h ON h.story_id = s.id
        GROUP BY s.id ORDER BY s.updated_at DESC`);
    return ok(rows.map(r => ({
      id: r.id, code: r.code, title_en: r.title_en, title_ar: r.title_ar, synopsis: r.synopsis, reviewed_at: r.reviewed_at,
      updated_at: r.updated_at, cover_sha: r.cover_sha, steps: parse<Step[]>(r.steps_json, []),
      counts: { shots: r.shots, ok: r.ok_n ?? 0, redrawing: r.redrawing_n ?? 0, fix: r.fix_n ?? 0 },
    })));
  });

  /// One story: its notes and every shot in reading order.
  router.get('/st/stories/:id', async (req, env, { id }) => {
    if (!actorRef(req)) return unauthorized('Authenticated user required');
    const story = await queryOne<StoryRow>(env.DB_ST, `SELECT * FROM st_story WHERE id = ?`, [id]);
    if (!story) return notFound('story');
    const shots = await query<ShotRow>(env.DB_ST,
      `SELECT * FROM st_story_shot WHERE story_id = ? ORDER BY page_no, line_no`, [id]);
    return ok({
      id: story.id, code: story.code, title_en: story.title_en, title_ar: story.title_ar, synopsis: story.synopsis, style: story.style,
      notes: parse<Record<string, string[]>>(story.notes_json, {}), steps: parse<Step[]>(story.steps_json, []), reviewed_at: story.reviewed_at,
      shots: shots.map(shapeShot),
    });
  });

  /// Flag a shot: the issue is added to its list and the shot is marked to fix. `status` alone (no text) moves it, e.g.
  /// back to ok once the picture is redrawn.
  router.post('/st/stories/:id/shots/:stem/flag', async (req, env, { id, stem }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    let body: { text?: string; status?: string };
    try { body = await req.json(); } catch { return badRequest('JSON body required'); }
    const text = (body.text ?? '').trim();
    const status = body.status ?? (text ? 'fix' : undefined);
    if (!text && !status) return badRequest('text or status required');
    if (status && !['ok', 'redrawing', 'fix'].includes(status)) return badRequest('status must be ok, redrawing or fix');
    const shot = await queryOne<ShotRow>(env.DB_ST, `SELECT * FROM st_story_shot WHERE story_id = ? AND stem = ?`, [id, stem]);
    if (!shot) return notFound('shot');
    const issues = parse<Issue[]>(shot.issues_json, []);
    if (text) issues.push({ text, by: user, at: new Date().toISOString() });
    await execute(env.DB_ST,
      `UPDATE st_story_shot SET issues_json = ?, status = ?, updated_at = datetime('now') WHERE story_id = ? AND stem = ?`,
      [JSON.stringify(issues), status ?? shot.status, id, stem]);
    const fresh = await queryOne<ShotRow>(env.DB_ST, `SELECT * FROM st_story_shot WHERE story_id = ? AND stem = ?`, [id, stem]);
    return ok(shapeShot(fresh!));
  });

  /// A picture or clip's bytes by its SHA-256 (R2 story/<sha>). One hash is one content for ever, so it caches for good.
  router.get('/st/stories/blob/:sha', async (_req, env, { sha }) => {
    if (!/^[0-9a-f]{64}$/.test(sha)) return notFound('story file');
    const obj = await env.OVERLAY.get(`story/${sha}`);
    if (!obj) return notFound('story file');
    return new Response(obj.body, { headers: {
      'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    } });
  });
}
