// The authored bank's rules (core 052, AGR:DRL): a clean drill breaks none; each fault is caught by its own rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { auditDrills, drillBankRoutes } from '../src/routes/drills';
import { signJwt } from '../src/jwt';

function d1(db: DatabaseSync) {
  return { prepare: (sql: string) => {
    const run = (args: unknown[]) => ({
      async all<T>() { return { results: db.prepare(sql).all(...(args as never[])) as T[] }; },
      async first<T>() { return (db.prepare(sql).get(...(args as never[])) as T) ?? null; },
      async run() { db.prepare(sql).run(...(args as never[])); return { success: true }; },
    });
    return { bind: (...a: unknown[]) => run(a), ...run([]) };
  } } as unknown as D1Database;
}

test('AGR:DRL: a clean drill passes; a broken one is caught by its rule', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  // the rules themselves, as migration 052 writes them
  const mig = readFileSync(new URL('../migrations/052_cyb_drill.sql', import.meta.url), 'utf8');
  db.exec(mig.slice(mig.indexOf('INSERT OR REPLACE INTO cyb_agent_rule')));
  db.exec(readFileSync(new URL('../migrations/054_drl_concept_rules.sql', import.meta.url), 'utf8'));
  db.exec(`INSERT INTO cyb_discipline (code, ord, name_ar, name_en, question_en, deck_id) VALUES ('SF', 10, 'صرف', 'Morphology', 'q', 'DECK:AL'), ('BL', 30, 'بلاغة', 'Rhetoric', 'q', 'DECK:AL');
           INSERT INTO cyb_drill_type (domain, scope, code, discipline, status) VALUES ('QR', 'kind', 'gt_book', 'NH', 'retired');`);
  const put = (gid: string, kind: string, payload: object, interaction = 'choose', discipline = 'SF') =>
    db.prepare(`INSERT INTO cyb_drill (gid, domain, discipline, kind, interaction, payload_json, status) VALUES (?, 'QR', ?, ?, ?, ?, 'live')`)
      .run(gid, discipline, kind, interaction, JSON.stringify(payload));
  put('DRL:QR:SF:a', 'sarf_mudari', { id: 'a', options: ['يُنْزِلُ', 'يَنْزِلُ', 'يُنَزِّلُ'], answer: 'يُنْزِلُ' });
  // a relative 'who' is not a question about a person; a concept met in an Arabic example is fine
  put('DRL:QR:BL:qasr', 'feature', { id: 'qasr', prompt: 'إِنَّهُ هُوَ — what kind of restriction?', answer: 'قصر قلب',
       options: ['قصر قلب', 'قصر تعيين — it settles a hearer who was unsure', 'قصر إفراد'] }, 'choose', 'BL');
  let audit = await auditDrills(d1(db));
  assert.ok(audit.length >= 8);
  assert.ok(audit.every((r) => r.ok), JSON.stringify(audit.filter((r) => !r.ok)));

  put('DRL:QR:XX:b', 'x', { id: 'b' }, 'choose', 'XX');                                        // 001 unclassified
  put('DRL:QR:SF:wrong', 'x', { id: 'c' });                                                      // 002 gid ≠ standard
  put('DRL:QR:SF:d', 'x', { id: 'd', options: ['أ', 'ب'], answer: 'ج' });                         // 003 two, answer missing
  put('DRL:QR:SF:e', 'x', { id: 'e', options: ['أ', 'أ', 'ب'], answer: 'أ' });                     // 004 the same twice
  put('DRL:QR:SF:f', 'x', { id: 'f', pairs: [['أ', 'a'], ['ب', 'b']] }, 'pairs');                 // 005 two pairs
  put('DRL:QR:SF:g', 'x', { id: 'g' }, 'type_it');                                               // 006 typed
  put('DRL:QR:SF:h', 'gt_book', { id: 'h' });                                                    // 007 who/which book
  put('DRL:QR:SF:i', 'fill', { id: 'i', words: [{ t: 'حم' }] });                                 // 008 no audio
  put('DRL:QR:SF:j', 'x', { id: 'j', prompt: 'Who glosses it so?', answer: 'x', options: ['x', 'y', 'z'] });      // 009 who
  put('DRL:QR:SF:k', 'x', { id: 'k', prompt: 'The meaning', answer: 'al-Ṭabarī (d. 310 AH)', options: ['al-Ṭabarī (d. 310 AH)', 'y', 'z'] }); // 009 date
  put('DRL:QR:BL:l', 'feature', { id: 'l', prompt: 'Which term means fronting?', answer: 'taqdīm', options: ['taqdīm', 'taʾkhīr', 'ḥadhf'] }, 'choose', 'BL'); // 010 no example
  audit = await auditDrills(d1(db));
  const bad = Object.fromEntries(audit.map((r) => [r.id, r.found]));
  assert.equal(bad['AGR:DRL:009'], 2, 'the person question and the date — not the relative who');
  for (const id of ['AGR:DRL:001', 'AGR:DRL:002', 'AGR:DRL:003', 'AGR:DRL:004', 'AGR:DRL:005', 'AGR:DRL:006', 'AGR:DRL:007', 'AGR:DRL:008', 'AGR:DRL:010']) {
    assert.ok((bad[id] ?? 0) >= 1, `${id} catches its fault (found ${bad[id]})`);
  }
});

test('a skill practice with no lesson continues a begun concept, its unmet steps, each with its filing card', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const put = db.prepare(`INSERT INTO cyb_drill (gid, domain, discipline, kind, interaction, skill, work_ref, payload_json, status) VALUES (?, 'AR', 'BL', 'feature', 'choose', 'grammar', ?, ?, 'live')`);
  for (const c of ['A', 'B', 'C']) for (const st of [1, 2, 3]) put.run(`DRL:AR:BL:bl:${st}:${c}`, `GT:${c}`, JSON.stringify({ id: `bl:${st}:${c}`, step: st }));
  db.exec('PRAGMA foreign_keys = OFF');
  // the learner began A (one step) and met B through (all three); C never
  db.exec(`INSERT INTO core_srs_card (id, user_ref, deck_id, module, resource_type, resource_ref, front_text, back_text, drill_gid)
           VALUES ('k1', 'U1', 'D', 'AR', 'grammar', 'r1', 'q', 'a', 'DRL:AR:BL:bl:1:A'), ('k2', 'U1', 'D', 'AR', 'grammar', 'r2', 'q', 'a', 'DRL:AR:BL:bl:1:B'),
                  ('k3', 'U1', 'D', 'AR', 'grammar', 'r3', 'q', 'a', 'DRL:AR:BL:bl:2:B'), ('k4', 'U1', 'D', 'AR', 'grammar', 'r4', 'q', 'a', 'DRL:AR:BL:bl:3:B')`);
  type H = (r: Request, e: unknown, p: unknown) => Promise<Response>;
  const routes = new Map<string, H>();
  drillBankRoutes({ get: (p: string, h: H) => routes.set(p, h), post: () => {} } as never);
  const t = await signJwt({ sub: 'U1', role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 }, 's');
  const res = await routes.get('/core/cyb/drills')!(new Request('http://x/core/cyb/drills?domain=AR&skill=grammar&concepts=1',
    { headers: { authorization: `Bearer ${t}` } }), { DB_CORE: d1(db), JWT_SECRET: 's' }, {});
  const body = await res.json() as { data: { drills: Array<{ gid: string }> } };
  // A is begun (one of three met): its next steps come first, never the step already met
  assert.deepEqual(body.data.drills.map((d) => d.gid).sort(), ['DRL:AR:BL:bl:2:A', 'DRL:AR:BL:bl:3:A'],
    'the begun concept, its unmet steps');
  // every dealt drill carries the card its answer is filed on, under its own gid
  const first = body.data.drills[0] as unknown as { srs: { module: string; resourceType: string; resourceRef: string; extra: { drill: { id: string }; group: { workId: string } } } };
  assert.equal(first.srs.resourceType, 'grammar');
  assert.equal(first.srs.resourceRef, (body.data.drills[0] as { gid: string }).gid);
  assert.equal(first.srs.module, 'AR');
  assert.equal(first.srs.extra.group.workId, 'GT:A');
});

test('held: of the drills a round would deal, the ones the learner already holds as cards', async () => {
  const { srsRoutes } = await import('../src/routes/srs');
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  db.exec(`PRAGMA foreign_keys = OFF;
           INSERT INTO core_srs_card (id, user_ref, deck_id, module, resource_type, resource_ref, front_text, back_text)
           VALUES ('k1', 'U1', 'D', 'AR', 'grammar', 'AR:drill:gs:gs_term:1', 'q', 'a'), ('k2', 'U2', 'D', 'AR', 'grammar', 'AR:drill:gs:gs_term:2', 'q', 'a')`);
  type H = (r: Request, e: unknown, p: unknown) => Promise<Response>;
  const routes = new Map<string, H>();
  srsRoutes({ get: () => {}, put: () => {}, patch: () => {}, delete: () => {}, post: (p: string, h: H) => routes.set(p, h) } as never);
  const t = await signJwt({ sub: 'U1', role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 }, 's');
  const res = await routes.get('/core/srs/held')!(new Request('http://x/core/srs/held', { method: 'POST',
    headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
    body: JSON.stringify({ refs: ['AR:drill:gs:gs_term:1', 'AR:drill:gs:gs_term:2', 'AR:drill:new'] }) }), { DB_CORE: d1(db), JWT_SECRET: 's' }, {});
  const body = await res.json() as { data: { held: string[] } };
  assert.deepEqual(body.data.held, ['AR:drill:gs:gs_term:1'], 'only this learner\'s card counts');
});

test('a drill placed in two passages is dealt in each (its own place, or cyb_drill_place)', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  db.exec(`INSERT INTO cyb_drill (gid, domain, discipline, kind, interaction, skill, work_ref, intro_surah, intro_ayah, payload_json, status)
           VALUES ('DRL:QR:DL:rg:core:x', 'QR', 'DL', 'lex_asl', 'choose', 'vocab', 'QR:SURAH:30', 30, 5, '{"id":"rg:core:x"}', 'live');
           INSERT INTO cyb_drill_place (gid, work_ref, intro_surah, intro_ayah) VALUES ('DRL:QR:DL:rg:core:x', 'QR:SURAH:34', 34, 12);`);
  type H = (r: Request, e: unknown, p: unknown) => Promise<Response>;
  const routes = new Map<string, H>();
  drillBankRoutes({ get: (p: string, h: H) => routes.set(p, h), post: () => {} } as never);
  const t = await signJwt({ sub: 'U1', role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 }, 's');
  const deal = async (q: string) => {
    const res = await routes.get('/core/cyb/drills')!(new Request(`http://x/core/cyb/drills?domain=QR&${q}`, { headers: { authorization: `Bearer ${t}` } }),
      { DB_CORE: d1(db), JWT_SECRET: 's' }, {});
    return ((await res.json()) as { data: { drills: Array<{ gid: string }> } }).data.drills.length;
  };
  assert.equal(await deal('work=QR:SURAH:30&from=1&to=10'), 1, 'its own passage');
  assert.equal(await deal('work=QR:SURAH:34&from=10&to=20'), 1, 'the second passage it stands in');
  assert.equal(await deal('work=QR:SURAH:34&from=30&to=40'), 0, 'not another unit of that sūra');
});

test('a passage deals only the drills not yet met, begun roots first by step, and says how far through it is', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const put = db.prepare(`INSERT INTO cyb_drill (gid, domain, discipline, kind, interaction, skill, work_ref, intro_surah, intro_ayah, payload_json, status) VALUES (?, 'QR', 'DL', 'k', 'choose', 'vocab', 'QR:SURAH:30', 30, ?, ?, 'live')`);
  for (const [root, ay] of [['A', 1], ['B', 2]] as const)
    for (const st of [1, 2, 3]) put.run(`DRL:QR:DL:rg:${st}:${root}`, ay, JSON.stringify({ id: `rg:${st}:${root}`, step: st, links: { root } }));
  db.exec(`PRAGMA foreign_keys = OFF;
           INSERT INTO core_srs_card (id, user_ref, deck_id, module, resource_type, resource_ref, front_text, back_text, drill_gid)
           VALUES ('k1', 'U1', 'D', 'QR', 'vocabulary', 'DRL:QR:DL:rg:1:B', 'q', 'a', 'DRL:QR:DL:rg:1:B')`);
  type H = (r: Request, e: unknown, p: unknown) => Promise<Response>;
  const routes = new Map<string, H>();
  drillBankRoutes({ get: (p: string, h: H) => routes.set(p, h), post: () => {} } as never);
  const t = await signJwt({ sub: 'U1', role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 }, 's');
  const res = await routes.get('/core/cyb/drills')!(new Request('http://x/core/cyb/drills?domain=QR&work=QR:SURAH:30&from=1&to=5',
    { headers: { authorization: `Bearer ${t}` } }), { DB_CORE: d1(db), JWT_SECRET: 's' }, {});
  const body = await res.json() as { data: { drills: Array<{ gid: string }>; lesson: { total: number; met: number } } };
  assert.deepEqual(body.data.lesson, { total: 6, met: 1 });
  assert.deepEqual(body.data.drills.map((d) => d.gid),
    ['DRL:QR:DL:rg:2:B', 'DRL:QR:DL:rg:3:B', 'DRL:QR:DL:rg:1:A', 'DRL:QR:DL:rg:2:A', 'DRL:QR:DL:rg:3:A'],
    'B begun: its next steps first; the met step never again; then A from step 1');
});
