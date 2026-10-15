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
  for (const m of ['041_app_atlas.sql', '045_drill_feedback.sql', '046_flagged_room.sql', '047_drill_fix.sql'])
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

test('the Flagged room: reports drawn with their words; an owner withdraws, a reviewer reopens', async () => {
  const { db, as } = await setup();
  const amina = await as('U1');
  const bilal = await as('U2');
  const admin = await as('A1', 'admin');
  await amina('POST', '/core/drill/feedback', { drill_id: 'questions:QR:Q:40:1:05', reason: 'remove', resource_ref: 'QR:questions:QR:Q:40:1:05' });
  await bilal('POST', '/core/drill/feedback', { drillId: 'tafsir:razi:12', reason: 'audio', drill: { prompt: 'اسمع' } });

  // Amina sees her own, drawn: reason and state worded, and she may withdraw it
  let r = (await amina('GET', '/core/drill/feedback')).body.data;
  assert.equal(r.reviewer, false);
  assert.equal(r.feedback.length, 1);
  const mine = r.feedback[0];
  assert.equal(mine.mine, true);
  assert.equal(mine.reasonWord.label, 'Remove this drill');
  assert.equal(mine.statusWord.key, 'open');
  assert.deepEqual(mine.actions.map((a: { key: string }) => a.key), ['withdraw']);
  assert.equal(r.statuses.find((s: { key: string }) => s.key === 'open').count, 1);
  assert.ok(r.words.some((w: { key: string }) => w.key === 'empty'));

  // the reviewer sees both, with the reviewer's actions and not the owner's
  r = (await admin('GET', '/core/drill/feedback?status=all')).body.data;
  assert.equal(r.feedback.length, 2);
  assert.deepEqual(r.feedback[0].actions.map((a: { key: string }) => a.key), ['resolve', 'remove', 'dismiss']);

  // only the sender withdraws; withdrawing a removal gives the drill and its card back
  assert.equal((await bilal('PATCH', `/core/drill/feedback/${mine.id}`, { action: 'withdraw' }, { id: mine.id })).status, 403);
  assert.equal((await amina('PATCH', `/core/drill/feedback/${mine.id}`, { action: 'resolve' }, { id: mine.id })).status, 403);
  r = (await amina('PATCH', `/core/drill/feedback/${mine.id}`, { action: 'withdraw' }, { id: mine.id })).body.data;
  assert.equal(r.status, 'withdrawn');
  assert.equal(r.restored, 1);
  assert.equal((db.prepare(`SELECT suspended FROM core_srs_card WHERE id = 'K1'`).get() as { suspended: number }).suspended, 0);
  assert.deepEqual((await amina('GET', '/core/drill/feedback/reasons')).body.data.hidden, []);
  assert.equal((await amina('PATCH', `/core/drill/feedback/${mine.id}`, { action: 'withdraw' }, { id: mine.id })).status, 400);

  // a reviewer removes for all, then reopens: the drill is dealt again
  const audio = (await admin('GET', '/core/drill/feedback?status=open')).body.data.feedback[0];
  await admin('PATCH', `/core/drill/feedback/${audio.id}`, { action: 'remove', note: 'recording cut' }, { id: audio.id });
  assert.deepEqual((await amina('GET', '/core/drill/feedback/reasons')).body.data.removed, ['tafsir:razi:12']);
  const done = (await admin('GET', '/core/drill/feedback?status=removed')).body.data.feedback[0];
  assert.equal(done.resolution, 'recording cut');
  assert.deepEqual(done.actions.map((a: { key: string }) => a.key), ['reopen']);
  await admin('PATCH', `/core/drill/feedback/${audio.id}`, { action: 'reopen' }, { id: audio.id });
  assert.deepEqual((await amina('GET', '/core/drill/feedback/reasons')).body.data.removed, []);
  assert.equal((await admin('PATCH', `/core/drill/feedback/${audio.id}`, { action: 'nope' }, { id: audio.id })).status, 400);
});

test('a reviewer removes any drill, restores it, and corrects the copies already filed', async () => {
  const { db, as } = await setup();
  const amina = await as('U1');
  const admin = await as('A1', 'admin');
  const id = 'questions:QR:Q:40:1:05';
  db.exec(`UPDATE core_srs_card SET extra_json = '${JSON.stringify({ drill: { id, kind: 'questions', promptEn: 'Old?', options: ['a', 'b'], missed: [2] }, group: { s: 1 } })}' WHERE id = 'K1';
           INSERT INTO core_drill_class (id, user_ref, module, scope_ref, status) VALUES ('C1', 'U1', 'QR', 'QR:SP:40:1-3', 'in_progress');
           INSERT INTO core_drill_class_item (class_id, item_ref, node_key, state, card_json)
             VALUES ('C1', '${id}', 'questions', 'open', '${JSON.stringify({ module: 'QR', extra: { drill: { id, promptEn: 'Old?' } } })}');`);

  // the flag sheet tells a reviewer they are one, with the words of fixing
  let r = (await admin('GET', '/core/drill/feedback/reasons')).body.data;
  assert.equal(r.reviewer, true);
  assert.ok(r.fix.some((w: { key: string }) => w.key === 'fix'));
  assert.ok(r.fields.some((w: { key: string }) => w.key === 'qr_study_question.options_json'));
  assert.equal((await amina('GET', '/core/drill/feedback/reasons')).body.data.reviewer, false);

  // only a reviewer refreshes; the copy is the drill named
  const fresh = { id, kind: 'questions', promptEn: 'Why تنزيل and not إنزال?', options: ['In stages', 'At once'], srs: { module: 'QR' } };
  assert.equal((await amina('POST', '/core/drill/refresh', { drillId: id, module: 'QR', drill: fresh })).status, 403);
  assert.equal((await admin('POST', '/core/drill/refresh', { drillId: id, module: 'QR', drill: { ...fresh, id: 'x' } })).status, 400);
  r = (await admin('POST', '/core/drill/refresh', { drillId: id, module: 'QR', drill: fresh })).body.data;
  assert.equal(r.cards, 1);
  assert.equal(r.items, 1);
  const card = JSON.parse((db.prepare(`SELECT extra_json FROM core_srs_card WHERE id = 'K1'`).get() as { extra_json: string }).extra_json);
  assert.equal(card.drill.promptEn, 'Why تنزيل and not إنزال?');
  assert.deepEqual(card.drill.options, ['In stages', 'At once']);
  assert.deepEqual(card.drill.missed, [2]);             // what the learner added stays
  assert.equal(card.drill.srs, undefined);              // no card inside the card
  assert.deepEqual(card.group, { s: 1 });
  const item = JSON.parse((db.prepare(`SELECT card_json FROM core_drill_class_item WHERE class_id = 'C1'`).get() as { card_json: string }).card_json);
  assert.equal(item.extra.drill.promptEn, 'Why تنزيل and not إنزال?');
  assert.equal(item.module, 'QR');
  // another module's copies are left alone
  assert.equal((await admin('POST', '/core/drill/refresh', { drillId: id, module: 'AR', drill: fresh })).body.data.refreshed, 0);

  // remove for everyone, unflagged; restore deals it again
  assert.equal((await amina('POST', '/core/drill/remove', { drillId: id })).status, 403);
  await admin('POST', '/core/drill/remove', { drillId: id, module: 'QR', note: 'ambiguous' });
  assert.deepEqual((await amina('GET', '/core/drill/feedback/reasons')).body.data.removed, [id]);
  r = (await admin('POST', '/core/drill/restore', { drillId: id })).body.data;
  assert.equal(r.restored, 1);
  assert.deepEqual((await amina('GET', '/core/drill/feedback/reasons')).body.data.removed, []);
});

test('several reasons at once: one report each, the drill withheld when any of them removes it', async () => {
  const { db, as } = await setup();
  const amina = await as('U1');
  let r = await amina('POST', '/core/drill/feedback', { drillId: 'sarf:prep:SP:SV:نزل:II:2', reasons: ['data_issue', 'audio'],
    note: 'the bāʾ is not ilṣāq', drill: { prompt: 'نَزَّلَ … ؟' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.ids.length, 2);
  assert.equal(r.body.data.hidden, false);
  const rows = db.prepare(`SELECT reason, note FROM core_drill_feedback WHERE drill_id = 'sarf:prep:SP:SV:نزل:II:2' ORDER BY reason`).all() as Array<{ reason: string; note: string }>;
  assert.deepEqual(rows.map((x) => x.reason), ['audio', 'data_issue']);
  assert.ok(rows.every((x) => x.note === 'the bāʾ is not ilṣāq'));
  r = await amina('POST', '/core/drill/feedback', { drillId: 'sarf:x', reasons: ['data_issue', 'remove'] });
  assert.equal(r.body.data.hidden, true);
  assert.equal((await amina('POST', '/core/drill/feedback', { drillId: 'sarf:y', reasons: ['data_issue', 'nope'] })).status, 400);
});
