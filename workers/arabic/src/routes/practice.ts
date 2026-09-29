import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';
import { labels, skillCard, instruct } from '../lib/labels';
import { commonWords, isCommon } from '../lib/common';
import { parseBand, bandOf, bare, type Band } from '../lib/levels';
import { mineDrills } from './words';

// ── Practice: skills drilled on real Arabic ──────────────────────────────────
// Every listening drill is cut from a line someone actually said — in a series,
// a podcast, a story, a reading — with every word timed (ar_practice_pool), so
// the app can play the line, or one word of it, from the recording itself.
// The worker builds each drill whole (the blank, the options, the order); the
// app only plays and checks. A session is drawn fresh each time, so it is never
// kept; the skill list is.

// the skills are data: ar_practice_label scope 'skill' (lib/labels.ts)

interface Line {
  id: string; band: string; level: string | null; work_id: string | null; work_title: string | null;
  object_key: string; start_sec: number; end_sec: number; text_ar: string; words_json: string; word_count: number;
  text_en: string | null; gloss_json: string | null;
}

const audioUrl = (key: string) => `/api/ar/audio/${encodeURI(key)}`;
const shuffle = <T,>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/// Random lines at a level — translated ones first, so the meaning can be shown.
async function drawLines(env: ArabicEnv, band: Band, n: number, translated = true): Promise<Line[]> {
  const start = Math.floor(Math.random() * 1e9);
  const where = (band === 'all' ? '' : 'band = ? AND ') + (translated ? 'text_en IS NOT NULL AND' : '');
  const args = band === 'all' ? [] : [band];
  let rows = await query<Line>(env.DB_AR, `SELECT * FROM ar_practice_pool WHERE ${where} rnd >= ? ORDER BY rnd LIMIT ?`, [...args, start, n]);
  if (rows.length < n) rows = rows.concat(await query<Line>(env.DB_AR,
    `SELECT * FROM ar_practice_pool WHERE ${where} rnd >= 0 ORDER BY rnd LIMIT ?`, [...args, n - rows.length]));
  if (translated && rows.length < n) {
    const seen = new Set(rows.map((r) => r.id));
    rows = rows.concat((await drawLines(env, band, n - rows.length + 4, false)).filter((r) => !seen.has(r.id)).slice(0, n - rows.length));
  }
  return rows;
}

const glossesOf = (l: { gloss_json: string | null }) => { try { return l.gloss_json ? JSON.parse(l.gloss_json) as string[] : null; } catch { return null; } };

function wordsOf(l: Line) {
  let times: Array<[number, number]> = [];
  try { times = JSON.parse(l.words_json); } catch { times = []; }
  return l.text_ar.split(/\s+/).map((t, i) => ({ t, s: times[i]?.[0] ?? l.start_sec, e: times[i]?.[1] ?? l.end_sec }));
}

// Words that carry little on their own: never the blank.
// what not to drill is data (ar_common_word): function words at every level, common Qurʾān words above Basic

const shapeOf = (w: string) => { const b = bare(w); return b.startsWith('وال') ? 'وال' : b.startsWith('بال') ? 'بال' : b.startsWith('ال') ? 'ال'
  : b.startsWith('و') ? 'و' : b.startsWith('ب') ? 'ب' : b.startsWith('ل') ? 'ل' : ''; };

/// Words to offer beside the right one, chosen to be confused by ear: the same
/// prefix, a close length, as many shared letters as can be found; none the same.
function distractors(answer: string, pool: string[], k = 3, light: (w: string) => boolean = () => false) {
  const a = bare(answer);
  const letters = new Set(a.replace(/^(وال|بال|ال|و|ب|ل)/, ''));
  const scored = pool
    .filter((w) => { const b = bare(w); return b !== a && b.length >= 2 && !light(w); })
    .map((w) => {
      const b = bare(w);
      const shared = [...new Set(b.replace(/^(وال|بال|ال|و|ب|ل)/, ''))].filter((c) => letters.has(c)).length;
      return { w, score: shared * 2 + (shapeOf(w) === shapeOf(answer) ? 3 : 0) - Math.abs(b.length - a.length) + Math.random() };
    })
    .sort((x, y) => y.score - x.score);
  const out: string[] = [];
  for (const { w } of scored) { if (!out.some((x) => bare(x) === bare(w))) out.push(w); if (out.length === k) break; }
  return out;
}
const clean = (w: string) => w.replace(/[؟،؛.!?"«»:…,()]/g, '');
/// Options shown bare, so the vowel marks of the right one do not give it away.
const shown = (w: string) => bare(clean(w));

async function lineDrills(env: ArabicEnv, skill: string, band: Band, n: number) {
  const common = await commonWords(env);
  const light = (w: string) => isCommon(common, w, band === 'basic');
  // more lines than asked: a line with no word worth drilling is passed over
  const lines = await drawLines(env, band, skill === 'fill' || skill === 'hear' ? n * 3 : n);
  const others = await drawLines(env, band, 24, false);
  const drillLines = lines;
  const pool = [...new Set(others.flatMap((l) => l.text_ar.split(/\s+/).map(clean)).filter((w) => bare(w).length >= 2))];
  return drillLines.map((l) => {
    const words = wordsOf(l);
    const audio = { url: audioUrl(l.object_key), start: l.start_sec, end: l.end_sec };
    const source = { workId: l.work_id, title: l.work_title, level: l.level };
    // the meaning, for the learner to reveal: the sentence, and a gloss per word
    const base = { id: `${skill}:${l.id}`, kind: skill, audio, words: words.map((w) => ({ ...w, t: w.t })), source,
                   en: l.text_en, glosses: glossesOf(l) };
    if (skill === 'fill' || skill === 'hear') {
      // a content word, long enough to hear, clearly timed — the lightest words never
      const content = words.map((w, i) => ({ w, i }))
        .filter(({ w }) => bare(w.t).length >= 3 && !light(w.t) && w.e - w.s >= 0.22);
      if (!content.length) return null;
      const pick = content[Math.floor(Math.random() * content.length)];
      const answer = shown(pick.w.t);
      const options = shuffle([answer, ...distractors(answer, pool, 3, light).map(shown)]);
      return skill === 'fill'
        ? { ...base, blank: pick.i, answer, options }
        : { ...base, audio: { ...audio, start: Math.max(l.start_sec, pick.w.s - 0.04), end: Math.min(l.end_sec, pick.w.e + 0.06) },
            target: pick.i, answer, options, line: audio };
    }
    if (skill === 'order') {
      const order = words.map((_, i) => i);
      let shuffled = shuffle(order);
      for (let k = 0; k < 4 && shuffled.every((v, i) => v === i); k++) shuffled = shuffle(order);
      return { ...base, shuffled };
    }
    return base;   // shadow: the line and its timings
  }).filter(Boolean).slice(0, n);
}

async function wordDrills(env: ArabicEnv, band: Band, n: number) {
  const daily = await query<{ id: string; singular_ar: string; plural_ar: string; gloss_en: string; gender: string }>(env.DB_AR,
    `SELECT id, singular_ar, plural_ar, gloss_en, gender FROM ar_daily_word`);
  const mined = await query<{ id: string; text_ar: string; vocalised_ar: string | null; gloss_en: string; register: string | null }>(env.DB_AR,
    `SELECT id, text_ar, vocalised_ar, gloss_en, register FROM ar_acq_item WHERE gloss_en IS NOT NULL AND status = 'live'`);
  const all = [
    ...daily.map((d) => ({ id: d.id, word: d.singular_ar, gloss: d.gloss_en, band: 'basic' })),
    ...mined.map((m) => ({ id: m.id, word: m.vocalised_ar ?? m.text_ar, gloss: m.gloss_en,
                            band: m.register === 'fusha_turath' ? 'advanced' : 'middle' })),
  ];
  // never a function word; above Basic, never a word the Qurʾān or the corpus makes common
  const common = await commonWords(env);
  const mine = all.filter((w) => (band === 'all' || w.band === band) && !isCommon(common, w.word, band === 'basic'));
  const glosses = [...new Set(all.map((w) => w.gloss))];
  return shuffle(mine).slice(0, n).map((w) => ({
    id: `meaning:${w.id}`, kind: 'meaning', prompt: w.word, answer: w.gloss,
    options: shuffle([w.gloss, ...shuffle(glosses.filter((g) => g !== w.gloss)).slice(0, 3)]),
  }));
}

const PLURAL_KIND: Record<string, { en: string; ar: string }> = {
  taksir: { en: 'broken plural', ar: 'جمع تكسير' },
  salim_m: { en: 'sound masculine plural', ar: 'جمع مذكر سالم' },
  salim_f: { en: 'sound feminine plural', ar: 'جمع مؤنث سالم' },
};

async function pluralDrills(env: ArabicEnv, band: Band, n: number) {
  if (band !== 'all' && band !== 'basic') return [];
  const rows = await query<{ id: string; singular_ar: string; plural_ar: string; gloss_en: string; plural_kind: string; pattern_ar: string | null }>(env.DB_AR,
    `SELECT id, singular_ar, plural_ar, gloss_en, plural_kind, pattern_ar FROM ar_daily_word`);
  const plurals = rows.map((r) => r.plural_ar);
  return shuffle(rows).slice(0, n).map((r) => ({
    id: `plural:${r.id}`, kind: 'plural', prompt: r.singular_ar, gloss: r.gloss_en, answer: r.plural_ar,
    options: shuffle([r.plural_ar, ...distractors(r.plural_ar, plurals)]),
    note: PLURAL_KIND[r.plural_kind] ?? null, pattern: r.pattern_ar,
  }));
}

async function grammarDrills(env: ArabicEnv, band: Band, n: number) {
  const rows = await query<{ id: string; prompt_ar: string; prompt_en: string | null; options_json: string; answer_json: string; explanation_md: string | null; level: string | null }>(env.DB_AR,
    `SELECT id, prompt_ar, prompt_en, options_json, answer_json, explanation_md, level FROM ar_exercises WHERE exercise_type = 'mcq'`);
  return shuffle(rows.filter((r) => band === 'all' || bandOf(r.level) === band)).slice(0, n).flatMap((r) => {
    try {
      const options = JSON.parse(r.options_json) as string[];
      const correct = (JSON.parse(r.answer_json) as { correct: number }).correct;
      return [{ id: `grammar:${r.id}`, kind: 'grammar', prompt: r.prompt_ar, promptEn: r.prompt_en,
                options, answer: options[correct], explanation: r.explanation_md, level: r.level }];
    } catch { return []; }
  });
}

async function counts(env: ArabicEnv, band: Band) {
  const [pool, daily, mined, grammar, mine] = await Promise.all([
    query<{ band: string; n: number }>(env.DB_AR, `SELECT band, COUNT(*) AS n FROM ar_practice_pool GROUP BY band`),
    query<{ n: number }>(env.DB_AR, `SELECT COUNT(*) AS n FROM ar_daily_word`),
    query<{ register: string | null; n: number }>(env.DB_AR,
      `SELECT register, COUNT(*) AS n FROM ar_acq_item WHERE gloss_en IS NOT NULL AND status = 'live' GROUP BY register`),
    query<{ level: string | null; n: number }>(env.DB_AR, `SELECT level, COUNT(*) AS n FROM ar_exercises WHERE exercise_type = 'mcq' GROUP BY level`),
    query<{ n: number }>(env.DB_AR, `SELECT COUNT(*) AS n FROM ar_acq_item WHERE status = 'live' AND root_ar IS NOT NULL AND capture_id IS NOT NULL`),
  ]);
  const lines = pool.filter((p) => band === 'all' || p.band === band).reduce((s, p) => s + p.n, 0);
  const basicOk = band === 'all' || band === 'basic';
  const minedN = mined.filter((m) => band === 'all' || (m.register === 'fusha_turath' ? 'advanced' : 'middle') === band)
    .reduce((s, m) => s + m.n, 0);
  return {
    lines, words: (basicOk ? daily[0]?.n ?? 0 : 0) + minedN, plurals: basicOk ? daily[0]?.n ?? 0 : 0,
    grammar: grammar.filter((g) => band === 'all' || bandOf(g.level) === band).reduce((s, g) => s + g.n, 0),
    mine: mine[0]?.n ?? 0,   // the reader's own words, at every level
  };
}

export function practiceRoutes(router: Router<ArabicEnv>) {
  // The skills, and how much there is to drill in each at this level.
  router.get('/ar/practice/home', async (req, env) => {
    const band = parseBand(new URL(req.url).searchParams.get('level'));
    const [c, all] = await Promise.all([counts(env, band), labels(env)]);
    return ok({
      level: band,
      skills: (all.skill ?? []).map((s) => ({ ...skillCard(s), count: c[(s.extra?.source as keyof typeof c) ?? 'lines'] ?? 0 }))
        .filter((s) => s.count > 0),
      // scene practice, where the level has scripted episodes (Middle, Advanced)
      scenes: (all.scene_skill ?? []).find((x) => x.key === 'shelf')
        ? skillCard((all.scene_skill ?? []).find((x) => x.key === 'shelf')!) : null,
    });
  });

  // A session: n drills of one skill, drawn fresh.
  router.get('/ar/practice/session', async (req, env) => {
    const url = new URL(req.url);
    const band = parseBand(url.searchParams.get('level'));
    const skill = url.searchParams.get('skill') ?? '';
    const n = Math.min(20, Math.max(3, Number(url.searchParams.get('n') ?? 8)));
    const all = await labels(env);
    const row = (all.skill ?? []).find((s) => s.key === skill);
    if (!row) return badRequest(`unknown skill ${skill}`);
    const meta = skillCard(row);
    const items = row.extra?.source === 'lines' ? await lineDrills(env, skill, band, n)
      : skill === 'mine' ? await mineDrills(env, n)
      : skill === 'meaning' ? await wordDrills(env, band, n)
      : skill === 'plural' ? await pluralDrills(env, band, n)
      : await grammarDrills(env, band, n);
    const res = ok({ skill: meta, level: band, items: instruct(items as Array<{ kind: string }>, all) });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  });
}
