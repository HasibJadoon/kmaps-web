import WebSocket from 'ws';

const BASE = process.env.KM_BASE ?? 'https://backend.k-maps.com';
const need = (k) => {
  const v = process.env[k];
  if (!v) { console.error(`missing ${k}`); process.exit(2); }
  return v;
};

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

async function login(email, password) {
  const res = await fetch(`${BASE}/api/core/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login ${email}: ${res.status} ${await res.text()}`);
  const body = await res.json();
  const token = body.token ?? body.data?.token;
  if (!token) throw new Error(`login ${email}: no token in response`);
  return token;
}

const api = (token, path, init = {}) => fetch(`${BASE}/api${path}`, {
  ...init,
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...init.headers },
});

function open(token, code, label) {
  const url = `${BASE.replace(/^http/, 'ws')}/api/core/srs/sessions/${code}/live`;
  const ws = new WebSocket(url, { headers: { authorization: `Bearer ${token}` } });
  const seen = [];
  const waiters = [];
  ws.on('message', (raw) => {
    const text = raw.toString();
    if (text === 'pong') return;
    let msg; try { msg = JSON.parse(text); } catch { return; }
    seen.push(msg);
    for (let i = waiters.length - 1; i >= 0; i--) {
      if (waiters[i].match(msg)) { waiters.splice(i, 1)[0].resolve(msg); }
    }
  });
  return {
    label, ws, seen,
    ready: new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); }),
    send: (o) => ws.send(JSON.stringify(o)),

    wait(match, ms = 6000) {
      const hit = seen.find(match);
      if (hit) return Promise.resolve(hit);
      return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`${label}: timeout waiting for frame`)), ms);
        waiters.push({ match, resolve: (m) => { clearTimeout(t); resolve(m); } });
      });
    },

    async silence(match, ms = 2500) {
      const before = seen.filter(match).length;
      await new Promise((r) => setTimeout(r, ms));
      return seen.filter(match).length === before;
    },
    close: () => ws.close(),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const [tokenA, tokenB] = await Promise.all([
    login(need('KM_A_EMAIL'), need('KM_A_PASSWORD')),
    login(need('KM_B_EMAIL'), need('KM_B_PASSWORD')),
  ]);
  console.log('signed in as both people\n');

  const queue = await (await api(tokenA, '/core/srs/review?limit=5')).json();
  const cards = queue.data?.due ?? queue.due ?? [];
  if (!cards.length) { console.error('A has nothing due — nothing to ask'); process.exit(2); }
  const card = cards[0];
  console.log(`A will ask: ${card.id} — ${(card.front_text ?? card.frontText ?? '').slice(0, 60)}`);

  const made = await (await api(tokenA, '/core/srs/sessions', { method: 'POST', body: '{}' })).json();
  const code = made.data?.code ?? made.code;
  check(!!code && code.length === 6, 'room code minted', code);

  const A = open(tokenA, code, 'A');
  const B = open(tokenB, code, 'B');
  await Promise.all([A.ready, B.ready]);
  await A.wait((m) => m.t === 'sync');
  await B.wait((m) => m.t === 'sync');
  check(true, 'both sockets joined and synced');

  A.send({ t: 'ask', card: card.id });
  const askedB = await B.wait((m) => m.t === 'asked');
  check(!!askedB.asked?.front, "B receives the card's front");
  check(askedB.asked?.back === null || askedB.asked?.back === undefined,
        'the back is ABSENT from the wire before the reveal',
        JSON.stringify(askedB.asked?.back));

  B.send({ t: 'rate', rating: 3 });
  check(await B.silence((m) => m.t === 'answers'),
        'a rating before the reveal is refused');

  A.send({ t: 'reveal' });
  const revealedB = await B.wait((m) => m.t === 'revealed');
  check(typeof revealedB.asked?.back === 'string' || revealedB.asked?.back === null,
        'the back arrives on reveal',
        JSON.stringify((revealedB.asked?.back ?? '').slice(0, 40)));

  A.send({ t: 'rate', rating: 4 });
  check(await A.silence((m) => m.t === 'answers'),
        "the asker's own rating is refused");

  B.send({ t: 'rate', rating: 3 });
  const answers = await B.wait((m) => m.t === 'answers');
  const mine = (answers.answers ?? [])[0];
  check(!!mine, 'B\'s rating is broadcast to the room');
  check(mine?.rating === 3, 'the rating is the one B sent');
  console.log(`       scheduled=${mine?.scheduled} nextInDays=${mine?.nextInDays}`);
  if (mine?.scheduled === false) {
    console.log('       (B holds no card for this question — reported, not silently dropped)');
  }

  const answersA = await A.wait((m) => m.t === 'answers');
  check((answersA.answers ?? []).length === (answers.answers ?? []).length,
        'both screens see the same answers');

  if (cards[1]) {
    A.send({ t: 'ask', card: cards[1].id });
    const next = await B.wait((m) => m.t === 'asked' && m.asked?.cardId === cards[1].id);
    check((next.answers ?? []).length === 0, 'a new question clears the previous ratings');
  }

  A.close(); B.close();
  await sleep(200);
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((err) => { console.error('\nERROR:', err.message); process.exit(1); });
