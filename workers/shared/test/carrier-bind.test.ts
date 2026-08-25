// ─── carrier-bind — the pinned behaviour ─────────────────────────────────────
//
// The interesting test here is the one about where the filter goes. The first
// version of `bindWhere` put it inside the subquery, which would have produced
//
//   target_id IN (SELECT id FROM ar_ling_root_sense
//                  WHERE root_norm = ? AND target_type = ?)
//
// and ar_ling_root_sense has no `target_type` — it is a column of the
// attestation table, saying what kind of thing that row attests. Every
// attestation reading would have failed, and the carrier would have reported
// as empty rather than as broken.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseVia, bindWhere } from '../src/carrier-bind';

const ARC_STEP = JSON.stringify({
  col: 'arc_id', to_table: 'ar_ling_sense_arc', to_col: 'id', root_col: 'root_norm',
});
const ATTESTATION = JSON.stringify({
  col: 'target_id', to_table: 'ar_ling_root_sense', to_col: 'id', root_col: 'root_norm',
  where_col: 'target_type', where_val: 'sense',
});

describe('a direct carrier compares its own column', () => {
  test('the bound value is a parameter, never interpolated', () => {
    const w = bindWhere({ root_bind: 'direct', root_bind_col: 'root_norm' }, 'نزل', 'نزل');
    assert.deepEqual(w, { sql: 'root_norm = ?', params: ['نزل'] });
  });

  test('an id-bound carrier binds the ULID it was given, not the root string', () => {
    const w = bindWhere({ root_bind: 'direct', root_bind_col: 'root_id' }, 'AL01ABC', 'نزل');
    assert.deepEqual(w!.params, ['AL01ABC']);
  });

  test('a column that is not an identifier is refused, not interpolated', () => {
    // `root_bind_col` on a via row holds prose. It must never reach SQL.
    const w = bindWhere(
      { root_bind: 'direct', root_bind_col: 'arc_id -> ar_ling_sense_arc.id' }, 'x', 'x');
    assert.equal(w, null);
  });
});

describe('a via carrier reaches the root through one table', () => {
  test('membership of the keys the far table holds for this root', () => {
    const w = bindWhere(
      { root_bind: 'via', root_bind_col: 'prose', root_bind_via_json: ARC_STEP }, '', 'كتب');
    assert.equal(w!.sql,
      'arc_id IN (SELECT id FROM ar_ling_sense_arc WHERE root_norm = ?)');
    assert.deepEqual(w!.params, ['كتب']);
  });

  test('the filter narrows the CARRIER, so it sits outside the subquery', () => {
    const w = bindWhere(
      { root_bind: 'via', root_bind_col: 'prose', root_bind_via_json: ATTESTATION }, '', 'نزل');
    assert.equal(w!.sql,
      'target_id IN (SELECT id FROM ar_ling_root_sense WHERE root_norm = ?)'
      + " AND target_type = ?");
    assert.deepEqual(w!.params, ['نزل', 'sense']);
  });

  test('the filter is NOT inside the subquery', () => {
    // Pinning the bug directly: ar_ling_root_sense has no target_type column.
    const w = bindWhere(
      { root_bind: 'via', root_bind_col: 'prose', root_bind_via_json: ATTESTATION }, '', 'نزل');
    const subquery = w!.sql.slice(w!.sql.indexOf('('), w!.sql.indexOf(')') + 1);
    assert.ok(!subquery.includes('target_type'),
      'the carrier\'s own filter must not be applied to the table joined to');
  });

  test('an unreadable path is unknown, not zero', () => {
    for (const bad of [null, undefined, '', 'not json', '{}',
                       JSON.stringify({ col: 'a' }),
                       JSON.stringify({ col: 'a; DROP TABLE x', to_table: 't', to_col: 'i', root_col: 'r' })]) {
      assert.equal(
        bindWhere({ root_bind: 'via', root_bind_col: 'prose', root_bind_via_json: bad }, '', 'x'),
        null, `should refuse: ${String(bad)}`);
    }
  });

  test('every identifier in the path is checked before it reaches SQL', () => {
    assert.equal(parseVia(JSON.stringify({
      col: 'arc_id', to_table: 'ar_ling_sense_arc', to_col: 'id',
      root_col: 'root_norm', where_col: 'x = 1 OR 1',
    })), null);
    assert.notEqual(parseVia(ARC_STEP), null);
  });
});
