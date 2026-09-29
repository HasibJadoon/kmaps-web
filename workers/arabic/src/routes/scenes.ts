import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';
import { parseBand, bare, type Band } from '../lib/levels';

// ── Scenes: watch, then practise in context ──────────────────────────────────
// The scripted episodes (ar_text_unit.script_json: scenes of lines, each with
// its speaker, Arabic, English, and every word timed on the episode's own
// recording) at Middle and Advanced. A scene is watched line by line; then it
// is practised — the hard words of that scene only, in the lines they were
// said: listen and fill, who said it, what it means, the dialogue back in
// order, and — where the scene has been read for it (ar_scene_vocab) — a word's
// meaning in this context and the gist of what happened.

interface Line { speaker?: string; ar: string; en?: string; start: number; end: number; w?: Array<[number, number]>; note?: string }
interface Scene { scene_no: number; title_ar?: string; title_en?: string; icon?: string; era?: string; summary_en?: string;
                  lines: Line[]; start?: number; end?: number }
interface Script { title_ar?: string; title_en?: string; series_ar?: string; series_en?: string; episode?: number;
                   cast?: Array<{ name_ar: string; name_en?: string; role_en?: string; icon?: string }>; scenes: Scene[] }

const LEVELS: Record<Exclude<Band, 'all'>, string[]> = { basic: ['A1', 'A2'], middle: ['B1', 'B2'], advanced: ['C1', 'C2'] };
const levelsOf = (band: Band) => band === 'all' ? ['B1', 'B2', 'C1', 'C2'] : band === 'basic' ? [] : LEVELS[band];

interface EpisodeRow { unit: string; work: string; level: string; title: string | null; episode: number | null;
                       series: string | null; scenes: number; audio: string | null }

async function episodes(env: ArabicEnv, band: Band) {
  const lv = levelsOf(band);
  if (!lv.length) return [];
  return query<EpisodeRow>(env.DB_AR,
    `SELECT t.id AS unit, r.id AS work, r.level, COALESCE(json_extract(t.script_json, '$.title_ar'), r.title_ar) AS title,
            json_extract(t.script_json, '$.episode') AS episode,
            COALESCE(json_extract(t.script_json, '$.series_ar'), pc.name_ar, pe.name) AS series,
            json_array_length(json_extract(t.script_json, '$.scenes')) AS scenes,
            (SELECT a.object_key FROM ar_acq_audio a WHERE a.acq_ref_id = r.id AND a.status = 'live'
               AND a.object_key NOT LIKE 'youtube:%' LIMIT 1) AS audio
       FROM ar_text_unit t
       JOIN ar_acquisition_ref r ON r.id = t.acq_ref_id AND r.level IN (${lv.map(() => '?').join(',')})
       LEFT JOIN ar_acq_entry e ON e.ar_no = json_extract(r.meta_json, '$.ar_no')
       LEFT JOIN ar_acq_entry pe ON pe.ar_no = e.parent_ar_no
       LEFT JOIN ar_acq_category pc ON pc.id = pe.ar_no
      WHERE t.script_json IS NOT NULL AND json_valid(t.script_json)
      ORDER BY series, episode`, lv);
}

async function script(env: ArabicEnv, unit: string) {
  const row = await queryOne<{ script_json: string; work: string; level: string; audio: string | null }>(env.DB_AR,
    `SELECT t.script_json, r.id AS work, r.level,
            (SELECT a.object_key FROM ar_acq_audio a WHERE a.acq_ref_id = r.id AND a.status = 'live'
               AND a.object_key NOT LIKE 'youtube:%' LIMIT 1) AS audio
       FROM ar_text_unit t JOIN ar_acquisition_ref r ON r.id = t.acq_ref_id
      WHERE t.id = ? AND t.script_json IS NOT NULL`, [unit]);
  if (!row) return null;
  try { return { s: JSON.parse(row.script_json) as Script, work: row.work, level: row.level, audio: row.audio }; } catch { return null; }
}

const audioUrl = (key: string | null) => (key ? `/api/ar/audio/${encodeURI(key)}` : null);
const shuffle = <T,>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clean = (w: string) => w.replace(/[؟،؛.!?"«»:…,()\[\]]/g, '');
const stem = (w: string) => bare(w).replace(/^(وال|فال|بال|كال|لل|ال|و|ف|ب|ل)/, '');
const LIGHT = new Set(['قال', 'قالت', 'قد', 'لقد', 'لا', 'ما', 'من', 'في', 'على', 'إلى', 'عن', 'أن', 'إن', 'هذا', 'هذه', 'ذلك', 'التي',
  'الذي', 'الذين', 'كان', 'كانت', 'هو', 'هي', 'هم', 'ثم', 'أو', 'يا', 'لم', 'لن', 'كل', 'حتى', 'إذا', 'لكن', 'بل', 'مع', 'بين', 'عند',
  'كما', 'أي', 'إلا', 'هل', 'نعم', 'أنا', 'أنت', 'نحن', 'الله', 'رسول', 'أمير', 'المؤمنين', 'يا']);

function timedWords(l: Line) {
  const toks = l.ar.trim().split(/\s+/);
  const timed = (l.w ?? []).length === toks.length;
  return toks.map((t, i) => ({ t, s: timed ? l.w![i][0] : l.start, e: timed ? l.w![i][1] : l.end }));
}

/// The scene's hard words: long, not among the lightest, and rare in the episode.
function hardWords(sc: Scene, ep: Script) {
  const freq = new Map<string, number>();
  for (const s of ep.scenes) for (const l of s.lines) for (const t of l.ar.split(/\s+/)) {
    const k = stem(t); if (k) freq.set(k, (freq.get(k) ?? 0) + 1);
  }
  const out: Array<{ line: number; index: number; word: string; rarity: number }> = [];
  sc.lines.forEach((l, li) => {
    timedWords(l).forEach((w, wi) => {
      const k = stem(w.t);
      if (k.length < 4 || LIGHT.has(bare(clean(w.t))) || w.e - w.s < 0.25) return;
      const f = freq.get(k) ?? 0;
      if (f <= 2) out.push({ line: li, index: wi, word: clean(w.t), rarity: f + (k.length >= 6 ? -0.5 : 0) });
    });
  });
  return out.sort((a, b) => a.rarity - b.rarity);
}

export function sceneRoutes(router: Router<ArabicEnv>) {
  // The scripted series at a level (Middle / Advanced), with episodes and scenes.
  router.get('/ar/scenes', async (req, env) => {
    const band = parseBand(new URL(req.url).searchParams.get('level'));
    const eps = await episodes(env, band);
    const series = new Map<string, { series: string; level: string; episodes: EpisodeRow[] }>();
    for (const e of eps) {
      const k = e.series ?? e.title ?? e.unit;
      const s = series.get(k) ?? { series: k, level: e.level, episodes: [] };
      s.episodes.push(e); series.set(k, s);
    }
    return ok({
      level: band,
      series: [...series.values()].map((s) => ({
        series: s.series, level: s.level, episodes: s.episodes.length, scenes: s.episodes.reduce((n, e) => n + (e.scenes ?? 0), 0),
        list: s.episodes.map((e) => ({ unit: e.unit, work: e.work, title: e.title, episode: e.episode, scenes: e.scenes, hasAudio: !!e.audio })),
      })),
    });
  });

  // One episode: its cast and its scenes (title, summary, how many lines).
  router.get('/ar/scenes/:unit', async (_req, env, { unit }) => {
    const sc = await script(env, unit);
    if (!sc) return notFound(`scenes of ${unit}`);
    const { s } = sc;
    return ok({
      unit, work: sc.work, level: sc.level, title: s.title_ar, titleEn: s.title_en, series: s.series_ar, seriesEn: s.series_en,
      episode: s.episode, audio: audioUrl(sc.audio), cast: s.cast ?? [],
      scenes: s.scenes.map((x) => ({ no: x.scene_no, title: x.title_ar, titleEn: x.title_en, icon: x.icon, era: x.era,
                                     summary: x.summary_en, lines: x.lines.length, start: x.start ?? x.lines[0]?.start,
                                     end: x.end ?? x.lines[x.lines.length - 1]?.end })),
    });
  });

  // One scene, to watch: every line with its speaker, English and timings.
  router.get('/ar/scenes/:unit/:no', async (_req, env, { unit, no }) => {
    const sc = await script(env, unit);
    const scene = sc?.s.scenes.find((x) => String(x.scene_no) === no);
    if (!sc || !scene) return notFound(`scene ${no} of ${unit}`);
    const url = audioUrl(sc.audio);
    const speakers = new Set(scene.lines.map((l) => l.speaker).filter(Boolean));
    return ok({
      unit, no: scene.scene_no, title: scene.title_ar, titleEn: scene.title_en, summary: scene.summary_en, era: scene.era,
      audio: url, cast: (sc.s.cast ?? []).filter((c) => speakers.has(c.name_ar)),
      lines: scene.lines.map((l) => ({ speaker: l.speaker ?? null, ar: l.ar, en: l.en ?? null, note: l.note ?? null,
                                       clip: url ? { url, start: l.start, end: l.end } : null, words: timedWords(l) })),
    });
  });

  // A practice round on one scene: its hard words and its dialogue, drawn fresh.
  router.get('/ar/scenes/:unit/:no/practice', async (_req, env, { unit, no }) => {
    const sc = await script(env, unit);
    const scene = sc?.s.scenes.find((x) => String(x.scene_no) === no);
    if (!sc || !scene) return notFound(`scene ${no} of ${unit}`);
    const url = audioUrl(sc.audio);
    if (!url) return badRequest('this episode has no recording to practise with');
    const clip = (l: Line) => ({ url, start: l.start, end: l.end });
    const lines = scene.lines.filter((l) => l.ar && l.end > l.start);
    const items: unknown[] = [];
    const source = { workId: sc.work, title: `${sc.s.series_ar ?? ''} · ${scene.title_ar ?? ''}`.trim(), level: sc.level };

    // the scene's hard words, heard and filled — options from the episode's other hard words, confusable by ear
    const hard = hardWords(scene, sc.s);
    const epHard = sc.s.scenes.flatMap((x) => hardWords(x, sc.s)).map((h) => h.word);
    const usedLines = new Set<number>();
    for (const h of hard) {
      if (items.length >= 3) break;
      if (usedLines.has(h.line)) continue;
      usedLines.add(h.line);
      const l = scene.lines[h.line];
      const a = bare(h.word);
      const letters = new Set(stem(h.word));
      const opts = shuffle(epHard.filter((w) => bare(w) !== a))
        .map((w) => ({ w, s: [...new Set(stem(w))].filter((c) => letters.has(c)).length * 2 - Math.abs(bare(w).length - a.length) + Math.random() }))
        .sort((x, y) => y.s - x.s).map((x) => bare(x.w))
        .filter((w, i, arr) => arr.indexOf(w) === i).slice(0, 3);
      items.push({ id: `fill:${unit}:${no}:${h.line}`, kind: 'fill', audio: clip(l), words: timedWords(l), blank: h.index,
                   answer: a, options: shuffle([a, ...opts]), en: l.en ?? null, source });
    }

    // who said it — where the scene has more than one voice
    const named = lines.filter((l) => l.speaker);
    const voices = [...new Set(named.map((l) => l.speaker!))];
    const allVoices = [...new Set(sc.s.scenes.flatMap((x) => x.lines.map((l) => l.speaker).filter(Boolean) as string[]))];
    if (voices.length >= 2) {
      for (const l of shuffle(named).slice(0, 2)) {
        const others = shuffle([...voices, ...allVoices].filter((v) => v !== l.speaker)).filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 3);
        items.push({ id: `speaker:${unit}:${no}:${l.start}`, kind: 'speaker', audio: clip(l), words: timedWords(l),
                     prompt: 'Who says this?', answer: l.speaker, options: shuffle([l.speaker!, ...others]), en: l.en ?? null, source });
      }
    }

    // what it means — the line's English among the scene's (and episode's) other lines
    const withEn = lines.filter((l) => l.en && l.ar.split(/\s+/).length >= 4);
    const epEn = sc.s.scenes.flatMap((x) => x.lines.map((l) => l.en).filter(Boolean) as string[]);
    for (const l of shuffle(withEn).slice(0, 2)) {
      const others = shuffle(epEn.filter((e) => e !== l.en)).slice(0, 3);
      items.push({ id: `match:${unit}:${no}:${l.start}`, kind: 'match', audio: clip(l), words: timedWords(l),
                   answer: l.en, options: shuffle([l.en!, ...others]), en: l.en ?? null, source });
    }

    // the dialogue, back in order — four lines that follow one another
    if (lines.length >= 4) {
      const at = Math.floor(Math.random() * (lines.length - 3));
      const run = lines.slice(at, at + 4);
      const order = run.map((_, i) => i);
      let shuffled = shuffle(order);
      for (let k = 0; k < 4 && shuffled.every((v, i) => v === i); k++) shuffled = shuffle(order);
      items.push({ id: `dialogue:${unit}:${no}:${at}`, kind: 'dialogue',
                   audio: { url, start: run[0].start, end: run[run.length - 1].end },
                   dialogue: run.map((l) => ({ speaker: l.speaker ?? null, ar: l.ar, en: l.en ?? null, clip: clip(l) })),
                   shuffled, source });
    }

    // read for this scene: a hard word's meaning here, and the gist (ar_scene_vocab)
    try {
      const read = await queryOne<{ vocab_json: string | null; gist_json: string | null }>(env.DB_AR,
        `SELECT vocab_json, gist_json FROM ar_scene_vocab WHERE unit_id = ? AND scene_no = ?`, [unit, Number(no)]);
      const vocab = read?.vocab_json ? JSON.parse(read.vocab_json) as Array<{ line: number; word: string; gloss: string; distractors: string[]; note?: string; lemma?: string }> : [];
      for (const v of shuffle(vocab).slice(0, 4)) {
        const l = scene.lines[v.line];
        if (!l) continue;
        const toks = l.ar.trim().split(/\s+/);
        const idx = toks.findIndex((t) => bare(clean(t)) === bare(clean(v.word)));
        items.push({ id: `vocab:${unit}:${no}:${v.line}:${v.word}`, kind: 'vocab', audio: clip(l), words: timedWords(l),
                     target: idx >= 0 ? idx : null, prompt: v.word, answer: v.gloss, options: shuffle([v.gloss, ...(v.distractors ?? []).slice(0, 3)]),
                     explanation: [v.lemma ? `lemma ${v.lemma}` : null, v.note].filter(Boolean).join(' — ') || null,
                     en: l.en ?? null, source });
      }
      const gist = read?.gist_json ? JSON.parse(read.gist_json) as { q: string; options: string[]; answer: number } : null;
      if (gist?.q && gist.options?.length) {
        items.push({ id: `gist:${unit}:${no}`, kind: 'gist', prompt: gist.q, answer: gist.options[gist.answer],
                     options: shuffle(gist.options), en: scene.summary_en ?? null, source });
      }
    } catch { /* not read yet */ }

    const res = ok({ skill: { id: 'scene', title: scene.title_en ?? 'Scene practice', titleAr: scene.title_ar ?? 'المشهد',
                              tagline: 'This scene — its hard words and its dialogue', icon: 'film', color: '#E07A5F' },
                     level: sc.level, items: shuffle(items) });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  });
}
