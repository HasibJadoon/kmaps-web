import { execFileSync } from 'node:child_process';
const { judge } = await import('/Users/abdulhasibahmedjadoon/Documents/Documents - AbdulHasib’s Mac mini - 2/LLM/_Repositories/kmaps-web/workers/core/src/bank/score.ts');
const q = (sql) => {
  const out = execFileSync('npx', ['wrangler','d1','execute','km_core','--remote','--json','--command',sql],
    { encoding:'utf8', stdio:['ignore','pipe','pipe'], maxBuffer: 1<<26 });
  return JSON.parse(out.slice(out.indexOf('[')))[0].results;
};
const items = q(`SELECT i.* FROM core_bank_item i JOIN core_bank_pack p ON p.id=i.pack_ref
                  WHERE p.slug IN ('quran-40-quiz','quran-40-path') ORDER BY i.slug`);
const opts = q(`SELECT o.* FROM core_bank_item_option o JOIN core_bank_item i ON i.id=o.item_ref
                JOIN core_bank_pack p ON p.id=i.pack_ref
                WHERE p.slug IN ('quran-40-quiz','quran-40-path') ORDER BY o.sort_order`);
const byItem = new Map();
for (const o of opts) (byItem.get(o.item_ref) ?? byItem.set(o.item_ref, []).get(o.item_ref)).push(o);

// For each item: the answer a person who knows would give, and one who doesn't.
// An answer is an option ID, never an index — the room sends what it was
// given, and an index would silently mean a different option after a shuffle.
const ordered = (os) => os.filter((o) => o.role === 'order_token')
                          .sort((a, b) => a.sort_order - b.sort_order).map((o) => o.id);
const right = (it, os) => {
  if (it.interaction === 'order') return ordered(os);
  if (it.response_json) return JSON.parse(it.response_json).correct;
  return os.filter((o) => o.is_correct === 1).map((o) => o.id);
};
const wrong = (it, os) => {
  if (it.interaction === 'order') return ordered(os).reverse();
  if (it.response_json) { const r = JSON.parse(it.response_json);
    return typeof r.correct === 'number' ? r.correct + 200 : !r.correct; }
  return os.filter((o) => o.is_correct !== 1).slice(0, 1).map((o) => o.id);
};
let bad = 0;
for (const it of items) {
  const os = byItem.get(it.id) ?? [];
  const good = judge(it, os, right(it, os), 3000);
  const poor = judge(it, os, wrong(it, os), 3000);
  const ok = it.scoring === 'none'
    ? good.isCorrect === null && poor.isCorrect === null
    : good.credit >= 1 && poor.credit < 1;
  if (!ok) bad++;
  console.log(`${ok ? '✓' : '✗'} ${it.slug.padEnd(26)} ${it.interaction.padEnd(14)}`
    + `${String(it.scoring).padEnd(14)} right=${JSON.stringify(good.credit)}/${good.points ?? 0}pts`
    + `  wrong=${JSON.stringify(poor.credit)}`);
}
console.log(bad ? `\n${bad} item(s) not answerable as loaded` : '\nevery loaded item is answerable');
process.exitCode = bad ? 1 : 0;
