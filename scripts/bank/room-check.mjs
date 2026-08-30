// ─── One live round, end to end ───────────────────────────────────────────────
//
// The claim migration 030 makes is that every play of every app writes the same
// two rows. The quiz room wrote its own table instead, so the shared scorecard
// had never contained a round. This plays one — host pushes, two people answer,
// host reveals — and then asks the SCORECARD, not the room, what happened.

import { WebSocket } from 'ws';

const BASE = process.env.KM_BASE ?? 'http://127.0.0.1:8799';
const token = (who) => process.env[`TOK_${who}`];
let failures = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? '  ' + detail : ''}`);
};

const api = async (path, who, init = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json',
               authorization: `Bearer ${token(who)}`, ...init.headers },
  });
  const text = await res.text();
  try { return { status: res.status, body: JSON.parse(text).data ?? JSON.parse(text) }; }
  catch { return { status: res.status, body: text }; }
};

const open = (code, who) => new Promise((resolve, reject) => {
  const ws = new WebSocket(`${BASE.replace('http', 'ws')}/core/quiz/sessions/${code}/live`,
                           { headers: { authorization: `Bearer ${token(who)}` } });
  const seen = [];
  ws.on('message', (d) => { try { seen.push(JSON.parse(d.toString())); } catch {} });
  ws.on('open', () => resolve({ ws, seen }));
  ws.on('error', reject);
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// A room, and something to ask in it.
const items = (await api('/core/quiz/questions?surah=40&limit=2', 'HOST')).body ?? [];
check(items.length >= 1, 'the picker has bank items to ask', `${items.length}`);

const made = await api('/core/quiz/sessions', 'HOST',
                       { method: 'POST', body: JSON.stringify({ title: 'audit round' }) });
const code = made.body?.code ?? made.body?.session?.code;
check(!!code, 'a room opens', `code ${code} · status ${made.status}`);
if (!code) process.exit(1);

const host = await open(code, 'HOST');
const guest = await open(code, 'GUEST');
await wait(600);

host.ws.send(JSON.stringify({ t: 'push', question: items[0].id }));
await wait(900);
const live = [...guest.seen].reverse().find((m) => m.t === 'question')?.live;
check(!!live, 'the question reaches the room', live?.prompt?.slice(0, 30));
check(live?.correctIndex == null, 'and does not carry the answer with it');
check((live?.options ?? []).length >= 2, 'with its options', `${live?.options?.length}`);

host.ws.send(JSON.stringify({ t: 'answer', choice: 0 }));
guest.ws.send(JSON.stringify({ t: 'answer', choice: 1 }));
await wait(700);
host.ws.send(JSON.stringify({ t: 'reveal' }));
await wait(1500);
const revealed = [...guest.seen].reverse().find((m) => m.t === 'reveal');
check(revealed?.live?.correctIndex != null, 'the reveal says which was right',
      `index ${revealed?.live?.correctIndex}`);
console.log('   who answered:', JSON.stringify((revealed?.given ?? []).map(
  (g) => `${g.userId?.slice(-5)}:${g.choice}`)));
console.log('   roster:', JSON.stringify([...host.seen, ...guest.seen]
  .filter((m) => m.roster).slice(-1)[0]?.roster?.map((p) => p.userId?.slice(-5)) ?? []));

host.ws.close(); guest.ws.close();
await wait(800);

// The point of the exercise: ask the shared scorecard.
const scores = (await api('/core/bank/scores', 'HOST')).body;
const players = (scores?.overall ?? []).filter((p) => p.user_id.startsWith('CORE:ROOM'));
check(players.length === 2, 'both players are on the SHARED scorecard',
      players.map((p) => `${p.user_id.slice(-5)}:${p.points}`).join(' '));

const room = (await api(`/core/bank/rooms/${code}`, 'HOST')).body;
check((room?.board ?? []).length === 2, 'and on the room board', `${room?.board?.length}`);
const boardPts = (room?.board ?? []).map((b) => b.points).sort();
const cardPts = players.map((p) => p.points).sort();
check(JSON.stringify(boardPts) === JSON.stringify(cardPts),
      'the two boards agree about the same evening',
      `room ${boardPts} vs card ${cardPts}`);

console.log(failures ? `\n${failures} failed` : '\nthe room writes the one ledger');
process.exitCode = failures ? 1 : 0;
