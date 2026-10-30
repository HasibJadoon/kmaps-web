import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classBeats, clock } from '../src/class-beats';
import { chapters, markersEdl } from '../src/class-export';
import type { CaptureMarkerRow } from '../src/repositories/capture.repo';

test('a talking card steps in its turns, then its drawing, spoken by the last speaker', () => {
  const beats = classBeats(JSON.stringify({
    kind: 'talk_card',
    subs: [{ who: 'Hasib', text: 'Why?' }, { who: 'Ali', text: 'Because.' }],
    steps: [{ ref: '40:1', text: 'حمٓ' }, { ref: '40:2', text: '' }],
  }));
  assert.deepEqual(beats.map((b) => `${b.kind}:${b.who}`),
    ['turn:Hasib', 'turn:Ali', 'visual:Ali', 'visual:Ali']);
});

test('a line comes first and a contrast draws in two beats', () => {
  const beats = classBeats(JSON.stringify({
    line: 'A point.', subs: [{ who: 'Ali', text: 'x' }], contrast: { told: 'a', text: 'b' },
  }));
  assert.deepEqual(beats.map((b) => b.kind), ['line', 'turn', 'visual', 'visual']);
  assert.equal(classBeats(null).length, 0);
  assert.equal(classBeats('not json').length, 0);
});

test('the take writes YouTube chapters and Resolve markers by speaker', () => {
  const m = (sec: string, start: number, end: number, who: string): CaptureMarkerRow => ({
    id: 'x', session_ref: 's', point_ref: 'p', section_ref: sec, take_number: 1,
    start_tc: clock(start), end_tc: clock(end), status: 'good',
    note: JSON.stringify({ turn: 0, who, kind: 'turn' }), clip_ref: null, seq: 0, created_at: '',
  });
  const markers = [m('A', 1.5, 30, 'Hasib'), m('A', 30, 95, 'Ali'), m('B', 95, 140, 'Hasib')];
  const scenes = [{ id: 'A', heading: 'Opening' }, { id: 'B', heading: 'حمٓ' }];
  assert.equal(chapters(markers, scenes), '0:00 Opening\n1:35 حمٓ\n');
  const edl = markersEdl('EP', markers, scenes, 30);
  assert.match(edl, /01:00:01:15 01:00:01:16/);
  assert.match(edl, /\|C:ResolveColorYellow \|M:Hasib · Opening \|D:855/);
  assert.match(edl, /\|C:ResolveColorBlue \|M:Ali · Opening/);
});

test('a drawing on its own names its speaker; a strip steps a turn per beat', () => {
  assert.deepEqual(classBeats(JSON.stringify({ kind: 'talk_card', who: 'Ali', link: { to: 'x' } })),
    [{ who: 'Ali', kind: 'visual' }]);
  assert.deepEqual(classBeats(JSON.stringify({ kind: 'talk_strip', subs: [{ who: 'Hasib', text: 'a' }, { who: 'Ali', text: 'b' }] }))
    .map((b) => b.who), ['Hasib', 'Ali']);
  assert.deepEqual(classBeats(JSON.stringify({ kind: 'transition', no: 1 })), []);
});

test('a bookend steps question, title, line, recap, its lines, then the end screen', () => {
  const beats = classBeats(JSON.stringify({
    kind: 'bookend', side: 'outro', question: 'Why?', title: 'Because', line: 'One line.',
    recap: [{ ar: 'حمٓ' }], subs: [{ who: 'Ali', text: 'a' }, { who: 'Hasib', text: 'b' }], end_screen: true,
  }));
  assert.deepEqual(beats.map((b) => `${b.kind}:${b.who}`),
    ['visual:Ali', 'visual:Ali', 'line:Ali', 'visual:Ali', 'turn:Ali', 'turn:Hasib', 'visual:']);
  assert.equal(classBeats(JSON.stringify({ kind: 'bookend', side: 'intro', title: 'Q', subs: [{ who: 'Hasib', text: 'x' }] })).length, 2);
});
