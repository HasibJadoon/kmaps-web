import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seriesPlan, checklists } from '../src/checklist';
import type { EpisodeCtx } from '../src/episode/context';
import { buildHub } from '../src/episode/hub';
import { stepViews } from '../src/episode/steps';
import { phaseFor, PHASES } from '../src/episode/phases';
import { publishView } from '../src/episode/publish';
import { resource, resourceTiles } from '../src/episode/resources';
import { focusOf } from '../src/episode/focus';
import { bidiLine, splitTitle } from '../src/episode/text';

const steps = [
  { key: 'read', label: 'Day 1 · Read', opens: 'read_unit', offset: -1, action: 'notes', who: 'Hasib', cue: 'After Fajr', cue_prayer: 'fajr', cue_after_min: 20, minutes: 25 },
  { key: 'think', label: 'Day 1 · Think', offset: -1, action: 'think', who: 'Hasib', cue: 'After Fajr' },
  { key: 'brainstorm', label: 'Day 1 · Brainstorm', offset: -1, action: 'brainstorm', who: 'Ali', cue: 'After ʿAṣr', cue_prayer: 'asr', cue_after_min: 20 },
  { key: 'prepare', label: 'Day 1 · Prepare', offset: -1, action: 'prepare', who: 'Both', cue: 'After Maghrib' },
  { key: 'record', label: 'Day 2 · Record', offset: 0, action: 'shoot', who: 'Both', cue: 'After ʿIshāʾ', cue_prayer: 'isha', cue_after_min: 20 },
  { key: 'review', label: 'Day 2 · Review', offset: 0, action: 'review', who: 'Hasib', cue: 'After recording' },
];
const plan = seriesPlan(JSON.stringify({ steps, cadence_days: 2, tz: 'Australia/Sydney', open_url: 'com.kmaps.app://quran/{unit}' }));
const at = '2026-10-30T08:00:00Z';
const allDone = Object.fromEntries(steps.map((s) => [s.key, at]));
const runSheet = [
  { segment: 'hook', minutes: 2, who: 'Ali', line: 'Who is allowed to argue about God’s signs?' },
  { segment: 'read', minutes: 4, who: 'Hasib', line: 'Read 40:4–5.' },
  { segment: 'close', minutes: 1, who: 'both', line: 'Next: 40:6.' },
];
const p2meta = {
  read_unit: '40/4-5', concept: 'جِدال — arguing with no authority', questions: ['Who disputes?'],
  struck: 'Only one side is said to argue.', sources: [{ who: 'Ibn ʿĀshūr', says: 'Pressing on and on.' }, { who: 'al-Ṭabarī', says: 'Disputing to refute.', differs: true }],
  parallel: { kind: 'quran', ref: '40:35', text: 'Without authority.' }, unknowns: ['Why the past tense in 40:5?'],
  hook: 'Is every religious debate wrong?', objections: ['But they look like winners.'], run_sheet: runSheet,
  short: { hook: 'Who gets to argue?', open_question: 'What is the authority they lack?' },
  chain: { open_question: 'What is the authority?', promise: 'Tomorrow: 40:35.', next: 'Ghāfir 40:6' },
  steps_done: { read: at },
};
const eps = [
  { id: 'EP:ghafir:P01', session_no: 1, meta_json: JSON.stringify({ steps_done: allDone }) },
  { id: 'EP:ghafir:P02', session_no: 2, meta_json: JSON.stringify(p2meta) },
  { id: 'EP:ghafir:P03', session_no: 3, meta_json: JSON.stringify({ read_unit: '40/6' }) },
];
const now = new Date('2026-11-17T01:00:00Z');
const all = checklists(plan, eps, now);

function ctx(id: string, meta: Record<string, unknown>): EpisodeCtx {
  return {
    id, title: 'الجدال في آيات الله — The Charge and Its Genealogy', session_no: 2, series_title: 'Ghāfir', meta,
    plan, checklist: all.get(id)!, siblings: [...all.values()],
    series_order: eps.map((e) => ({ id: e.id, session_no: e.session_no, state: all.get(e.id)!.state })),
    participants: [
      { id: 'H', display_name: 'Hasib', color: '#e8c96a', role: 'host', seq: 0 },
      { id: 'A', display_name: 'Ali', color: '#4c9fc9', role: 'speaker', seq: 1 },
    ],
    sections: [{ heading: 'The question', type: 'talk_card', points: [{ text: 'يُجَادِلُ is the verb.', speaker_ref: 'H' }, { text: 'Is it wrong?', speaker_ref: 'A' }] }],
    slides: null, reading: { kind: 'qr', surah: 40, surah_name: 'Ghafir', from: 4, to: 5, translation: null,
      ayahs: [{ ayah: 4, text: 'مَا يُجَٰدِلُ', en: 'Only the disbelievers dispute.' }, { ayah: 5, text: 'كَذَّبَتۡ', en: 'Before them…' }] },
    now,
  };
}

test('hub: six steps over two days, logged state, Claude-prepared %, tiles and publish — no text', () => {
  const hub = buildHub(ctx('EP:ghafir:P02', p2meta), { path: ['Qurʾān', 'Ḥawāmīm', 'Ghāfir'] });
  assert.deepEqual(hub.steps.map((s) => [s.key, s.day, s.state]), [
    ['read', 1, 'done'], ['think', 1, 'now'], ['brainstorm', 1, 'later'], ['prepare', 1, 'later'], ['record', 2, 'later'], ['review', 2, 'later'],
  ]);
  assert.equal(hub.days, 2);
  assert.deepEqual(hub.steps.find((s) => s.key === 'think')!.prepared, { have: 5, total: 5, pct: 100 });
  assert.equal(hub.steps.find((s) => s.key === 'prepare')!.prepared.have, 4);   // 3 run-sheet lines + the short
  assert.equal(hub.steps.find((s) => s.key === 'brainstorm')!.who, 'Ali');
  assert.equal(hub.now?.key, 'think');
  assert.equal(hub.title_en, 'The Charge and Its Genealogy');
  assert.equal(hub.subtitle, 'Ghāfir · 40:4–5');
  assert.deepEqual(hub.path, ['Qurʾān', 'Ḥawāmīm', 'Ghāfir']);
  assert.deepEqual(hub.backlog.tiles.map((t) => [t.label, t.state]), [['P01', 'done'], ['P02', 'now'], ['P03', 'queued']]);
  assert.deepEqual(hub.resources.map((r) => [r.key, r.n]), [['text', 2], ['concept', 1], ['points', 2], ['questions', 1]]);
  assert.deepEqual(hub.publish.tiles.map((t) => t.done), [false, false]);
  assert.equal(hub.publish.produced.total, 1);
  assert.ok(!('focus' in hub) && !('people' in hub) && !('questions' in hub));
});

test('legacy step keys still open their phase (shoot → record)', () => {
  assert.equal(phaseFor('shoot').key, 'record');
  assert.equal(phaseFor('notes').key, 'read');
  assert.equal(phaseFor('anything').key, 'anything');
});

test('each phase builds only its own data', () => {
  const c = ctx('EP:ghafir:P02', p2meta);
  const think = PHASES.think!.build(c) as Record<string, unknown>;
  assert.equal((think['sources'] as unknown[]).length, 2);
  assert.equal((think['host_points'] as { name: string }).name, 'Hasib');
  const bs = PHASES.brainstorm!.build(c) as Record<string, unknown>;
  assert.equal(bs['hook'], 'Is every religious debate wrong?');
  assert.equal((bs['partner_points'] as { name: string }).name, 'Ali');
  const prep = PHASES.prepare!.build(c) as { segments: Array<{ start: string; label: string }>; total_minutes: number };
  assert.deepEqual(prep.segments.map((s) => [s.start, s.label]), [['00:00', 'Hook'], ['02:00', 'Read'], ['06:00', 'Close']]);
  assert.equal(prep.total_minutes, 7);
  const rev = PHASES.review!.build(c) as { chain: { next: string } };
  assert.equal(rev.chain.next, 'Ghāfir 40:6');
  assert.deepEqual(PHASES.review!.prepared(c), [3, 3]);
  assert.deepEqual(PHASES.think!.prepared(ctx('EP:ghafir:P03', { read_unit: '40/6' })), [0, 5]);
});

test('the selected text and the resources', () => {
  const c = ctx('EP:ghafir:P02', p2meta);
  const f = focusOf(c);
  assert.equal(f.cite, 'Ghafir 40:4–5');
  assert.equal(f.blocks[0]!.en, 'Only the disbelievers dispute.');
  assert.equal(f.concept, '⁧جِدال⁩ — arguing with no authority');
  assert.equal((resource(c, 'questions') as { questions: string[] }).questions[0], 'Who disputes?');
  assert.equal(resource(c, 'slides'), null);
  assert.equal(resourceTiles(ctx('EP:ghafir:P03', { read_unit: '40/6' }))[0]!.n, 1);
});

test('publish: the short asks, the long answers, chapters from the run sheet', () => {
  const v = publishView(ctx('EP:ghafir:P02', { ...p2meta, published: { short: { at, url: 'https://youtu.be/x' } } }));
  const [sh, lg] = v.parts;
  assert.equal(sh!.title, 'Who gets to argue?');
  assert.equal(sh!.published?.url, 'https://youtu.be/x');
  assert.equal(lg!.title, 'Is every religious debate wrong?');
  assert.deepEqual(lg!.chapters.map((c) => c.at), ['00:00', '02:00', '06:00']);
  assert.match(lg!.description, /We read Ibn ʿĀshūr and al-Ṭabarī\./);
  assert.equal(lg!.ready, false);
  assert.equal(v.playlist, 'Do Zāwiya · Ghāfir');
});

test('Arabic runs inside English keep their order; titles split', () => {
  assert.equal(bidiLine('يُجَادِلُ is Form III.'), '⁧يُجَادِلُ⁩ is Form III.');
  assert.equal(bidiLine('comes «بِسُلْطَانٍ مُبِينٍ» (40:23).'), 'comes «⁧بِسُلْطَانٍ مُبِينٍ⁩» (40:23).');
  assert.equal(bidiLine('Only English.'), 'Only English.');
  assert.equal(bidiLine('مَا يُجَادِلُ'), 'مَا يُجَادِلُ');
  assert.deepEqual(splitTitle('Liberalism · 06 — Locke on property'), { en: 'Locke on property', ar: null });
});

test('step views carry the cue for the phone reminder', () => {
  const v = stepViews(ctx('EP:ghafir:P02', p2meta));
  const think = v.find((s) => s.key === 'think')!;
  assert.equal(think.cue, 'After Fajr');
  assert.equal(think.when, 'today');
  assert.equal(think.cue_on, '2026-11-17');
  assert.equal(v.find((s) => s.key === 'record')!.when, 'tomorrow');
});

test('sprint cards: the one due today and worked on last is the one in hand', async () => {
  const { sprintCard, rankSprints } = await import('../src/episode/sprints');
  const a = sprintCard(ctx('EP:ghafir:P02', p2meta), { path: ['Qurʾān', 'Ḥawāmīm', 'Ghāfir'], accent: '#D8B657' });
  assert.equal(a.now?.title, 'Think');
  assert.equal(a.logged.done, 1);
  assert.equal(a.subtitle, 'Ghāfir · 40:4–5');
  const b = { ...a, episode_id: 'EP:liberalism:R01.01', series: 'Liberalism', now: { ...a.now!, when: 'tomorrow' }, last_logged: null };
  const ranked = rankSprints([b, a]);
  assert.equal(ranked[0]!.episode_id, 'EP:ghafir:P02');
  assert.equal(ranked[0]!.studying, true);
  assert.equal(ranked[1]!.studying, false);
});
