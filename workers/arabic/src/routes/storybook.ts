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

const GOLD = '#C9A84C';
const media = (key: string | null) => (key ? `/api/ar/audio/${encodeURI(key)}` : null);
const parse = <T>(j: string | null | undefined, d: T): T => { try { return j ? (JSON.parse(j) as T) : d; } catch { return d; } };
const lookOf = (r: Row | undefined): Look => {
  const l = parse<Partial<Look>>(r?.look_json, {});
  return { accent: l.accent ?? GOLD, gradient: l.gradient ?? ['#141414', '#0B0B0B'], motif: l.motif ?? null };
};
const word = (l: Label | undefined, fallback: string) => ({ text: l?.label ?? fallback, ar: l?.labelAr ?? null, icon: l?.icon ?? null,
                                                         detail: l?.detail ?? null, color: l?.color ?? null });

/// The words of the book's screens, one object, from its label rows.
function words(L: Map<string, Label>) {
  const k = (key: string, fb: string) => word(L.get(key), fb);
  return {
    entry: k('entry', 'Read as a story book'), byChapter: k('by_chapter', 'By chapter'), byTheme: k('by_theme', 'By theme'),
    english: k('english', 'English'), remember: k('remember', 'Remember'), checks: k('checks', 'Check yourself'),
    right: k('right', 'Right'), wrong: k('wrong', 'Not quite'), again: k('again', 'Read it again'), next: k('next', 'Next story'),
    inside: k('inside', 'A story told here'), open: k('open', 'Open the story'), pages: k('pages', 'pages'),
    notYet: k('not_yet', 'Arabic not yet vowelled'), sound: k('sound', 'Sound'),
    readMode: k('read_mode', 'Read'), storyMode: k('story_mode', 'Story'),
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
    const [rows, counts, all] = await Promise.all([rowsOf(env, work), pageCounts(env, work), labels(env)]);
    if (!rows.length) return notFound(`story book of ${work}`);
    const n = new Map(counts.map((c) => [c.story_id, c.n]));
    const byId = new Map(rows.map((r) => [r.id, r]));
    const chip = themeChip(byKey(all.storybook_theme));
    const node = (r: Row): Record<string, unknown> => {
      const look = lookOf(byId.get(r.chapter_id ?? ''));
      return {
        id: r.id, titleAr: r.title_ar, titleEn: r.title_en, summary: r.summary_en, kind: r.kind, depth: r.depth,
        pages: n.get(r.id) ?? 0, cover: media(r.cover_key), accent: look.accent, authored: !!r.authored,
        themes: parse<string[]>(r.themes_json, []).map(chip).filter(Boolean),
        children: rows.filter((c) => c.parent_id === r.id).map(node),
      };
    };
    const chapters = rows.filter((r) => r.kind === 'bab').map((c) => {
      const look = lookOf(c);
      return { id: c.id, titleAr: c.title_ar, titleEn: c.title_en, ...look,
               stories: rows.filter((r) => r.parent_id === c.id).map(node) };
    });
    // a theme lists every story that names it, flat, in book order
    const flat = (r: Row) => { const x = node(r); delete x.children; return x; };
    const themes = (all.storybook_theme ?? []).map((t) => ({
      ...chip(t.key)!,
      stories: rows.filter((r) => r.kind !== 'bab' && parse<string[]>(r.themes_json, []).includes(t.key)).map(flat),
    })).filter((t) => t.stories.length);
    return ok({ work, words: words(byKey(all.storybook)), chapters, themes });
  });

  router.get('/ar/text/storybooks/:id', async (_req, env, params) => {
    const id = decodeURIComponent(params.id);
    const story = await queryOne<Row>(env.DB_AR,
      `SELECT id, acq_ref_id, parent_id, chapter_id, kind, depth, seq, title_ar, title_en, summary_en, themes_json, look_json,
              audio_key, audio_seconds, cover_key, remember_json, authored
         FROM ar_storybook WHERE id = ? AND status = 'live'`, [id]).catch(softFail(null as Row | null, 'ar_storybook'));
    if (!story || story.kind === 'bab') return notFound(`story ${id}`);
    const [pages, chapter, parent, all, siblings] = await Promise.all([
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
    ]);
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
      id: story.id, titleAr: story.title_ar, titleEn: story.title_en, summary: story.summary_en, authored: !!story.authored,
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
    });
  });
}
