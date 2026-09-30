// Project the grammar-term registry (GT) from its home to the two domains that keep a copy.
//
// km_arabic_linguistic.ar_ling_gram_term is the term of record. km_quran and km_arabic each
// keep a mirror of it (same table name) so their own SQL can join a term's names: QR for the
// iʿrāb / sentence-structure links (qr_gram_term_ref is a view over its mirror), AR for the
// lesson and syllabus links (ar_lesson_term, ar_node_gram_term). Nothing writes the mirrors
// but this script. Re-run it whenever the registry changes:
//
//   node scripts/project-gram-terms.mjs            # both mirrors
//   node scripts/project-gram-terms.mjs quran      # one
//
// Each mirror takes the columns it has in common with the registry, upserted by id. A mirror row whose term
// the registry no longer holds is reported, not deleted: the domain's links may still name it.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const run = (dir, args) => execFileSync('npx', ['wrangler', ...args],
  { cwd: `${ROOT}workers/${dir}`, encoding: 'utf8', maxBuffer: 1 << 28 });
const read = (out) => {
  const blocks = JSON.parse(out.slice(out.indexOf('[')));
  return blocks.flatMap((b) => b.results ?? []);
};
const sql = (dir, db, command) => read(run(dir, ['d1', 'execute', db, '--remote', '--json', '--command', command]));

const MIRRORS = [
  { name: 'quran', dir: 'quran', db: 'km_quran' },
  { name: 'arabic', dir: 'arabic', db: 'km_arabic' },
].filter((m) => process.argv.length <= 2 || process.argv.slice(2).includes(m.name));

const columnsOf = (dir, db, table = 'ar_ling_gram_term') =>
  sql(dir, db, `SELECT name FROM pragma_table_info('${table}')`).map((r) => r.name);
const alCols = columnsOf('ar-linguistics', 'km_arabic_linguistic');
const alCatCols = columnsOf('ar-linguistics', 'km_arabic_linguistic', 'ar_ling_gram_category');
const lit = (v) => v === null || v === undefined ? 'NULL'
  : typeof v === 'number' ? String(v)
  : `'${String(v).replace(/'/g, "''")}'`;
const dir = mkdtempSync(join(tmpdir(), 'gt-'));

for (const m of MIRRORS) {
  const mine = columnsOf(m.dir, m.db);
  const cols = alCols.filter((c) => mine.includes(c));
  const terms = sql('ar-linguistics', 'km_arabic_linguistic',
    `SELECT ${cols.join(',')} FROM ar_ling_gram_term ORDER BY category_key, term_order`);
  const extra = mine.includes('synced_at') ? ['synced_at'] : [];
  const now = new Date().toISOString();
  const statements = [];
  // a mirror that keeps the categories too (km_quran) has its terms point at them: those first
  const myCats = columnsOf(m.dir, m.db, 'ar_ling_gram_category');
  if (myCats.length) {
    const cc = alCatCols.filter((c) => myCats.includes(c));
    const cats = sql('ar-linguistics', 'km_arabic_linguistic', `SELECT ${cc.join(',')} FROM ar_ling_gram_category`);
    const set = cc.filter((c) => c !== 'category_key').map((c) => `${c} = excluded.${c}`).join(', ');
    statements.push(`INSERT INTO ar_ling_gram_category (${cc.join(',')}) VALUES `
      + cats.map((t) => '(' + cc.map((c) => lit(t[c])).join(',') + ')').join(',')
      + ` ON CONFLICT (category_key) DO UPDATE SET ${set};`);
  }
  for (let i = 0; i < terms.length; i += 40) {
    const values = terms.slice(i, i + 40).map((t) =>
      '(' + [...cols.map((c) => lit(t[c])), ...extra.map(() => lit(now))].join(',') + ')');
    // an upsert, not a replace: the mirror's own tables hold foreign keys to these rows, and
    // REPLACE deletes the row it replaces
    const set = [...cols, ...extra].filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ');
    statements.push(`INSERT INTO ar_ling_gram_term (${[...cols, ...extra].join(',')}) VALUES ${values.join(',')}`
      + ` ON CONFLICT (id) DO UPDATE SET ${set};`);
  }
  statements.unshift('PRAGMA defer_foreign_keys = ON;');
  const file = join(dir, `${m.name}.sql`);
  writeFileSync(file, statements.join('\n'));
  run(m.dir, ['d1', 'execute', m.db, '--remote', '--file', file]);
  const ids = new Set(terms.map((t) => t.id));
  const held = sql(m.dir, m.db, `SELECT id FROM ar_ling_gram_term`).map((r) => r.id);
  const stale = held.filter((id) => !ids.has(id));
  console.log(`${m.db}: ${terms.length} projected (${cols.length} columns); mirror holds ${held.length}` +
    (stale.length ? `; not in the registry: ${stale.join(', ')}` : ''));
}
