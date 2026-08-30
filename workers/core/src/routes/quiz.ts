// ─── /core/quiz/* — a question asked to a room ────────────────────────────────
//
//   GET  /core/quiz/questions            — the bank, any domain
//   POST /core/quiz/questions            — author one
//   POST /core/quiz/sessions             — open a room, get a code
//   GET  /core/quiz/sessions/:code/live  — WebSocket → QuizSession
//   GET  /core/quiz/sessions/:code       — one room's board
//   GET  /core/quiz/dashboard            — what the scores add up to
//
// The bank is shared: a question authored by anyone can be pushed by anyone.
// That is deliberate — the point of a question bank is that it outlives the
// session it was written for, and a private bank is just a script.

import type { Router } from '../../../shared/src/router';
import { ok, created, badRequest, notFound, unauthorized } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query, execute, queryOne } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { CoreEnv } from '../env';
import { generateDrafts, type SourceCard } from '../quiz/generate';

const MODULES = ['QR', 'AL', 'AR', 'WV', 'EN', 'other'] as const;
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function randomCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>) : null;
  } catch { return null; }
}

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null;

/** A positive integer, or nothing. Zero is not a sūrah or an āyah, and storing
 *  it as one would make "unscoped" and "sūrah 0" the same row. */
const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export function quizRoutes(router: Router<CoreEnv>): void {
  // ── The bank ───────────────────────────────────────────────────────────────

  router.get('/core/quiz/questions', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const url = new URL(req.url);
    const module = url.searchParams.get('module');
    const ref = url.searchParams.get('ref');
    const surah = Number(url.searchParams.get('surah') ?? '0');
    const from = Number(url.searchParams.get('from') ?? '0');
    const to = Number(url.searchParams.get('to') ?? '0');
    const step = url.searchParams.get('step');
    const topic = url.searchParams.get('topic');
    const concept = url.searchParams.get('concept');
    const search = (url.searchParams.get('q') ?? '').trim();
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? '100')));

    const conds = ["status = 'active'"];
    const params: unknown[] = [];
    if (module) { conds.push('module = ?'); params.push(module); }
    // A prefix, so "44" finds every question on the sūrah and "44:3" narrows to
    // the āyah — the same convention the SRS queue uses for a surah scope.
    if (ref) { conds.push('(resource_ref = ? OR resource_ref LIKE ?)'); params.push(ref, `${ref}:%`); }
    if (surah > 0) { conds.push('surah = ?'); params.push(surah); }
    // Verse to verse: any question whose own range overlaps the one asked for.
    // Overlap rather than containment, because a question about 44:8–10 belongs
    // in a session on 44:1–9 — it is partly about it, and a host narrowing to a
    // passage wants everything that touches it.
    if (from > 0 && to > 0) {
      conds.push('(ayah_from IS NULL OR (ayah_from <= ? AND ayah_to >= ?))');
      params.push(to, from);
    }
    if (step) { conds.push('step_key = ?'); params.push(step); }
    if (topic) { conds.push('topic = ?'); params.push(topic); }
    if (concept) { conds.push('concept_ref = ?'); params.push(concept); }
    if (search) { conds.push('(prompt LIKE ? OR options_json LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

    const rows = await query(
      env.DB_CORE,
      `SELECT id, module, domain, resource_ref, prompt, options_json, seconds,
              difficulty, tags, author_ref, created_at,
              surah, ayah_from, ayah_to, passage_ref, step_key, topic, concept_ref
         FROM core_quiz_question
        WHERE ${conds.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT ?`,
      [...params, limit],
    );
    // `correct_index` is not in that SELECT and must never be: this endpoint is
    // reachable by every player in the room, and the bank is browsable during a
    // session. The answer lives in the Durable Object's read path alone.
    return ok(rows.map((r) => ({ ...r, options: safeOptions(r.options_json) })));
  });

  router.post('/core/quiz/questions', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    if (!body) return badRequest('Request body must be a JSON object');

    const prompt = str(body['prompt']);
    if (!prompt) return badRequest('prompt is required');

    const rawOptions = body['options'];
    const options = Array.isArray(rawOptions)
      ? rawOptions.filter((o): o is string => typeof o === 'string')
          .map((o) => o.trim()).filter(Boolean)
      : [];
    if (options.length < 2 || options.length > 6) {
      return badRequest('options must be between two and six answers');
    }

    const correct = Number(body['correct_index']);
    if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) {
      return badRequest(`correct_index must be an index into options (0..${options.length - 1})`);
    }

    const module = str(body['module']) ?? 'other';
    if (!(MODULES as readonly string[]).includes(module)) {
      return badRequest(`module must be one of: ${MODULES.join(', ')}`);
    }

    const seconds = Number(body['seconds'] ?? 20);
    const id = typedId('QZQ');
    await execute(
      env.DB_CORE,
      `INSERT INTO core_quiz_question
         (id, author_ref, module, domain, resource_ref, prompt, options_json,
          correct_index, explanation, seconds, difficulty, tags,
          surah, ayah_from, ayah_to, passage_ref, step_key, topic, concept_ref)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, ctx.userId, module, str(body['domain']), str(body['resource_ref']),
       prompt, JSON.stringify(options), correct, str(body['explanation']),
       Number.isFinite(seconds) && seconds > 0 ? Math.min(300, Math.round(seconds)) : 20,
       str(body['difficulty']), str(body['tags']),
       num(body['surah']), num(body['ayah_from']), num(body['ayah_to']),
       str(body['passage_ref']), str(body['step_key']),
       str(body['topic']), str(body['concept_ref'])],
    );
    return created({ id, prompt, options, correct_index: correct, module });
  });

  /** What the bank actually holds, so a picker can offer only branches that
   *  lead somewhere. Offering all 114 sūrahs when questions exist for two is
   *  how a picker becomes a scrolling exercise. */
  router.get('/core/quiz/scope', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const [modules, surahs, steps, topics, passages] = await Promise.all([
      query(env.DB_CORE,
        `SELECT module, COUNT(*) AS n FROM core_quiz_question
          WHERE status = 'active' GROUP BY module ORDER BY n DESC`, []),
      query(env.DB_CORE,
        `SELECT surah, COUNT(*) AS n,
                MIN(ayah_from) AS ayah_from, MAX(ayah_to) AS ayah_to
           FROM core_quiz_question
          WHERE status = 'active' AND surah IS NOT NULL
          GROUP BY surah ORDER BY surah`, []),
      query(env.DB_CORE,
        `SELECT step_key, COUNT(*) AS n FROM core_quiz_question
          WHERE status = 'active' AND step_key IS NOT NULL
          GROUP BY step_key ORDER BY n DESC`, []),
      query(env.DB_CORE,
        `SELECT topic, COUNT(*) AS n FROM core_quiz_question
          WHERE status = 'active' AND topic IS NOT NULL
          GROUP BY topic ORDER BY n DESC LIMIT 40`, []),
      // The passages the bank actually has questions for — a scope in its own
      // right, not a rung you must pass through to reach a step.
      query(env.DB_CORE,
        `SELECT surah, ayah_from, ayah_to, COUNT(*) AS n
           FROM core_quiz_question
          WHERE status = 'active' AND surah IS NOT NULL AND ayah_from IS NOT NULL
          GROUP BY surah, ayah_from, ayah_to
          ORDER BY surah, ayah_from`, []),
    ]);
    return ok({ modules, surahs, steps, topics, passages });
  });

  /** POST /core/quiz/generate — make questions out of the cards you already
   *  hold, in a scope you name.
   *
   *  Scoped the same way everything else is: a whole sūrah, a passage, a step,
   *  or all of it. The questions land in the same bank as authored ones and are
   *  marked `source='generated'` with the card they came from, so re-running
   *  updates in place instead of laying a second copy beside the first. An
   *  authored question is never touched. */
  router.post('/core/quiz/generate', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req) ?? {};

    const surah = Number(body['surah'] ?? 0);
    const from = Number(body['ayah_from'] ?? 0);
    const to = Number(body['ayah_to'] ?? 0);
    const step = str(body['step_key']);
    const module = str(body['module']);
    const limit = Math.min(200, Math.max(1, Number(body['limit'] ?? 60)));

    const conds = ['user_ref = ?', 'suspended = 0'];
    const params: unknown[] = [ctx.userId];
    if (module) { conds.push('module = ?'); params.push(module); }
    if (surah > 0) {
      // The same two arms the review queue uses: cards whose ref names the
      // sūrah, and cards first met in it.
      conds.push(`(resource_ref = ? OR resource_ref LIKE ? OR intro_surah = ?)`);
      params.push(String(surah), `${surah}:%`, surah);
    }
    if (surah > 0 && from > 0 && to > 0) {
      conds.push(`((resource_ref GLOB ?
                    AND CAST(substr(resource_ref, instr(resource_ref, ':') + 1) AS INTEGER)
                        BETWEEN ? AND ?)
                   OR (intro_surah = ? AND intro_ayah BETWEEN ? AND ?))`);
      params.push(`${surah}:*`, from, to, surah, from, to);
    }

    const cards = await query<SourceCard>(
      env.DB_CORE,
      `SELECT id, module, resource_type, resource_ref, card_kind,
              front_text, back_text, note_type_id, fields_json
         FROM core_srs_card
        WHERE ${conds.join(' AND ')}
        LIMIT ?`,
      [...params, limit],
    );

    const { drafts, skipped } = generateDrafts(cards);
    let written = 0;
    for (const draft of drafts) {
      if (step && draft.kind !== step) continue;
      try {
        await execute(
          env.DB_CORE,
          `INSERT INTO core_quiz_question
             (id, author_ref, module, resource_ref, prompt, options_json,
              correct_index, explanation, seconds, surah, ayah_from, ayah_to,
              step_key, source, generated_from)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated', ?)
           -- The WHERE has to be repeated: the index is partial, and SQLite
           -- will not match an upsert target to a partial index without it.
           ON CONFLICT (generated_from) WHERE generated_from IS NOT NULL DO UPDATE SET
             prompt = excluded.prompt,
             options_json = excluded.options_json,
             correct_index = excluded.correct_index,
             updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`,
          [typedId('QZQ'), ctx.userId, module ?? 'QR', null,
           draft.prompt, JSON.stringify(draft.options), draft.correctIndex,
           draft.explanation ?? null, 20,
           surah > 0 ? surah : null,
           from > 0 ? from : null, to > 0 ? to : null,
           draft.kind, draft.fromCardId],
        );
        written++;
      } catch { /* one bad row must not lose the batch */ }
    }

    return ok({
      from_cards: cards.length,
      written,
      // Said out loud rather than hidden: a card with no back text, or with
      // fewer than three distinct siblings to draw wrong answers from, cannot
      // make a fair question.
      skipped_cards: skipped,
    });
  });

  // ── The room ───────────────────────────────────────────────────────────────

  router.post('/core/quiz/sessions', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req) ?? {};

    const id = typedId('QZS');
    const code = randomCode();
    await execute(
      env.DB_CORE,
      `INSERT INTO core_quiz_session (id, code, host_ref, title, module)
       VALUES (?, ?, ?, ?, ?)`,
      [id, code, ctx.userId, str(body['title']), str(body['module'])],
    );
    return created({ id, code, status: 'lobby' });
  });

  router.get('/core/quiz/sessions/:code/live', async (req, env, { code }) => {
    if (req.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return badRequest('Expected a WebSocket upgrade request');
    }
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const session = await queryOne<{ id: string; host_ref: string; status: string }>(
      env.DB_CORE,
      'SELECT id, host_ref, status FROM core_quiz_session WHERE code = ?',
      [code.toUpperCase()],
    );
    if (!session) return notFound(`quiz ${code}`);
    if (session.status === 'ended') return badRequest('That quiz has ended');

    const headers = new Headers(req.headers);
    headers.set('X-KM-User-Id', ctx.userId);
    headers.set('X-KM-Session-Id', session.id);
    // Who may push and reveal. Decided here, from the row, rather than by the
    // socket claiming it — the object trusts this header because nothing
    // outside this worker can set it.
    headers.set('X-KM-Host-Id', session.host_ref);

    const stub = env.QUIZ_SESSION.get(env.QUIZ_SESSION.idFromName(session.id));
    return stub.fetch(new Request(req.url, { method: 'GET', headers }));
  });

  /** One room's board, after the fact. The same numbers the live screen showed,
   *  read from the record rather than from anyone's memory of it. */
  router.get('/core/quiz/sessions/:code', async (req, env, { code }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const session = await queryOne<Record<string, unknown>>(
      env.DB_CORE,
      `SELECT id, code, title, module, status, started_at, ended_at, host_ref
         FROM core_quiz_session WHERE code = ?`,
      [code.toUpperCase()],
    );
    if (!session) return notFound(`quiz ${code}`);

    const board = await query(
      env.DB_CORE,
      `SELECT a.user_ref AS user_id,
              COALESCE(u.display_name, u.email) AS name,
              SUM(a.points) AS points, SUM(a.correct) AS correct, COUNT(*) AS answered
         FROM core_quiz_answer a
         LEFT JOIN core_users u ON u.id = a.user_ref
        WHERE a.session_ref = ?
        GROUP BY a.user_ref
        ORDER BY points DESC, correct DESC`,
      [session['id']],
    );
    return ok({ session, board });
  });

  // ── The dashboard ──────────────────────────────────────────────────────────
  //
  // Three questions, answered from the answer log: how did each room go, how is
  // each person doing, and which questions is everybody getting wrong. The last
  // one is the useful one — a question the room fails is a gap in the teaching,
  // not in the room.
  router.get('/core/quiz/dashboard', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const url = new URL(req.url);
    const module = url.searchParams.get('module');

    const [sessions, players, hardest, totals] = await Promise.all([
      query(
        env.DB_CORE,
        `SELECT s.code, s.title, s.module, s.status, s.started_at, s.ended_at,
                COUNT(DISTINCT a.user_ref) AS players,
                COUNT(DISTINCT a.question_ref) AS questions,
                COALESCE(SUM(a.correct), 0) AS correct,
                COUNT(a.id) AS answers
           FROM core_quiz_session s
           LEFT JOIN core_quiz_answer a ON a.session_ref = s.id
          ${module ? 'WHERE s.module = ?' : ''}
          GROUP BY s.id
          ORDER BY s.created_at DESC
          LIMIT 50`,
        module ? [module] : [],
      ),
      query(
        env.DB_CORE,
        `SELECT a.user_ref AS user_id,
                COALESCE(u.display_name, u.email) AS name,
                SUM(a.points) AS points,
                SUM(a.correct) AS correct,
                COUNT(*) AS answered,
                COUNT(DISTINCT a.session_ref) AS sessions
           FROM core_quiz_answer a
           LEFT JOIN core_users u ON u.id = a.user_ref
          GROUP BY a.user_ref
          ORDER BY points DESC`,
        [],
      ),
      query(
        env.DB_CORE,
        `SELECT q.id, q.prompt, q.module, q.resource_ref,
                COUNT(a.id) AS asked,
                COALESCE(SUM(a.correct), 0) AS correct,
                ROUND(100.0 * COALESCE(SUM(a.correct), 0) / COUNT(a.id)) AS pct
           FROM core_quiz_answer a
           JOIN core_quiz_question q ON q.id = a.question_ref
          GROUP BY q.id
         HAVING asked >= 1
          ORDER BY pct ASC, asked DESC
          LIMIT 20`,
        [],
      ),
      query<{ questions: number; answers: number }>(
        env.DB_CORE,
        `SELECT (SELECT COUNT(*) FROM core_quiz_question WHERE status = 'active') AS questions,
                (SELECT COUNT(*) FROM core_quiz_answer) AS answers`,
        [],
      ),
    ]);

    return ok({
      sessions, players, hardest,
      bank: totals[0] ?? { questions: 0, answers: 0 },
    });
  });
}

function safeOptions(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch { return []; }
}
