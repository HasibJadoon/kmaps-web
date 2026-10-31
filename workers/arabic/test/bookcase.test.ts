// The bookcase (GET /ar/text/bookcase, /ar/text/bookcase/shelf, /ar/text/works/:id/profile): a book with a cover picture
// (ar_acquisition_ref.meta_json.cover_key, set by kmaps-resources scripts/library/publish_covers.py) is served with the
// picture's URL; a book without one is served with cover null, so the app keeps its placeholder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { Router } from '../../shared/src/router';
import { bookcaseRoutes } from '../src/routes/bookcase';

function d1(db: DatabaseSync): D1Database {
  const stmt = (q: string, args: unknown[] = []) => {
    const s = db.prepare(q);
    return {
      bind: (...b: unknown[]) => stmt(q, b),
      all: async () => ({ results: s.all(...(args as never[])) }),
      first: async () => s.get(...(args as never[])) ?? null,
      run: async () => ({ meta: { changes: Number(s.run(...(args as never[])).changes) } }),
    };
  };
  return { prepare: (q: string) => stmt(q) } as unknown as D1Database;
}

function world() {
  const AR = new DatabaseSync(':memory:');
  AR.exec(`
    CREATE TABLE ar_practice_label (scope TEXT, key TEXT, label TEXT, label_ar TEXT, detail TEXT, icon TEXT, color TEXT,
                                    min_value INTEGER, extra_json TEXT, sort INTEGER, PRIMARY KEY (scope, key));
    CREATE TABLE ar_acq_category (id TEXT PRIMARY KEY, name_ar TEXT);
    CREATE TABLE ar_acq_entry (ar_no INTEGER, name TEXT, parent_ar_no INTEGER);
    CREATE TABLE ar_acq_audio (id TEXT, acq_ref_id TEXT, title_ar TEXT, object_key TEXT, status TEXT, duration_sec REAL);
    CREATE TABLE ar_acquisition_ref (id TEXT PRIMARY KEY, slug TEXT, title_ar TEXT, title_en TEXT, author TEXT, note_ar TEXT,
                                     genre_ref TEXT, register TEXT, level TEXT, verse_form TEXT, status TEXT, meta_json TEXT,
                                     page_template TEXT, subtitle_ar TEXT);
    CREATE TABLE ar_text_unit (id TEXT PRIMARY KEY, acq_ref_id TEXT, seq INTEGER, title_ar TEXT, text_ar TEXT, word_count INTEGER,
                               status TEXT);
    INSERT INTO ar_practice_label (scope, key, label, label_ar, icon, color, sort)
      VALUES ('shelf', 'shape:amthal', 'Proverbs', 'الأمثال', 'quote.opening', '#B08D57', 1),
             ('shelf', 'shape:prose', 'Stories', 'القصص', 'book', '#C9A84C', 2);
    INSERT INTO ar_acquisition_ref (id, slug, title_ar, author, note_ar, genre_ref, level, status, meta_json) VALUES
      ('ACQ:SHM:6321', 'kalila', 'كليلة ودمنة', 'ابن المقفع', 'ت 142', 'g', 'B2', 'live',
       '{"shape":"prose","cover_key":"books/covers/ACQ_SHM_6321-ab12cd34.jpg"}'),
      ('ACQ:SHM:3832', 'bukhala', 'البخلاء للجاحظ', 'الجاحظ', 'ت 255', 'g', 'B1', 'live', '{"shape":"prose"}'),
      ('ACQ:SHM:126', 'amthal', 'الأمثال - أبو عبيد', 'أبو عبيد', 'ت 224', 'g', 'C1', 'live',
       '{"shape":"amthal","cover_key":"books/covers/a b-1.jpg"}');
    INSERT INTO ar_text_unit VALUES ('u1', 'ACQ:SHM:6321', 1, 't', 'نص النص النص النص', 5, 'live'),
                                    ('u2', 'ACQ:SHM:3832', 1, 't', 'نص النص النص النص', 5, 'live'),
                                    ('u3', 'ACQ:SHM:126', 1, 't', 'نص النص النص النص', 5, 'live');`);
  const env = { DB_AR: d1(AR) } as any;
  const r = new Router<any>(); bookcaseRoutes(r);
  const get = async (path: string) => {
    const res = await r.handle(new Request('https://ar' + path), env);
    return { status: res.status, body: await res.json() as any };
  };
  return { AR, get };
}

test('the bookcase: a book with a cover key is served with its picture URL, one without has cover null', async () => {
  const { status, body } = await world().get('/ar/text/bookcase');
  assert.equal(status, 200);
  const books = body.data.shelves.flatMap((s: any) => s.items);
  const by = (id: string) => books.find((b: any) => b.id === id);
  assert.equal(by('ACQ:SHM:6321').cover, '/api/ar/audio/books/covers/ACQ_SHM_6321-ab12cd34.jpg');
  assert.equal(by('ACQ:SHM:3832').cover, null, 'no picture yet: the placeholder stays');
  assert.equal(by('ACQ:SHM:126').cover, '/api/ar/audio/books/covers/a%20b-1.jpg', 'the key is URL-encoded');
  // the placeholder's own look is untouched for every book
  assert.equal(by('ACQ:SHM:3832').color, '#C9A84C');
  assert.equal(by('ACQ:SHM:3832').icon, 'book');
});

test('an opened shelf and the book profile carry the cover too', async () => {
  const w = world();
  const shelf = (await w.get('/ar/text/bookcase/shelf?id=' + encodeURIComponent('turath:prose'))).body.data.shelf;
  assert.deepEqual(shelf.items.map((b: any) => [b.id, b.cover === null]), [['ACQ:SHM:6321', false], ['ACQ:SHM:3832', true]]);
  const profile = (await w.get('/ar/text/works/ACQ%3ASHM%3A6321/profile')).body.data;
  assert.equal(profile.work.cover, '/api/ar/audio/books/covers/ACQ_SHM_6321-ab12cd34.jpg');
  const plain = (await w.get('/ar/text/works/ACQ%3ASHM%3A3832/profile')).body.data;
  assert.equal(plain.work.cover, null);
});
