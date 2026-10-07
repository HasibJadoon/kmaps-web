// A back-link names the root as the Qurʾān spells it; the book may file it under another key. findEntry reads the
// root as spelled first, then this book's own key for it, lowest rank first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { findEntry } from '../src/routes/lexicon_v2';

function d1(db: DatabaseSync) {
  const bound = (sql: string, params: unknown[]) => {
    const stmt = db.prepare(sql);
    return {
      async all<T>() { return { results: stmt.all(...(params as never[])) as T[] }; },
      async first<T>() { return (stmt.get(...(params as never[])) as T) ?? null; },
    };
  };
  return { prepare: (sql: string) => ({ bind: (...p: unknown[]) => bound(sql, p), ...bound(sql, []) }) } as unknown as D1Database;
}

function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE ar_ling_lexicon_entry (id TEXT, source_slug TEXT, root_text TEXT, root_norm TEXT, root_id TEXT, raw_text TEXT,
      entry_text_ar TEXT, entry_text_en TEXT, page_start INT, page_end INT, volume_no INT, source_url TEXT, source_native_id TEXT, status TEXT);
    CREATE TABLE ar_ling_root_lexicon_key (root_norm TEXT, lookup_norm TEXT, key_rank INT, reason TEXT);
    INSERT INTO ar_ling_lexicon_entry (id, source_slug, root_norm) VALUES
      ('E1', 'raghib_mufradat', 'عز'), ('E2', 'ibn_manzur_lisan_arab', 'عزز'), ('E3', 'lane_lexicon', 'شد');
    INSERT INTO ar_ling_root_lexicon_key VALUES
      ('عزز', 'عزز', 0, 'as spelled'), ('عزز', 'عز', 1, 'geminate'),
      ('شدد', 'شدد', 0, 'as spelled'), ('شدد', 'شد', 1, 'geminate');`);
  return d1(db);
}

test('a root filed as spelled is found as spelled', async () => {
  assert.equal((await findEntry(setup(), 'ibn_manzur_lisan_arab', 'عزز'))?.id, 'E2');
});

test('a geminate the phonetic school files under its biliteral is found there', async () => {
  const db = setup();
  const r = await findEntry(db, 'raghib_mufradat', 'عزز');
  assert.equal(r?.id, 'E1');
  assert.equal(r?.root_norm, 'عز');
  assert.equal((await findEntry(db, 'lane_lexicon', 'شدد'))?.root_norm, 'شد');
});

test('a root a book does not have is not found', async () => {
  assert.equal(await findEntry(setup(), 'lane_lexicon', 'عزز'), null);
});
