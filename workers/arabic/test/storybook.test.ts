// The story book (GET /ar/text/storybooks, /ar/text/storybooks/:id; migration 0079): shaped for a renderer that
// decides nothing — words from labels, the chapter's look, media URLs, page times in the story's own audio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { Router } from '../../shared/src/router';
import { storybookRoutes, storybookEntry } from '../src/routes/storybook';

const root = new URL('../../', import.meta.url).pathname;

function d1(db: DatabaseSync): D1Database {
  const stmt = (q: string, args: unknown[] = []) => {
    const s = db.prepare(q);
    const a = args.map((v) => (typeof v === 'boolean' ? +v : v)) as never[];
    return {
      bind: (...b: unknown[]) => stmt(q, b),
      all: async () => ({ results: s.all(...a) }),
      first: async () => s.get(...a) ?? null,
      run: async () => { const r = s.run(...a); return { meta: { changes: Number(r.changes) } }; },
    };
  };
  return { prepare: (q: string) => stmt(q) } as unknown as D1Database;
}

function world(migrate = true) {
  const AR = new DatabaseSync(':memory:');
  AR.exec(`CREATE TABLE ar_practice_label (scope TEXT, key TEXT, label TEXT, label_ar TEXT, detail TEXT, icon TEXT, color TEXT,
             min_value INTEGER, extra_json TEXT, sort INTEGER, PRIMARY KEY (scope, key));
           CREATE TABLE kmaps_cache_version (family TEXT PRIMARY KEY, version TEXT NOT NULL, updated_at TEXT NOT NULL);
           INSERT INTO kmaps_cache_version VALUES ('content', 'v0', 'now');`);
  if (migrate) {
    const m = readFileSync(root + 'arabic/migrations/0079_storybook.sql', 'utf8');
    AR.exec(m); AR.exec(m);                                         // idempotent
    const t = readFileSync(root + 'arabic/migrations/0082_storybook_telling.sql', 'utf8');
    AR.exec(t); AR.exec(t);
    AR.exec(`
      INSERT INTO ar_storybook (id, acq_ref_id, chapter_id, kind, depth, seq, title_ar, title_en, look_json)
        VALUES ('KD:05', 'ACQ:SHM:6321', 'KD:05', 'bab', 0, 5, 'الأسد والثور', 'The Lion and the Ox',
                '{"accent":"#D99A4E","gradient":["#24170C","#120B06"],"motif":"savanna"}');
      INSERT INTO ar_storybook (id, acq_ref_id, parent_id, chapter_id, kind, depth, seq, title_ar, title_en, themes_json, audio_key,
                                audio_seconds, cover_key, remember_json, authored)
        VALUES ('KD:05:01', 'ACQ:SHM:6321', 'KD:05', 'KD:05', 'main', 1, 114, 'الأسد والثور', 'The Lion and the Ox', '["slander","friendship"]',
                'books/kalila/storybook/KD_05_01/audio-aa.m4a', 3313, NULL, '{"moral_en":"A slanderer can sunder the firmest friendship."}', 0),
               ('KD:05:03', 'ACQ:SHM:6321', 'KD:05:01', 'KD:05', 'fable', 2, 116, 'الْقِرْدُ وَالنَّجَّارُ', 'The Monkey and the Carpenter', '["place"]',
                'books/kalila/storybook/KD_05_03/audio-bb.m4a', 51.2, 'books/kalila/storybook/KD_05_03/p01-cc.jpg',
                '{"title_en":"Remember","moral_ar":"مَنْ تَكَلَّفَ…","moral_en":"Whoever…","words":[{"t":"مَنْ","s":45.1,"e":45.3}],"start":45.1,"end":51,
                  "checks":[{"prompt_en":"Fill the gap from the story.","prompt_ar":"فَتَدَلَّى ___ فِي الشَّقِّ","options":["رَأْسُهُ","ذَنَبُهُ"],"answer":1,"answer_en":"his tail"}]}', 1),
               ('KD:05:04', 'ACQ:SHM:6321', 'KD:05:01', 'KD:05', 'fable', 2, 117, 'الثَّعْلَبُ وَالطَّبْلُ', 'The Fox and the Drum', '["caution","wit"]',
                NULL, NULL, NULL, '{}', 1);
      INSERT INTO ar_storybook_page (story_id, no, kind, link_id, text_ar, text_en, words_json, start_sec, end_sec, rec_key, rec_start, rec_end, picture_key, placeholder)
        VALUES ('KD:05:01', 1, 'story', NULL, 'وكان قريباً منه أجمةٌ', NULL, '[{"t":"وكان","s":0.25,"e":0.6}]', 0.25, 4, 'books/kalila/03-c.mp3', 2100, 2104, 'books/kalila/storybook/KD_05_01/p01-dd.jpg', 1),
               ('KD:05:01', 2, 'link', 'KD:05:03', NULL, NULL, '[]', NULL, NULL, NULL, NULL, NULL, NULL, 1),
               ('KD:05:03', 1, 'story', NULL, 'زَعَمُوا أَنَّ قِرْدًا', 'They say a monkey', '[{"t":"زَعَمُوا","s":0.25,"e":1.6},{"t":"أَنَّ","s":1.6,"e":1.8}]',
                0.25, 9.4, 'books/kalila/03-c.mp3', 2258.26, 2267.66, 'books/kalila/storybook/KD_05_03/p01-cc.jpg', 0);
      UPDATE ar_storybook_page SET
        lines_json = '[{"speaker":"storyteller","text":"زَعَمُوا أَنَّ قِرْدًا","from":0,"to":1,"audio":null}]',
        sound_json = '{"ambience":{"id":"carpenter_yard","gain_db":-22,"scene_in":true},"spots":[{"id":"wedge_pop","word":1,"gain_db":-12},{"id":"not_made","word":0}]}'
        WHERE story_id = 'KD:05:03' AND no = 1;
      INSERT INTO ar_sfx (id, object_key, scene_in_key, loopable) VALUES
        ('carpenter_yard', 'sfx/carpenter_yard-11.m4a', 'sfx/carpenter_yard_in-22.m4a', 1), ('wedge_pop', 'sfx/wedge_pop-33.m4a', NULL, 0);
      INSERT INTO ar_storybook_telling (story_id, lang, audio_key, audio_seconds, intro_sec, story_sec, film_json, grid_json) VALUES
        ('KD:05:03', 'en', 'books/kalila/telling/KD_05_03/en-ee.m4a', 74.1, 7.2, 62.6,
         '{"opening":{"title":"The Monkey and the Carpenter"},"ending":{"title":"The Monkey and the Carpenter","end":"The End","seconds":11.5,"picture":"books/kalila/telling/KD_05_03/s14-ff.jpg"},
           "pages":[{"no":1,"start":7.2}],"shots":[{"start":0,"end":12,"xf":0.9,"picture":"books/kalila/telling/KD_05_03/s01-aa.jpg","clip":null,"from":[0.5,0.5,1],"to":[0.45,0.46,1.2]}],
           "phrases":[{"start":6.95,"end":9,"fade":0.35,"words":[{"t":"They","s":7.2,"e":7.5,"k":false},{"t":"monkey","s":9.06,"e":9.4,"k":true}]}],
           "runs":[{"start":6.95,"end":9,"ar":"زَعَمُوا","en":"They say…","ur":"کہتے ہیں…"}]}', NULL),
        ('KD:05:03', 'ar', 'books/kalila/telling/KD_05_03/ar-dd.m4a', 94.6, 7.4, 83.1, '{"shots":[],"phrases":[],"pages":[]}',
         '{"audio":"books/kalila/telling/KD_05_03/grid-gg.m4a","seconds":106.9,"headingAt":0.6,"sections":[{"kind":"verb","at":2.8}],
           "pages":[{"start":5.6,"end":30,"cards":[{"at":5.6,"end":9,"forms":[{"t":"رَأَى","s":6.7,"e":7.1}],"en":"to see","picture":"books/kalila/telling/KD_05_03/w01-hh.jpg"}]}]}');`);
  }
  const env = { DB_AR: d1(AR) } as any;
  const r = new Router<any>(); storybookRoutes(r);
  const get = async (path: string) => {
    const res = await r.handle(new Request('https://ar' + path), env);
    return { status: res.status, body: await res.json() as any };
  };
  return { AR, env, get };
}

test('the shelf: chapters with their look and nested stories, themes with their stories, words from labels', async () => {
  const w = world();
  const { status, body } = await w.get('/ar/text/storybooks?work=ACQ:SHM:6321');
  assert.equal(status, 200);
  const d = body.data;
  assert.equal(d.words.entry.text, 'Read as a story book');
  assert.equal(d.words.byTheme.text, 'By theme');
  assert.equal(d.chapters.length, 1);
  const ch = d.chapters[0];
  assert.equal(ch.accent, '#D99A4E');
  assert.deepEqual(ch.gradient, ['#24170C', '#120B06']);
  assert.equal(ch.stories[0].id, 'KD:05:01');
  assert.deepEqual(ch.stories[0].children.map((c: any) => c.id), ['KD:05:03', 'KD:05:03~animated', 'KD:05:04'], 'nested in book order, the animated version beside its book');
  assert.equal(ch.stories[0].children[0].cover, '/api/ar/audio/books/kalila/storybook/KD_05_03/p01-cc.jpg');
  assert.equal(ch.stories[0].children[0].themes[0].text, 'Knowing your place');
  assert.equal(ch.stories[0].pages, 2);
  const place = d.themes.find((t: any) => t.key === 'place');
  assert.deepEqual(place.stories.map((s: any) => s.id), ['KD:05:03', 'KD:05:03~animated']);
  assert.equal(place.stories[0].children, undefined, 'a theme lists stories flat');
  assert.ok(!d.themes.some((t: any) => t.key === 'greed'), 'a theme with no story is left out');
});

test('one story: pages with word times in its own audio, link pages, the Remember page last, next story', async () => {
  const w = world();
  const frame = (await w.get('/ar/text/storybooks/KD%3A05%3A01')).body.data;
  assert.equal(frame.audio.url, '/api/ar/audio/books/kalila/storybook/KD_05_01/audio-aa.m4a');
  assert.equal(frame.pages[1].kind, 'link');
  assert.equal(frame.pages[1].link.id, 'KD:05:03');
  assert.equal(frame.pages[1].link.cover, '/api/ar/audio/books/kalila/storybook/KD_05_03/p01-cc.jpg');
  assert.equal(frame.pages[0].placeholder, true);
  assert.equal(frame.inside, null, 'a story told in a chapter is not inside another story');

  const { status, body } = await w.get('/ar/text/storybooks/KD:05:03');
  assert.equal(status, 200);
  const s = body.data;
  assert.equal(s.look.accent, '#D99A4E', "the chapter's look");
  assert.deepEqual(s.inside, { id: 'KD:05:01', titleAr: 'الأسد والثور', titleEn: 'The Lion and the Ox' });
  assert.equal(s.pages[0].words[0].t, 'زَعَمُوا');
  assert.equal(s.pages[0].start, 0.25);
  assert.equal(s.pages[0].recording.start, 2258.26);
  assert.equal(s.pages[0].of, 2, 'counting the Remember page');
  assert.equal(s.remember.no, 2);
  assert.equal(s.remember.checks[0].id, 'KD:05:03:c1');
  assert.equal(s.remember.checks[0].answer, 1);
  assert.equal(s.remember.words[0].s, 45.1);
  assert.equal(s.words.remember.ar, 'تَذَكَّرْ');
  assert.equal(s.next.id, 'KD:05:04');
  assert.deepEqual(s.pages[0].lines[0], { speaker: 'storyteller', name: null, text: 'زَعَمُوا أَنَّ قِرْدًا', from: 0, to: 1, guess: false, audio: null });
  assert.equal(s.pages[0].sound.ambience.url, '/api/ar/audio/sfx/carpenter_yard-11.m4a');
  assert.equal(s.pages[0].sound.ambience.sceneIn, '/api/ar/audio/sfx/carpenter_yard_in-22.m4a');
  assert.equal(s.pages[0].sound.ambience.gainDb, -22);
  assert.deepEqual(s.pages[0].sound.spots.map((x: any) => [x.id, x.word]), [['wedge_pop', 1]], 'a sound not in the library is left out');
  assert.equal(s.words.sound.text, 'Sound');
});

test('a chapter is not a story; an unknown story is 404; without the migration the profile simply has no entry', async () => {
  const w = world();
  assert.equal((await w.get('/ar/text/storybooks/KD:05')).status, 404);
  assert.equal((await w.get('/ar/text/storybooks/KD:99:99')).status, 404);
  assert.equal((await w.get('/ar/text/storybooks')).status, 400);
  const e = await storybookEntry(w.env, 'ACQ:SHM:6321');
  assert.equal(e?.stories, 3);
  assert.equal(e?.label, 'Read as a story book');
  assert.equal(await storybookEntry(w.env, 'ACQ:SHM:1'), null);

  const bare = world(false);
  assert.equal(await storybookEntry(bare.env, 'ACQ:SHM:6321'), null);
  assert.equal((await bare.get('/ar/text/storybooks?work=ACQ:SHM:6321')).status, 404);
});

test('a filmed story stands twice: the written book and its animated version (?lang= picks a telling, Arabic first, the grid on Arabic)', async () => {
  const w = world();
  const shelf = (await w.get('/ar/text/storybooks?work=ACQ:SHM:6321')).body.data;
  const [book, monkey, fox0] = shelf.chapters[0].stories[0].children;
  assert.equal(book.id, 'KD:05:03');
  assert.deepEqual(book.tellings, [], 'the written book is read as pages');
  assert.equal(monkey.id, 'KD:05:03~animated');
  assert.equal(monkey.kind, 'animated');
  assert.equal(monkey.themes[0].key, 'animated', 'the animated chip first');
  assert.deepEqual(monkey.tellings.map((l: any) => [l.key, l.dir]), [['ar', 'rtl'], ['en', 'ltr']], 'in the labels order, only those told');
  assert.equal(fox0.id, 'KD:05:04');
  assert.equal(shelf.chapters[0].stories[0].children.length, 3, 'a story with no telling has no animated card');
  assert.equal(shelf.words.language.text, 'Language');
  assert.equal(shelf.words.search.icon, 'magnifyingglass', 'the shelf search field is a label row');
  assert.equal(shelf.words.noMatch.text, 'No story matches');

  const written = (await w.get('/ar/text/storybooks/KD:05:03')).body.data;
  assert.equal(written.telling, null, 'the book itself reads as pages');
  assert.deepEqual(written.tellings, []);
  const ar = (await w.get('/ar/text/storybooks/KD:05:03~animated')).body.data;
  assert.equal(ar.id, 'KD:05:03~animated', 'the language toggle asks for the animated id');
  assert.equal(ar.telling.lang, 'ar', 'Arabic when no language is asked for');
  assert.equal(ar.telling.font, 'AmiriQuran-Regular');
  assert.equal(ar.telling.grid.title, 'كَلِمَاتُ الْقِصَّةِ');
  assert.equal(ar.telling.grid.audio.url, '/api/ar/audio/books/kalila/telling/KD_05_03/grid-gg.m4a');
  assert.equal(ar.telling.grid.sections[0].title, 'الأَفْعالُ');
  assert.equal(ar.telling.grid.pages[0].cards[0].picture, '/api/ar/audio/books/kalila/telling/KD_05_03/w01-hh.jpg');
  assert.equal(ar.pages.length, 1, 'the pages are still there for reading');

  const { status, body } = await w.get('/ar/text/storybooks/KD:05:03~animated?lang=en');
  assert.equal(status, 200);
  const en = body.data.telling;
  assert.equal(en.dir, 'ltr');
  assert.equal(en.font, 'Baloo2-Regular');
  assert.equal(en.audio.url, '/api/ar/audio/books/kalila/telling/KD_05_03/en-ee.m4a');
  assert.equal(en.intro, 7.2);
  assert.equal(en.storyEnd, 62.6);
  assert.equal(en.shots[0].picture, '/api/ar/audio/books/kalila/telling/KD_05_03/s01-aa.jpg');
  assert.equal(en.shots[0].clip, null);
  assert.equal(en.ending.picture, '/api/ar/audio/books/kalila/telling/KD_05_03/s14-ff.jpg');
  assert.equal(en.phrases[0].words[1].k, true);
  assert.equal(en.style.key, '#FAC75C');
  assert.equal(en.grid, null, 'the word grid ends the Arabic telling only');
  assert.equal(en.runs[0].ar, 'زَعَمُوا', 'each run carries its line in the other languages');
  assert.deepEqual(en.lines.map((l: any) => [l.key, l.font, l.lineSize]),
    [['ar', 'AmiriQuran-Regular', 18], ['ur', 'NotoNastaliqUrdu-Regular', 15]], 'the translation line: every other language, its face and size');
  assert.deepEqual(ar.telling.lines.map((l: any) => l.key), ['en', 'ur']);

  assert.equal((await w.get('/ar/text/storybooks/KD:05:03~animated?lang=ur')).status, 404, 'a language it is not told in');
  const fox = (await w.get('/ar/text/storybooks/KD:05:04')).body.data;
  assert.equal(fox.telling, null);
  assert.deepEqual(fox.tellings, []);
  assert.equal((await w.get('/ar/text/storybooks/KD:05:04~animated')).status, 404, 'no animated version of an unfilmed story');
});
