import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import { softFail } from '../../../shared/src/soft-fail';
import type { ArabicEnv } from '../env';
import { labels, byKey, type Label } from '../lib/labels';

/// Story books: a work's tales as picture pages read aloud (migration 0079).
///
/// Shaped for a renderer that decides nothing: every word on the screen comes from
/// ar_practice_label (scope 'storybook'; themes 'storybook_theme'), every colour from
/// the chapter's look, every URL is built here, and each page carries its own audio
/// span and word times in the story's own cut. Two reads:
///
///   GET /ar/text/storybooks?work=ACQ:SHM:6321   the shelf — by chapter (nested) and by theme
///   GET /ar/text/storybooks/:id                 one story: its pages, then its Remember page
///
/// Both sit under /ar/text/, so the gateway lets them through unsigned and they are
/// kept by the content version like the rest of the library.

interface Row {
  id: string; acq_ref_id: string; parent_id: string | null; chapter_id: string | null; kind: string; depth: number;
  seq: number; title_ar: string; title_en: string | null; summary_en: string | null; themes_json: string;
  look_json: string; audio_key: string | null; audio_seconds: number | null; cover_key: string | null;
  remember_json: string; authored: number;
}
interface PageRow {
  no: number; kind: string; link_id: string | null; text_ar: string | null; text_en: string | null; words_json: string;
  start_sec: number | null; end_sec: number | null; rec_key: string | null; rec_start: number | null; rec_end: number | null;
  picture_key: string | null; placeholder: number; lines_json: string; sound_json: string;
}
interface Sfx { id: string; object_key: string; scene_in_key: string | null; loopable: number }
interface Cue { ambience?: { id: string; gain_db?: number; scene_in?: boolean }; spots?: Array<{ id: string; word?: number; at?: number; gain_db?: number }> }
interface Look { accent: string; gradient: [string, string]; motif: string | null }
interface TellingRow {
  story_id?: string; lang: string; audio_key: string; audio_seconds: number | null; intro_sec: number; story_sec: number | null;
  film_json: string; grid_json: string | null;
}
type Json = Record<string, any>;

const GOLD = '#C9A84C';
/// A filmed story stands on the shelf twice: the written book (its id, read as pages) and the animated version (its id
/// + this suffix, played as its film; owner, 2026-11-06: "books stay as books … type animated so we have both").
export const ANIMATED = '~animated';
const media = (key: string | null) => (key ? `/api/ar/audio/${encodeURI(key)}` : null);
const parse = <T>(j: string | null | undefined, d: T): T => { try { return j ? (JSON.parse(j) as T) : d; } catch { return d; } };
const lookOf = (r: Row | undefined): Look => {
  const l = parse<Partial<Look>>(r?.look_json, {});
  return { accent: l.accent ?? GOLD, gradient: l.gradient ?? ['#141414', '#0B0B0B'], motif: l.motif ?? null };
};
const word = (l: Label | undefined, fallback: string) => ({ text: l?.label ?? fallback, ar: l?.labelAr ?? null, icon: l?.icon ?? null,
                                                         detail: l?.detail ?? null, color: l?.color ?? null });

const withAr = (w: ReturnType<typeof word>, l: Label | undefined, fallbackAr: string) => ({ ...w, ar: l?.labelAr ?? fallbackAr });

/// The languages a story is told in, in the labels' order (scope 'storybook_lang'): the toggle's words and how the
/// text runs. Only the languages the story has.
export const languagesOf = (langs: Iterable<string>, LANG: Label[] | undefined) => {
  const have = new Set(langs);
  return (LANG ?? []).filter((l) => have.has(l.key))
    .map((l) => {
      const x = (l.extra ?? {}) as Json;
      // font + lineSize: how this language's line is set when it runs as the translation under another telling
      return { key: l.key, text: l.label, ar: l.labelAr, dir: (x.dir as string | undefined) ?? 'ltr',
        font: (x.font as string | undefined) ?? null, lineSize: (x.lineSize as number | undefined) ?? 16 };
    });
};

/// One telling as the app plays it (migration 0082): the film's soundtrack, its shots, the bottom phrases, the
/// title and end cards, and (Arabic) the word grid. Every key becomes a URL here; the face and the way the text
/// runs come from the language's label row.
export function tellingOf(t: TellingRow, LANG: Label[] | undefined, G: Map<string, Label>, W: Map<string, Label>) {
  const film = parse<Json>(t.film_json, {});
  const grid = parse<Json | null>(t.grid_json, null);
  const l = (LANG ?? []).find((x) => x.key === t.lang);
  const x = (l?.extra ?? {}) as Json;
  const pic = (k: string | null | undefined) => media(k ?? null);
  const gw = W.get('words_grid');
  return {
    lang: t.lang, label: l?.label ?? t.lang, dir: x.dir ?? (t.lang === 'en' ? 'ltr' : 'rtl'),
    font: x.font ?? null, titleFont: x.titleFont ?? x.font ?? null, size: x.size ?? 28, weight: x.weight ?? null, lineHeight: x.lineHeight ?? 1.4,
    audio: { url: media(t.audio_key), seconds: t.audio_seconds },
    intro: t.intro_sec, storyEnd: t.story_sec ?? t.audio_seconds,
    style: { ink: '#FFF8E6', key: '#FAC75C', ...(film.style ?? {}) },
    opening: film.opening ?? null,
    ending: film.ending ? { ...film.ending, picture: pic(film.ending.picture) } : null,
    pages: film.pages ?? [],
    shots: (film.shots ?? []).map((s: Json) => ({ ...s, picture: pic(s.picture), clip: pic(s.clip) })),
    phrases: film.phrases ?? [],
    // each run's line in every language: the translation line under the words (behind the app's English switch)
    runs: film.runs ?? [],
    // the languages that line can run in (every language but the telling's own), each with its face and size
    lines: languagesOf((LANG ?? []).map((x) => x.key), LANG).filter((x) => x.key !== t.lang),
    grid: grid ? {
      title: gw?.labelAr ?? gw?.label ?? 'Words from the story', titleEn: gw?.label ?? null,
      audio: { url: media(grid.audio), seconds: grid.seconds ?? null }, picture: pic(grid.picture),
      headingAt: grid.headingAt ?? 0.6,
      sections: (grid.sections ?? []).map((s: Json) => {
        const g = G.get(s.kind);
        return { ...s, title: g?.labelAr ?? s.kind, sub: g?.label ?? null, color: g?.color ?? '#F5D675' };
      }),
      pages: (grid.pages ?? []).map((p: Json) => ({ ...p, cards: (p.cards ?? []).map((c: Json) => ({ ...c, picture: pic(c.picture) })) })),
      idioms: grid.idioms ?? null,
    } : null,
  };
}

const tellingsOf = (env: ArabicEnv, id: string) =>
  query<TellingRow>(env.DB_AR,
    `SELECT lang, audio_key, audio_seconds, intro_sec, story_sec, film_json, grid_json FROM ar_storybook_telling
      WHERE story_id = ? AND status = 'live'`, [id]).catch(softFail([] as TellingRow[], 'ar_storybook_telling'));

/// The words of the book's screens, one object, from its label rows.
export function words(L: Map<string, Label>) {
  const k = (key: string, fb: string) => word(L.get(key), fb);
  return {
    entry: k('entry', 'Read as a story book'), byChapter: k('by_chapter', 'By chapter'), byTheme: k('by_theme', 'By theme'),
    english: k('english', 'English'), remember: k('remember', 'Remember'), checks: k('checks', 'Check yourself'),
    right: k('right', 'Right'), wrong: k('wrong', 'Not quite'), again: k('again', 'Read it again'), next: k('next', 'Next story'),
    inside: k('inside', 'A story told here'), open: k('open', 'Open the story'), pages: k('pages', 'pages'),
    notYet: k('not_yet', 'Arabic not yet vowelled'), sound: k('sound', 'Sound'),
    readMode: k('read_mode', 'Read'), storyMode: k('story_mode', 'Story'),
    // the cover: the series line over the title, and its two ways in (listen, or read it yourself)
    kicker: withAr(k('kicker', 'KALĪLA WA DIMNA · IBN AL-MUQAFFAʿ'), L.get('kicker'), 'مِنْ كَلِيلَةَ وَدِمْنَةَ'),
    readAloud: withAr(k('read_aloud', 'Read aloud'), L.get('read_aloud'), 'اِسْتَمِعْ'),
    readMyself: k('read_myself', 'Read myself'),
    complete: k('complete', 'Complete'),   // a finished story's ribbon on the shelf
    language: k('language', 'Language'),   // the telling's language toggle
    translation: k('translation', 'Translation'),
    search: k('search', 'Search stories in this book'),   // the shelf's search field
    noMatch: k('no_match', 'No story matches'),                 // the shelf when a search finds nothing
  };
}

const themeChip = (T: Map<string, Label>) => (key: string) => {
  const t = T.get(key);
  return t ? { key, text: t.label, ar: t.labelAr, icon: t.icon ?? 'tag', color: t.color ?? GOLD } : null;
};

const rowsOf = (env: ArabicEnv, work: string) =>
  query<Row>(env.DB_AR, `SELECT id, acq_ref_id, parent_id, chapter_id, kind, depth, seq, title_ar, title_en, summary_en, themes_json,
                                look_json, audio_key, audio_seconds, cover_key, remember_json, authored
                           FROM ar_storybook WHERE acq_ref_id = ? AND status = 'live' ORDER BY seq`, [work])
    .catch(softFail([] as Row[], 'ar_storybook'));

const pageCounts = (env: ArabicEnv, work: string) =>
  query<{ story_id: string; n: number }>(env.DB_AR,
    `SELECT p.story_id, COUNT(*) AS n FROM ar_storybook_page p JOIN ar_storybook s ON s.id = p.story_id
      WHERE s.acq_ref_id = ? AND s.status = 'live' GROUP BY p.story_id`, [work])
    .catch(softFail([] as { story_id: string; n: number }[], 'ar_storybook_page'));

/// What a book profile shows to open the story book: null when the work has none.
export async function storybookEntry(env: ArabicEnv, work: string) {
  const n = await queryOne<{ n: number }>(env.DB_AR,
    `SELECT COUNT(*) AS n FROM ar_storybook WHERE acq_ref_id = ? AND status = 'live' AND kind <> 'bab'`, [work])
    .catch(softFail(null as { n: number } | null, 'ar_storybook'));
  if (!n?.n) return null;
  const L = byKey((await labels(env)).storybook);
  const e = word(L.get('entry'), 'Read as a story book');
  return { work, label: e.text, labelAr: e.ar, detail: e.detail, icon: e.icon ?? 'book.pages', color: e.color ?? GOLD, stories: n.n };
}

export function storybookRoutes(router: Router<ArabicEnv>) {
  router.get('/ar/text/storybooks', async (req, env) => {
    const work = new URL(req.url).searchParams.get('work');
    if (!work) return badRequest('work is required');
    const [rows, counts, all, told] = await Promise.all([rowsOf(env, work), pageCounts(env, work), labels(env),
      query<{ story_id: string; lang: string }>(env.DB_AR,
        `SELECT t.story_id, t.lang FROM ar_storybook_telling t JOIN ar_storybook s ON s.id = t.story_id
          WHERE s.acq_ref_id = ? AND s.status = 'live' AND t.status = 'live'`, [work])
        .catch(softFail([] as { story_id: string; lang: string }[], 'ar_storybook_telling'))]);
    const toldIn = new Map<string, string[]>();
    for (const t of told) toldIn.set(t.story_id, [...(toldIn.get(t.story_id) ?? []), t.lang]);
    if (!rows.length) return notFound(`story book of ${work}`);
    const n = new Map(counts.map((c) => [c.story_id, c.n]));
    const byId = new Map(rows.map((r) => [r.id, r]));
    const chip = themeChip(byKey(all.storybook_theme));
    const W = words(byKey(all.storybook));
    const anim = byKey(all.storybook).get('animated');
    const animChip = { key: 'animated', text: anim?.label ?? 'Animated', ar: anim?.labelAr ?? null,
                       icon: anim?.icon ?? 'play.rectangle.fill', color: anim?.color ?? GOLD };
    const node = (r: Row): Record<string, unknown> => {
      const look = lookOf(byId.get(r.chapter_id ?? ''));
      return {
        id: r.id, titleAr: r.title_ar, titleEn: r.title_en, summary: r.summary_en, kind: r.kind, depth: r.depth,
        pages: n.get(r.id) ?? 0, accent: look.accent, authored: !!r.authored,
        cover: media(r.cover_key),
        // the written book: read as pages
        tellings: [],
        themes: parse<string[]>(r.themes_json, []).map(chip).filter(Boolean),
        children: rows.filter((c) => c.parent_id === r.id).flatMap(both),
      };
    };
    // the animated version beside it, when the story is filmed: the languages it is told in, its chip first
    const animated = (r: Row) => {
      const langs = languagesOf(toldIn.get(r.id) ?? [], all.storybook_lang);
      if (!langs.length) return [];
      const x = node(r);
      return [{ ...x, id: r.id + ANIMATED, kind: 'animated', tellings: langs, children: [],
                themes: [animChip, ...(x.themes as unknown[])] }];
    };
    const both = (r: Row) => [node(r), ...animated(r)];
    const chapters = rows.filter((r) => r.kind === 'bab').map((c) => {
      const look = lookOf(c);
      return { id: c.id, titleAr: c.title_ar, titleEn: c.title_en, ...look,
               stories: rows.filter((r) => r.parent_id === c.id).flatMap(both) };
    });
    // a theme lists every story that names it, flat, in book order
    const flat = (r: Row) => both(r).map((x) => { delete x.children; return x; });
    const themes = (all.storybook_theme ?? []).map((t) => ({
      ...chip(t.key)!,
      stories: rows.filter((r) => r.kind !== 'bab' && parse<string[]>(r.themes_json, []).includes(t.key)).flatMap(flat),
    })).filter((t) => t.stories.length);
    return ok({ work, words: W, chapters, themes });
  });

  router.get('/ar/text/storybooks/:id', async (req, env, params) => {
    const asked = decodeURIComponent(params.id);
    // the animated version plays the film; the plain id is the written book, read as pages
    const isAnimated = asked.endsWith(ANIMATED);
    const id = isAnimated ? asked.slice(0, -ANIMATED.length) : asked;
    const want = new URL(req.url).searchParams.get('lang');
    const story = await queryOne<Row>(env.DB_AR,
      `SELECT id, acq_ref_id, parent_id, chapter_id, kind, depth, seq, title_ar, title_en, summary_en, themes_json, look_json,
              audio_key, audio_seconds, cover_key, remember_json, authored
         FROM ar_storybook WHERE id = ? AND status = 'live'`, [id]).catch(softFail(null as Row | null, 'ar_storybook'));
    if (!story || story.kind === 'bab') return notFound(`story ${asked}`);
    const [pages, chapter, parent, all, siblings, tellings] = await Promise.all([
      query<PageRow>(env.DB_AR,
        `SELECT no, kind, link_id, text_ar, text_en, words_json, start_sec, end_sec, rec_key, rec_start, rec_end, picture_key, placeholder,
                lines_json, sound_json
           FROM ar_storybook_page WHERE story_id = ? ORDER BY no`, [id]),
      queryOne<Row>(env.DB_AR, `SELECT * FROM ar_storybook WHERE id = ?`, [story.chapter_id ?? '']),
      story.parent_id ? queryOne<Row>(env.DB_AR, `SELECT * FROM ar_storybook WHERE id = ?`, [story.parent_id]) : Promise.resolve(null),
      labels(env),
      query<{ id: string; title_ar: string; title_en: string | null }>(env.DB_AR,
        `SELECT id, title_ar, title_en FROM ar_storybook WHERE acq_ref_id = ? AND status = 'live' AND kind <> 'bab' AND seq > ?
          ORDER BY seq LIMIT 1`, [story.acq_ref_id, story.seq]),
      isAnimated ? tellingsOf(env, id) : Promise.resolve([] as TellingRow[]),
    ]);
    // the telling asked for; without ?lang=, the first the story has in the labels' order (Arabic first)
    const langs = languagesOf(tellings.map((t) => t.lang), all.storybook_lang);
    if (want && !tellings.some((t) => t.lang === want)) return notFound(`telling ${id} in ${want}`);
    if (isAnimated && !tellings.length) return notFound(`animated ${id}`);
    const told = tellings.find((t) => t.lang === (want ?? langs[0]?.key));
    const links = pages.filter((p) => p.link_id).map((p) => p.link_id!);
    const linked = links.length
      ? await query<{ id: string; title_ar: string; title_en: string | null; cover_key: string | null }>(env.DB_AR,
          `SELECT id, title_ar, title_en, cover_key FROM ar_storybook WHERE id IN (${links.map(() => '?').join(',')})`, links)
      : [];
    // the sounds the pages name, as URLs: ambience under the page (with its scene-in swell), spots on their words
    const cues = pages.map((p) => parse<Cue>(p.sound_json, {}));
    const rem0 = parse<Record<string, any>>(story.remember_json, {});
    const ids = [...new Set([...cues, rem0.sound ?? {}].flatMap((c: Cue) => [c.ambience?.id, ...(c.spots ?? []).map((s) => s.id)])
      .filter((x): x is string => !!x))];
    const lib = ids.length
      ? await query<Sfx>(env.DB_AR, `SELECT id, object_key, scene_in_key, loopable FROM ar_sfx WHERE id IN (${ids.map(() => '?').join(',')})`, ids)
          .catch(softFail([] as Sfx[], 'ar_sfx'))
      : [];
    const sfx = new Map(lib.map((x) => [x.id, x]));
    const sound = (c: Cue) => {
      const a = c.ambience && sfx.get(c.ambience.id);
      return {
        ambience: a ? { id: a.id, url: media(a.object_key), sceneIn: c.ambience!.scene_in ? media(a.scene_in_key) : null,
                        gainDb: c.ambience!.gain_db ?? -22 } : null,
        spots: (c.spots ?? []).filter((s) => sfx.has(s.id))
          .map((s) => ({ id: s.id, url: media(sfx.get(s.id)!.object_key), word: s.word ?? null, at: s.at ?? null, gainDb: s.gain_db ?? -12 })),
      };
    };
    const lineAudio = (a: { key?: string; start?: number; end?: number } | null | undefined) =>
      a?.key ? { url: media(a.key), start: a.start ?? null, end: a.end ?? null } : null;
    const L = byKey(all.storybook);
    const look = lookOf(chapter ?? undefined);
    const chip = themeChip(byKey(all.storybook_theme));
    const rem = parse<Record<string, any>>(story.remember_json, {});
    const total = pages.length + 1;
    return ok({
      id: asked, titleAr: story.title_ar, titleEn: story.title_en, summary: story.summary_en, authored: !!story.authored,
      chapter: chapter ? { id: chapter.id, titleAr: chapter.title_ar, titleEn: chapter.title_en } : null,
      inside: parent && parent.kind !== 'bab' ? { id: parent.id, titleAr: parent.title_ar, titleEn: parent.title_en } : null,
      look, themes: parse<string[]>(story.themes_json, []).map(chip).filter(Boolean),
      words: words(L),
      audio: story.audio_key ? { url: media(story.audio_key), seconds: story.audio_seconds } : null,
      pages: pages.map((p) => {
        const l = p.link_id ? linked.find((x) => x.id === p.link_id) : undefined;
        return {
          no: p.no, of: total, kind: p.kind, picture: media(p.picture_key), placeholder: !!p.placeholder,
          textAr: p.text_ar, textEn: p.text_en,
          words: parse<Array<{ t: string; s: number; e: number }>>(p.words_json, []),
          start: p.start_sec, end: p.end_sec,
          recording: p.rec_key ? { url: media(p.rec_key), start: p.rec_start, end: p.rec_end } : null,
          link: l ? { id: l.id, titleAr: l.title_ar, titleEn: l.title_en, cover: media(l.cover_key) } : null,
          lines: parse<Array<Record<string, any>>>(p.lines_json, []).map((x) => ({
            speaker: x.speaker, name: x.name ?? null, text: x.text, from: x.from, to: x.to, guess: !!x.guess, audio: lineAudio(x.audio),
          })),
          sound: sound(cues[pages.indexOf(p)]),
        };
      }),
      remember: {
        no: total, of: total, title: rem.title_en ?? word(L.get('remember'), 'Remember').text,
        speaker: rem.speaker_en ?? null, moralAr: rem.moral_ar ?? null, moralEn: rem.moral_en ?? null, lesson: rem.lesson_en ?? null,
        words: rem.words ?? [], start: rem.start ?? null, end: rem.end ?? null, sound: sound(rem.sound ?? {}),
        checks: (rem.checks ?? []).map((c: Record<string, unknown>, i: number) => ({
          id: `${story.id}:c${i + 1}`, prompt: c.prompt_en, promptAr: c.prompt_ar ?? null, options: c.options ?? [],
          answer: c.answer, answerNote: c.answer_en ?? null,
        })),
      },
      next: siblings[0] ? { id: siblings[0].id, titleAr: siblings[0].title_ar, titleEn: siblings[0].title_en } : null,
      tellings: langs,
      telling: told ? tellingOf(told, all.storybook_lang, byKey(all.storybook_grid), L) : null,
    });
  });
}
