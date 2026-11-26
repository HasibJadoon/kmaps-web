import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { card, fullPath, domainDoors, domainPage, episodePage, ltrLines, prompterOf, manifest, nowPage, pipelinePage, seriesPage, stageNow } from '../src/studio/model';
import type { EpisodeBundle, Registry } from '../src/studio/types';

// the registry and the first six episodes exactly as studio.py wrote them to the local D1
const fx = JSON.parse(readFileSync(join(__dirname, 'fixtures/studio.json'), 'utf8'));
const reg = fx.registry as Registry;
const eps = fx.episodes as EpisodeBundle[];
const ep = (id: string) => eps.find((e) => e.ep.id === id)!;

/// every string a view shows that came from a *_key must have resolved: no "stage.", "section.", "nav." … left raw
function noRawKeys(obj: unknown, path = ''): string[] {
  if (typeof obj === 'string') return /^(nav|stage|section|group|check|role|part|series|arc|domain|show|now|person|empty|presenter|workflow)\.[\w.-]+$/.test(obj) ? [`${path}=${obj}`] : [];
  if (Array.isArray(obj)) return obj.flatMap((x, i) => noRawKeys(x, `${path}[${i}]`));
  if (obj && typeof obj === 'object') return Object.entries(obj).filter(([k]) => !['labels', 'tokens', 'accent', 'icon', 'tone'].includes(k)).flatMap(([k, v]) => noRawKeys(v, `${path}.${k}`));
  return [];
}

test('stages are derived from rows: 001 published, 002 at Ready to film', () => {
  assert.equal(stageNow(reg, ep('EP:dz-qr:001'))?.key, 'published');
  assert.equal(stageNow(reg, ep('EP:dz-qr:002'))?.key, 'ready');
  assert.equal(stageNow(reg, ep('EP:dz-wv:001'))?.key, 'research');
  assert.equal(card(reg, ep('EP:dz-qr:002')).stage?.label, 'Ready to film');
  assert.equal(card(reg, ep('EP:bh-films:008')).stage?.label, 'To publish');     // in hand, not yet out
  assert.equal(card(reg, ep('EP:bh-films:001')).stage?.label, 'Published');
  assert.equal(card(reg, ep('EP:dz-qr:002')).boundary, '40:1–5');
  assert.deepEqual(card(reg, ep('EP:dz-qr:002')).people, ['Hasib', 'Ali']);
  assert.deepEqual(card(reg, ep('EP:dz-wv:001')).people, ['Hasib', 'Ali']);   // the manager row is not a host tag
});

test('the manifest carries the look, the words and the navigation, all from rows', () => {
  const m = manifest(reg, 'ipad');
  assert.equal(m.tokens['accent'].value, '#E6A34A');
  assert.deepEqual(m.nav.map((n) => n.kind), ['nav_item', 'nav_item', 'series_list']);
  assert.equal(m.nav[0].label, 'Now');
  const series = (m.nav[2] as { series: Array<{ label: string }> }).series.map((s) => s.label);
  assert.deepEqual(series, ['Do Zāwiya · Worldview', 'Do Zāwiya · Qurʾān', 'Reading Ibn ʿĀshūr', 'Qurʾān Understanding', 'Passage by Passage']);
  assert.deepEqual(noRawKeys(m), []);
});

test('the episode page follows VIEW:episode in order and hides sections whose rule does not hold', () => {
  const p = episodePage(reg, ep('EP:dz-qr:002'), 'ipad', eps);
  const related = p.sections.find((s) => s.key === 'related')!.data as Array<{ label: string; items: Array<{ title: string; url: string }> }>;
  assert.deepEqual(related.map((g) => [g.label, g.items.map((i) => i.title)]), [['Passage by Passage', ['The Forgiver · 40:1–3', 'The Charge · 40:4–5']]]);
  assert.ok(related[0]!.items[0]!.url.startsWith('https://youtu.be/'));
  assert.deepEqual(p.sections.map((s) => s.key), ['header', 'people', 'stages', 'study', 'related', 'scenes', 'slides', 'checks']);
  const study = p.sections.find((s) => s.key === 'study')!.data as Array<{ label: string; items: unknown[] }>;
  assert.deepEqual(study.map((g) => [g.label, g.items.length]), [['Study', 4], ['Tafsīr scripts', 5], ['Slides', 14], ['Essays', 4], ['Notes', 3]]);
  const checks = p.sections.find((s) => s.key === 'checks')!.data as Array<{ key: string; result: string | null }>;
  assert.equal(checks.filter((c) => c.result === 'pass').length, 4);
  assert.deepEqual(noRawKeys(p), []);
  const p1 = episodePage(reg, ep('EP:dz-qr:001'), 'ipad');
  assert.ok(p1.sections.some((s) => s.key === 'publish'));       // published → the publish section shows
});

test('now, pipeline and series pages are built from the same rows', () => {
  const now = nowPage(reg, eps, 'ios');
  const next = now.sections.find((s) => s.key === 'next')!.data as { id: string };
  assert.equal(next.id, 'EP:dz-qr:002');                          // the episode closest to the camera
  const pub = now.sections.find((s) => s.key === 'out')!.data as Array<{ id: string }>;
  assert.ok(pub.map((e) => e.id).includes('EP:bh-films:006'));      // newest first: GHF06 went out 2026-11-25
  const boards = pipelinePage(reg, eps, 'ios').sections[0]!.data as Array<{ key: string; label: string; columns: Array<{ key: string; episodes: Array<{ id: string }> }> }>;
  assert.deepEqual(boards.map((b) => b.label), ['Episode sprint', 'Film']);
  const films = boards[1]!.columns;
  assert.deepEqual(films.map((c) => [c.key, c.episodes.length]), [['planned', 0], ['script', 0], ['cut', 2], ['delivered', 0], ['published', 9]]);
  const cols = boards[0]!.columns;
  assert.deepEqual(cols.map((c) => c.key), ['planned', 'research', 'scenes', 'ready', 'filmed', 'published']);
  assert.deepEqual(cols.find((c) => c.key === 'ready')!.episodes.map((e) => e.id), ['EP:dz-qr:002']);
  const s = seriesPage(reg, 'SER:dz-qr', eps, 'ios');
  const arcs = s.sections.find((x) => x.key === 'arcs')!.data as Array<{ label: string; episodes: Array<{ no: number }> }>;
  assert.deepEqual(arcs.map((a) => [a.label, a.episodes.map((e) => e.no)]), [['Ghāfir', [1, 2]]]);
  assert.deepEqual(noRawKeys([now, cols, s]), []);
});

test('study: one column per mufassir, rows per āyah, silent cells explicit; run carries the scene words from the registry', async () => {
  const { studyPage, ayatOfHeading, sceneParams, runPage } = await import('../src/studio/model');
  assert.deepEqual(ayatOfHeading('40:4–5 — مَا يُجَٰدِلُ', 40), [4, 5]);
  assert.deepEqual(ayatOfHeading('Introduction', 40), []);
  const docs = [
    { title: 'Tafsīr script — الطبري · 40:1–5', body: '# x\n## 40:1 — حمٓ\nfour views\n## 40:4–5 — …\nthe arguers' },
    { title: 'Tafsīr script — ابن عاشور · 40:1–5', body: '## Introduction\nthe names\n## 40:1–3 — …\nthe overture' },
  ];
  const p = studyPage(reg, ep('EP:dz-qr:002'), docs, 'ipad');
  const d = p.sections[0]!.data as { columns: string[]; rows: Array<{ ayah: string; cells: Array<Record<string, unknown>> }>; intro: unknown[] };
  assert.equal(d.rows.length, 5);
  assert.equal(d.rows[1]!.cells[0]!['silent'], 'Silent on this āyah');        // al-Ṭabarī says nothing separately on 40:2
  assert.deepEqual(d.rows[1]!.cells[1]!['shared'], [1, 2, 3]);                 // Ibn ʿĀshūr's one section covers 1–3
  assert.equal(d.rows[4]!.cells[0]!['text'], 'the arguers');
  assert.equal(d.intro.length, 1);
  assert.deepEqual(sceneParams(reg, ep('EP:dz-qr:002')), { face: 'mushaf', meaning: 'IT MEANS', lesson: 'WATCH THIS WORD', units: 'āyāt' });
  const run = runPage(reg, ep('EP:dz-qr:002'), { scenes: [{ no: 1, type: 'title' }] }, 'ipad');
  const s = run.sections[0]!.data as { items: unknown[]; room: string; people: Array<{ name: string }> };
  assert.equal(s.items.length, 1);
  assert.equal(s.room, 'studio/episodes/EP:dz-qr:002/room');
  assert.deepEqual(s.people.map((x) => x.name), ['Hasib', 'Ali']);
});

test('ltrLines marks English lines that start with Arabic, leaves Arabic lines alone', () => {
  assert.equal(ltrLines('علي told me\nقال الله'), '\u200Eعلي told me\nقال الله');
  assert.equal(ltrLines('\u200Ealready'), '\u200Ealready');
  assert.equal(ltrLines('plain English'), 'plain English');
});

test('prompterOf: prompter.* labels without prefix; footage = layout root + episode folder + footage rule dir', () => {
  const reg = { labels: { 'prompter.speed': 'Speed', 'presenter.next': 'Next' },
    layouts: [{ id: 'FL:x', scope: 'series', owner_ref: 'SER:x', root_path: 'icloud:K/EPS', episode_pattern: null, subfolders_json: '[]',
      asset_rules_json: '{"footage":"02_FOOTAGE/*"}' }] } as unknown as Parameters<typeof prompterOf>[0];
  const b = (folder: string | null) => ({ ep: { series_ref: 'SER:x', folder_path: folder } }) as unknown as Parameters<typeof prompterOf>[1];
  assert.deepEqual(prompterOf(reg, b('EP02 · T')), { labels: { speed: 'Speed' }, footage: 'icloud:K/EPS/EP02 · T/02_FOOTAGE' });
  assert.equal(prompterOf(reg, b(null)).footage, null);
});

test('dashboard doors: one per domain, counts add up; a card carries its domain and one step per stage', () => {
  const doors = domainDoors(reg, eps);
  assert.equal(doors.length, reg.domains.length);
  for (const d of doors) assert.equal(d.total, d.published + d.doing);
  const c = card(reg, ep('EP:dz-qr:002'));
  assert.equal(c.domain?.key, 'QR');
  assert.deepEqual(c.steps.slice(0, 4), ['done', 'done', 'done', 'current']);
  const page = domainPage(reg, 'QR', eps, 'ipad') as { view: string };
  assert.equal(page.view, 'VIEW:domain');
});

test('fullPath: an indexed file gets its series folder root in front; rooted paths stay', () => {
  const r = { layouts: [{ id: 'FL:x', scope: 'series', owner_ref: 'SER:x', root_path: 'icloud:K/Films', episode_pattern: null, subfolders_json: '[]', asset_rules_json: '{}' }] } as unknown as Registry;
  const b = { ep: { series_ref: 'SER:x' } } as unknown as EpisodeBundle;
  assert.equal(fullPath(r, b, 'GHF09/3_THUMBNAILS/t.jpg'), 'icloud:K/Films/GHF09/3_THUMBNAILS/t.jpg');
  assert.equal(fullPath(r, b, 'icloud:a/b.jpg'), 'icloud:a/b.jpg');
  assert.equal(fullPath(r, b, null), null);
});
