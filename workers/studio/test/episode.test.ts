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
import { focusOf } from '../src/episode/focus';
import { episodeTemplate, TEMPLATE } from '../src/episode/template';
import { bidiLine, splitTitle } from '../src/episode/text';

const steps = [
  { key: 'read', label: 'Day 1 · Read', opens: 'read_unit', offset: -1, action: 'notes', who: 'Hasib', cue: 'After Fajr', cue_prayer: 'fajr', cue_after_min: 20 },
  { key: 'research', label: 'Day 1 · Research', offset: -1, action: 'research', who: 'Hasib', cue: 'After ʿAṣr' },
  { key: 'episode', label: 'Day 1 · Episode', offset: -1, action: 'episode', who: 'Both', cue: 'After Maghrib' },
  { key: 'record', label: 'Day 2 · Record', offset: 0, action: 'shoot', who: 'Both', cue: 'After ʿIshāʾ', cue_prayer: 'isha', cue_after_min: 20 },
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
  deck: { slug: 'st-ep-ghafir-p02', sections: { promise: 0, read: 2, close: 17 } },
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

test('hub: four steps over two days (Read · Research · Episode · Record), Claude-prepared %, tiles and publish — no text', () => {
  const hub = buildHub(ctx('EP:ghafir:P02', p2meta), { path: ['Qurʾān', 'Ḥawāmīm', 'Ghāfir'] });
  assert.deepEqual(hub.steps.map((s) => [s.key, s.title, s.day, s.state]), [
    ['read', 'Read', 1, 'done'], ['research', 'Research', 1, 'now'], ['episode', 'Episode', 1, 'later'], ['record', 'Record', 2, 'later'],
  ]);
  assert.equal(hub.days, 2);
  assert.deepEqual(hub.steps.find((s) => s.key === 'research')!.prepared, { have: 5, total: 5, pct: 100 });
  assert.deepEqual(hub.steps.find((s) => s.key === 'episode')!.prepared, { have: 7, total: 7, pct: 100 });   // the ready list
  assert.equal(hub.now?.key, 'research');
  assert.equal(hub.title_en, 'The Charge and Its Genealogy');
  assert.equal(hub.subtitle, 'Ghāfir · 40:4–5');
  assert.deepEqual(hub.path, ['Qurʾān', 'Ḥawāmīm', 'Ghāfir']);
  assert.deepEqual(hub.backlog.tiles.map((t) => [t.label, t.state]), [['P01', 'done'], ['P02', 'now'], ['P03', 'queued']]);
  assert.deepEqual(hub.resources.map((r) => [r.key, r.n]), [['text', 2], ['concept', 1], ['points', 2], ['questions', 1], ['slides', 1]]);
  assert.deepEqual(hub.publish.tiles.map((t) => t.done), [false, false]);
  assert.equal(hub.publish.produced.total, 1);
  assert.ok(!('focus' in hub) && !('people' in hub) && !('questions' in hub));
});

test('older step keys fold into the four (think → Research, brainstorm/prepare/review → Episode, shoot → Record)', () => {
  assert.equal(phaseFor('shoot').key, 'record');
  assert.equal(phaseFor('notes').key, 'read');
  assert.equal(phaseFor('think').key, 'research');
  assert.equal(phaseFor('brainstorm').key, 'episode');
  assert.equal(phaseFor('prepare').key, 'episode');
  assert.equal(phaseFor('review').key, 'episode');
  assert.deepEqual(Object.keys(PHASES), ['read', 'research', 'episode', 'record']);
  assert.equal(phaseFor('anything').key, 'anything');
});

test('each phase builds only its own data; the episode is guidelines, never script lines', () => {
  const c = ctx('EP:ghafir:P02', p2meta);
  const res = PHASES.research!.build(c) as Record<string, unknown>;
  assert.equal((res['sources'] as unknown[]).length, 2);
  assert.equal(res['struck'], 'Only one side is said to argue.');
  const ep = PHASES.episode!.build(c) as { objections: string[]; partner: string; total_minutes: number; deck_url: string;
    segments: Array<Record<string, unknown>>; ready: Array<{ ok: boolean }>; after: { next: string } };
  assert.equal(ep.objections[0], 'But they look like winners.');
  assert.equal(ep.partner, 'Ali');
  assert.equal(ep.total_minutes, 27);
  assert.ok(ep.segments.every((s) => !('line' in s)));
  const seg = (k: string) => ep.segments.find((s) => s['segment'] === k)!;
  assert.equal(seg('promise')['pointer'], 'Is every religious debate wrong?');
  assert.equal(seg('read')['pointer'], '40:4–5');
  assert.equal(seg('stand')['pointer'], 'Why the past tense in 40:5?');
  assert.equal(seg('read')['slides'], 'com.kmaps.app://deck/st-ep-ghafir-p02?slide=2');
  assert.equal(seg('idea')['slides'], null);   // no slide index for it yet
  assert.equal(ep.deck_url, 'com.kmaps.app://deck/st-ep-ghafir-p02');
  assert.equal(ep.after.next, 'Ghāfir 40:6');
  assert.ok(ep.ready.every((r) => r.ok));
  const rec = PHASES.record!.build(c) as { segments: unknown[]; deck_url: string };
  assert.equal(rec.segments.length, 9);
  assert.equal(rec.deck_url, 'com.kmaps.app://deck/st-ep-ghafir-p02');
  assert.deepEqual(PHASES.research!.prepared(ctx('EP:ghafir:P03', { read_unit: '40/6' })), [0, 5]);
});

test('the selected text and the resources', () => {
  const c = ctx('EP:ghafir:P02', p2meta);
  const f = focusOf(c);
  assert.equal(f.cite, 'Ghafir 40:4–5');
  assert.equal(f.blocks[0]!.en, null);   // Arabic only: every translation is one tap away
  assert.equal(f.concept, '⁧جِدال⁩ — arguing with no authority');
  assert.equal((resource(c, 'questions') as { questions: string[] }).questions[0], 'Who disputes?');
  assert.deepEqual(resource(c, 'slides'), { title: 'The episode’s slides', url: 'com.kmaps.app://deck/st-ep-ghafir-p02' });
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
  const res = v.find((s) => s.key === 'research')!;
  assert.equal(res.cue, 'After ʿAṣr');
  assert.equal(res.when, 'today');
  assert.equal(res.cue_on, '2026-11-17');
  assert.equal(v.find((s) => s.key === 'record')!.when, 'tomorrow');
});

test('sprint cards: the one due today and worked on last is the one in hand', async () => {
  const { sprintCard, rankSprints } = await import('../src/episode/sprints');
  const a = sprintCard(ctx('EP:ghafir:P02', p2meta), { path: ['Qurʾān', 'Ḥawāmīm', 'Ghāfir'], accent: '#D8B657' });
  assert.equal(a.now?.title, 'Research');
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

test('study time, not logs: no planned minutes — a step counts once any time is spent on it; publishing finishes', () => {
  const p = seriesPlan(JSON.stringify({ steps, cadence_days: 2, tz: 'Australia/Sydney' }));
  const studied = { read: 25 * 60, research: 4 * 60 };   // Read and Research both touched → Episode is in hand
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
  assert.deepEqual(v.map((s) => [s.key, s.state, s.badge]),
    [['read', 'later', '25 min'], ['research', 'later', '4 min'], ['episode', 'now', `${v[2]!.prepared.pct}%`], ['record', 'later', `${v[3]!.prepared.pct}%`]]);
  const hub = buildHub(c);
  assert.equal(hub.studied.label, '29 min');
  assert.match(hub.caption, /^29 min studied · finished when the Episode is published/);
  const done = buildHub({ ...c, checklist: cl.get('EP:x:1')! });
  assert.ok(done.steps.every((s) => s.state === 'done'));
  assert.match(done.caption, /^Published /);
});

test('a guide with a Doc opens in the essay reader instead of being set inline', () => {
  const c = ctx('EP:ghafir:P02', { read_label: 'The Bible, Israel’s kings and Rome', read_note: 'Story.\n\nKey players: A — b', read_doc: 'wv-liberalism-guide-01' });
  const f = focusOf({ ...c, reading: null });
  assert.equal(f.doc?.url, 'com.kmaps.app://essay/wv-liberalism-guide-01');
  assert.equal(f.note, null);
});

test('every episode with a Doc links it; a Qurʾān passage keeps its āyāt inline too', () => {
  const f = focusOf(ctx('EP:ghafir:P02', { ...p2meta, read_doc: 'st-ep-ghafir-p02' }));
  assert.equal(f.doc?.url, 'com.kmaps.app://essay/st-ep-ghafir-p02');
  assert.equal(f.blocks.length, 2);
  assert.equal(f.doc?.title, 'The Charge and Its Genealogy');
});

test('the episode template: Jessica’s nine sections for two people, guidelines with pointers, the same for the Bible', () => {
  const t = episodeTemplate(ctx('EP:ghafir:P02', p2meta));
  assert.deepEqual(t.segments.map((s) => s.segment),
    ['promise', 'read', 'idea', 'been_here', 'parallel', 'heart', 'pushback', 'stand', 'close']);
  assert.deepEqual(t.segments.slice(0, 3).map((s) => [s.start, s.label]), [['00:00', 'The promise'], ['02:00', 'Read'], ['06:00', 'The big idea']]);
  assert.ok(t.segments.every((s) => s.does && s.who));
  const bible = episodeTemplate(ctx('EP:bible:GEN.01', { read_label: 'Genesis 1–2' }));
  const caught = episodeTemplate(ctx('EP:bible:GEN.01', { read_label: 'Genesis 1–2', caught: ['Genesis 1:26–27', '2:7'] }));
  assert.equal(caught.segments.find((s) => s.segment === 'read')!.pointer, 'Genesis 1:26–27 · 2:7');   // only what caught us
  const theme = episodeTemplate(ctx('EP:bible:GEN.01', { theme: 'Two creation stories', caught: ['Genesis 2:4'] }));
  assert.equal(theme.segments.find((s) => s.segment === 'read')!.pointer, 'Theme: Two creation stories — Genesis 2:4');
  assert.deepEqual(bible.segments.map((s) => s.segment), t.segments.map((s) => s.segment));   // one template for both
  assert.equal(bible.segments.find((s) => s.segment === 'read')!.pointer, 'Genesis 1–2');
  assert.ok(bible.segments.filter((s) => s.segment !== 'read').every((s) => s.pointer === null && s.slides === null));
  assert.equal(bible.before, null);
  assert.equal(bible.after, null);
  assert.equal(bible.deck_url, null);
  assert.ok(bible.ready.every((c) => !c.ok));
});

test('an episode sprint carries its Before-filming list and its resources', () => {
  const c = ctx('EP:ghafir:P02', {
    read_unit: '40/1-5',
    prep: [{ id: 'tafsir', title: 'Read your tafsīr scripts', who: 'Both', link: 'com.kmaps.app://essay/a' },
           { id: 'cards', title: 'Rehearse your cards', who: 'Hasib' }, { title: 'no id' }],
    prep_done: { tafsir: '2026-11-26T08:00:00Z' },
    resources: [{ group: 'Study', title: 'Key points', link: 'com.kmaps.app://essay/k' },
                { group: 'Slides', title: 'P1 text', link: 'com.kmaps.app://deck/p1' },
                { group: 'Study', title: 'Lexicon', link: 'com.kmaps.app://essay/l' }],
  });
  const tiles = resourceTiles(c);
  assert.deepEqual(tiles.slice(0, 3).map((t) => [t.key, t.n]), [['checklist', 2], ['library', 3], ['text', 5]]);
  const list = resource(c, 'checklist') as any;
  assert.equal(list.done, 1);
  assert.deepEqual(list.items.map((i: any) => [i.id, !!i.done, i.link]), [['tafsir', true, 'com.kmaps.app://essay/a'], ['cards', false, null]]);
  const lib = resource(c, 'library') as any;
  assert.deepEqual(lib.groups.map((g: any) => [g.title, g.items.length]), [['Study', 2], ['Slides', 1]]);
  assert.equal(resource(ctx('EP:ghafir:P03', { read_unit: '40/6' }), 'checklist'), null);
});

test('an episode series names its tiles EP 01…, others keep their passage labels', async () => {
  const { tileLabel, tileStyle } = await import('../src/episode/sprints');
  const z = { tiles: { unit: 'Episodes', label: 'EP {n}', list: true } };
  assert.equal(tileLabel({ id: 'EP:ghafir:P02', session_no: 2 }, z), 'EP 02');
  assert.equal(tileLabel({ id: 'EP:ghafir:P02', session_no: 2 }, {}), 'P02');
  assert.deepEqual(tileStyle(z), { unit: 'Episodes', label: 'EP {n}', list: true });
  assert.deepEqual(tileStyle({}), { unit: null, label: null, list: false });
});
