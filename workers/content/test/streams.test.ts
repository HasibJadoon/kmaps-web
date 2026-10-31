// The Week: Mondays, and picks matched to their studies.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMonth, buildWeek, mondayOf } from '../src/streams';
import type { Study } from '../src/repositories/study.repo';

test('a day falls in the week of its Monday', () => {
  assert.equal(mondayOf('2026-10-31'), '2026-10-26');
  assert.equal(mondayOf('2026-11-02'), '2026-11-02');
  assert.equal(mondayOf('2026-11-08'), '2026-11-02');
});

test('each stream with its picks, done counted, a pick with a study carrying it', async () => {
  const rows: Record<string, unknown[]> = {
    streams: [{ stream_key: 'qr', title: 'Qurʾān', title_ar: 'القرآن', icon: 'book', accent: '#c9a84c', queue_module: 'qr', queue_path: 'sprint/backlog/surahs' }],
    picks: [
      { pick_id: 'a', stream_key: 'qr', unit: 'QR:SP:40:1-3', label: 'P01', title: 'Tanzil', title_ar: null, ref: '40:1–3',
        page_json: '{"module":"qr","path":"sprint/page/40/1"}', down_json: null, state: 'done' },
      { pick_id: 'b', stream_key: 'qr', unit: 'QR:SP:40:4-5', label: 'P02', title: null, title_ar: null, ref: null, page_json: null, down_json: null, state: 'todo' },
    ],
  };
  const db = { prepare: (sql: string) => ({ bind: () => ({ all: async () => ({ results: sql.includes('cm_stream ') ? rows.streams : rows.picks }) }),
    all: async () => ({ results: sql.includes('FROM cm_stream') ? rows.streams : rows.picks }) }) } as unknown as D1Database;
  const studies = [{ doc_id: 'CM:STUDY:ghafir:P01', sprint: { backlog: { module: 'qr', path: 'x' }, unit: 'QR:SP:40:1-3' } }] as unknown as Study[];
  const w = await buildWeek(db, '2026-11-04', studies);
  assert.equal(w.start, '2026-11-02');
  assert.equal(w.label, 'Week of 2 Nov');
  assert.equal(w.number, 45);
  assert.deepEqual(w.streams[0].picks.map((p) => [p.label, p.study]), [['P01', 'CM:STUDY:ghafir:P01'], ['P02', null]]);
  assert.equal(w.streams[0].done, 1);
});

test("a month is the sprints whose Monday falls in it, each stream's done counted per week", async () => {
  const db = { prepare: (sql: string) => ({ bind: () => ({ all: async () => ({ results:
    sql.includes('FROM cm_stream ') ? [{ stream_key: 'wv', title: 'Worldview', title_ar: null, icon: null, accent: null }]
    : sql.includes('cm_sprint_pick') ? [{ stream_key: 'wv', week_start: '2026-11-09', label: '02', title: 'Liberalism', state: 'done' },
                                        { stream_key: 'wv', week_start: '2026-11-09', label: '05', title: 'Marxism', state: 'todo' }]
    : [{ retro_id: 'r', stream_key: null, kind: 'keep', text: 'One ism a week', author_ref: 'CORE:H', created_at: '2026-11-30' }] }) }) }) } as unknown as D1Database;
  const m = await buildMonth(db, '2026-11', { 'CORE:H': 'Hasib' });
  assert.deepEqual(m.weeks.map((w) => w.start), ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30']);
  assert.equal(m.label, 'November 2026');
  assert.deepEqual(m.streams[0].weeks.map((w) => [w.done, w.total]), [[0, 0], [1, 2], [0, 0], [0, 0], [0, 0]]);
  assert.deepEqual([m.prev, m.next], ['2026-10', '2026-12']);
  assert.equal(m.retro[0].author, 'Hasib');
});
