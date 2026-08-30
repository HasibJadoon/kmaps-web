const BASE = process.env.KM_BASE ?? 'http://127.0.0.1:8799';
let failures = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? '  ' + detail : ''}`);
};
const api = async (path, who, init = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json',
               authorization: `Bearer ${process.env[`TOK_${who}`]}`, ...init.headers },
  });
  const text = await res.text();
  try { return { status: res.status, body: JSON.parse(text).data ?? JSON.parse(text) }; }
  catch { return { status: res.status, body: text }; }
};

const write = (who, forRef, forName, en) =>
  api('/core/bank/cards', who, { method: 'POST', body: JSON.stringify({
    prompt_en: en, prompt_ar: 'سؤال', prompt_ur: 'سوال',
    addressed_to_ref: forRef, addressed_to_name: forName, difficulty: 2 }) });

const hasib = await write('HASIB', 'CORE:T2', 'Sadaf', "HASIB-SECRET: what are you not saying?");
check(hasib.status === 201, 'Hasib writes a card for Sadaf', `status ${hasib.status}`);
const sadaf = await write('SADAF', 'CORE:T1', 'Hasib', "SADAF-SECRET: when did I last hurt you?");
check(sadaf.status === 201, 'Sadaf writes one for Hasib');
const arham = await write('ARHAM', 'CORE:T1', 'Hasib', "ARHAM-SECRET: what do you regret?");
check(arham.status === 201, 'Arham writes one for Hasib');

const mine = (await api('/core/bank/table/tonight', 'HASIB')).body;
const myPrompts = (mine?.cards ?? []).map((c) => c.prompt_en).join(' | ');
check(myPrompts.includes('HASIB-SECRET'), 'Hasib sees his own card');
check(!myPrompts.includes('SADAF-SECRET') && !myPrompts.includes('ARHAM-SECRET'),
      'and NOT the cards written for him', myPrompts.slice(0, 60));

const seats = mine?.table ?? [];
check(seats.length >= 2, 'the others are at the table', seats.map((s) => s.name).join(', '));
check(seats.every((s) => s.waiting >= 1), 'each showing a count', 
      seats.map((s) => `${s.name}:${s.waiting}`).join(' '));
check(!JSON.stringify(seats).includes('SECRET'),
      'and no prompt anywhere in the seat data');

// Every other way in.
const packsBody = (await api('/core/bank/packs', 'HASIB')).body;
const packs = Array.isArray(packsBody) ? packsBody : [];
const others = packs.filter((p) => p.app === 'table' && p.slug.startsWith('table-core:')
                                   && !p.slug.includes('t1'));
check(others.length === 0, "another person's deck is not even listed",
      others.map((p) => p.slug).join(', '));

const sadafBody = (await api('/core/bank/packs', 'SADAF')).body;
const sadafPack = (Array.isArray(sadafBody) ? sadafBody : []).find((p) => p.app === 'table' && p.slug.includes('t2'));
if (sadafPack) {
  const peek = await api(`/core/bank/packs/table-core:t2`, 'HASIB');
  check(peek.status === 403 || peek.status === 404,
        "and cannot be opened by slug", `status ${peek.status}`);
  check(!JSON.stringify(peek.body ?? '').includes('SADAF-SECRET'),
        'nor leaked in the refusal');
}

const stolen = await api(`/core/bank/cards/${sadaf.body.id}`, 'HASIB', { method: 'DELETE' });
check(stolen.status === 403, "and cannot be deleted by someone else",
      `status ${stolen.status}`);

console.log(failures ? `\n${failures} failed` : '\nnobody can see anybody else’s cards');
process.exitCode = failures ? 1 : 0;
