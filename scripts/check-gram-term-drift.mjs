// Report drift between the grammar-term registry and its two mirrors. READ-ONLY: SELECTs only.
//
// km_arabic_linguistic.ar_ling_gram_term is the term of record; km_quran and km_arabic keep a copy
// (same table name) so their own SQL can join a term's names. scripts/project-gram-terms.mjs is the
// only writer of the copies. This script never writes — it tells you whether a re-projection is due:
//
//   node scripts/check-gram-term-drift.mjs            # both mirrors
//   node scripts/check-gram-term-drift.mjs quran      # one
//   node scripts/check-gram-term-drift.mjs --verbose  # every differing id, not the first 20
//
// For ar_ling_gram_term (and ar_ling_gram_category / ar_ling_gram_term_alias where a mirror keeps
// them) it compares the columns the mirror shares with the registry and reports rows missing from
// the mirror, rows only the mirror holds, and rows whose shared columns differ (with the columns).
// Exit code 1 when anything drifted, so it can gate a deploy or a cron.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const only = args.filter((a) => !a.startsWith('--'));

const select = (dir, db, command) => {
  if (!/^\s*SELECT\b/i.test(command)) throw new Error(`read-only script: refusing ${command.slice(0, 40)}`);
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', db, '--remote', '--json', '--command', command],
    { cwd: `${ROOT}workers/${dir}`, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(out.slice(out.indexOf('['))).flatMap((b) => b.results ?? []);
};
const columnsOf = (dir, db, table) =>
  select(dir, db, `SELECT name FROM pragma_table_info('${table}')`).map((r) => r.name);

const HOME = { dir: 'ar-linguistics', db: 'km_arabic_linguistic' };
const MIRRORS = [
  { name: 'quran', dir: 'quran', db: 'km_quran' },
  { name: 'arabic', dir: 'arabic', db: 'km_arabic' },
].filter((m) => !only.length || only.includes(m.name));

// the key each table is compared on; a table without one (alias) is compared as a set of whole rows
const TABLES = [
  { table: 'ar_ling_gram_term', key: ['id'] },
  { table: 'ar_ling_gram_category', key: ['category_key'] },
  { table: 'ar_ling_gram_term_alias', key: null },
];
// bookkeeping the mirrors add or stamp themselves: never drift
const IGNORE = new Set(['synced_at', 'created_at', 'updated_at']);

const norm = (v) => (v === undefined ? null : v);
const keyOf = (row, cols) => JSON.stringify(cols.map((c) => norm(row[c])));
const show = (xs) => (verbose ? xs : xs.slice(0, 20)).join(', ') + (!verbose && xs.length > 20 ? ` … (+${xs.length - 20})` : '');

let drifted = false;
for (const m of MIRRORS) {
  console.log(`\n${m.db} vs ${HOME.db}`);
  for (const { table, key } of TABLES) {
    const homeCols = columnsOf(HOME.dir, HOME.db, table);
    const mineCols = columnsOf(m.dir, m.db, table);
    if (!mineCols.length) { console.log(`  ${table}: not kept in this mirror`); continue; }
    if (!homeCols.length) { console.log(`  ${table}: not in the registry (mirror-only table)`); drifted = true; continue; }
    const cols = homeCols.filter((c) => mineCols.includes(c) && !IGNORE.has(c));
    const k = key ?? cols;
    const list = cols.join(',');
    const [home, mine] = [select(HOME.dir, HOME.db, `SELECT ${list} FROM ${table}`), select(m.dir, m.db, `SELECT ${list} FROM ${table}`)];
    const homeBy = new Map(home.map((r) => [keyOf(r, k), r]));
    const mineBy = new Map(mine.map((r) => [keyOf(r, k), r]));
    const missing = [...homeBy.keys()].filter((x) => !mineBy.has(x));
    const extra = [...mineBy.keys()].filter((x) => !homeBy.has(x));
    const changed = [];
    const changedCols = new Map();
    if (key) {
      for (const [id, h] of homeBy) {
        const r = mineBy.get(id);
        if (!r) continue;
        const diff = cols.filter((c) => JSON.stringify(norm(h[c])) !== JSON.stringify(norm(r[c])));
        if (diff.length) {
          changed.push(id);
          for (const c of diff) changedCols.set(c, (changedCols.get(c) ?? 0) + 1);
        }
      }
    }
    const notShared = homeCols.filter((c) => !mineCols.includes(c) && !IGNORE.has(c));
    const label = (xs) => xs.map((x) => JSON.parse(x).join('|'));
    console.log(`  ${table}: registry ${home.length}, mirror ${mine.length} (compared on ${cols.length} shared columns` +
      (notShared.length ? `; mirror lacks ${notShared.join(', ')}` : '') + ')');
    if (missing.length) console.log(`    missing from mirror (${missing.length}): ${show(label(missing))}`);
    if (extra.length) console.log(`    only in mirror (${extra.length}): ${show(label(extra))}`);
    if (changed.length) {
      console.log(`    differing rows (${changed.length}): ${show(label(changed))}`);
      console.log(`    by column: ${[...changedCols].map(([c, n]) => `${c} ×${n}`).join(', ')}`);
    }
    if (missing.length || extra.length || changed.length) drifted = true;
    else console.log('    in step');
  }
}
console.log(drifted ? '\nDRIFT — re-run scripts/project-gram-terms.mjs (it writes; review first).' : '\nAll mirrors in step.');
process.exit(drifted ? 1 : 0);
