import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const run = (dir, args) => execFileSync('npx', ['wrangler', ...args],
  { cwd: `${ROOT}workers/${dir}`, encoding: 'utf8', maxBuffer: 1 << 26 });
const read = (out) => {
  const i = out.indexOf('['); const text = out.slice(i);
  try { return JSON.parse(text).flatMap((b) => b.results ?? []); }
  catch (e) {
    const pos = Number(e.message.match(/position (\d+)/)?.[1] ?? 0);
    return JSON.parse(text.slice(0, pos)).flatMap((b) => b.results ?? []);
  }
};

const bare = (s) => String(s ?? '')
  .replace(/[ً-ْٰـ]/g, '')
  .replace(/[إأآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  .replace(/\s+/g, ' ').trim();

const al = read(run('ar-linguistics', ['d1','execute','km_arabic_linguistic','--remote','--json',
  '--command','SELECT id, category_key, term_key, name_ar, name_bare FROM ar_ling_gram_term']));

const bySlug = new Map(), byArabic = new Map();
const push = (map, key, value) => {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
};
for (const t of al) {
  push(bySlug, t.term_key, t);
  push(byArabic, bare(t.name_ar), t);
  push(byArabic, bare(t.name_bare), t);
}

const PREFER = {
  term_key: ['irab_role', 'sentence_role', 'kalam_kind', 'pos', 'nawasikh', 'harf_maani'],
  clause_function: ['sentence_role', 'irab_role', 'sentence_class'],
  clause_type: ['sentence_class', 'kalam_kind'],
  nuance_type: ['balagha_maani', 'kalam_kind'],
};

const unbound = read(run('quran', ['d1','execute','km_quran','--remote','--json','--command',
  `SELECT kind, key, label_ar, canonical_key, category FROM qr_ss_vocab_register
    WHERE gram_term_id IS NULL`]));

const pick = (row, candidates) => {
  if (candidates.length === 1) return candidates[0];
  if (row.category) {
    const exact = candidates.find((c) => c.category_key === row.category);
    if (exact) return exact;
  }
  for (const category of PREFER[row.kind] ?? []) {
    const hit = candidates.find((c) => c.category_key === category);
    if (hit) return hit;
  }
  return null;
};

const matched = [], unresolved = [];
for (const row of unbound) {
  const pool = [
    ...(bySlug.get(row.key) ?? []),
    ...(bySlug.get(row.canonical_key ?? '') ?? []),
    ...(byArabic.get(bare(row.key)) ?? []),
    ...(byArabic.get(bare(row.label_ar)) ?? []),
  ];
  const seen = new Set(); const candidates = pool.filter((t) => !seen.has(t.id) && seen.add(t.id));
  const hit = candidates.length ? pick(row, candidates) : null;
  if (hit) matched.push([row, hit]); else unresolved.push(row);
}
console.log(`  unbound ${unbound.length} → matched ${matched.length}, still unresolved ${unresolved.length}`);

const esc = (v) => String(v).replace(/'/g, "''");
const apply = process.argv.includes('--apply');
writeFileSync('/tmp/bind.sql', matched.map(([r, t]) =>
  `UPDATE qr_ss_vocab_register SET gram_term_id='${esc(t.id)}', mapping_status='mapped'`
  + ` WHERE kind='${esc(r.kind)}' AND key='${esc(r.key)}';`).join('\n'));

if (apply && matched.length) {
  run('quran', ['d1','execute','km_quran','--remote','--file','/tmp/bind.sql']);
  console.log('  applied');
}

const byKind = {};
for (const r of unresolved) byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
console.log('  unresolved by kind:', JSON.stringify(byKind));
console.log('  examples:', unresolved.slice(0, 10).map((r) => `${r.kind}/${r.key}`).join(', '));

writeFileSync('/tmp/unresolved.json', JSON.stringify(unresolved, null, 1));
console.log('  unresolved written to /tmp/unresolved.json');
