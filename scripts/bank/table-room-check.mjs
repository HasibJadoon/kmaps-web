import { WebSocket } from 'ws';

const BASE = process.env.KM_BASE ?? 'http://127.0.0.1:8799';
let failures = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? '  ' + detail : ''}`);
};
const api = async (path, who, init = {}) => {
  const res = await fetch(`${BASE}${path}`, { ...init,
    headers: { 'content-type': 'application/json',
               authorization: `Bearer ${process.env[`TOK_${who}`]}`, ...init.headers } });
  const text = await res.text();
  try { return { status: res.status, body: JSON.parse(text).data ?? JSON.parse(text) }; }
  catch { return { status: res.status, body: text }; }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const join = (code, who, remote = false) => new Promise((resolve) => {
  const ws = new WebSocket(
    `${BASE.replace('http', 'ws')}/core/bank/table/rooms/${code}/live`
      + (remote ? '?remote=1' : ''),
                           { headers: { authorization: `Bearer ${process.env[`TOK_${who}`]}` } });
  const seen = [];
  ws.on('message', (d) => { try { seen.push(JSON.parse(d.toString())); } catch {} });
  ws.on('open', () => resolve({ ws, seen, ok: true }));
  ws.on('unexpected-response', (_r, res) => resolve({ ok: false, status: res.statusCode }));
  ws.on('error', () => {});
});
const card = (who, forName, en) => api('/core/bank/cards', who, { method: 'POST',
  body: JSON.stringify({ prompt_en: en, addressed_to_name: forName, difficulty: 2 }) });

// Uneven hands, which is the point: 3, 2 and 1.
for (const t of ['a', 'b', 'c']) await card('HASIB', 'Sadaf', `HASIB ${t}`);
for (const t of ['a', 'b']) await card('SADAF', 'Hasib', `SADAF ${t}`);
await card('ARHAM', 'Hasib', 'ARHAM a');

const code = `D${Date.now().toString(36).toUpperCase().slice(-6)}`;
const h = await join(code, 'HASIB');
const s = await join(code, 'SADAF');
const a = await join(code, 'ARHAM', true);
check(h.ok && s.ok && a.ok, 'three people join the table');
await wait(700);

const sync = h.seen.find((m) => m.t === 'sync');
check((sync?.roster ?? []).length >= 1, 'the roster fills', 
      (sync?.roster ?? []).map((r) => `${r.name}:${r.waiting}`).join(' '));
check(sync?.turn === 'CORE:T1', 'the first to join has the first turn', String(sync?.turn));

// Somebody with no cards cannot join.
const empty = await join(code, 'NOBODY');
check(!empty.ok && empty.status === 409,
      'and somebody with no cards prepared cannot join', `status ${empty.status}`);

// Out of turn does nothing.
s.ws.send(JSON.stringify({ t: 'play', card: 'anything' }));
await wait(400);
check(!h.seen.some((m) => m.t === 'played' && m.played),
      'playing out of turn does nothing');

const mine = (await api('/core/bank/table/tonight', 'HASIB')).body?.cards ?? [];
const first = mine.find((c) => (c.prompt_en ?? '').startsWith('HASIB'));
h.ws.send(JSON.stringify({ t: 'play', card: first.id }));
await wait(800);
const played = [...a.seen].reverse().find((m) => m.t === 'played')?.played;
check(!!played, 'the card reaches everyone at the table', played?.promptEn);
check(played?.forName === 'Sadaf', 'and it points at who it is for', played?.forName);

const turned = [...s.seen].reverse().find((m) => m.turn !== undefined)?.turn;
check(turned === 'CORE:T2', 'then the turn goes round', String(turned));

// The asker rates the answer; nobody else can.
s.ws.send(JSON.stringify({ t: 'rate', rating: 5 }));
await wait(400);
check(!a.seen.some((m) => m.t === 'rated'), 'only the asker may rate');
h.ws.send(JSON.stringify({ t: 'rate', rating: 4 }));
await wait(700);
check(a.seen.some((m) => m.t === 'rated' && m.rating === 4), 'the asker rates the answer');

h.ws.close(); s.ws.close(); a.ws.close();
await wait(500);

const scores = (await api('/core/bank/scores', 'HASIB')).body;
const row = (scores?.overall ?? []).find((p) => p.user_id === 'CORE:T1');
check((row?.conversations ?? 0) >= 1, 'the evening is recorded as a conversation',
      `conversations ${row?.conversations}`);
check((row?.rounds ?? 0) === 0 && (row?.points ?? 0) === 0,
      'and still scores nothing', `rounds ${row?.rounds} points ${row?.points}`);

// Somebody who joined remote says so, and answers by typing.
{
  const seats = [...h.seen].reverse().find((m) => m.roster)?.roster ?? [];
  const arham = seats.find((r) => r.userId === 'CORE:T3');
  check(arham?.remote === true, 'a remote joiner is marked remote on the roster',
        JSON.stringify(seats.map((r) => `${r.name}${r.remote ? ' (remote)' : ''}`)));

  // Only the remote person types. Everybody else is at the table and says it.
  s.ws.send(JSON.stringify({ t: 'answer', text: 'I am here, I will just say it.' }));
  await wait(400);
  check(!h.seen.some((m) => m.t === 'answered'),
        'somebody at the table cannot type an answer');

  a.ws.send(JSON.stringify({ t: 'answer', text: 'Typing from the other city.' }));
  await wait(700);
  const said = [...h.seen].reverse().find((m) => m.t === 'answered');
  check(said?.text === 'Typing from the other city.',
        'and a remote answer reaches the table', said?.name);
}

// One to N. A table of one is a person going through their own deck, and the
// turn simply never leaves them.
{
  const solo = await join(`A${Date.now().toString(36).toUpperCase().slice(-6)}`, 'SADAF');
  check(solo.ok, 'a table of one opens');
  await wait(500);
  const sync1 = solo.seen.find((m) => m.t === 'sync');
  check(sync1?.turn === 'CORE:T2', 'and the turn is theirs', String(sync1?.turn));
  const hand = (await api('/core/bank/table/tonight', 'SADAF')).body?.cards ?? [];
  solo.ws.send(JSON.stringify({ t: 'play', card: hand[0].id }));
  await wait(700);
  const after = [...solo.seen].reverse().find((m) => m.turn !== undefined)?.turn;
  check(after === 'CORE:T2' || after === null,
        'and it stays with them while they still hold cards', String(after));
  solo.ws.close();
  await wait(300);
}

console.log(failures ? `\n${failures} failed` : '\nthe table goes round');
process.exitCode = failures ? 1 : 0;
