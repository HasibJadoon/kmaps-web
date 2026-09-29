import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';
import { parseBand, bare, type Band } from '../lib/levels';
import { labels, byKey, badge, skillCard, instruct } from '../lib/labels';
import { commonWords, isCommon } from '../lib/common';

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

/// A scene's title without its number ("Scene 2 — …", "المشهد الثاني — …"): the number is shown on its own.
const titled = (t?: string) => (t ?? '').replace(/^\s*(Scene\s+\d+|المشهد\s+\S+)\s*[—–:-]\s*/u, '').trim() || null;

const range = ([a, b]: [number, number]) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const audioUrl = (key: string | null) => (key ? `/api/ar/audio/${encodeURI(key)}` : null);
const shuffle = <T,>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clean = (w: string) => w.replace(/[؟،؛.!?"«»:…,()\[\]]/g, '');
const stem = (w: string) => bare(w).replace(/^(وال|فال|بال|كال|لل|ال|و|ف|ب|ل)/, '');
// common and function words are data (ar_common_word) — filtered where the drills are built

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
      if (k.length < 4 || w.e - w.s < 0.25) return;
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
    const [eps, L] = await Promise.all([episodes(env, band), labels(env)]);
    const lab = byKey(L.scene_skill);
    const series = new Map<string, { series: string; level: string; episodes: EpisodeRow[] }>();
    for (const e of eps) {
      const k = e.series ?? e.title ?? e.unit;
      const s = series.get(k) ?? { series: k, level: e.level, episodes: [] };
      s.episodes.push(e); series.set(k, s);
    }
    return ok({
      level: band,
      card: lab.get('shelf') ? skillCard(lab.get('shelf')!) : null,
      empty: lab.get('empty') ? skillCard(lab.get('empty')!) : null,
      series: [...series.values()].map((s) => ({
        series: s.series, level: s.level, episodes: s.episodes.length, scenes: s.episodes.reduce((n, e) => n + (e.scenes ?? 0), 0),
        list: s.episodes.map((e) => ({ unit: e.unit, work: e.work, title: e.title, episode: e.episode, scenes: e.scenes, hasAudio: !!e.audio })),
      })),
    });
  });

  // One episode: its cast and its scenes (title, summary, how many lines).
  router.get('/ar/scenes/:unit', async (_req, env, { unit }) => {
    const [sc, L] = await Promise.all([script(env, unit), labels(env)]);
    if (!sc) return notFound(`scenes of ${unit}`);
    const { s } = sc;
    return ok({
      card: byKey(L.scene_skill).get('episode') ? skillCard(byKey(L.scene_skill).get('episode')!) : null,
      practise: byKey(L.scene_skill).get('practise') ? skillCard(byKey(L.scene_skill).get('practise')!) : null,
      unit, work: sc.work, level: sc.level, title: s.title_ar, titleEn: s.title_en, series: s.series_ar, seriesEn: s.series_en,
      episode: s.episode, audio: audioUrl(sc.audio), cast: s.cast ?? [],
      // the practice rounds' difficulty, as the app offers it
      tiers: (L.scene_tier ?? []).map((t) => ({ key: t.key || null, label: t.label, labelAr: t.labelAr, color: t.color ?? '#E07A5F' })),
      scenes: s.scenes.map((x) => ({ no: x.scene_no, title: titled(x.title_ar), titleEn: titled(x.title_en), icon: x.icon, era: x.era,
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
      unit, no: scene.scene_no, title: titled(scene.title_ar), titleEn: titled(scene.title_en), summary: scene.summary_en, era: scene.era,
      audio: url, cast: (sc.s.cast ?? []).filter((c) => speakers.has(c.name_ar)),
      lines: scene.lines.map((l) => ({ speaker: l.speaker ?? null, ar: l.ar, en: l.en ?? null, note: l.note ?? null,
                                       clip: url ? { url, start: l.start, end: l.end } : null, words: timedWords(l) })),
    });
  });

  // A practice round on one scene: its hard words and its dialogue, drawn fresh.
  // ?tier=easy|good|hard keeps the read items (words, idioms, features) of that tier; the listening drills stay
  router.get('/ar/scenes/:unit/:no/practice', async (req, env, { unit, no }) => {
    const tier = new URL(req.url).searchParams.get('tier');
    const inTier = (x: { tier?: string }) => !tier || !x.tier || x.tier === tier;
    const [L, common] = await Promise.all([labels(env), commonWords(env)]);
    const hardOnly = (w: string) => !isCommon(common, w);
    const sc = await script(env, unit);
    const scene = sc?.s.scenes.find((x) => String(x.scene_no) === no);
    if (!sc || !scene) return notFound(`scene ${no} of ${unit}`);
    const url = audioUrl(sc.audio);
    if (!url) return badRequest('this episode has no recording to practise with');
    const clip = (l: Line) => ({ url, start: l.start, end: l.end });
    const lines = scene.lines.filter((l) => l.ar && l.end > l.start);
    const items: unknown[] = [];
    const source = { workId: sc.work, title: [sc.s.series_ar, titled(scene.title_ar)].filter(Boolean).join(' · '), level: sc.level };

    // what the episode's scenes were read for (ar_scene_vocab): the hard words a reader chose, with their meanings
    type Vocab = { line: number; word: string; gloss: string; distractors: string[]; note?: string; lemma?: string; tier?: string };
    const reads = await query<{ scene_no: number; vocab_json: string | null; gist_json: string | null;
                                expressions_json: string | null; features_json: string | null }>(env.DB_AR,
      `SELECT scene_no, vocab_json, gist_json, expressions_json, features_json FROM ar_scene_vocab WHERE unit_id = ?`, [unit]).catch(() => []);
    const parse = <T,>(j: string | null): T | null => { try { return j ? JSON.parse(j) as T : null; } catch { return null; } };
    const read = reads.find((r) => String(r.scene_no) === no);
    // only the higher-end words: never a function word, never one the Qurʾān uses often
    const vocab = (parse<Vocab[]>(read?.vocab_json ?? null) ?? []).filter(inTier).filter((v) => hardOnly(v.word));
    const epVocab = reads.flatMap((r) => parse<Vocab[]>(r.vocab_json) ?? []).map((v) => clean(v.word)).filter(hardOnly);

    // names are not vocabulary
    const names = new Set((sc.s.cast ?? []).flatMap((c) => c.name_ar.split(/\s+/)).map((w) => stem(w)));
    const isName = (w: string) => names.has(stem(w));

    // the scene's hard words, heard and filled — the words a reader chose where there are any, else the rarest;
    // options from the episode's other hard words, confusable by ear
    // a word is asked once a round: its meaning here (up to four), or else heard and filled
    const asked = shuffle(vocab).slice(0, 4);
    const chosen = vocab.filter((v) => !asked.includes(v)).map((v) => {
      const toks = (scene.lines[v.line]?.ar ?? '').trim().split(/\s+/);
      const index = toks.findIndex((t) => bare(clean(t)) === bare(clean(v.word)));
      return index >= 0 ? { line: v.line, index, word: clean(toks[index]), rarity: 0, tier: v.tier } : null;
    }).filter(Boolean) as Array<{ line: number; index: number; word: string; rarity: number; tier?: string }>;
    // with a tier asked for, only the words read at that tier; else the rarest besides
    const hard = [...chosen, ...(tier && vocab.length ? [] : hardWords(scene, sc.s).filter((h) => !isName(h.word) && hardOnly(h.word)))];
    const epHard = [...epVocab, ...sc.s.scenes.flatMap((x) => hardWords(x, sc.s)).map((h) => h.word)].filter((w) => !isName(w) && hardOnly(w));
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
                   answer: a, options: shuffle([a, ...opts]), en: l.en ?? null, source, tier: (h as { tier?: string }).tier ?? null, bucket: 'vocab' });
    }

    // who said it — where the scene has more than one voice
    const named = lines.filter((l) => l.speaker);
    const voices = [...new Set(named.map((l) => l.speaker!))];
    const allVoices = [...new Set(sc.s.scenes.flatMap((x) => x.lines.map((l) => l.speaker).filter(Boolean) as string[]))];
    if (voices.length >= 2) {
      for (const l of shuffle(named).slice(0, 2)) {
        const others = shuffle([...voices, ...allVoices].filter((v) => v !== l.speaker)).filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 3);
        items.push({ id: `speaker:${unit}:${no}:${l.start}`, kind: 'speaker', audio: clip(l), words: timedWords(l),
                     prompt: byKey(L.prompt).get('speaker')?.label ?? null, answer: l.speaker, options: shuffle([l.speaker!, ...others]), en: l.en ?? null, source });
      }
    }

    // what it means — the line's English among the scene's (and episode's) other lines
    const withEn = lines.filter((l) => l.en && l.ar.split(/\s+/).length >= 4);
    const epEn = [...new Set(sc.s.scenes.flatMap((x) => x.lines.map((l) => l.en).filter(Boolean) as string[]))];
    const sceneEn = new Set(lines.map((l) => l.en).filter(Boolean));
    const words = (e: string) => e.split(/\s+/).length;
    for (const l of shuffle(withEn).slice(0, 2)) {
      // the wrong meanings are as long as the right one, and from this scene where they can be
      const n = words(l.en!);
      const others = epEn.filter((e) => e !== l.en)
        .map((e) => ({ e, d: Math.abs(words(e) - n) / n + (sceneEn.has(e) ? 0 : 0.35) + Math.random() * 0.3 }))
        .sort((a, b) => a.d - b.d).slice(0, 3).map((x) => x.e);
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

    // read for this scene: a hard word's meaning here, and the gist
    try {
      for (const v of asked) {
        const l = scene.lines[v.line];
        if (!l) continue;
        const toks = l.ar.trim().split(/\s+/);
        const idx = toks.findIndex((t) => bare(clean(t)) === bare(clean(v.word)));
        items.push({ id: `vocab:${unit}:${no}:${v.line}:${v.word}`, kind: 'vocab', audio: clip(l), words: timedWords(l),
                     target: idx >= 0 ? idx : null, prompt: v.word, answer: v.gloss, options: shuffle([v.gloss, ...(v.distractors ?? []).slice(0, 3)]),
                     explanation: [v.lemma ? `lemma ${v.lemma}` : null, v.note].filter(Boolean).join(' — ') || null,
                     en: l.en ?? null, source, tier: v.tier ?? null, bucket: 'vocab' });
      }
      // its idioms and set expressions: what the phrase means here
      type Expr = { line: number; phrase: string; span: [number, number]; meaning: string; literal?: string; note?: string; distractors: string[]; tier?: string };
      for (const x of shuffle((parse<Expr[]>(read?.expressions_json ?? null) ?? []).filter(inTier)).slice(0, 2)) {
        const l = scene.lines[x.line];
        if (!l) continue;
        items.push({ id: `idiom:${unit}:${no}:${x.line}:${x.span[0]}`, kind: 'idiom', audio: clip(l), words: timedWords(l),
                     span: range(x.span), prompt: x.phrase, answer: x.meaning, options: shuffle([x.meaning, ...x.distractors.slice(0, 3)]),
                     explanation: [x.literal ? `Literally: ${x.literal}` : null, x.note].filter(Boolean).join(' — ') || null,
                     en: l.en ?? null, source, tier: x.tier ?? null, bucket: 'idiom' });
      }
      // what is worth noticing in how a line is built — its grammar or its rhetoric
      type Feat = { line: number; text: string; span: [number, number]; feature: string; term_ar?: string; q: string;
                    options: string[]; answer: number; explanation?: string; tier?: string; bucket?: string };
      for (const x of shuffle((parse<Feat[]>(read?.features_json ?? null) ?? []).filter(inTier)).slice(0, 3)) {
        const l = scene.lines[x.line];
        if (!l) continue;
        items.push({ id: `feature:${unit}:${no}:${x.line}:${x.span[0]}`, kind: 'feature', audio: clip(l), words: timedWords(l),
                     span: range(x.span), prompt: x.q, answer: x.options[x.answer], options: shuffle(x.options),
                     note: { en: x.feature, ar: x.term_ar ?? '' }, explanation: x.explanation ?? null, en: l.en ?? null, source,
                     tier: x.tier ?? null, bucket: x.bucket ?? 'grammar' });
      }
      const gist = parse<{ q: string; options: string[]; answer: number }>(read?.gist_json ?? null);
      if (gist?.q && gist.options?.length) {
        items.push({ id: `gist:${unit}:${no}`, kind: 'gist', prompt: gist.q, answer: gist.options[gist.answer],
                     options: shuffle(gist.options), en: scene.summary_en ?? null, source });
      }
    } catch { /* not read yet */ }

    // what each drill works on and how hard it is, as the labels have them
    const buckets = byKey(L.bucket), tiers = byKey(L.scene_tier);
    for (const it of items as Array<{ bucket?: string | null; tier?: string | null; badges?: unknown }>) {
      it.badges = [badge(it.bucket ? buckets.get(it.bucket) : undefined), badge(it.tier ? tiers.get(it.tier) : undefined)].filter(Boolean);
    }
    const base = byKey(L.scene_skill).get('scene');
    const card = base ? skillCard(base) : { id: 'scene', title: '', titleAr: '', tagline: '', icon: 'film', color: '#E07A5F' };
    const res = ok({ skill: { ...card, title: titled(scene.title_en) ?? card.title, titleAr: titled(scene.title_ar) ?? card.titleAr },
                     level: sc.level, items: instruct(shuffle(items) as Array<{ kind: string }>, L) });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  });
}
