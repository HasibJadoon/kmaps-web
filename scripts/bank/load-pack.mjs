// ─── Loading a pack without the HTTP route ────────────────────────────────────
//
// POST /core/bank/import is owner-gated and this script does not authenticate.
// Rather than re-implement the importer's upsert, digest and retire rules — two
// copies of that logic would drift, and the copy nobody exercises would be the
// wrong one — this runs the REAL importPack() against remote D1 through a shim
// that speaks the D1 binding's shape and executes with wrangler.
//
// So the code path under test here is production's. What is NOT exercised is
// the route in front of it: auth, the body parse, the dry-run rollback. Use the
// curl in the README for that.

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

const DB = process.env.BANK_DB ?? 'km_core';
const DRY = process.env.DRY_RUN === '1';
const dir = mkdtempSync(join(tmpdir(), 'bankload-'));
let calls = 0;

/** SQL literal. Everything is bound as text or a number; nothing is concatenated
 *  from user input, and the values here are ours. */
const lit = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/'/g, "''")}'`;
};

function run(sql, params) {
  let i = 0;
  const inlined = sql.replace(/\?/g, () => lit(params[i++]));
  // --command, never --file: with a file wrangler reports a SUMMARY row
  // ("Total queries executed") in place of the results, so every SELECT comes
  // back as one truthy row and every existence check says yes.
  writeFileSync(join(dir, `s${calls++}.sql`), inlined);   // kept for reading back
  const out = execFileSync('npx', [
    'wrangler', 'd1', 'execute', DB, '--remote', '--json', '--command', inlined,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 });
  const parsed = JSON.parse(out.slice(out.indexOf('[')));
  return parsed[0]?.results ?? [];
}

/** Enough of the D1 binding for the importer, and nothing more. */
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
