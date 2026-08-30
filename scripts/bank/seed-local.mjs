import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const CORE = `${ROOT}workers/core`;

const run = (args, cwd = CORE) =>
  execFileSync('npx', ['wrangler', ...args], {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26,
  });

const remote = (sql) => {
  const out = run(['d1', 'execute', 'km_core', '--remote', '--json', '--command', sql]);
  return JSON.parse(out.slice(out.indexOf('[')))[0].results ?? [];
};
const local = (file) => run(['d1', 'execute', 'km_core', '--local', '--file', file]);

const TABLES = [
  // Only what the three apps read. The SRS tables are a different surface and
  // dragging them in means dragging their indexes and their triggers too.
  'core_users', 'core_quiz_session',
  'core_bank_pack', 'core_bank_unit', 'core_bank_item', 'core_bank_item_option',
  'core_bank_unit_item', 'core_bank_attempt', 'core_bank_response',
  'core_bank_profile', 'core_bank_item_feedback', 'core_bank_import',
];

const schema = readFileSync(`${CORE}/schema.sql`, 'utf8');

// Statements are collected line by line rather than by a regex over the whole
// file. A non-greedy `[\s\S]*?\n\);` looks right and is not: one table whose
// body happens not to end on a bare `);` swallows the four that follow it, and
// the seed then tries to create the same table twice.
const lines = schema.split('\n');
const statements = new Map();
for (let i = 0; i < lines.length; i++) {
  const head = /^CREATE TABLE (\w+) \($/.exec(lines[i]);
  if (!head) continue;
  // Balance the parentheses rather than looking for a line that is just `);`.
  // An ALTER-added column lands as `, created_at TEXT NOT NULL DEFAULT (…)));`
  // — closing paren on a content line — and a line-shaped terminator runs
  // straight past it into the next table.
  const body = [lines[i]];
  let open = (lines[i].match(/\(/g) ?? []).length - (lines[i].match(/\)/g) ?? []).length;
  for (let j = i + 1; j < lines.length && open > 0; j++) {
    body.push(lines[j]);
    open += (lines[j].match(/\(/g) ?? []).length - (lines[j].match(/\)/g) ?? []).length;
  }
  statements.set(head[1], body.join('\n'));
}

const ddl = [];
for (const table of [...TABLES].reverse()) ddl.push(`DROP TABLE IF EXISTS ${table};`);
for (const table of TABLES) {
  const stmt = statements.get(table);
  if (stmt) ddl.push(stmt.replace('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS '));
  else console.warn(`  no DDL for ${table}`);
}
for (const m of schema.matchAll(/CREATE (UNIQUE )?INDEX [^;]+;/g)) {
  // An index whose statement runs past its own semicolon has swallowed the
  // table definition after it; taking that would create the table twice.
  if (m[0].includes('CREATE TABLE')) continue;
  if (TABLES.some((t) => m[0].includes(t))) {
    ddl.push(m[0].replace(/CREATE (UNIQUE )?INDEX /,
                          (s) => s.replace('INDEX ', 'INDEX IF NOT EXISTS ')));
  }
}
writeFileSync('/tmp/seed-ddl.sql', ddl.join('\n'));
local('/tmp/seed-ddl.sql');

const lit = (v) => v === null || v === undefined ? 'NULL'
  : typeof v === 'number' ? String(v)
  : `'${String(v).replace(/'/g, "''")}'`;
const copy = (table, where = '') => {
  const rows = remote(`SELECT * FROM ${table} ${where}`);
  return rows.map((r) => `INSERT OR REPLACE INTO ${table} (${Object.keys(r).join(',')})`
    + ` VALUES (${Object.values(r).map(lit).join(',')});`);
};

const data = [
  // Clear the play BEFORE replacing the content. `INSERT OR REPLACE` deletes
  // the row it replaces, and a response pointing at that item makes the delete
  // a foreign-key violation — so a reseed would stop half way and leave the
  // deck partly translated, which is exactly what it did.
  `DELETE FROM core_bank_response;`,
  `DELETE FROM core_bank_attempt;`,
  `DELETE FROM core_bank_profile;`,
  `DELETE FROM core_bank_unit_item;`,
  ...copy('core_bank_pack'),
  ...copy('core_bank_unit'),
  ...copy('core_bank_item', "WHERE status='live'"),
  ...copy('core_bank_item_option'),
  ...copy('core_bank_unit_item'),
  `INSERT OR REPLACE INTO core_users (id, email, display_name) VALUES
     ('CORE:T1','hasib@test','Hasib'),
     ('CORE:T2','sadaf@test','Sadaf'),
     ('CORE:T3','arham@test','Arham');`,
];
writeFileSync('/tmp/seed-data.sql', data.join('\n'));
local('/tmp/seed-data.sql');

const counts = run(['d1', 'execute', 'km_core', '--local', '--json', '--command',
  `SELECT (SELECT COUNT(*) FROM core_bank_pack) packs,
          (SELECT COUNT(*) FROM core_bank_item) items,
          (SELECT COUNT(*) FROM core_bank_item_option) options,
          (SELECT COUNT(*) FROM core_users) users`]);
console.log('  local:', JSON.parse(counts.slice(counts.indexOf('[')))[0].results[0]);
