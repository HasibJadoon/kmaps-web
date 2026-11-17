import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seriesPlan, checklists } from '../src/checklist';
import { buildDesk, deskReward, type DeskInput } from '../src/desk';

const plan = seriesPlan(JSON.stringify({
  steps: [
    { key: 'read', label: 'Day 1 · Read + points', opens: 'read_unit', offset: -1, action: 'notes',
      cue: 'After Fajr', cue_prayer: 'fajr', cue_after_min: 20, minutes: 25 },
    { key: 'shoot', label: 'Day 2 · Record', offset: 0, action: 'shoot',
      cue: 'After ʿIshāʾ', cue_prayer: 'isha', cue_after_min: 20 },
  ],
  cadence_days: 2, weekday: null, tz: 'Australia/Sydney', open_url: 'com.kmaps.app://quran/{unit}',
}));
const at = '2026-10-30T08:00:00Z';
const eps = [
  { id: 'p1', session_no: 1, meta_json: JSON.stringify({ steps_done: { read: at, shoot: at } }) },
  { id: 'p2', session_no: 2, meta_json: JSON.stringify({ read_unit: '40/4-5' }) },
  { id: 'p3', session_no: 3, meta_json: null },
];
const now = new Date('2026-11-17T01:00:00Z'); // Tue 17 Nov, Sydney
const all = checklists(plan, eps, now);

function input(id: string, over: Partial<DeskInput> = {}): DeskInput {
  return {
    id, title: 'الجدال — The Charge and Its Genealogy', session_no: 2, series_title: 'Ghāfir',
    meta: { read_unit: '40/4-5', concept: { label: 'jidāl — disputing the signs' }, questions: ['Who disputes?', ' '] },
    plan, checklist: all.get(id)!, siblings: [...all.values()],
    participants: [
      { id: 'A', display_name: 'Ali', color: '#4c9fc9', role: 'speaker', seq: 1 },
      { id: 'H', display_name: 'Hasib', color: '#c9a84c', role: 'host', seq: 0 },
    ],
    sections: [
      { heading: 'The question', points: [{ text: 'What is jidāl?', speaker_ref: 'A' }, { text: 'Arguing to defeat', speaker_ref: 'H' }] },
      { heading: 'The question', points: [{ text: 'And here?', speaker_ref: 'A' }] },
      { heading: 'Reading', points: [{ text: 'Recite once', speaker_ref: null }, { text: '  ', speaker_ref: 'H' }] },
    ],
    reading: { kind: 'qr', surah: 40, surah_name: 'Ghafir', from: 4, to: 5, translation: null,
      ayahs: [{ ayah: 4, text: 'مَا يُجَٰدِلُ', en: 'None dispute…' }, { ayah: 5, text: 'كَذَّبَتْ', en: 'Before them…' }] },
    slides: { title: 'Ghāfir 40:4–5 on slides', deck: 'ghafir-p2-text' },
    now, ...over,
  };
}

test('the active episode: today is day 1, read after Fajr for 25 minutes', () => {
  const d = buildDesk(input('p2'));
  assert.equal(d.now.state, 'active');
  assert.equal(d.now.action, 'read');
  assert.equal(d.now.label, 'Read 40:4–5 · 25 min');
  assert.equal(d.now.cue, 'After Fajr');
  assert.equal(d.now.cue_prayer, 'fajr');
  assert.equal(d.now.cue_after_min, 20);
  assert.equal(d.now.cue_on, '2026-11-17');
  assert.equal(d.now.day_of, 1);
  assert.equal(d.now.days, 2);
  assert.equal(d.now.countdown, 'today');
  assert.equal(d.now.still_on, false);
});

test('day 2 is recording with the other person', () => {
  const ticked = checklists(plan, [eps[0]!, { ...eps[1]!, meta_json: JSON.stringify({ read_unit: '40/4-5',
    steps_done: { read: '2026-11-16T22:00:00Z' } }) }, eps[2]!], now);
  const d = buildDesk(input('p2', { checklist: ticked.get('p2')!, siblings: [...ticked.values()] }));
  assert.equal(d.now.action, 'record');
  assert.equal(d.now.label, 'Record with Ali');
  assert.equal(d.now.cue, 'After ʿIshāʾ');
  assert.equal(d.now.day_of, 2);
  assert.equal(d.now.countdown, 'tomorrow');
});

test('a missed day keeps the same episode: still on it, today', () => {
  const later = new Date('2026-11-20T01:00:00Z');
  const moved = checklists(plan, eps, later);
  // the plan rolls to today, so the read step is today again — never shown as overdue
  const d = buildDesk(input('p2', { checklist: moved.get('p2')!, siblings: [...moved.values()], now: later }));
  assert.equal(d.now.countdown, 'today');
  assert.equal(d.now.action, 'read');
});

test('queued and recorded episodes have nothing to press', () => {
  assert.equal(buildDesk(input('p3')).now.action, null);
  assert.equal(buildDesk(input('p3')).now.state, 'queued');
  const done = buildDesk(input('p1'));
  assert.equal(done.now.state, 'done');
  assert.match(done.now.label, /^Recorded /);
});

test('focus: the concept and the āyāt, cited; questions trimmed; the deck link', () => {
  const d = buildDesk(input('p2'));
  assert.deepEqual(d.focus.concept, { id: null, label: 'jidāl — disputing the signs' });
  assert.equal(d.focus.cite, 'Ghafir 40:4–5');
  assert.equal(d.focus.blocks[0]!.en, 'None dispute…');
  assert.equal(d.focus.rtl, true);
  assert.deepEqual(d.focus.blocks.map((b) => [b.id, b.n]), [['40:4', 4], ['40:5', 5]]);
  assert.equal(d.focus.open_url, 'com.kmaps.app://quran/40/4-5');
  assert.deepEqual(d.questions, ['Who disputes?']);
  assert.deepEqual(d.slides, { title: 'Ghāfir 40:4–5 on slides', url: 'com.kmaps.app://deck/ghafir-p2-text' });
});

test('people: host first, points grouped by section, unassigned points are the host\'s', () => {
  const d = buildDesk(input('p2'));
  assert.deepEqual(d.people.map((p) => p.name), ['Hasib', 'Ali']);
  assert.deepEqual(d.people[0]!.groups, [
    { heading: 'The question', points: ['Arguing to defeat'] },
    { heading: 'Reading', points: ['Recite once'] },
  ]);
  assert.deepEqual(d.people[1]!.groups, [{ heading: 'The question', points: ['What is jidāl?', 'And here?'] }]);
});

test('talk-card sections win over a class\'s slide sections', () => {
  const d = buildDesk(input('p2', { sections: [
    { heading: 'The reading', type: 'ayah', points: [{ text: 'Recite once', speaker_ref: null }] },
    { heading: 'The question', type: 'talk_card', points: [{ text: 'Why Form III?', speaker_ref: 'A' }] },
  ] }));
  assert.deepEqual(d.people.map((p) => [p.name, p.groups.map((g) => g.heading)]), [['Ali', ['The question']]]);
});

test('a Worldview reading shows only its passages; no text → the plan\'s note', () => {
  const wv = buildDesk(input('p2', { reading: { kind: 'wv', title: 'Two Treatises — Ch. V Of Property', passages: [
    { id: 'x:17.1', cite: '§25', text: 'God, who hath given the world…', en: null },
    { id: 'x:17.2', cite: '§27', text: 'Though the earth…', en: null }] } }));
  assert.equal(wv.focus.rtl, false);
  assert.equal(wv.focus.cite, 'Two Treatises — Ch. V Of Property · §25–§27');
  const none = buildDesk(input('p2', { reading: null, meta: { card: { read: 'John Gray, Liberalism (short, whole)' } } }));
  assert.deepEqual(none.focus.blocks, []);
  assert.equal(none.focus.note, 'John Gray, Liberalism (short, whole)');
});

test('reward: produced so far, and the run within a cadence of each other', () => {
  const c = (d: string | null) => ({ finished_on: d } as never);
  assert.equal(deskReward([c(null)], 2), null);
  assert.deepEqual(deskReward([c('2026-11-01'), c('2026-11-03'), c('2026-11-06'), c('2026-11-20')], 2),
    { produced_total: 4, in_a_row: 1, line: '4 produced' });
  assert.deepEqual(deskReward([c('2026-11-01'), c('2026-11-03'), c('2026-11-06')], 2),
    { produced_total: 3, in_a_row: 3, line: '3 produced · 3 in a row' });
});
