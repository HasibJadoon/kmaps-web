// Feedback on any drill over a real SQLite: a report keeps the drill as shown; removing a drill
// hides it from that learner and suspends their card; only a reviewer resolves, and a drill they
// remove is withheld from everyone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { drillFeedbackRoutes } from '../src/routes/drill-feedback';
import { signJwt } from '../src/jwt';

type Handler = (req: Request, env: unknown, params: Record<string, string>) => Promise<Response>;

function d1(db: DatabaseSync) {
  const bound = (sql: string, params: unknown[]) => {
    const stmt = db.prepare(sql);
    const args = params.map((p) => (p === undefined ? null : typeof p === 'boolean' ? Number(p) : p)) as never[];
    return {
      async all<T>() {
        return { results: (/^\s*(SELECT|WITH)|RETURNING/i.test(sql) ? stmt.all(...args) : (stmt.run(...args), [])) as T[] };
      },
      async first<T>() { return (stmt.get(...args) as T) ?? null; },
      async run() { const r = stmt.run(...args); return { success: true, meta: { changes: r.changes } }; },
    };
  };
  return {
    prepare(sql: string) {
      return { bind: (...p: unknown[]) => bound(sql, p), ...bound(sql, []) };
    },
    async batch(stmts: Array<{ run(): Promise<unknown> }>) {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
  };
}

async function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  for (const m of ['041_app_atlas.sql', '045_drill_feedback.sql'])
    db.exec(readFileSync(new URL(`../migrations/${m}`, import.meta.url), 'utf8'));
  db.exec(`INSERT INTO core_users (id, email, display_name) VALUES ('U1', 'a@x', 'Amina'), ('U2', 'b@x', 'Bilal');
           INSERT INTO core_srs_deck (id, user_ref, title) VALUES ('D1', 'U1', 'QR');
           INSERT INTO core_srs_card (id, deck_id, user_ref, module, resource_type, resource_ref, card_template)
             VALUES ('K1', 'D1', 'U1', 'QR', 'passage', 'QR:questions:QR:Q:40:1:05', 'questions');`);
  const routes = new Map<string, Handler>();
  drillFeedbackRoutes({ get: (p: string, h: Handler) => routes.set(`GET ${p}`, h), post: (p: string, h: Handler) => routes.set(`POST ${p}`, h),
                        patch: (p: string, h: Handler) => routes.set(`PATCH ${p}`, h) } as never);
  const secret = 's';
  const env = { DB_CORE: d1(db), JWT_SECRET: secret };
  const as = async (who: string, role = 'user') => {
    const t = await signJwt({ sub: who, role, exp: Math.floor(Date.now() / 1000) + 3600 }, secret);
    return async (method: string, path: string, body?: unknown, params: Record<string, string> = {}) => {
      const [p, q] = path.split('?');
      const key = `${method} ${params.id ? p.replace(params.id, ':id') : p}`;
      const res = await routes.get(key)!(new Request(`http://x${p}${q ? `?${q}` : ''}`, {
        method, headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined }), env, params);
      return { status: res.status, body: await res.json() as Record<string, any> };
    };
  };
  return { db, as };
}

test('a learner reports, removes, and a reviewer resolves', async () => {
  const { db, as } = await setup();
  const amina = await as('U1');
  const bilal = await as('U2');
  const admin = await as('A1', 'admin');

  let r = await amina('GET', '/core/drill/feedback/reasons');
  assert.ok(r.body.data.reasons.some((x: { key: string; hides: boolean }) => x.key === 'remove' && x.hides));
  assert.ok(r.body.data.reasons.some((x: { key: string; hides: boolean }) => x.key === 'data_issue' && !x.hides));
  assert.deepEqual(r.body.data.hidden, []);

  // a data issue, with the drill as shown
  r = await amina('POST', '/core/drill/feedback', { drillId: 'questions:QR:Q:40:1:03', reason: 'data_issue', note: 'tanzil spelled wrong',
                                                   module: 'QR', kind: 'questions', drill: { promptEn: 'Why تنزيل?', options: ['a', 'b'] } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.hidden, false);
  // removing another: hidden from Amina, her card suspended
  r = await amina('POST', '/core/drill/feedback', { drill_id: 'questions:QR:Q:40:1:05', reason: 'remove',
                                                   resource_ref: 'QR:questions:QR:Q:40:1:05' });   // as the app sends it
  assert.equal(r.body.data.hidden, true);
  assert.equal(r.body.data.suspended, 1);
  assert.equal((db.prepare(`SELECT suspended FROM core_srs_card WHERE id = 'K1'`).get() as { suspended: number }).suspended, 1);
  assert.deepEqual((await amina('GET', '/core/drill/feedback/reasons')).body.data.hidden, ['questions:QR:Q:40:1:05']);
  assert.deepEqual((await bilal('GET', '/core/drill/feedback/reasons')).body.data.hidden, []);   // not Bilal's

  // a learner sees their own reports; a reviewer sees the queue
  assert.equal((await bilal('GET', '/core/drill/feedback?status=open')).body.data.feedback.length, 0);
  const q = (await admin('GET', '/core/drill/feedback?status=open')).body.data;
  assert.equal(q.reviewer, true);
  assert.equal(q.feedback.length, 2);
  const issue = q.feedback.find((f: { reason: string }) => f.reason === 'data_issue');
  assert.deepEqual(issue.drill, { promptEn: 'Why تنزيل?', options: ['a', 'b'] });
  assert.equal(issue.name, 'Amina');

  // only a reviewer resolves; a drill they remove is withheld from everyone
  assert.equal((await amina('PATCH', `/core/drill/feedback/${issue.id}`, { status: 'removed' }, { id: issue.id })).status, 403);
  r = await admin('PATCH', `/core/drill/feedback/${issue.id}`, { status: 'removed', note: 'rewritten' }, { id: issue.id });
  assert.equal(r.status, 200);
  assert.deepEqual((await bilal('GET', '/core/drill/feedback/reasons')).body.data.removed, ['questions:QR:Q:40:1:03']);

  // bad input
  assert.equal((await amina('POST', '/core/drill/feedback', { drillId: 'x', reason: 'nope' })).status, 400);
  assert.equal((await admin('PATCH', '/core/drill/feedback/DFB:none', { status: 'resolved' }, { id: 'DFB:none' })).status, 404);
});
