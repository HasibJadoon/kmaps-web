import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const run = (dir, args) => execFileSync('npx', ['wrangler', ...args],
  { cwd: `${ROOT}workers/${dir}`, encoding: 'utf8', maxBuffer: 1 << 26 });
const read = (out) => {
  const i = out.indexOf('[');
  const text = out.slice(i);
  let blocks;
  try { blocks = JSON.parse(text); }
  catch (e) { blocks = JSON.parse(text.slice(0, e.message.match(/position (\d+)/)?.[1] ?? 0)); }
  return blocks.flatMap((b) => b.results ?? []);
};

const COLS = ['id','category_key','term_key','qac_flag','parent_term_id','term_order',
  'name_ar','name_en','name_ur','short_ar','short_en','short_ur',
  'definition_ar','definition_en','definition_ur','badge_color','icon',
  'version','superseded_by','status','discipline','name_bare'];

const terms = read(run('ar-linguistics', ['d1','execute','km_arabic_linguistic','--remote','--json',
  '--command', `SELECT ${COLS.join(',')} FROM ar_ling_gram_term ORDER BY category_key, term_order`]));

const lit = (v) => v === null || v === undefined ? 'NULL'
  : typeof v === 'number' ? String(v)
  : `'${String(v).replace(/'/g, "''")}'`;

const statements = [];
for (let i = 0; i < terms.length; i += 60) {
  const values = terms.slice(i, i + 60).map((t) =>
    '(' + [lit(`GT:${t.category_key}:${t.term_key}`), ...COLS.map((c) => lit(t[c]))].join(',') + ')');
  statements.push(`INSERT OR REPLACE INTO qr_gram_term_ref (gram_term_ref,${COLS.join(',')})`
    + ` VALUES ${values.join(',')};`);
}
writeFileSync('/tmp/gram-terms.sql', statements.join('\n'));
run('quran', ['d1','execute','km_quran','--remote','--file','/tmp/gram-terms.sql']);

const check = read(run('quran', ['d1','execute','km_quran','--remote','--json','--command',
  `SELECT (SELECT COUNT(*) FROM qr_gram_term_ref) AS projected,
          (SELECT COUNT(*) FROM (SELECT DISTINCT lx_grammar_ref r FROM qr_ss_scope_grammar_link) g
            LEFT JOIN qr_gram_term_ref t ON t.gram_term_ref = g.r
           WHERE t.gram_term_ref IS NULL) AS dangling`]));
console.log(' ', check[0]);
