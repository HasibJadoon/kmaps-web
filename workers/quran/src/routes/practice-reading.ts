import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { withCard } from './practice-kit';
import { loadAyat, type Scope } from './practice';

// ── Read & listen, sentence by sentence (qr_163) ───────────────────────────────
// After the passage is heard whole and every sentence built, each sentence of the passage (qr_ss_occ_sentence) is read
// on its own node, in four moves, each drill standing at the sentence's first word so the class places it there:
//   wordclass       each word named اسم · فعل · حرف (its corpus part of speech)
//   sentpart        the sentence named (الجملة الاسمية / الفعلية …, its GT sentence class), each clause the sentence
//                   data names, and each phrase (جار ومجرور, ظرف, نعت …) — marked on the line
//   transbuild      its Arabic built from its English, two words of the passage that do not belong among the tiles
//   keyterm_meaning each key term in it (Sinai, Key Terms of the Qurʾān): its meaning, Sinai's note the explanation,
//                   the word heard as the reciter says it
// Every option is a GT term's Arabic name (ar_ling_gram_term), never a label of this file.

type Drill = Record<string, unknown>;
type Gt = { id: string; name_ar: string };
type Sent = { id: string; ayah_from: number; ayah_to: number; ws: number | null; we: number | null; cls: string | null };
type Word = { word_index: number; word_text: string; pos: string | null };
type Timed = { t: string; s: number; e: number };

const shuffle = <T>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const strip = (s: string) => s.replace(/[ً-ْٰۖ-ۭ]/g, '');

/** A corpus part of speech as its GT class: verbs fiʿl; nouns, names, adjectives, pronouns, demonstratives, relatives
 *  and adverbs ism; the rest ḥarf. A word whose particle carries a pronoun (إِلَيْهِ) is two words in one: not asked. */
function classOf(pos: string | null, text: string): string | null {
  if (!pos) return null;
  if (pos === 'V') return 'GT:pos:fil';
  if (['N', 'PN', 'ADJ', 'PRON', 'DEM', 'REL', 'T', 'LOC'].includes(pos)) return 'GT:pos:ism';
  if (['P', 'ACC'].includes(pos) && strip(text).length > 3) return null;
  return 'GT:pos:harf';
}

/** A Sinai gloss usable as an option: whole words, not an entry's fragment (": to be ~", "ask for ~"). */
const usable = (g: string | null): g is string => !!g && g.trim().length >= 3 && !/[~]/.test(g) && !/^[:(]/.test(g.trim());

export async function readingSentenceDrills(env: QuranEnv, scope: Scope): Promise<Drill[]> {
  if (!scope.surah) return [];
  const surah = scope.surah, from = scope.from ?? 1, to = scope.to ?? 999;
  const sentences = await query<Sent>(env.DB_QR,
    `SELECT id, ayah_from, ayah_to, word_start_index AS ws, word_end_index AS we, gt_sentence_class AS cls FROM qr_ss_occ_sentence
      WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ? AND COALESCE(is_virtual, 0) = 0 AND word_start_index IS NOT NULL
      ORDER BY ayah_from, word_start_index, (id LIKE '%:jadwal:%'), id`, [surah, from, to]);
  if (!sentences.length) return [];
  const ids = sentences.map((s) => s.id);
  const nums: number[] = [];
  for (let a = from; a <= Math.min(to, Math.max(...sentences.map((s) => s.ayah_to))); a++) nums.push(a);
  const [ayat, posRows, clauses, phrases, units, terms, gts] = await Promise.all([
    loadAyat(env, nums.map((a) => [surah, a])),
    query<Word & { ayah: number }>(env.DB_QR,
      `SELECT ayah, word_index, word_text, pos FROM qr_word_occurrence WHERE surah = ? AND ayah BETWEEN ? AND ?`, [surah, from, to]),
    query<{ id: string; sentence_id: string; ayah_from: number; ayah_to: number; ws: number | null; we: number | null; ref: string | null }>(env.DB_QR,
      `SELECT id, sentence_id, ayah_from, ayah_to, word_start_index AS ws, word_end_index AS we, lx_clause_type_ref AS ref
         FROM qr_ss_occ_clause WHERE sentence_id IN (SELECT value FROM json_each(?)) AND COALESCE(is_virtual, 0) = 0 ORDER BY clause_order`,
      [JSON.stringify(ids)]),
    query<{ id: string; sentence_id: string; ayah: number; ws: number; we: number; ref: string | null }>(env.DB_QR,
      `SELECT p.id, c.sentence_id, p.ayah, p.word_start_index AS ws, p.word_end_index AS we, p.lx_phrase_type_ref AS ref
         FROM qr_ss_occ_phrase p JOIN qr_ss_occ_clause c ON c.id = p.clause_id
        WHERE c.sentence_id IN (SELECT value FROM json_each(?)) ORDER BY p.ayah, p.word_start_index`, [JSON.stringify(ids)]),
    query<{ scope_id: string; fluent_en: string }>(env.DB_QR,
      `SELECT scope_id, fluent_en FROM qr_ss_translation_unit WHERE scope_type = 'sentence' AND scope_id IN (SELECT value FROM json_each(?))`,
      [JSON.stringify(ids)]),
    // the sūra's key terms: those of the passage are asked; every gloss of the sūra is a near miss
    query<{ source: string; grp: string; ayah: number; word_index: number | null; head_ar: string | null; label_en: string | null }>(env.DB_QR,
      `SELECT source, grp, ayah, word_index, head_ar, label_en FROM qr_drill_anchor
        WHERE family = 'keyterm' AND surah = ? AND source IN ('sinai_key_terms', 'sinai_cite')`, [surah]),
    query<Gt & { category_key: string }>(env.DB_QR,
      `SELECT id, name_ar, category_key FROM ar_ling_gram_term
        WHERE id IN ('GT:pos:ism', 'GT:pos:fil', 'GT:pos:harf') OR category_key = 'sentence_class'
           OR id IN (SELECT DISTINCT lx_phrase_type_ref FROM qr_ss_occ_phrase WHERE lx_phrase_type_ref IS NOT NULL)`),
  ]);
  const gt = new Map(gts.map((g) => [g.id, g.name_ar]));
  const classes = ['GT:pos:ism', 'GT:pos:fil', 'GT:pos:harf'].filter((id) => gt.has(id));
  // the sentence classes a learner meets first; a sentence's own class is always among its options
  const sentenceSet = ['GT:sentence_class:ismiyya', 'GT:sentence_class:filiyya', 'GT:sentence_class:shartiyya',
                       'GT:sentence_class:istifhamiyya', 'GT:sentence_class:manfiyya'].filter((id) => gt.has(id));
  const phraseSet = [...new Set(phrases.map((p) => p.ref).filter((r): r is string => !!r && gt.has(r)))];
  const posOf = new Map(posRows.map((w) => [`${w.ayah}:${w.word_index}`, w]));
  const enOf = new Map(units.map((u) => [u.scope_id, u.fluent_en]));
  const cite = new Map(terms.filter((t) => t.source === 'sinai_cite' && t.label_en).map((t) => [t.grp, t.label_en!]));
  const glosses = [...new Set(terms.filter((t) => t.source === 'sinai_key_terms' && usable(t.label_en)).map((t) => t.label_en!.trim()))];

  const out: Drill[] = [];
  const seen = new Set<string>();
  const passageWords: string[] = [];
  type Line = { s: Sent; words: Timed[]; ws: Word[]; ays: number[]; audio: { url: string; start: number; end: number }; title: string; en: string | null };
  const lines: Line[] = [];
  for (const s of sentences) {
    const span = `${s.ayah_from}:${s.ws}-${s.ayah_to}:${s.we}`;
    if (seen.has(span)) continue;
    seen.add(span);
    const parts = Array.from({ length: s.ayah_to - s.ayah_from + 1 }, (_, i) => ayat.get(`${surah}:${s.ayah_from + i}`));
    if (parts.some((p) => !p || !p.aligned || !p.audio) || new Set(parts.map((p) => p!.audio!.url)).size > 1) continue;
    const words: Timed[] = [], ws: Word[] = [], ays: number[] = [];
    for (const p of parts) {
      p!.ws.forEach((w, i) => {
        if (p!.ayah === s.ayah_from && w.word_index < (s.ws ?? 1)) return;
        if (p!.ayah === s.ayah_to && w.word_index > (s.we ?? 9_999)) return;
        words.push(p!.words[i]); ws.push(w); ays.push(p!.ayah);
      });
    }
    if (!words.length) continue;
    const first = parts[0]!, last = parts[parts.length - 1]!;
    const range = s.ayah_to > s.ayah_from ? `${surah}:${s.ayah_from}–${s.ayah_to}` : `${surah}:${s.ayah_from}`;
    // the English: the sentence's own (its derived translation), else its āyāt's when the sentence is them whole
    const whole = (s.ws ?? 1) === 1 && last.ws.every((w) => w.word_index <= (s.we ?? 9_999));
    const en = enOf.get(s.id) ?? (whole ? [...new Set(parts.map((p) => p!.en).filter(Boolean))].join(' ') || null : null);
    lines.push({ s, words, ws, ays, en, title: first.title.replace(/ \d+:\d+$/, ` ${range}`),
                 audio: { url: first.audio!.url, start: Math.max(first.audio!.start, words[0].s - 0.05), end: Math.min(last.audio!.end, words[words.length - 1].e + 0.15) } });
    passageWords.push(...ws.map((w) => w.word_text));
  }

  for (const l of lines) {
    const { s } = l;
    const at = { ayah: s.ayah_from, word: s.ws ?? 1 };
    const base = (id: string, ask: string): Drill => ({
      id, ask, script: 'quran', audio: l.audio, words: l.words, en: l.en, at,
      source: { workId: `QR:SURAH:${surah}`, title: l.title, level: null },
    });
    const text = l.ws.map((w) => w.word_text).join(' ');
    const card = (d: Drill, kind: string, front: string, back: string) =>
      withCard(d, { ref: `QR:${String(d.id)}`, type: 'passage', kind, front, back, surah, ayah: s.ayah_from, series: l.title.replace(/ \d+:\d+(–\d+)?$/, '') });
    const idx = (ay: number, w: number) => l.ws.findIndex((x, i) => l.ays[i] === ay && x.word_index === w);

    // 1 · each word: ism, fiʿl or ḥarf
    if (classes.length === 3) {
      l.ws.forEach((w, i) => {
        const c = classOf(posOf.get(`${l.ays[i]}:${w.word_index}`)?.pos ?? w.pos, w.word_text);
        if (!c || l.ws.length < 2) return;
        const answer = gt.get(c)!;
        out.push(card({ ...base(`wordclass:${surah}:${l.ays[i]}:${w.word_index}`, 'wordclass'), kind: 'feature', span: [i],
                        prompt: w.word_text, options: classes.map((x) => gt.get(x)!), answer, explanation: `${w.word_text}: ${answer}` },
                      'wordclass', `${text}\n${w.word_text}`, answer));
      });
    }

    // 2 · its parts: the sentence, each clause the data names, each phrase
    const named: Array<{ key: string; span: number[]; ref: string; set: string[] }> = [];
    if (s.cls && gt.has(s.cls) && l.ws.length >= 2) named.push({ key: 'jumla', span: l.ws.map((_, i) => i), ref: s.cls, set: sentenceSet });
    for (const c of clauses.filter((c) => c.sentence_id === s.id && c.ref && gt.has(c.ref))) {
      const a = idx(c.ayah_from, c.ws ?? 1), b = idx(c.ayah_to, c.we ?? c.ws ?? 1);
      if (a < 0 || b < a || b - a + 1 >= l.ws.length) continue;            // the whole sentence is asked once, above
      named.push({ key: `c:${c.id}`, span: Array.from({ length: b - a + 1 }, (_, k) => a + k), ref: c.ref!, set: sentenceSet });
    }
    for (const p of phrases.filter((p) => p.sentence_id === s.id && p.ref && gt.has(p.ref))) {
      const a = idx(p.ayah, p.ws), b = idx(p.ayah, p.we);
      if (a < 0 || b < a) continue;
      named.push({ key: `p:${p.id}`, span: Array.from({ length: b - a + 1 }, (_, k) => a + k), ref: p.ref!, set: phraseSet });
    }
    for (const n of named) {
      const answer = gt.get(n.ref)!;
      const others = shuffle(n.set.filter((x) => x !== n.ref)).slice(0, 3).map((x) => gt.get(x)!);
      if (others.length < 2) continue;
      const part = n.span.map((i) => l.ws[i].word_text).join(' ');
      out.push(card({ ...base(`sentpart:${s.id}:${n.key}`, 'sentpart'), kind: 'feature', span: n.span, prompt: part,
                      options: shuffle([answer, ...others]), answer, explanation: `${part}: ${answer}` },
                    'sentpart', `${text}\n${part}`, answer));
    }

    // 3 · its Arabic from its English, two words of the passage among the tiles that do not belong
    if (l.en && !/[؀-ۿ]/.test(l.en) && l.ws.length >= 3) {
      const own = new Set(l.ws.map((w) => strip(w.word_text)));
      const decoys = shuffle([...new Set(passageWords.filter((w) => !own.has(strip(w))))]).slice(0, 2);
      if (decoys.length === 2) {
        const tiles = shuffle([...l.ws.map((w, i) => ({ w: w.word_text, at: i })), ...decoys.map((w) => ({ w, at: -1 }))]);
        const solution = l.ws.map((_, i) => tiles.findIndex((t) => t.at === i));
        out.push(card({ ...base(`transbuild:${s.id}`, 'transbuild'), kind: 'transbuild', interaction: 'tiles', lang: 'ar', tileMode: 'arrange',
                        tokens: tiles.map((t) => t.w), solution, prompt: l.en, answer: text },
                      'transbuild', l.en, text));
      }
    }

    // 4 · its key terms: the meaning, Sinai's note, the word as recited
    const mine = terms.filter((t) => t.source === 'sinai_key_terms' && usable(t.label_en) && t.word_index != null
      && idx(t.ayah, t.word_index) >= 0);
    const asked = new Set<string>();
    for (const t of mine) {
      if (asked.has(t.grp)) continue;
      asked.add(t.grp);
      const i = idx(t.ayah, t.word_index!);
      const answer = t.label_en!.trim();
      const verb = /\(v\.\)/.test(answer);
      const near = shuffle(glosses.filter((g) => g !== answer && /\(v\.\)/.test(g) === verb)).slice(0, 3);
      if (near.length < 3) continue;
      const w = l.words[i];
      out.push(card({ ...base(`keyterm:meaning:${surah}:${t.ayah}:${t.word_index}`, 'keyterm_meaning'), kind: 'feature', span: [i],
                      prompt: t.head_ar ?? l.ws[i].word_text, options: shuffle([answer, ...near]), answer,
                      audio: { url: l.audio.url, start: Math.max(l.audio.start, w.s - 0.04), end: Math.min(l.audio.end, w.e + 0.1) },
                      line: l.audio, explanation: cite.get(t.grp) ?? null },
                    'keyterm', `${l.ws[i].word_text} (${t.head_ar ?? ''})`, answer));
    }
  }
  return out;
}
