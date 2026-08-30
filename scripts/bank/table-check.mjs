const BASE = process.env.KM_BASE ?? 'http://127.0.0.1:8799';
const PREFIX = process.env.KM_PREFIX ?? '';
let failures = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? '  ' + detail : ''}`);
};

const api = async (path, who, init = {}) => {
  const res = await fetch(`${BASE}${PREFIX}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json',
               authorization: `Bearer ${process.env[`TOK_${who}`]}`, ...init.headers },
  });
  const text = await res.text();
  try { return { status: res.status, body: JSON.parse(text).data ?? JSON.parse(text) }; }
  catch { return { status: res.status, body: text }; }
};

const packs = (await api('/core/bank/packs?app=table', 'TABLE')).body ?? [];
const deck = packs.find((p) => p.slug === 'table-family');
check(!!deck, 'the family deck is listed as a table pack', `${packs.length} table pack(s)`);
if (!deck) process.exit(1);

const detail = (await api('/core/bank/packs/table-family', 'TABLE')).body;
const cards = detail?.items ?? [];
check(cards.length >= 40, 'its cards are served off the pack', `${cards.length} cards`);
check(detail?.units?.length === 0, 'a deck has no units — the cards hang off the pack');

check(cards.every((c) => c.interaction === 'open_prompt'),
      'every card is an open prompt');
check(cards.every((c) => c.scoring === 'none'),
      'and none of them is marked');
check(cards.every((c) => (c.options ?? []).length === 0),
      'a conversation card offers no options to pick');

const depths = new Set(cards.map((c) => c.difficulty));
check(depths.size === 3, 'three depths, so an evening can start light',
      [...depths].sort().join(', '));
const forms = new Set(cards.map((c) => c.stimulus_md));
check(forms.size === 4, 'four card forms', [...forms].join(' · '));

const card = cards.find((c) => c.stimulus_md === 'about you') ?? cards[0];

/** One evening: a round of the Table app, asked of a named person. */
async function evening(who, askedOf) {
  const attempt = (await api('/core/bank/attempts', who, {
    method: 'POST',
    body: JSON.stringify({ pack_ref: deck.id, mode: 'table',
                           room_code: `DINNER-${askedOf}` }),
  })).body;
  const answer = await api(`/core/bank/attempts/${attempt.id}/answer`, who, {
    method: 'POST',
    body: JSON.stringify({ item_ref: card.id, answer: null,
                           respondent_name: askedOf }),
  });
  await api(`/core/bank/attempts/${attempt.id}/finish`, who,
            { method: 'POST', body: '{}' });
  return { attempt, answer };
}

const first = await evening('TABLE', 'Sadaf');
check(!!first.attempt?.id, 'a table round opens with no unit at all',
      `unit ${first.attempt?.unit_ref} · room ${first.attempt?.room_code}`);
check(first.answer.body?.correct === null,
      'an unscored card comes back unmarked, not wrong',
      `correct=${JSON.stringify(first.answer.body?.correct)}`);
check(first.answer.body?.points === 0, 'and worth no points');

const second = await evening('TABLE', 'Arham');
check(second.attempt?.id !== first.attempt?.id, 'a second evening is its own round');

// The bug migrations 026/027 left behind, named in 030's own header: a card
// asked of two people on two evenings could only remember the second, because
// for_name and asked_at lived on the CARD.
const mine = (await api('/core/bank/profile', 'TABLE')).body;
// Recorded as conversations, NOT as innings. An evening at the table counted
// as an innings worth nought does not merely fail to help a batting average —
// it drags it down, so whoever talks most looks like the worst player.
check(mine?.career?.conversations === 2, 'both evenings are on the record',
      `conversations ${mine?.career?.conversations}`);
check(mine?.career?.innings === 0, 'and none of them is an innings',
      `innings ${mine?.career?.innings}`);
check(mine?.career?.average === null, 'so there is no average to drag down');
check(mine?.high === null, 'and no high score off a conversation');
check(mine?.career?.accuracy === null,
      'a conversation has no accuracy, and the card says so rather than 0%');

const scores = (await api('/core/bank/scores?app=table', 'TABLE')).body;
const row = (scores?.overall ?? [])[0];
check(row?.conversations === 2 && row?.rounds === 0,
      'the scorecard counts the evenings without scoring them',
      `conversations ${row?.conversations} · rounds ${row?.rounds} · points ${row?.points}`);
check(row?.stars === null, 'and rates nobody on them');

console.log(failures ? `\n${failures} failed` : '\nthe table app plays');
process.exitCode = failures ? 1 : 0;
