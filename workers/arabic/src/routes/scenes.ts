import type { Router } from '../../../shared/src/router';
import { attachGt } from '../../../shared/src/gt-attach';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';
import { parseBand, bandOf, bare, type Band } from '../lib/levels';
import { labels, byKey, badge, skillCard, instruct, srsCardFor, dropEmpty, dropRetired, type Label } from '../lib/labels';
import { commonWords, isCommon } from '../lib/common';
import { highEndOf } from '../lib/highend';

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
const levelsOf = (band: Band) => band === 'all' ? ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] : LEVELS[band];

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
       JOIN ar_acquisition_ref r ON r.id = t.acq_ref_id AND r.status = 'live' AND r.level IN (${lv.map(() => '?').join(',')})
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
/// A draw's chance: Math.random for a fresh round; a seeded one (seeded) for a class, so the same scene deals the same drills.
export type Rand = () => number;
const shuffle = <T,>(xs: T[], rand: Rand = Math.random) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/// A generator seeded by a text (FNV-1a into mulberry32): the same text, the same sequence.
export function seeded(text: string): Rand {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  let t = h >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const clean = (w: string) => w.replace(/[؟،؛.!?"«»:…,()\[\]]/g, '');
const stem = (w: string) => bare(w).replace(/^(وال|فال|بال|كال|لل|ال|و|ف|ب|ل)/, '');
// common and function words are data (ar_common_word) — filtered where the drills are built

function timedWords(l: Line) {
  const toks = l.ar.trim().split(/\s+/);
  const timed = (l.w ?? []).length === toks.length;
  return toks.map((t, i) => ({ t, s: timed ? l.w![i][0] : l.start, e: timed ? l.w![i][1] : l.end }));
}

/// The letters English ears confuse, each with the ones it is heard as: the decoys of a word built from its letters.
const SOUNDALIKE: Record<string, string[]> = {
  'ح': ['ه', 'خ'], 'ه': ['ح'], 'خ': ['ح', 'غ'], 'ع': ['ء', 'أ'], 'ء': ['ع'], 'أ': ['ع', 'ا'], 'غ': ['خ', 'ق'],
  'ق': ['ك', 'غ'], 'ك': ['ق'], 'ص': ['س'], 'س': ['ص', 'ث'], 'ض': ['د', 'ظ'], 'د': ['ض', 'ذ'], 'ط': ['ت'], 'ت': ['ط'],
  'ظ': ['ذ', 'ز', 'ض'], 'ذ': ['ز', 'ظ', 'د'], 'ز': ['ذ'], 'ث': ['س', 'ت'], 'ة': ['ه', 'ت'], 'ى': ['ي', 'ا'], 'ي': ['ى'],
};
const letters = (w: string) => [...w.replace(/[\u064B-\u0652\u0670\u0640]/g, '').replace(/[^\u0621-\u064A]/g, '')];

/// A word heard in its line, then built from its letters, with letters it sounds like among them. Null when the line has no word timings (the clip would not be the word) or the word is too short/long.
function hearBuildWord(l: Line, i: number, url: string | null, rand: Rand) {
  const toks = l.ar.trim().split(/\s+/);
  if (!url || (l.w ?? []).length !== toks.length || !toks[i]) return null;
  const ls = letters(toks[i]);
  if (ls.length < 3 || ls.length > 10 || l.w![i][1] - l.w![i][0] < 0.15) return null;   // too short a clip to be the word
  const pool = [...new Set(ls.flatMap((c) => SOUNDALIKE[c] ?? []))].filter((c) => !ls.includes(c));
  const decoys = shuffle(pool, rand).slice(0, ls.length > 6 ? 2 : 3);
  const order = shuffle([...ls.map((_, k) => k), ...decoys.map((_, k) => -1 - k)], rand);
  return { interaction: 'listen_tiles', tileMode: 'arrange', tokens: order.map((k) => (k >= 0 ? ls[k] : decoys[-1 - k])),
           solution: ls.map((_, k) => order.indexOf(k)), answer: ls.join(''),
           // one recording: the scene's line, as heard; the line is shown with the word missing, and its words light as
           // they are said, so the gap is heard in its place
           audio: { url, start: l.start, end: l.end },
           words: toks.map((t, k) => ({ t, s: l.w![k][0], e: l.w![k][1] })), blank: i };
}

/// A phrase (an idiom's span) heard alone, then built from its words, two of the line's or scene's other words among them.
function hearBuildPhrase(l: Line, span: [number, number], others: string[], url: string | null, rand: Rand) {
  const toks = l.ar.trim().split(/\s+/);
  const ws = toks.slice(span[0], span[1] + 1);
  if (!url || (l.w ?? []).length !== toks.length || ws.length < 2 || ws.length > 8) return null;
  const decoys = shuffle(others.filter((w) => w.length >= 2 && !ws.includes(w)).filter((w, k, a) => a.indexOf(w) === k), rand).slice(0, 2);
  const order = shuffle([...ws.map((_, k) => k), ...decoys.map((_, k) => -1 - k)], rand);
  return { interaction: 'listen_tiles', tileMode: 'arrange', tokens: order.map((k) => (k >= 0 ? ws[k] : decoys[-1 - k])),
           solution: ws.map((_, k) => order.indexOf(k)), answer: ws.join(' '),
           audio: { url, start: Math.max(0, l.w![span[0]][0] - 0.06), end: l.w![span[1]][1] + 0.1 },
           words: ws.map((t, k) => ({ t, s: l.w![span[0] + k][0], e: l.w![span[0] + k][1] })) };
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

/// A round of n: taken in turn from each kind of drill (a verbal idiom, a key term, a word, an idiom,
/// a feature, the listening drills), so every round mixes them; then shuffled.
function balance<T extends { kind: string; bucket?: string | null }>(items: T[], n: number, rand: Rand = Math.random) {
  const mix = <U,>(xs: U[]) => shuffle(xs, rand);
  const groups = new Map<string, T[]>();
  for (const it of mix(items)) {
    const k = it.bucket === 'verbal_idiom' || it.bucket === 'keyterm' || it.bucket === 'near_synonym' ? it.bucket : it.kind;
    groups.set(k, [...(groups.get(k) ?? []), it]);
  }
  const order = ['verbal_idiom', 'keyterm', 'near_synonym', 'vocab', 'idiom', 'feature', 'fill', 'dialogue', 'speaker', 'match', 'gist'];
  const keys = [...order.filter((k) => groups.has(k)), ...[...groups.keys()].filter((k) => !order.includes(k))];
  const out: T[] = [];
  while (out.length < n && keys.some((k) => groups.get(k)!.length)) {
    for (const k of keys) { const g = groups.get(k)!; if (g.length && out.length < n) out.push(g.shift()!); }
  }
  return mix(out);
}

type LexHit = { line: number; span_from: number; span_to: number; ref: string; kind: string };
type Lexeme = { kind: string; phrase?: string; meanings?: Array<{ en: string; ref: string | null; ayahEn?: string | null }>;
                terms?: Array<{ term: string; ar: string | null; gloss: string | null }>; excerpt?: string | null; page?: number | null;
                source?: string; distractors?: string[]; lane?: { senses: string[]; page: number | null; source: string } | null;
                set?: string; used?: string; members?: Array<{ ar: string; gloss: string | null; note: string | null; used: boolean;
                                                           lexica: Array<{ source: string; text: string; page: number | null }> }> };

/// A line whose words are what is heard — not one the captions corrected toward the written form ('الأصل في التفريغ').
/// Nor one whose word timings collapsed (a word of a hundredth of a second): the text is then not what the clip says.
const heardAsWritten = (l: Line) => !((l as Line & { note?: string | null }).note ?? '').includes('الأصل في التفريغ')
  && !(l.w ?? []).some((w) => w[1] - w[0] < 0.04);

/// The meanings that are words: a gloss with a bracket, a digit or other debris is left out of a range question.
const cleanSenses = (xs: string[] | undefined) => (xs ?? []).filter((x) => /^[a-z][a-z' -]{1,40}$/i.test(x.trim()));

type Sarf = { madi?: string; mudari?: string; masdar?: string; masdar_pl?: string; senses?: string[]; pl?: string[]; sing?: string; mufrad?: string;
              jam?: string; verb?: string };

/// Each verb and noun of the scene, worked as a word: what it means in its line, and its forms — a verb's past, present
/// and action noun (maṣdar); a noun's plural or singular, and for a derived noun (mushtaq) the verb it comes from. Every
/// drill stands on the word's own line, heard and marked. The forms come from ar_scene_word.sarf_json (CAMeL, Lane's
/// Lexicon checked against Lisān, Tāj, Ṣiḥāḥ and Miṣbāḥ); the questions from ar_practice_label scope 'ask'.
function sarfDrills(sw: Array<{ scene_no: number; line: number; word_index: number; surface: string; word_class: string;
                                lemma_ar: string | null; derivation: string | null; number: string | null; sarf_json: string | null }>,
                    no: string, scene: Scene, clip: (l: Line) => unknown, L: Record<string, Label[]>, source: unknown,
                    rand: () => number, skip: (c: string) => boolean, verbForms: Map<string, Sarf> = new Map()): Array<Record<string, unknown>> {
  const mix = <U,>(xs: U[]) => shuffle(xs, rand);
  const ask = byKey(L.ask);
  const sarf = (j: string | null) => { try { return (j ? JSON.parse(j) : {}) as Sarf; } catch { return {} as Sarf; } };
  // the episode's forms of each kind, the choices for each other's questions
  const of = new Map<string, Set<string>>();
  const put = (k: string, v?: string) => { if (v) (of.get(k) ?? of.set(k, new Set()).get(k)!).add(v); };
  for (const w of sw) {
    const f = sarf(w.sarf_json);
    if (w.word_class === 'verb') { put('madi', f.madi); put('mudari', f.mudari); put('masdar', f.masdar); put('vsense', f.senses?.[0]); put('pl', f.masdar_pl); }
    else { put('pl', f.pl?.[0]); put('sing', f.sing ?? f.mufrad); put('nsense', f.senses?.[0]); put('verb', f.verb); }
  }
  // the sense the line's English uses, else the first
  const sense = (f: Sarf, en: string | null) => {
    const xs = f.senses ?? []; const e = ` ${(en ?? '').toLowerCase().replace(/[^a-z ]/g, ' ')} `;
    return xs.find((s) => s.toLowerCase().replace(/^(be|to) /, '').split(/[ ,]+/).some((t) => t.length > 2 && e.includes(` ${t}`))) ?? xs[0];
  };
  const choices = (k: string, answer: string, near: Array<string | undefined>) => {
    const close = [...new Set(near.filter((x): x is string => !!x && x !== answer))];
    const rest = mix([...(of.get(k) ?? [])].filter((x) => x !== answer && !close.includes(x)));
    const opts = [...close, ...rest].slice(0, 3);
    return opts.length === 3 ? mix([answer, ...opts]) : null;
  };
  // the episode's verbs with all three forms, and every word's senses by class — the near-misses of the sets below
  const triples: Array<{ madi: string; mudari: string; masdar: string; form: number | null }> = [];
  const senseBy = new Map<string, Set<string>>();
  for (const w of sw) {
    const f = sarf(w.sarf_json);
    if (w.word_class === 'verb' && f.madi && f.mudari && f.masdar && !triples.some((t) => t.madi === f.madi)) {
      triples.push({ madi: f.madi, mudari: f.mudari, masdar: f.masdar, form: (f as { form?: number }).form ?? null });
    }
    for (const x of cleanSenses(f.senses)) (senseBy.get(w.word_class) ?? senseBy.set(w.word_class, new Set()).get(w.word_class)!).add(x);
  }
  // past · present · action noun as one set, the wrong sets each with parts borrowed from other verbs of the episode
  const triad = (f: Sarf): { right: string; options: string[] } | null => {
    if (!f.madi || !f.mudari || !f.masdar) return null;
    const fm = (f as { form?: number }).form ?? null;
    const others = mix(triples.filter((t) => t.madi !== f.madi)).sort((p, q) => Number(q.form === fm) - Number(p.form === fm));
    const set = (a: string, b: string, c: string) => `${a} · ${b} · ${c}`;
    const right = set(f.madi, f.mudari, f.masdar);
    const wrong = [others[0] && set(f.madi, others[0].mudari, f.masdar), others[1] && set(f.madi, f.mudari, others[1].masdar),
                   others[2] && others[3] && set(f.madi, others[2].mudari, others[3].masdar)].filter((x): x is string => !!x && x !== right);
    return new Set(wrong).size === 3 ? { right, options: mix([right, ...wrong]) } : null;
  };
  // every sense that belongs, among others that do not
  const rangeOf = (raw: string[] | undefined, cls: string): { trues: string[]; options: string[] } | null => {
    const senses = cleanSenses(raw);
    if (senses.length < 2) return null;
    const trues = senses.slice(0, 3); const used = new Set(trues.flatMap(tok));
    const wrong = mix([...(senseBy.get(cls) ?? [])].filter((x) => !trues.includes(x) && !tok(x).some((t) => used.has(t)))).slice(0, 3);
    return wrong.length === 3 ? { trues, options: mix([...trues, ...wrong]) } : null;
  };
  const tok = (x: string) => x.toLowerCase().replace(/^(be|to) /, '').split(/[ ,]+/).filter((t) => t.length > 2);
  const out: Array<Record<string, unknown>> = []; const done = new Set<string>();
  const sceneVerbs: Array<{ f: Sarf; l: Line }> = []; const sceneNouns: Array<{ f: Sarf; l: Line }> = [];
  for (const w of sw.filter((x) => String(x.scene_no) === no)) {
    const a = bare(clean(w.surface)); const l = scene.lines[w.line - 1];
    if (!l || skip(a) || !heardAsWritten(l) || bare(clean(l.ar.trim().split(/\s+/)[w.word_index] ?? '')) !== a) continue;
    const key = `${w.word_class}:${w.lemma_ar ?? a}`;
    if (done.has(key)) continue; done.add(key);
    const f = sarf(w.sarf_json);
    const base = { audio: clip(l), words: timedWords(l), target: w.word_index, prompt: clean(w.surface), en: l.en ?? null, source,
                   bucket: w.word_class === 'verb' ? 'verb' : 'noun' };
    const add = (k: string, answer: string | undefined, pool: string, near: Array<string | undefined> = [], prompt?: string) => {
      const q = ask.get(k); if (!answer || !q) return;
      const options = choices(pool, answer, near); if (!options) return;
      out.push({ ...base, ...(prompt ? { prompt } : {}), id: `sarf:${k}:${w.lemma_ar ?? a}:${no}:${w.line}:${w.word_index}`, kind: 'vocab',
                 instruction: q.label, instructionAr: q.labelAr, answer, options,
                 explanation: [f.madi && f.mudari ? `${f.madi} – ${f.mudari}${f.masdar ? ` – ${f.masdar}` : ''}` : null,
                               f.pl?.[0] ? `${f.sing ?? f.mufrad ?? ''} – ${f.pl[0]}` : null].filter(Boolean).join(' · ') || null });
    };
    // first the word heard alone and built from its letters — sound to spelling, before meaning and forms
    const hb = ask.get('hear_build_word');
    const url = ((clip(l) as { url?: string | null }) ?? {}).url ?? null;
    const built = hb ? hearBuildWord(l, w.word_index, url, rand) : null;
    if (hb && built) out.push({ ...base, ...built, id: `sarf:build:${w.lemma_ar ?? a}:${no}:${w.line}:${w.word_index}`, kind: 'dictation',
                                target: null, prompt: null, instruction: hb.label, instructionAr: hb.labelAr });
    // the word's whole range of meanings: pick every sense that belongs, among others that do not
    const rq = ask.get("range"); const rg = rq && rangeOf(f.senses, w.word_class);
    if (rq && rg) out.push({ ...base, id: `sarf:range:${w.lemma_ar ?? a}:${no}:${w.line}:${w.word_index}`, kind: 'vocab', interaction: 'choose_all',
                             instruction: rq.label, instructionAr: rq.labelAr, answer: rg.trues.join(' / '), correct: rg.options.map((o, i) => (rg.trues.includes(o) ? i : -1)).filter((i) => i >= 0), options: rg.options });
    if (w.word_class === 'verb') {
      add('verb_meaning', sense(f, l.en ?? null), 'vsense');
      add('madi', f.madi, 'madi', [f.mudari, f.masdar]);
      add('mudari', f.mudari, 'mudari', [f.madi, f.masdar]);
      add('masdar', f.masdar, 'masdar', [f.madi, f.mudari]);
      // the action noun's plural — only where that plural is in common use (heard in the scenes, kept in masdar_pl)
      if (f.masdar && f.masdar_pl) add('masdar_plural', f.masdar_pl, 'pl', [f.masdar], f.masdar);
      // the three forms together: past · present · action noun, the wrong sets each with one part borrowed
      const tr = ask.get('triad'); const t3 = tr && triad(f);
      if (tr && t3) out.push({ ...base, id: `sarf:triad:${w.lemma_ar ?? a}:${no}:${w.line}:${w.word_index}`, kind: 'vocab',
                              instruction: tr.label, instructionAr: tr.labelAr, answer: t3.right, options: t3.options });
      sceneVerbs.push({ f, l });
    } else {
      const sing = f.sing ?? f.mufrad;
      add('noun_meaning', sense(f, l.en ?? null), 'nsense');
      if (w.number === 'p') add('singular', sing, 'sing', [f.pl?.[1]]);
      else add('plural', f.pl?.[0], 'pl', [sing, f.pl?.[1]]);
      if (w.derivation === 'mushtaqq') add('from_verb', f.verb, 'verb');
      // fixed (jāmid) or derived (mushtaqq): a derived noun is only asked where the verb it comes from is known
      const dq = ask.get('derivation'), oj = ask.get('opt_jamid'), om = ask.get('opt_mushtaqq');
      if (dq && oj && om && (w.derivation === 'jamid' || (w.derivation === 'mushtaqq' && f.verb))) {
        const right = w.derivation === 'jamid' ? oj.label : om.label;
        out.push({ ...base, id: `sarf:derivation:${w.lemma_ar ?? a}:${no}:${w.line}:${w.word_index}`, kind: 'vocab',
                   instruction: dq.label, instructionAr: dq.labelAr, answer: right, options: [oj.label, om.label],
                   explanation: w.derivation === 'mushtaqq' ? `${f.sing ?? f.mufrad ?? ''} ← ${f.verb}` : null });
      }
      // a derived noun: the verb it comes from — its three forms together, and its range of meanings
      const sv = w.derivation === 'mushtaqq' && f.verb ? verbForms.get(f.verb) : undefined;
      if (sv) {
        const ts = ask.get('triad_source'); const t3 = ts && triad(sv);
        if (ts && t3) out.push({ ...base, id: `sarf:triad_source:${w.lemma_ar ?? a}:${no}:${w.line}:${w.word_index}`, kind: 'vocab',
                                 instruction: ts.label, instructionAr: ts.labelAr, answer: t3.right, options: t3.options });
        const rs = ask.get('range_source'); const rv = rs && rangeOf(sv.senses, 'verb');
        if (rs && rv) out.push({ ...base, id: `sarf:range_source:${w.lemma_ar ?? a}:${no}:${w.line}:${w.word_index}`, kind: 'vocab', interaction: 'choose_all',
                                 instruction: rs.label, instructionAr: rs.labelAr, answer: rv.trues.join(' / '), correct: rv.options.map((o, i) => (rv.trues.includes(o) ? i : -1)).filter((i) => i >= 0), options: rv.options });
      }
      sceneNouns.push({ f, l });
    }
  }
  // matching sets of four: singular ↔ plural, past ↔ present, verb ↔ action noun — every word of the scene in a set
  const chunks = <T,>(xs: T[]) => {
    const g: T[][] = []; for (let i = 0; i < xs.length; i += 4) g.push(xs.slice(i, i + 4));
    if (g.length > 1 && g[g.length - 1].length < 3) g[g.length - 2].push(...g.pop()!);
    return g.filter((x) => x.length >= 3);
  };
  const sets = (k: string, bucket: string, xs: Array<{ f: Sarf; l: Line }>, pair: (f: Sarf) => string[] | null) => {
    const q = ask.get(k); if (!q) return;
    const ys = xs.map((x) => ({ x, p: pair(x.f) })).filter((y): y is { x: { f: Sarf; l: Line }; p: string[] } => !!y.p);
    chunks(mix(ys)).forEach((g, i) => {
      out.push({ id: `sarf:${k}:${no}:${i}`, kind: 'sarf_pairs', interaction: 'pairs', pairs: g.map((y) => y.p), bucket,
                 audio: clip(g[0].x.l), words: timedWords(g[0].x.l), en: g[0].x.l.en ?? null, source,
                 instruction: q.label, instructionAr: q.labelAr });
    });
  };
  const uniq = <T,>(xs: T[], key: (x: T) => string | undefined) => { const seen = new Set<string>(); return xs.filter((x) => { const k = key(x); if (!k || seen.has(k)) return false; seen.add(k); return true; }); };
  sets('pairs_number', 'noun', uniq(sceneNouns, (x) => x.f.pl?.[0] && (x.f.sing ?? x.f.mufrad)), (f) => (f.pl?.[0] ? [(f.sing ?? f.mufrad) as string, f.pl[0]] : null));
  sets('pairs_tense', 'verb', uniq(sceneVerbs, (x) => x.f.madi && x.f.mudari), (f) => (f.madi && f.mudari ? [f.madi, f.mudari] : null));
  sets('pairs_masdar', 'verb', uniq(sceneVerbs, (x) => x.f.madi && x.f.masdar), (f) => (f.madi && f.masdar ? [f.madi, f.masdar] : null));
  return out;
}

async function lexemeDrills(env: ArabicEnv, unit: string, no: number, scene: Scene, clip: (l: Line) => unknown,
                            L: Record<string, import('../lib/labels').Label[]>, source: unknown, tier: string | null, rand: Rand = Math.random) {
  const mix = <U,>(xs: U[]) => shuffle(xs, rand);
  if (tier === 'easy') return [];                                     // idioms and key terms are the stretch, not the warm-up
  const hits = await query<LexHit>(env.DB_AR,
    `SELECT line, span_from, span_to, ref, kind FROM ar_scene_lexeme WHERE unit_id = ? AND scene_no = ?`, [unit, no]).catch(() => []);
  if (!hits.length || !env.AR_LINGUISTICS) return [];
  const chosen = [...mix(hits.filter((h) => h.kind === 'verbal_idiom')).slice(0, 2), ...mix(hits.filter((h) => h.kind === 'keyterm')).slice(0, 1),
                  ...mix(hits.filter((h) => h.kind === 'near_synonym')).slice(0, 2)];
  const refs = [...new Set(chosen.map((h) => h.ref.replace(/^AL:/, '')))];
  const lexRes = await env.AR_LINGUISTICS.fetch(`https://al/al/lex/v2/lexemes?refs=${encodeURIComponent(refs.join(','))}`)
    .then((r) => r.json() as Promise<{ data?: { lexemes?: Record<string, Lexeme> } }>).catch(() => null);
  const lexemes = lexRes?.data?.lexemes ?? {};
  const passages = await query<{ ref: string; kind: string; work_id: string | null; unit_id: string | null; title: string | null; level: string | null;
                                  text_ar: string; hit_from: number | null; hit_to: number | null; object_key: string | null; start_sec: number | null; end_sec: number | null }>(env.DB_AR,
    `SELECT ref, kind, work_id, unit_id, title, level, text_ar, hit_from, hit_to, object_key, start_sec, end_sec
       FROM ar_lexeme_passage WHERE ref IN (${chosen.map(() => '?').join(',')}) ORDER BY ref, rank`, chosen.map((h) => h.ref)).catch(() => []);
  const ayah = async (ref: string | null) => {
    if (!ref || !env.QURAN) return null;
    const [s, a] = ref.split(':');
    const r = await env.QURAN.fetch(`https://qr/qr/ayahs/${s}/${a}`).then((x) => x.json() as Promise<{ data?: { text_display?: string } }>).catch(() => null);
    return r?.data?.text_display ?? null;
  };
  const titles = byKey(L.context);
  const out: unknown[] = [];
  for (const h of chosen) {
    const x = lexemes[h.ref.replace(/^AL:/, '')];
    const l = scene.lines[h.line];
    if (!x || !l) continue;
    if (h.kind === 'near_synonym') {
      // which of its near-synonyms was said: heard in the line, the word blanked, its set to choose from —
      // then how Lisān, Tāj al-ʿArūs and Lane tell them apart
      const others = (x.distractors ?? []).slice(0, 3);
      if (!x.used || others.length < 2) continue;
      out.push({ id: `nuance:${unit}:${no}:${h.line}:${h.span_from}`, kind: 'nuance', audio: clip(l), words: timedWords(l),
                 blank: h.span_from, answer: x.used, options: mix([x.used, ...others]), en: l.en ?? null, source,
                 prompt: x.set ?? null, tier: null, bucket: 'near_synonym',
                 context: { synonyms: { title: titles.get('synonyms')?.label ?? null, set: x.set ?? null,
                   items: (x.members ?? []).map((m) => ({ ar: m.ar, gloss: m.gloss, note: m.note, used: m.used,
                     lexica: m.lexica.map((d) => ({ source: d.source, text: d.text, page: d.page })) })) } } });
      continue;
    }
    const phrase = l.ar.trim().split(/\s+/).slice(h.span_from, h.span_to + 1).join(' ');
    const answer = h.kind === 'keyterm'
      ? (x.terms?.find((t) => t.gloss)?.gloss ?? x.lane?.senses?.[0] ?? null)
      : (x.meanings?.[0]?.en ?? null);
    const wrong = (x.distractors ?? []).filter((d) => d && d !== answer).slice(0, 3);
    if (!answer || wrong.length < 3) continue;
    const meanings = await Promise.all((x.meanings ?? []).slice(0, 4).map(async (m) => ({ en: m.en, ref: m.ref, ayahAr: await ayah(m.ref), ayahEn: m.ayahEn ?? null })));
    const context = {
      meanings: meanings.length ? { title: titles.get('meanings')?.label ?? null, items: meanings } : null,
      lane: x.lane ? { title: titles.get('lane')?.label ?? null, senses: x.lane.senses, cite: `${x.lane.source}, p. ${x.lane.page ?? '—'}` } : null,
      sinai: h.kind === 'keyterm' ? { title: titles.get('sinai')?.label ?? null,
        terms: (x.terms ?? []).map((t) => [t.ar, t.gloss].filter(Boolean).join(' — ')), excerpt: x.excerpt ?? null,
        cite: `${x.source ?? ''}${x.page ? `, p. ${x.page}` : ''}` } : null,
      passages: { title: titles.get('passages')?.label ?? null,
        items: passages.filter((p) => p.ref === h.ref).map((p) => ({ kind: p.kind, title: p.title, level: p.level, workId: p.work_id, unitId: p.unit_id,
          text: p.text_ar, hit: p.hit_from != null ? [p.hit_from, p.hit_to] : null,
          audio: p.object_key ? { url: `/api/ar/audio/${encodeURI(p.object_key)}`, start: p.start_sec, end: p.end_sec } : null })) },
    };
    out.push({ id: `lexeme:${unit}:${no}:${h.line}:${h.span_from}`, kind: h.kind === 'keyterm' ? 'vocab' : 'idiom',
               audio: clip(l), words: timedWords(l), span: range([h.span_from, h.span_to]), target: h.kind === 'keyterm' ? h.span_from : null,
               prompt: phrase, answer, options: mix([answer, ...wrong]), en: l.en ?? null, source,
               explanation: x.meanings?.[0]?.ayahEn ? null : null, tier: null, bucket: h.kind, context });
  }
  return out;
}

/// One scene's round: its words, idioms, verbal idioms, key terms, near-synonyms, features and
/// dialogue, drawn fresh — or a Response saying why there is none.
export async function sceneRound(env: ArabicEnv, unit: string, no: string, tier: string | null, size = 12, rand: Rand = Math.random) {
    const mix = <U,>(xs: U[]) => shuffle(xs, rand);
    // a tier asked for keeps the read items of that tier; with none asked (a plain round, a class) the items a reader
    // marked easy are left out — scene drills are high-end only (an easy word was asked as "what does it mean")
    // a class's scene node (a big round) acquires the whole scene: every word read for it, every idiom, every line heard
    // and built — not the few high-end items a quick round samples
    const full = size >= 30;
    const inTier = (x: { tier?: string }) => (full || (tier ? !x.tier || x.tier === tier : x.tier !== 'easy'));
    const [L, common] = await Promise.all([labels(env), commonWords(env)]);
    const sc = await script(env, unit);
    const scene = sc?.s.scenes.find((x) => String(x.scene_no) === no);
    if (!sc || !scene) return notFound(`scene ${no} of ${unit}`);
    const url = audioUrl(sc.audio);
    if (!url) return badRequest('this episode has no recording to practise with');
    const clip = (l: Line) => ({ url, start: l.start, end: l.end });
    const lines = scene.lines.filter((l) => l.ar && l.end > l.start);
    // a line whose text is what the recording says (one corrected from the captions may sound different from its tiles)
    // HIGH-END only (lib/highend.ts): a word is drilled when it is hard in the Qurʾān or rare in the classical library;
    // a line is drilled whole (who said it, its meaning, the exchange, dictation) only when it holds such a word
    const hi = await highEndOf(env, sc.s.scenes.flatMap((x) => x.lines.flatMap((l) => (l.ar ?? '').split(/\s+/))));
    const hardOnly = (w: string) => !isCommon(common, w, false) && hi(w);
    const rich = (l: Line) => (l.ar ?? '').split(/\s+/).some((w) => hi(w));
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
    const vocab = (parse<Vocab[]>(read?.vocab_json ?? null) ?? []).filter(inTier)
      .filter((v) => (full ? !isCommon(common, v.word, false) : hardOnly(v.word)));
    const epVocab = reads.flatMap((r) => parse<Vocab[]>(r.vocab_json) ?? []).map((v) => clean(v.word)).filter(hardOnly);

    // names are not vocabulary
    const names = new Set((sc.s.cast ?? []).flatMap((c) => c.name_ar.split(/\s+/)).map((w) => stem(w)));
    const isName = (w: string) => names.has(stem(w));

    // the scene's hard words, heard and filled — the words a reader chose where there are any, else the rarest;
    // options from the episode's other hard words, confusable by ear
    // a word is asked once a round: its meaning here (up to four), or else heard and filled
    const asked = full ? vocab : mix(vocab).slice(0, 4);
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
      if (items.length >= (full ? 8 : 3)) break;
      if (usedLines.has(h.line)) continue;
      usedLines.add(h.line);
      const l = scene.lines[h.line];
      const a = bare(h.word);
      const letters = new Set(stem(h.word));
      const opts = mix(epHard.filter((w) => bare(w) !== a))
        .map((w) => ({ w, s: [...new Set(stem(w))].filter((c) => letters.has(c)).length * 2 - Math.abs(bare(w).length - a.length) + rand() }))
        .sort((x, y) => y.s - x.s).map((x) => bare(x.w))
        .filter((w, i, arr) => arr.indexOf(w) === i).slice(0, 3);
      items.push({ id: `fill:${unit}:${no}:${h.line}:${h.index}`, kind: 'fill', audio: clip(l), words: timedWords(l), blank: h.index,
                   answer: a, options: mix([a, ...opts]), en: l.en ?? null, source, tier: (h as { tier?: string }).tier ?? null, bucket: 'vocab' });
    }

    // a class scene node: every verb and noun of the scene, heard in its line and picked out — the line's English beside
    // it, three of the episode's other words of the same class as the choices (ar_scene_word: line from 1, word from 0)
    if (full) {
      type SW = { scene_no: number; line: number; word_index: number; surface: string; word_class: string; lemma_ar: string | null;
                  derivation: string | null; number: string | null; sarf_json: string | null };
      const sw = await query<SW>(env.DB_AR,
        `SELECT scene_no, line, word_index, surface, word_class, lemma_ar, derivation, number, sarf_json FROM ar_scene_word
          WHERE unit_id = ? AND word_class IN ('verb', 'noun')`, [unit]).catch(() => []);
      const pool = new Map<string, string[]>();
      for (const w of sw) {
        const c = bare(clean(w.surface));
        if (c.length < 3 || isName(c) || isCommon(common, c, false)) continue;
        const xs = pool.get(w.word_class) ?? []; if (!xs.includes(c)) xs.push(c); pool.set(w.word_class, xs);
      }
      const seen = new Set<string>();
      for (const w of sw.filter((x) => String(x.scene_no) === no)) {
        const a = bare(clean(w.surface));
        const l = scene.lines[w.line - 1];
        if (!l || a.length < 3 || isName(a) || isCommon(common, a, false) || seen.has(stem(a))) continue;
        if (!heardAsWritten(l) || bare(clean(l.ar.trim().split(/\s+/)[w.word_index] ?? '')) !== a) continue;
        seen.add(stem(a));
        const letters = new Set(stem(a));
        const opts = mix((pool.get(w.word_class) ?? []).filter((x) => x !== a && stem(x) !== stem(a)))
          .map((x) => ({ x, s: [...new Set(stem(x))].filter((c) => letters.has(c)).length * 2 - Math.abs(x.length - a.length) + rand() }))
          .sort((p, q) => q.s - p.s).slice(0, 3).map((o) => o.x);
        if (opts.length < 3) continue;
        items.push({ id: `word:${unit}:${no}:${w.line}:${w.word_index}`, kind: 'fill', audio: clip(l), words: timedWords(l),
                     blank: w.word_index, answer: a, options: mix([a, ...opts]), en: l.en ?? null, source,
                     bucket: w.word_class === 'verb' ? 'verb' : 'noun' });
      }
      // the verbs the scene's derived nouns come from, with their forms (they may be met in another episode)
      const srcVerbs = [...new Set(sw.flatMap((w) => { try { const f = JSON.parse(w.sarf_json ?? '{}') as { verb?: string }; return w.derivation === 'mushtaqq' && f.verb ? [f.verb] : []; } catch { return []; } }))];
      const verbForms = new Map<string, Record<string, unknown>>();
      for (let i = 0; i < srcVerbs.length; i += 40) {
        const chunk = srcVerbs.slice(i, i + 40);
        const rows = await query<{ lemma_ar: string; sarf_json: string }>(env.DB_AR,
          `SELECT lemma_ar, MAX(sarf_json) AS sarf_json FROM ar_scene_word WHERE word_class = 'verb' AND lemma_ar IN (${chunk.map(() => '?').join(',')}) GROUP BY lemma_ar`, chunk).catch(() => []);
        for (const r of rows) { try { verbForms.set(r.lemma_ar, JSON.parse(r.sarf_json)); } catch { /* none */ } }
      }
      for (const x of sarfDrills(sw, no, scene, clip, L, source, rand, (c) => c.length < 3 || isName(c) || isCommon(common, c, false), verbForms as Map<string, never>)) items.push(x);
    }

    // who said it — where the scene has more than one voice
    const named = lines.filter((l) => l.speaker && rich(l));
    const voices = [...new Set(named.map((l) => l.speaker!))];
    const allVoices = [...new Set(sc.s.scenes.flatMap((x) => x.lines.map((l) => l.speaker).filter(Boolean) as string[]))];
    if (voices.length >= 2) {
      for (const l of mix(named).slice(0, 2)) {
        const others = mix([...voices, ...allVoices].filter((v) => v !== l.speaker)).filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 3);
        items.push({ id: `speaker:${unit}:${no}:${l.start}`, kind: 'speaker', audio: clip(l), words: timedWords(l),
                     prompt: byKey(L.prompt).get('speaker')?.label ?? null, answer: l.speaker, options: mix([l.speaker!, ...others]), en: l.en ?? null, source });
      }
    }

    // what it means — the line's English among the scene's (and episode's) other lines
    const withEn = lines.filter((l) => l.en && l.ar.split(/\s+/).length >= 4 && rich(l));
    const epEn = [...new Set(sc.s.scenes.flatMap((x) => x.lines.map((l) => l.en).filter(Boolean) as string[]))];
    const sceneEn = new Set(lines.map((l) => l.en).filter(Boolean));
    const words = (e: string) => e.split(/\s+/).length;
    for (const l of mix(withEn).slice(0, 2)) {
      // the wrong meanings are as long as the right one, and from this scene where they can be
      const n = words(l.en!);
      const others = epEn.filter((e) => e !== l.en)
        .map((e) => ({ e, d: Math.abs(words(e) - n) / n + (sceneEn.has(e) ? 0 : 0.35) + rand() * 0.3 }))
        .sort((a, b) => a.d - b.d).slice(0, 3).map((x) => x.e);
      items.push({ id: `match:${unit}:${no}:${l.start}`, kind: 'match', audio: clip(l), words: timedWords(l),
                   answer: l.en, options: mix([l.en!, ...others]), en: l.en ?? null, source });
    }

    // the dialogue, back in order — four lines that follow one another
    // a run of four that holds high-end language
    // fixed windows (lines 0–3, 4–7 …), so one exchange is always the same review item
    const starts = [...Array(Math.max(0, lines.length - 3)).keys()].filter((i) => i % 4 === 0 && lines.slice(i, i + 4).some(rich));
    if (starts.length) {
      const at = starts[Math.floor(rand() * starts.length)];
      const run = lines.slice(at, at + 4);
      const order = run.map((_, i) => i);
      let shuffled = mix(order);
      for (let k = 0; k < 4 && shuffled.every((v, i) => v === i); k++) shuffled = mix(order);
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
                     target: idx >= 0 ? idx : null, prompt: v.word, answer: v.gloss, options: mix([v.gloss, ...(v.distractors ?? []).slice(0, 3)]),
                     explanation: [v.lemma ? `lemma ${v.lemma}` : null, v.note].filter(Boolean).join(' — ') || null,
                     en: l.en ?? null, source, tier: v.tier ?? null, bucket: 'vocab' });
      }
      // its idioms and set expressions: what the phrase means here
      type Expr = { line: number; phrase: string; span: [number, number]; meaning: string; literal?: string; note?: string; distractors: string[]; tier?: string };
      // an idiom or a feature must rest on more than function or common words
      const worth = (line: number, span: [number, number]) => {
        const toks = (scene.lines[line]?.ar ?? '').trim().split(/\s+/).slice(span[0], span[1] + 1);
        return toks.some((t) => hardOnly(t));
      };
      for (const x of mix((parse<Expr[]>(read?.expressions_json ?? null) ?? []).filter(inTier).filter((e) => full || worth(e.line, e.span))).slice(0, full ? 99 : 2)) {
        const l = scene.lines[x.line];
        if (!l) continue;
        items.push({ id: `idiom:${unit}:${no}:${x.line}:${x.span[0]}`, kind: 'idiom', audio: clip(l), words: timedWords(l),
                     span: range(x.span), prompt: x.phrase, answer: x.meaning, options: mix([x.meaning, ...x.distractors.slice(0, 3)]),
                     explanation: [x.literal ? `Literally: ${x.literal}` : null, x.note].filter(Boolean).join(' — ') || null,
                     en: l.en ?? null, source, tier: x.tier ?? null, bucket: 'idiom' });
        // and the phrase heard alone, then built from its words
        const hp = byKey(L.ask).get('hear_build_phrase');
        const pb = hp ? hearBuildPhrase(l, x.span, lines.flatMap((y) => y.ar.split(/\s+/)), url, rand) : null;
        if (hp && pb) items.push({ ...pb, id: `idiombuild:${unit}:${no}:${x.line}:${x.span[0]}`, kind: 'dictation', en: l.en ?? null,
                                   source, tier: x.tier ?? null, bucket: 'idiom', instruction: hp.label, instructionAr: hp.labelAr });
      }
      // what is worth noticing in how a line is built — its grammar or its rhetoric
      type Feat = { line: number; text: string; span: [number, number]; feature: string; term_ar?: string; q: string;
                    options: string[]; answer: number; explanation?: string; tier?: string; bucket?: string };
      // high end only: a feature whose term is EXPERT tier (ar_scene_feature_term → ar_ling_gram_term.tier) — never basic naḥw
      const expertIdx = new Set((await query<{ feature_idx: number }>(env.DB_AR,
        `SELECT f.feature_idx FROM ar_scene_feature_term f JOIN ar_ling_gram_term g ON g.id = f.term_id AND g.tier = 'expert'
          WHERE f.unit_id = ? AND f.scene_no = ?`, [unit, Number(no)]).catch(() => [] as Array<{ feature_idx: number }>)).map((r) => r.feature_idx));
      const feats = (parse<Feat[]>(read?.features_json ?? null) ?? []).map((f, i) => ({ f, i })).filter(({ i }) => expertIdx.has(i)).map(({ f }) => f);
      for (const x of mix(feats.filter((f) => f.q && f.options?.length).filter(inTier).filter((f) => worth(f.line, f.span))).slice(0, 3)) {
        const l = scene.lines[x.line];
        if (!l) continue;
        items.push({ id: `feature:${unit}:${no}:${x.line}:${x.span[0]}`, kind: 'feature', audio: clip(l), words: timedWords(l),
                     span: range(x.span), prompt: x.q, answer: x.options[x.answer], options: mix(x.options),
                     note: { en: x.feature, ar: x.term_ar ?? '' }, explanation: x.explanation ?? null, en: l.en ?? null, source,
                     tier: x.tier ?? null, bucket: x.bucket ?? 'grammar' });
      }
      // its verbal idioms and Qurʾān key terms (ar_scene_lexeme), each drilled with its range of meanings —
      // Mir's senses with their āyāt, Lane's renderings, Sinai's entry — and its contexts in the books and recordings
      for (const x of await lexemeDrills(env, unit, Number(no), scene, clip, L, source, tier, rand)) items.push(x);
      const gist = parse<{ q: string; options: string[]; answer: number }>(read?.gist_json ?? null);
      if (gist?.q && gist.options?.length) {
        items.push({ id: `gist:${unit}:${no}`, kind: 'gist', prompt: gist.q, answer: gist.options[gist.answer],
                     options: mix(gist.options), en: scene.summary_en ?? null, source });
      }
    } catch (e) { console.log('scene reading', unit, no, String(e)); }

    // what each drill works on and how hard it is, as the labels have them
    const buckets = byKey(L.bucket), tiers = byKey(L.scene_tier);
    for (const it of items as Array<{ bucket?: string | null; tier?: string | null; badges?: unknown }>) {
      it.badges = [badge(it.bucket ? buckets.get(it.bucket) : undefined), badge(it.tier ? tiers.get(it.tier) : undefined)].filter(Boolean);
    }
    // dictation: one line of a speakable length, heard, then written out
    // only a line whose text is what the recording says: one corrected from the captions («الأصل في التفريغ …» in its
    // note) may sound different from its tiles, so it is never dictated
    const speakable = lines.filter((l) => { const n = l.ar.split(/\s+/).length; return n >= 3 && n <= 12 && heardAsWritten(l) && (full || (n >= 4 && n <= 10 && rich(l))); });
    // no typing: the line heard, then its words tapped back in order from tiles (two decoys from the scene's other lines)
    for (const dict of full ? speakable : mix(speakable).slice(0, 1)) {
      const toks = dict.ar.split(/\s+/).filter(Boolean);
      const decoys = mix(lines.filter((l) => l !== dict).flatMap((l) => l.ar.split(/\s+/))
        .filter((w) => w.length >= 3 && !toks.includes(w))).filter((w, i, a) => a.indexOf(w) === i).slice(0, 2);
      const order = mix([...toks.map((_, i) => i), ...decoys.map((_, i) => -1 - i)]);
      const tokens = order.map((i) => (i >= 0 ? toks[i] : decoys[-1 - i]));
      const solution = toks.map((_, i) => order.indexOf(i));
      items.push({ id: `dictation:${unit}:${no}:${dict.start}`, kind: 'dictation', interaction: 'listen_tiles', tileMode: 'arrange',
                   tokens, solution, audio: clip(dict), words: timedWords(dict), answer: dict.ar, en: dict.en ?? null, source, bucket: 'sound' });
    }
    // every drill files its review card (CORE SRS): the words, idioms and terms, and the lines too
    for (const it of items as Array<Record<string, unknown>>)
      it.srs = srsCardFor(it, { skill: 'scene', band: bandOf(sc.level) ?? undefined, series: sc.s.series_ar ?? null, episode: unit, scene: Number(no) });
    // an empty drill (nothing asked or answered) is dropped, never dealt
    // and a drill of a retired kind (about a person or the story, not the language — AR 0053/0057) is never dealt
    items.splice(0, items.length, ...dropRetired(dropEmpty(items as Array<Record<string, unknown>>), L));
    const base = byKey(L.scene_skill).get('scene');
    const card = base ? skillCard(base) : { id: 'scene', title: '', titleAr: '', tagline: '', icon: 'film', color: '#E07A5F' };
    const deck = byKey(L.path).get('srs_deck');
    return { srsDeck: deck ? { title: deck.label, description: deck.detail } : null,
             skill: { ...card, title: titled(scene.title_en) ?? card.title, titleAr: titled(scene.title_ar) ?? card.titleAr },
                     level: sc.level, items: instruct(balance(items as Array<{ kind: string; bucket?: string | null }>, size, rand), L) };
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
    const round = await sceneRound(env, unit, no, new URL(req.url).searchParams.get('tier'));
    if (round instanceof Response) return round;
    // every drill carries the registry terms its rows name; the stage's words travel with it
    const res = ok({ ...round, items: await attachGt(env.DB_AR, round.items as unknown as Array<Record<string, unknown>>),
                     stage: (await labels(env)).stage ?? [] });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  });
}
