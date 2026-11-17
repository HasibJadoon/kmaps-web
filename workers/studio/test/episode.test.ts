import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seriesPlan, checklists } from '../src/checklist';
import type { EpisodeCtx } from '../src/episode/context';
import { buildHub } from '../src/episode/hub';
import { groupTranslations } from '../src/episode/translations';
import { stepViews } from '../src/episode/steps';
import { phaseFor, PHASES } from '../src/episode/phases';
import { publishView } from '../src/episode/publish';
import { resource, resourceTiles } from '../src/episode/resources';
import { focusOf, guideOf, paragraphsOf } from '../src/episode/focus';
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
  assert.equal(f.blocks[0]!.en, null);   // Arabic only: every translation is one tap away
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
  assert.equal(lg!.ready, true);   // nothing is logged by hand: both can go out any time
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
  const b = { ...a, episode_id: 'EP:liberalism:R01.01', series: 'Liberalism', path: ['Worldview', 'Liberalism'],
    now: { ...a.now!, when: 'tomorrow' }, last_logged: null };
  const ranked = rankSprints([a, b]);
  assert.deepEqual(ranked.map((c) => c.series), ['Liberalism', 'Ghāfir']);   // WV first, then the Qurʾān
  assert.equal(ranked[1]!.studying, true);
  assert.equal(ranked[0]!.studying, false);
  const { sprintTiles } = await import('../src/episode/sprints');
  const tiles = sprintTiles([
    { id: 'EP:liberalism:R06.02', session_no: 7, title: 'Liberalism · 06.2 — Locke · Chapter V 2.1–3.4', state: 'queued' },
    { id: 'EP:liberalism:R06.01', session_no: 6, title: 'Liberalism · 06.1 — Locke · Chapter V 1.1', state: 'active' },
    { id: 'EP:liberalism:R00', session_no: 0, title: 'Liberalism · 00 — Gray, Liberalism', state: 'done' },
    { id: 'EP:ghafir:P01:slides', session_no: 1, title: 'slides', state: 'queued' },
  ], 'EP:liberalism:R06.01');
  assert.deepEqual(tiles.map((t) => [t.label, t.state, t.group]), [
    ['00', 'done', '00 · Gray, Liberalism'], ['06.01', 'now', '06 · Locke'], ['06.02', 'queued', '06 · Locke']]);
});

test('a finished series is a done card that still opens its passages', async () => {
  const { doneCard } = await import('../src/episode/sprints');
  const c = doneCard({ id: 'SER:dozawiya:dukhan', title: 'الدخان — Ad-Dukhān' }, 'Ad-Dukhān', { path: ['Qurʾān', 'Ḥawāmīm', 'Ad-Dukhān'] },
    [{ id: 'EP:dukhan:P01', session_no: 1, title: 'x — One', state: 'done' }, { id: 'EP:dukhan:P02', session_no: 2, title: 'x — Two', state: 'done' }]);
  assert.equal(c.done, true);
  assert.equal(c.title_ar, 'الدخان');
  assert.deepEqual(c.tiles.map((t) => t.state), ['done', 'done']);
  assert.equal(c.subtitle, '2 passages');
});

test('curriculum: the chip, the grid headings, the angle colour and the depth meter come from series meta', async () => {
  const { placeOf, groupLabel, depthOf } = await import('../src/episode/curriculum');
  const { sprintTiles } = await import('../src/episode/sprints');
  const sm = {
    rounds: [{ n: 1, label: 'Basic' }], clusters: [{ n: 2, label: 'Liberty & the self' }],
    angles: { favour: { label: 'Favour', color: '#5bbf95' }, critic: { label: 'Critic', color: '#e5484d' } },
    depth: { '2': ['src-lbr-mill-on-liberty', 'src-lbr-cat-berlin-two-concepts'] },
    guides: { '2': [{ who: 'Gray', line: 'Toleration, not one ideal of the good life.' }] },
  };
  assert.deepEqual(placeOf({ round: 1, cluster: 2, angle: 'favour' }, sm), {
    round: { n: 1, label: 'Basic' }, cluster: { n: 2, label: 'Liberty & the self' }, angle: { key: 'favour', label: 'Favour', color: '#5bbf95' } });
  assert.equal(placeOf({}, sm), null);
  assert.equal(groupLabel({ round: 1, cluster: 2 }, sm), 'Round 1 · Basic › Liberty & the self');
  const order = [
    { id: 'EP:liberalism:L102.01', session_no: 1, title: 'x — Mill', state: 'done', source_ref: 'src-lbr-mill-on-liberty', round: 1, cluster: 2, angle: 'favour' },
    { id: 'EP:liberalism:L102.02', session_no: 2, title: 'x — Burke', state: 'active', source_ref: 'src-lbr-burke-reflections', round: 1, cluster: 2, angle: 'critic' },
  ];
  assert.deepEqual(depthOf({ cluster: 2 }, sm, order), { cluster: 'Liberty & the self', covered: 1, of: 2, pct: 50,
    guides: [{ who: 'Gray', line: 'Toleration, not one ideal of the good life.' }] });
  const tiles = sprintTiles(order, 'EP:liberalism:L102.02', sm);
  assert.deepEqual(tiles.map((t) => [t.label, t.group, t.angle_color]), [
    ['02.01', 'Round 1 · Basic › Liberty & the self', '#5bbf95'], ['02.02', 'Round 1 · Basic › Liberty & the self', '#e5484d']]);
});

test('āyah translations: English (default first), then Urdu; no transliteration or Roman Urdu; markup and brackets cleaned', () => {
  const g = groupTranslations([
    { source_id: 'QR:TRANS:EN_TRANSLIT', text: 'Ghafiri aththanbi', language: 'en', slug: 'EN_TRANSLIT', translator: 'Transliteration' },
    { source_id: 'QR:TRANS:UR_MAUDUDI', text: 'گناہ معاف کرنے والا', language: 'ur', translator: 'Maududi' },
    { source_id: 'QR:TRANS:EN_ASAD', text: 'forgiving <sup>1</sup>sins', language: 'en', translator: 'Muhammad Asad' },
    { source_id: 'QR:TRANS:EN_HALEEM', text: 'Forgiver of sins', language: 'en', translator: 'Abdel Haleem', is_default: 1 },
    { source_id: 'QR:TRANS:EN_IA_GEORGE_SALE', text: 'the forgiver of sin', language: 'en', translator: null },
    { source_id: 'QR:TRANS:EN_EMPTY', text: '  ', language: 'en', translator: 'Nobody' },
    { source_id: 'QR:TRANS:UR_MAUDUDI_ROMAN', text: 'Gunaah maaf karne wala', language: 'ur-roman', translator: 'Maududi' },
    { source_id: 'QR:TRANS:EN_IA_AL_MUNTAKHAB', text: 'Who gives up claim', language: 'en', translator: '[Al-Muntakhab]' },
  ]);
  assert.deepEqual(g.map((x) => x.key), ['en', 'ur']);
  assert.deepEqual(g[0]!.items.map((i) => i.translator), ['Abdel Haleem', 'Al-Muntakhab', 'George Sale', 'Muhammad Asad']);
  assert.equal(g[0]!.items[0]!.default, true);
  assert.equal(g[0]!.items[3]!.text, 'forgiving sins');
  assert.equal(g[1]!.label, 'Urdu'); assert.equal(g[1]!.rtl, true); assert.equal(g[1]!.items.length, 1);
});

test('study time, not logs: the step in hand is the first not studied for its minutes; publishing finishes', () => {
  const p = seriesPlan(JSON.stringify({ steps: steps.map((st) => ({ ...st, minutes: st.minutes ?? 10 })), cadence_days: 2, tz: 'Australia/Sydney' }));
  const studied = { read: 25 * 60, think: 4 * 60 };   // Read studied its 25 min; Think 4 of 10
  const list = [
    { id: 'EP:x:1', session_no: 1, meta_json: JSON.stringify({ study: { read: 600 }, published: { long: { at } } }) },
    { id: 'EP:x:2', session_no: 2, meta_json: JSON.stringify({ study: studied, study_at: at }) },
    { id: 'EP:x:3', session_no: 3, meta_json: null },
  ];
  const cl = checklists(p, list, now);
  assert.equal(cl.get('EP:x:1')!.state, 'done');        // published → finished, no ticks needed
  assert.equal(cl.get('EP:x:2')!.state, 'active');
  assert.equal(cl.get('EP:x:3')!.state, 'queued');
  assert.equal(cl.get('EP:x:2')!.studied, 29 * 60);
  const c = { ...ctx('EP:ghafir:P02', {}), plan: p, checklist: cl.get('EP:x:2')! };
  const v = stepViews(c);
  assert.deepEqual(v.map((s) => [s.key, s.state, s.badge]).slice(0, 3),
    [['read', 'later', '25 min'], ['think', 'now', '4 min'], ['brainstorm', 'later', `${v[2]!.prepared.pct}%`]]);
  const hub = buildHub(c);
  assert.equal(hub.studied.label, '29 min');
  assert.match(hub.caption, /^29 min studied · finished when the Episode is published/);
  const done = buildHub({ ...c, checklist: cl.get('EP:x:1')! });
  assert.ok(done.steps.every((s) => s.state === 'done'));
  assert.match(done.caption, /^Published /);
});

test('a guide note is set out for reading: paragraphs, who is who, a timeline, sources as named links', () => {
  const note = "Long ago the elders asked for a king. Samuel warned them. The king was never the last word. Prophets stood up to kings. In c. 1000 BC David ruled.\n\n"
    + "Key players: Samuel — prophet who warned Israel; Nathan — prophet who confronted David\n\n"
    + "Events: c. 1050–1000 BC — The people ask for a king; Samuel anoints Saul.; 586 BC — Babylon destroys the Temple.\n\n"
    + "Sources: Britannica: Crucifixion (about AD 32; other articles say 30) — https://www.britannica.com/topic/crucifixion; Bible (KJV) 1 Kings 21 — https://www.biblegateway.com/passage/?search=1+Kings+21";
  const g = guideOf(note)!;
  assert.equal(g.paragraphs.length, 2);
  assert.match(g.paragraphs[1]!, /c\. 1000 BC David ruled\.$/);   // "c." is not a sentence end
  assert.deepEqual(g.players[1], { name: 'Nathan', line: 'prophet who confronted David' });
  assert.deepEqual(g.events[0], { when: 'c. 1050–1000 BC', what: 'The people ask for a king; Samuel anoints Saul.' });
  assert.deepEqual(g.sources.map((x) => x.title), ['Britannica: Crucifixion (about AD 32; other articles say 30)', 'Bible (KJV) 1 Kings 21']);
  assert.equal(g.sources[1]!.url, 'https://www.biblegateway.com/passage/?search=1+Kings+21');
  assert.equal(guideOf('Just plain prose, no parts.'), null);
  assert.equal(paragraphsOf('One. Two. Three. Four.').length, 2);
});

test('a guide with a Doc opens in the essay reader instead of being set inline', () => {
  const c = ctx('EP:ghafir:P02', { read_label: 'The Bible, Israel’s kings and Rome', read_note: 'Story.\n\nKey players: A — b', read_doc: 'wv-liberalism-guide-01' });
  const f = focusOf({ ...c, reading: null });
  assert.equal(f.doc?.url, 'com.kmaps.app://essay/wv-liberalism-guide-01');
  assert.equal(f.guide, null);
  assert.equal(f.note, null);
});
