import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { withCard } from './practice-kit';
import { loadAyat, type Scope } from './practice';

// ── Read & listen, sentence by sentence (qr_163) ───────────────────────────────
// After the passage is heard whole and every sentence built, each sentence of the passage (qr_ss_occ_sentence) is read
// on its own node, in four moves, each drill standing at the sentence's first word so the class places it there:
//   wordclass       each word described as the corpus (QAC) describes it, in GT terms: its kind (اسم علم, حرف جرّ,
//                   اسم موصول …), then for a noun its derivation, case, definiteness, number and gender, for a verb its
//                   tense, voice, person, number, gender and mood — each wrong option the same word with one of these
//                   changed
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
/** A word's corpus properties, as GT ids (qr_word_occurrence gt_*). */
type Props = { gt_case: string | null; gt_number: string | null; gt_gender: string | null; gt_person: string | null;
               gt_voice: string | null; gt_tense: string | null; gt_mood: string | null; gt_definiteness: string | null;
               gt_derivation_type: string | null; has_pron_suffix: number | null };
type Term = { id: string; name_ar: string; name_en: string | null; category_key: string; qac_flag: string | null; term_order: number | null };
type Timed = { t: string; s: number; e: number };
type Story = { id: string; term_grp: string; term_ar: string; seq: number; title_en: string; surah: number; ayah_from: number; word_from: number;
               ayah_to: number; word_to: number; marks_json: string; ask_en: string; answer_en: string; wrong_json: string; explain_en: string;
               gc_ref: string | null; step_gc_ref: string | null; topic_ref: string | null; term_key: string | null;
               match_json: string | null; layer: string; source_ref: string | null };

const shuffle = <T>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const strip = (s: string) => s.replace(/[ً-ْٰۖ-ۭ]/g, '');

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
  const [ayat, posRows, clauses, phrases, units, terms, stories, gts, props] = await Promise.all([
    loadAyat(env, nums.map((a) => [surah, a])),
    query<Word & Props & { ayah: number; lemma: string | null }>(env.DB_QR,
      `SELECT ayah, word_index, word_text, pos, lemma, gt_case, gt_number, gt_gender, gt_person, gt_voice, gt_tense, gt_mood,
              gt_definiteness, gt_derivation_type, has_pron_suffix
         FROM qr_word_occurrence WHERE surah = ? AND ayah BETWEEN ? AND ?`, [surah, from, to]),
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
    query<Story>(env.DB_QR,
      `SELECT id, term_grp, term_ar, seq, title_en, surah, ayah_from, word_from, ayah_to, word_to, marks_json, ask_en, answer_en, wrong_json,
              explain_en, gc_ref, step_gc_ref, topic_ref, term_key, match_json, layer, source_ref
         FROM qr_keyterm_story WHERE status = 'live' AND term_key IS NOT NULL ORDER BY term_key, seq`).catch(() => [] as Story[]),
    query<Gt & { category_key: string }>(env.DB_QR,
      `SELECT id, name_ar, category_key FROM ar_ling_gram_term
        WHERE id IN ('GT:pos:ism', 'GT:pos:fil', 'GT:pos:harf') OR category_key = 'sentence_class'
           OR id IN (SELECT DISTINCT lx_phrase_type_ref FROM qr_ss_occ_phrase WHERE lx_phrase_type_ref IS NOT NULL)`),
    // the corpus's properties as the GT registry names them (case, number … and every kind of word and particle)
    query<Term>(env.DB_QR,
      `SELECT id, name_ar, name_en, category_key, qac_flag, term_order FROM ar_ling_gram_term
        WHERE category_key IN ('pos', 'harf_maani', 'case', 'number', 'gender', 'person', 'voice', 'tense', 'mood',
                               'definiteness', 'derivation_type')`),
  ]);
  const profile = wordProfiles(props);
  const gt = new Map(gts.map((g) => [g.id, g.name_ar]));
  // the sentence classes a learner meets first; a sentence's own class is always among its options
  const sentenceSet = ['GT:sentence_class:ismiyya', 'GT:sentence_class:filiyya', 'GT:sentence_class:shartiyya',
                       'GT:sentence_class:istifhamiyya', 'GT:sentence_class:manfiyya'].filter((id) => gt.has(id));
  const phraseSet = [...new Set(phrases.map((p) => p.ref).filter((r): r is string => !!r && gt.has(r)))];
  const posOf = new Map(posRows.map((w) => [`${w.ayah}:${w.word_index}`, w]));
  const enOf = new Map(units.map((u) => [u.scope_id, u.fluent_en]));
  // Sinai's citing note for a term, only where it is anchored on the same word (a note on the same entry elsewhere is
  // about another use of it)
  const cite = new Map(terms.filter((t) => t.source === 'sinai_cite' && t.label_en && t.word_index != null)
    .map((t) => [`${t.grp}|${t.ayah}:${t.word_index}`, t.label_en!]));
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

    // 1 · each word, described as the corpus describes it (its kind, then what that kind carries)
    l.ws.forEach((w, i) => {
      if (l.ws.length < 2) return;
      const row = posOf.get(`${l.ays[i]}:${w.word_index}`);
      const p = row ? profile(row, w.word_text) : null;
      if (!p) return;
      out.push(card({ ...base(`wordclass:${surah}:${l.ays[i]}:${w.word_index}`, 'wordclass'), kind: 'feature', span: [i],
                      prompt: w.word_text, options: shuffle([p.answer, ...p.wrong]), answer: p.answer, explanation: `${w.word_text}: ${p.explain}` },
                    'wordclass', `${text}\n${w.word_text}`, p.answer));
    });

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
                      line: l.audio, explanation: cite.get(`${t.grp}|${t.ayah}:${t.word_index}`) ?? null },
                    'keyterm', `${l.ws[i].word_text} (${t.head_ar ?? ''})`, answer));
    }
  }
  // 5 · a key term's story, wherever it is met (its match: Sinai's entries on a word of the sentence, or a corpus lemma):
  // the Qurʾān's own āyāt first, each recited with its answering words marked, then the history of the word, each step
  // naming its source. The steps carry the story's own ids (KS:…), the same in every passage that meets the term, so
  // review holds each once.
  const storyOf = new Map<string, Story[]>();
  for (const st of stories) (storyOf.get(st.term_key!) ?? storyOf.set(st.term_key!, []).get(st.term_key!)!).push(st);
  const met = new Map<string, Line>();
  const metAt = new Map<string, { ayah: number; word: number }>();
  for (const [key, steps] of storyOf) {
    const m = (() => { try { return JSON.parse(steps[0].match_json ?? '{}') as { sinai?: string[]; lemmas?: string[] }; } catch { return {}; } })();
    for (const l of lines) {
      if (met.has(key)) break;
      // the word it is met on: one of its Sinai entries there, or one of its lemmas (compared in canonical form: the corpus
      // writes shadda before fatha, a hand-typed lemma may not)
      const i = l.ws.findIndex((w, k) =>
        (m.sinai ?? []).some((g) => terms.some((t) => t.grp === g && t.ayah === l.ays[k] && t.word_index === w.word_index))
        || (m.lemmas ?? []).some((lm) => (posOf.get(`${l.ays[k]}:${w.word_index}`)?.lemma ?? '').normalize('NFC') === lm.normalize('NFC')));
      if (i >= 0) { met.set(key, l); metAt.set(key, { ayah: l.ays[i], word: l.ws[i].word_index }); }
    }
  }
  if (met.size) {
    const need = [...new Set([...met.keys()].flatMap((k) => storyOf.get(k)!.filter((st) => st.surah > 0).flatMap((st) =>
      Array.from({ length: st.ayah_to - st.ayah_from + 1 }, (_, i) => `${st.surah}:${st.ayah_from + i}`))))];
    const sAyat = need.length ? await loadAyat(env, need.map((k) => k.split(':').map(Number))) : new Map();
    for (const [key, l] of met) {
      for (const st of storyOf.get(key)!) {
        const d: Drill = {
          id: `keyterm:story:${st.id}`, ask: 'keyterm_story', kind: 'feature',
          // stands on the word the term is met on in this passage: its sentence deals it, the stories in reading order
          at: metAt.get(key) ?? { ayah: l.s.ayah_from, word: l.s.ws ?? 1 },
          prompt: st.ask_en, options: shuffle([st.answer_en, ...(JSON.parse(st.wrong_json) as string[])]), answer: st.answer_en,
          explanation: st.source_ref ? `${st.explain_en}\n— ${st.source_ref}` : st.explain_en, note: { en: st.title_en, ar: st.term_ar },
          layer: st.layer, topic: st.topic_ref,
          concepts: [st.gc_ref, st.step_gc_ref].filter((x, i, a): x is string => !!x && a.indexOf(x) === i),
          source: { workId: st.surah ? `QR:SURAH:${st.surah}` : null, title: st.source_ref ?? null, level: null },
        };
        if (st.surah > 0) {
          // a Qurʾān step: its āyāt, recited, the answering words marked
          const parts = Array.from({ length: st.ayah_to - st.ayah_from + 1 }, (_, i) => sAyat.get(`${st.surah}:${st.ayah_from + i}`));
          if (parts.some((p) => !p || !p.aligned || !p.audio) || new Set(parts.map((p) => p!.audio!.url)).size > 1) continue;
          const words: Timed[] = [], ws: Word[] = [], ays: number[] = [];
          for (const p of parts) p!.ws.forEach((w: Word, i: number) => {
            if (p!.ayah === st.ayah_from && w.word_index < st.word_from) return;
            if (p!.ayah === st.ayah_to && w.word_index > st.word_to) return;
            words.push(p!.words[i]); ws.push(w); ays.push(p!.ayah);
          });
          if (!words.length) continue;
          const marks = JSON.parse(st.marks_json) as number[][];
          const range = st.ayah_to > st.ayah_from ? `${st.surah}:${st.ayah_from}–${st.ayah_to}` : `${st.surah}:${st.ayah_from}`;
          const first = parts[0]!, last = parts[parts.length - 1]!;
          Object.assign(d, {
            script: 'quran', words, span: ws.flatMap((w, i) => marks.some(([a, f, t]) => ays[i] === a && w.word_index >= f && w.word_index <= t) ? [i] : []),
            audio: { url: first.audio!.url, start: Math.max(first.audio!.start, words[0].s - 0.05), end: Math.min(last.audio!.end, words[words.length - 1].e + 0.15) },
            source: { workId: `QR:SURAH:${st.surah}`, title: `${first.title.replace(/ \d+:\d+$/, '')} ${range}`, level: null },
          });
        }
        // its card names the story step, not the passage: one review item wherever the term is met
        out.push(withCard(d, { ref: `QR:keyterm:story:${st.id}`, type: 'concept', kind: 'keyterm', front: `${st.term_ar} — ${st.ask_en}`,
                              back: `${st.answer_en}\n${st.explain_en}`, surah: st.surah || surah, ayah: st.ayah_from || null, series: st.term_ar }));
      }
    }
  }
  return out;
}

// ── a word's profile ─────────────────────────────────────────────────────────

/** The corpus tags (qr_word_occurrence.pos, QAC) a noun-like word carries: they take case and the rest. */
const NOUNISH = new Set(['N', 'PN', 'ADJ', 'PRON', 'DEM', 'REL', 'NUM', 'T', 'LOC']);

/** Builds each word's description from the GT registry: the right one, and wrong ones that change one property. */
function wordProfiles(terms: Term[]) {
  const byId = new Map(terms.map((t) => [t.id, t]));
  // a corpus tag → its GT kind: the parts of speech first, then the particles' meanings (a tag such as ACC is both a case
  // and a particle, so the kind is looked for among these two categories only)
  const kindOf = new Map<string, Term>();
  for (const cat of ['harf_maani', 'pos']) for (const t of terms) if (t.category_key === cat && t.qac_flag) kindOf.set(t.qac_flag, t);
  const ofCat = (cat: string) => terms.filter((t) => t.category_key === cat).sort((a, b) => (a.term_order ?? 0) - (b.term_order ?? 0));
  const nounKinds = ['GT:pos:ism', 'GT:pos:alam', 'GT:pos:sifa', 'GT:pos:damir', 'GT:pos:ishara', 'GT:pos:mawsul', 'GT:pos:adad']
    .map((id) => byId.get(id)).filter((t): t is Term => !!t);
  const particleKinds = [...terms.filter((t) => t.category_key === 'pos' && t.id.includes('harf') && t.id !== 'GT:pos:harf'),
                         ...ofCat('harf_maani')];

  return (w: { pos: string | null } & Props, text: string) => {
    const pos = w.pos;
    if (!pos) return null;
    // a particle carrying a pronoun (إِلَيْهِ) is two words in one: not asked
    if (!NOUNISH.has(pos) && pos !== 'V' && (w.has_pron_suffix || strip(text).length > 3) && ['P', 'ACC'].includes(pos)) return null;
    const kind = kindOf.get(pos) ?? (pos === 'V' ? byId.get('GT:pos:fil') : NOUNISH.has(pos) ? byId.get('GT:pos:ism') : byId.get('GT:pos:harf'));
    if (!kind) return null;

    // the slots, in the corpus's order; each with the others it could have been
    type Slot = { term: Term; alts: Term[] };
    const slot = (id: string | null, cat: string): Slot | null => {
      const t = id ? byId.get(id) : undefined;
      return t ? { term: t, alts: ofCat(cat).filter((x) => x.id !== t.id) } : null;
    };
    const slots: Slot[] = [];
    if (pos === 'V') {
      slots.push({ term: kind, alts: [] });
      // the imperfect's mood is marked only when it is not the indicative
      const mood = w.gt_tense === 'GT:tense:imperfect' ? (w.gt_mood ?? 'GT:mood:indicative') : null;
      for (const s of [slot(w.gt_tense, 'tense'), slot(w.gt_voice ?? 'GT:voice:active', 'voice'), slot(w.gt_person, 'person'),
                       slot(w.gt_number, 'number'), slot(w.gt_gender, 'gender'), slot(mood, 'mood')]) if (s) slots.push(s);
    } else if (NOUNISH.has(pos)) {
      const plain = pos === 'N' || pos === 'ADJ';
      // a derived noun is only ever an ism or a ṣifa: a pronoun or a name with a maṣdar would give itself away
      const derived = plain && !!w.gt_derivation_type && byId.has(w.gt_derivation_type);
      slots.push({ term: kind, alts: nounKinds.filter((t) => t.id !== kind.id && (!derived || ['GT:pos:ism', 'GT:pos:sifa'].includes(t.id))) });
      for (const s of [plain ? slot(w.gt_derivation_type, 'derivation_type') : null, slot(w.gt_case, 'case'),
                       plain ? slot(w.gt_definiteness, 'definiteness') : null,
                       slot(w.gt_number, 'number'), slot(w.gt_gender, 'gender')]) if (s) slots.push(s);
    } else {
      slots.push({ term: kind, alts: particleKinds.filter((t) => t.id !== kind.id && t.name_ar !== kind.name_ar) });
    }

    const say = (ts: Term[]) => ts.map((t) => t.name_ar).join(' · ');
    const answer = say(slots.map((s) => s.term));
    // wrong: the same word with one slot changed — a different slot each time where it can be
    const wrong: string[] = [];
    const changeable = slots.map((s, i) => ({ s, i })).filter((x) => x.s.alts.length);
    for (let round = 0; wrong.length < 3 && round < 4; round++) {
      for (const { s, i } of shuffle(changeable)) {
        if (wrong.length >= 3) break;
        const alt = shuffle(s.alts)[0];
        const v = say(slots.map((x, j) => (j === i ? alt : x.term)));
        if (v !== answer && !wrong.includes(v)) wrong.push(v);
      }
    }
    if (wrong.length < 2) return null;
    const explain = slots.map((s) => (s.term.name_en ? `${s.term.name_ar} (${s.term.name_en})` : s.term.name_ar)).join(' · ');
    return { answer, wrong: wrong.slice(0, 3), explain };
  };
}
