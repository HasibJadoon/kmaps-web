// The study page: the Library in sections with nothing twice, and the log merged by day.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLog, type EpisodeDigest } from '../src/study-log';
import type { Study } from '../src/repositories/study.repo';

const H = 'CORE:H', A = 'CORE:A';
const labels: Record<string, string> = {
  open: 'Open', step: 'Step {n}', read: 'Read', study_slides: 'Study', story_slides: 'Story',
  minutes: '{n} min', hours: '{n} h', days: '{n} d', log_took: 'took {time}',
  log_started: 'Started {step}', log_finished: 'Finished {step}', log_wrote: 'Wrote “{title}”',
  log_wrote_many: 'Wrote {n} notes in {stage}', log_recorded: 'Recorded {episode}, {n} turns',
  log_try: 'One short try of {episode}', log_tries: '{n} short tries of {episode}', turns_logged: '{n} turns logged',
};

// Rows by table, answered to whatever the page asks.
function fakeDb(rows: Record<string, unknown[]>): D1Database {
  const pick = (sql: string) => sql.includes('cm_study_progress') ? rows.progress
    : sql.includes('cm_note_targets') ? rows.notes : sql.includes('cm_documents') ? rows.docs : [];
  return { prepare: (sql: string) => ({ bind: () => ({ all: async () => ({ results: pick(sql) ?? [] }) }) }) } as unknown as D1Database;
}

const study = { doc_id: 'CM:STUDY:x', title: 'P1', passage: { unit_id: 'QR:SP:40:1-3' }, labels } as unknown as Study;
const raw = {
  people: [H, A],
  names: { [H]: { name: 'Hasib', color: '#c9a84c' }, [A]: { name: 'Ali', color: '#6fa8e0' } },
  steps: [{ n: 2, key: 'questions', scope: 'person', title: 'Questions', decks: { [H]: 'q-h', [A]: 'q-a' } }],
  log: {
    take_min_seconds: 20,
    stages: [
      { key: 'library', title: 'Library', fold: true, sources: [
        { kind: 'terms', group: 'Key terms' }, { kind: 'steps', group: 'Slides' }, { kind: 'takes', group: 'Takes' },
        { kind: 'takes', group: 'Takes' }] },
      { key: 'read', title: 'Read', sources: [{ kind: 'notes', relation: 'keyterm' }] },
      { key: 'talk', title: 'Talk', sources: [{ kind: 'takes' }] },
    ],
  },
  library: { terms: [{ key: 'ghafir-word', ar: 'غَافِرِ', en: 'One who forgives',
    phrase: { key: 'ghafir', ar: 'غَافِرِ ٱلذَّنۢبِ', en: 'Forgiver of the sin' } }] },
};
const docs = [
  { doc_id: 'CM:DOC:qr:keyterm-essay:ghafir-word', doc_type: 'essay', slug: 'e-gw', title: 'Forgiving' },
  { doc_id: 'CM:DOC:qr:keyterm-story:ghafir', doc_type: 'deck', slug: 's-g', title: 'The story of غافر الذنب' },
];
const note = (id: string, title: string, at: string) =>
  ({ note_id: id, title, relation_type: 'keyterm', seq_order: 0, core_user_ref: H, created_at: at, updated_at: at, meta_json: null });
const episode: EpisodeDigest = {
  id: 'EP:1', title: 'Ghāfir P1', status: 'draft', sections: [],
  captures: [
    { id: 't1', started_at: '2026-10-30T18:12:11Z', ended_at: '2026-10-30T18:12:14Z', marker_count: 1 },
    { id: 't2', started_at: '2026-10-30T18:13:15Z', ended_at: '2026-10-30T18:13:21Z', marker_count: 1 },
    { id: 't3', started_at: '2026-10-30T18:33:25Z', ended_at: '2026-10-30T18:34:17Z', marker_count: 54 },
  ],
};
const page = () => buildLog(fakeDb({
  docs,
  progress: [{ core_user_ref: A, step_n: 2, started_at: '2026-10-30T12:05:58Z', completed_at: '2026-10-30T12:09:22Z', slides_seen: 8, slide_count: 8 }],
  notes: [note('n1', 'غافر', '2026-10-16T10:00:00Z'), note('n2', 'ذنب', '2026-10-16T10:05:00Z'), note('n3', 'توب', '2026-10-16T10:09:00Z')],
}), study, raw, [episode], H);

test('a word and its phrase are one row, under their section', async () => {
  const lib = (await page()).stages[0];
  const terms = lib.items.filter((i) => i.kind === 'term');
  assert.equal(terms.length, 1);
  assert.equal(terms[0].group, 'Key terms');
  assert.deepEqual(terms[0].links?.map((l) => l.label), ['Read', 'غَافِرِ ٱلذَّنۢبِ · Story']);
});

test('a person step is one row with a button for each person', async () => {
  const step = (await page()).stages[0].items.find((i) => i.kind === 'deck')!;
  assert.equal(step.group, 'Slides');
  assert.deepEqual(step.links?.map((l) => l.label), ['Hasib', 'Ali']);
});

test('short tries are not listed as takes', async () => {
  const takes = (await page()).stages[2].items;
  assert.equal(takes.length, 1);
  assert.match(takes[0].subtitle ?? '', /54 turns/);
});

test('the log: one line per step, notes of a day together, tries folded', async () => {
  const p = await page();
  const texts = p.log.map((e) => e.text);
  assert.deepEqual(texts, [
    'Recorded Ghāfir P1, 54 turns',
    '2 short tries of Ghāfir P1',
    'Finished Questions',
    'Wrote 3 notes in Read',
  ]);
  assert.equal(p.log.find((e) => e.text === 'Finished Questions')?.detail, 'took 3 min');
  assert.equal(p.log.find((e) => e.text.startsWith('Wrote'))?.detail, 'غافر · ذنب · توب');
  assert.deepEqual(p.days.map((d) => [d.day, d.events.length]), [['2026-10-30', 3], ['2026-10-16', 1]]);
});

test('the Library lists each thing once', async () => {
  const takes = (await page()).stages[0].items.filter((i) => i.group === 'Takes');
  assert.equal(takes.length, 1);
});
