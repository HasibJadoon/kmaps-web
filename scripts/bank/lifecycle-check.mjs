// ─── The play routes' SQL, run for real ───────────────────────────────────────
//
// Every statement in bank-play.ts, executed against remote D1 in the order the
// routes execute them, with judge() deciding each answer. This is the coverage
// that does not need a token — the SQL either runs or it does not, and that is
// exactly the class of bug the owner gate has been hiding.
//
// The rows it writes are removed at the end, by id.

import { execFileSync } from 'node:child_process';
const { judge } = await import(process.cwd() + '/workers/core/src/bank/score.ts');

const lit = (v) => v === null || v === undefined ? 'NULL'
  : typeof v === 'number' ? String(v)
  : typeof v === 'boolean' ? (v ? '1' : '0')
  : `'${String(v).replace(/'/g, "''")}'`;
const sql = (text, params = []) => {
  let i = 0;
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'km_core', '--remote',
    '--json', '--command', text.replace(/\?/g, () => lit(params[i++]))],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });
  return JSON.parse(out.slice(out.indexOf('[')))[0].results ?? [];
};

let failures = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? '  ' + detail : ''}`);
};

const USER = 'system@test.com';
const id = (p) => `${p}:TEST${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const written = { attempts: [], responses: [] };

// ── the unit the phone would open ────────────────────────────────────────────
const [unit] = sql(`SELECT u.id, u.pack_ref, u.hearts, u.pass_threshold, u.xp_award, u.title
                      FROM core_bank_unit u JOIN core_bank_pack p ON p.id=u.pack_ref
                     WHERE p.slug='quran-40-path' AND u.unit_index=0`);
check(!!unit, 'the lesson resolves', unit?.title);

const items = sql(`SELECT i.id, i.slug, i.interaction, i.scoring, i.response_json, i.seconds,
                          i.points_style, i.speed_bonus
                     FROM core_bank_unit_item ui JOIN core_bank_item i ON i.id=ui.item_ref
                    WHERE ui.unit_ref=? AND i.status='live' ORDER BY ui.seq, i.slug`, [unit.id]);
check(items.length === 6, 'it serves six live items', `got ${items.length}`);

// ── POST /attempts ───────────────────────────────────────────────────────────
const attemptId = id('BAT');
sql(`INSERT INTO core_bank_attempt (id, user_ref, unit_ref, pack_ref, mode, room_code, hearts_left)
     VALUES (?,?,?,?,?,?,?)`, [attemptId, USER, unit.id, unit.pack_ref, 'solo', null, unit.hearts]);
written.attempts.push(attemptId);
check(sql('SELECT id FROM core_bank_attempt WHERE id=?', [attemptId]).length === 1,
      'the attempt is written');

// ── POST /attempts/:id/answer, once per item ─────────────────────────────────
// Answered the way a person does: knowing five, guessing the sixth.
let right = 0;
for (const [seq, item] of items.entries()) {
  const options = sql(`SELECT id, role, is_correct, pair_key, credit, sort_order
                         FROM core_bank_item_option WHERE item_ref=? ORDER BY sort_order`, [item.id]);
  const correct = options.filter((o) => o.is_correct === 1).map((o) => o.id);
  const answer = seq === 5 ? options.filter((o) => o.is_correct !== 1).slice(0, 1).map((o) => o.id)
                           : correct;
  const latency = 3200 + seq * 400;
  const verdict = judge(item, options, answer, latency);
  if (verdict.isCorrect) right++;

  const responseId = id('BRS');
  sql(`INSERT INTO core_bank_response
         (id, attempt_ref, item_ref, user_ref, seq, response_json, is_correct, credit,
          latency_ms, points, hinted, respondent_ref, respondent_name)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [responseId, attemptId, item.id, USER, seq, JSON.stringify(answer),
     verdict.isCorrect === null ? null : (verdict.isCorrect ? 1 : 0),
     verdict.credit, latency, verdict.points, 0, null, null]);
  written.responses.push(responseId);
  sql(`UPDATE core_bank_item SET times_shown=times_shown+1, times_correct=times_correct+?
        WHERE id=?`, [verdict.isCorrect ? 1 : 0, item.id]);
}
check(right === 5, 'five of six judged correct', `${right}/6`);

// ── POST /attempts/:id/finish ────────────────────────────────────────────────
const [tally] = sql(`SELECT COUNT(is_correct) AS scored, COALESCE(SUM(is_correct),0) AS correct,
                            COALESCE(SUM(points),0) AS points
                       FROM core_bank_response WHERE attempt_ref=?`, [attemptId]);
const score = tally.scored > 0 ? tally.correct / tally.scored : null;
const passed = score >= unit.pass_threshold;
check(tally.scored === 6, 'all six responses are scored', `${tally.scored}`);
check(!passed, 'five of six fails a threshold of 1.0',
      `score ${score.toFixed(2)} vs ${unit.pass_threshold}`);

sql(`UPDATE core_bank_attempt
        SET finished_at=strftime('%Y-%m-%dT%H:%M:%SZ','now'), score=?, points=?, xp=?,
            passed_at=COALESCE(passed_at, CASE WHEN ? THEN
              strftime('%Y-%m-%dT%H:%M:%SZ','now') ELSE NULL END)
      WHERE id=?`, [score, tally.points, passed ? unit.xp_award : 0, passed ? 1 : 0, attemptId]);
const [done] = sql('SELECT score, points, xp, passed_at, finished_at FROM core_bank_attempt WHERE id=?',
                   [attemptId]);
check(done.finished_at !== null && done.passed_at === null,
      'the attempt closes without a pass', `points ${done.points}`);

// ── the path state the next screen derives ───────────────────────────────────
const states = sql(`SELECT u.unit_index, u.node_type, u.title,
                           (SELECT COUNT(*) FROM core_bank_attempt a
                             WHERE a.unit_ref=u.id AND a.user_ref=?) AS attempts,
                           (SELECT COUNT(*) FROM core_bank_attempt a
                             WHERE a.unit_ref=u.id AND a.user_ref=? AND a.passed_at IS NOT NULL) AS passes
                      FROM core_bank_unit u JOIN core_bank_pack p ON p.id=u.pack_ref
                     WHERE p.slug='quran-40-path' ORDER BY u.unit_index`, [USER, USER]);
check(states[0].attempts === 1 && states[0].passes === 0,
      'node 0 reads started-not-done, so node 1 stays shut');
for (const s of states) {
  console.log(`    ${s.unit_index} ${s.node_type.padEnd(9)} ${String(s.title).padEnd(34)}`
    + `attempts ${s.attempts}  passed ${s.passes}`);
}

// ── clean up: these are synthetic rows, not history ──────────────────────────
for (const r of written.responses) sql('DELETE FROM core_bank_response WHERE id=?', [r]);
for (const a of written.attempts) sql('DELETE FROM core_bank_attempt WHERE id=?', [a]);
const left = sql('SELECT COUNT(*) AS n FROM core_bank_attempt WHERE user_ref=? AND id LIKE ?',
                 [USER, 'BAT:TEST%'])[0].n;
check(left === 0, 'the test rows are removed', `${left} left`);

console.log(failures ? `\n${failures} check(s) failed` : '\nthe play routes\' SQL all runs');
process.exitCode = failures ? 1 : 0;
