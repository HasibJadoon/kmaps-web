import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

const DB = process.env.BANK_DB ?? 'km_core';
const DRY = process.env.DRY_RUN === '1';
const dir = mkdtempSync(join(tmpdir(), 'bankload-'));
let calls = 0;

const lit = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/'/g, "''")}'`;
};

function run(sql, params) {
  let i = 0;
  const inlined = sql.replace(/\?/g, () => lit(params[i++]));

  writeFileSync(join(dir, `s${calls++}.sql`), inlined);
  const out = execFileSync('npx', [
    'wrangler', 'd1', 'execute', DB, '--remote', '--json', '--command', inlined,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 });
  const parsed = JSON.parse(out.slice(out.indexOf('[')));
  return parsed[0]?.results ?? [];
}

const db = {
  prepare(sql) {
    return {
      bind(...params) {
        return {
          all:   async () => ({ results: run(sql, params) }),
          first: async () => run(sql, params)[0] ?? null,
          run:   async () => { run(sql, params); return { success: true }; },
        };
      },
      all:   async () => ({ results: run(sql, []) }),
      first: async () => run(sql, [])[0] ?? null,
      run:   async () => { run(sql, []); return { success: true }; },
    };
  },
};

const { importPack, validate } = await import('../../workers/core/src/bank/import.ts');

for (const path of process.argv.slice(2)) {
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  const errors = validate(doc);
  if (errors.length) {
    console.error(`✗ ${path}\n  ` + errors.join('\n  '));
    process.exitCode = 1;
    continue;
  }
  const result = await importPack(db, 'system@test.com', doc,
                                  { dryRun: DRY, filePath: path });
  console.log(path, JSON.stringify(result, null, 2));
}
