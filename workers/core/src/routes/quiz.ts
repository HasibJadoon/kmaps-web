import type { Router } from '../../../shared/src/router';
import { ok, created, badRequest, notFound } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query, execute, queryOne } from '../../../shared/src/db';
import { typedId, randomCode } from '../../../shared/src/ulid';
import { readJsonObject, nonBlank } from '../../../shared/src/validate';
import type { CoreEnv } from '../env';
import { generateDrafts, type SourceCard } from '../quiz/generate';

const MODULES = ['QR', 'AL', 'AR', 'WV', 'EN', 'other'] as const;
const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export function quizRoutes(router: Router<CoreEnv>): void {

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

    const limit = Math.min(90, Math.max(1, Number(url.searchParams.get('limit') ?? '50')));

    const conds = ["i.status = 'live'", "i.scoring != 'none'",
                   "EXISTS (SELECT 1 FROM core_bank_item_option o\n"
                   + "                       WHERE o.item_ref = i.id AND o.role = 'choice')"];
    const params: unknown[] = [];
    if (module) { conds.push('i.module = ?'); params.push(module); }

    if (ref) { conds.push('(i.resource_ref = ? OR i.resource_ref LIKE ?)'); params.push(ref, `${ref}:%`); }
    if (surah > 0) { conds.push('i.surah = ?'); params.push(surah); }

    if (from > 0 && to > 0) {
      conds.push('(i.ayah_from IS NULL OR (i.ayah_from <= ? AND i.ayah_to >= ?))');
      params.push(to, from);
    }
    if (step) { conds.push('i.step_key = ?'); params.push(step); }
    if (topic) { conds.push('i.tags = ?'); params.push(topic); }
    if (concept) { conds.push('i.concept_ref = ?'); params.push(concept); }
    if (search) { conds.push(`(COALESCE(i.prompt_en, i.prompt_ar, i.prompt_ur) LIKE ?
                     OR EXISTS (SELECT 1 FROM core_bank_item_option o
                                 WHERE o.item_ref = i.id
                                   AND COALESCE(o.label_en, o.label_ar) LIKE ?))`); params.push(`%${search}%`, `%${search}%`); }

    const rows = await query(
      env.DB_CORE,
      `SELECT i.id, i.module, i.resource_ref,
              COALESCE(i.prompt_en, i.prompt_ar, i.prompt_ur) AS prompt,
              i.seconds, i.difficulty, i.tags, i.created_at,
              i.surah, i.ayah_from, i.ayah_to, i.passage_ref, i.step_key,
              i.concept_ref, p.slug AS pack,
              (SELECT COUNT(*) FROM core_bank_item_option o
                WHERE o.item_ref = i.id AND o.role = 'choice') AS option_count
         FROM core_bank_item i
         JOIN core_bank_pack p ON p.id = i.pack_ref
        WHERE ${conds.join(' AND ')}
          AND (p.owner_ref IS NULL OR p.owner_ref = ?)
        ORDER BY i.created_at DESC
        LIMIT ?`,
      [...params, ctx.userId, limit],
    );

    const options = rows.length
      ? await query<{ item_ref: string; label: string }>(
          env.DB_CORE,
          `SELECT item_ref, COALESCE(label_en, label_ar, label_ur) AS label
             FROM core_bank_item_option
            WHERE role = 'choice' AND item_ref IN (${rows.map(() => '?').join(',')})
            ORDER BY sort_order`,
          rows.map((r) => r['id']))
      : [];
    const byItem = new Map<string, string[]>();
    for (const o of options) {
      byItem.set(o.item_ref, [...(byItem.get(o.item_ref) ?? []), String(o.label ?? '')]);
    }
    return ok(rows.map((r) => ({ ...r, options: byItem.get(String(r['id'])) ?? [] })));
  });

  router.post('/core/quiz/questions', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJsonObject(req);
    if (!body) return badRequest('Request body must be a JSON object');

    const prompt = nonBlank(body['prompt']);
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

    const module = nonBlank(body['module']) ?? 'other';
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
      [id, ctx.userId, module, nonBlank(body['domain']), nonBlank(body['resource_ref']),
       prompt, JSON.stringify(options), correct, nonBlank(body['explanation']),
       Number.isFinite(seconds) && seconds > 0 ? Math.min(300, Math.round(seconds)) : 20,
       nonBlank(body['difficulty']), nonBlank(body['tags']),
       num(body['surah']), num(body['ayah_from']), num(body['ayah_to']),
       nonBlank(body['passage_ref']), nonBlank(body['step_key']),
       nonBlank(body['topic']), nonBlank(body['concept_ref'])],
    );
    return created({ id, prompt, options, correct_index: correct, module });
  });

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

      query(env.DB_CORE,
        `SELECT surah, ayah_from, ayah_to, COUNT(*) AS n
           FROM core_quiz_question
          WHERE status = 'active' AND surah IS NOT NULL AND ayah_from IS NOT NULL
          GROUP BY surah, ayah_from, ayah_to
          ORDER BY surah, ayah_from`, []),
    ]);
    return ok({ modules, surahs, steps, topics, passages });
  });

  router.post('/core/quiz/generate', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJsonObject(req) ?? {};

    const surah = Number(body['surah'] ?? 0);
    const from = Number(body['ayah_from'] ?? 0);
    const to = Number(body['ayah_to'] ?? 0);
    const step = nonBlank(body['step_key']);
    const module = nonBlank(body['module']);
    const limit = Math.min(200, Math.max(1, Number(body['limit'] ?? 60)));

    const conds = ['user_ref = ?', 'suspended = 0'];
    const params: unknown[] = [ctx.userId];
    if (module) { conds.push('module = ?'); params.push(module); }
    if (surah > 0) {

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
    const failed: Array<{ from: string; why: string }> = [];
    for (const draft of drafts) {
      if (step && draft.kind !== step) continue;
      try {
        await execute(
          env.DB_CORE,

          `INSERT INTO core_quiz_question
             (id, author_ref, module, resource_ref, prompt, options_json,
              correct_index, explanation, seconds, surah, ayah_from, ayah_to,
              step_key, source, status, generated_from)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated', 'draft', ?)
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
      } catch (error) {

        failed.push({ from: draft.fromCardId, why: String(error).slice(0, 160) });
      }
    }

    return ok({
      from_cards: cards.length,
      written,

      skipped_cards: skipped,
      failed,

      status: 'draft',
    });
  });

  router.post('/core/quiz/sessions', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJsonObject(req) ?? {};

    const id = typedId('QZS');
    const code = randomCode();
    await execute(
      env.DB_CORE,
      `INSERT INTO core_quiz_session (id, code, host_ref, title, module)
       VALUES (?, ?, ?, ?, ?)`,
      [id, code, ctx.userId, nonBlank(body['title']), nonBlank(body['module'])],
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

    headers.set('X-KM-Host-Id', session.host_ref);

    headers.set('X-KM-Room-Code', code.toUpperCase());

    const stub = env.QUIZ_SESSION.get(env.QUIZ_SESSION.idFromName(session.id));
    return stub.fetch(new Request(req.url, { method: 'GET', headers }));
  });

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
