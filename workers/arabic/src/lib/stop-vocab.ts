// ── A stop's vocabulary hub (owner, 2026-10-31: "each stop has a full, unique vocabulary hub") ─────────────────────
// Every word a place teaches, gathered once: the day-sets' words (singular and plural, picture, audio), the key words
// its readings mark as they go (the read blocks' `keys`), and the words its dialogues and sentences put to use. A word
// is listed once, at the earliest stop on the map that teaches it, and carries "seen in" links back to the story,
// dialogue or sentences it comes from. Grouped by room where the stop has rooms, then by kind. The app only draws it.

import { bare } from './levels';

/** Arabic as it is searched: marks and tatweel off (`bare`), the alif forms one alif, tāʾ marbūṭa as hāʾ, alif maqṣūra as yāʾ, hamza
 *  carriers plain, Persian kāf/yāʾ as Arabic; Latin lower-cased. A query and every word go through the same fold, so "كيس", "كِيسٌ" and
 *  "كِيس" meet, and "الكتاب" meets "كِتَابٌ" by containment. */
export const fold = (t: string) => bare(t.normalize('NFC'))
  .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
  .replace(/ک/g, 'ك').replace(/[یې]/g, 'ي').toLowerCase().replace(/\s+/g, ' ').trim();

export type VocabKind = 'noun' | 'verb' | 'expression';

export const VOCAB_WORDS = {
  title: 'Words', titleAr: 'المُفْرَدَات',
  count: (n: number) => `${n} word${n === 1 ? '' : 's'}`,
  shown: (n: number, of: number) => `${n} of ${of} words`,
  none: 'No word matches',
  ui: { search: 'Search words', searchAr: 'ابْحَثْ', all: 'All', allAr: 'الْكُلُّ', seenIn: 'Seen in', hear: 'Hear', english: 'English', roomsTitle: 'Rooms', kindsTitle: 'Kinds',
        playAll: 'Play all', playAllAr: 'اِسْتَمِعْ لِلْكُلِّ', stop: 'Stop', stopAr: 'تَوَقَّفْ' },
  empty: 'Words gather here as this place gets its stories',
  general: { title: 'Around the place', titleAr: 'فِي الْمَكَانِ' },
  kinds: {
    noun: { title: 'Nouns', titleAr: 'أَسْمَاءٌ', form: 'plural' },
    verb: { title: 'Verbs', titleAr: 'أَفْعَالٌ', form: 'present' },
    expression: { title: 'Expressions', titleAr: 'تَعَابِيرُ', form: '' },
  } as Record<VocabKind, { title: string; titleAr: string; form: string }>,
};

/** The words of a reading's ```vocab block: the picture cards the reading used to end on, now the hub's. */
export interface ReadingVocab { w: string; en: string; base?: string | null; img?: string | null; audio?: string | null }

export interface SeenIn { id: string; kind: 'reading' | 'dialogue' | 'sentences'; ref: string; title: string; titleAr: string | null }
export interface VocabWord {
  id: string; ar: string; form: string | null; formLabel: string | null; gloss: string; kind: VocabKind;
  picture: string | null; audio: string | null; audioForm: string | null; seenIn: SeenIn[]; room: string | null;
  /** the root, letters only ('كتب'), when the word's day-set row names one */
  root?: string | null;
  /** set only when the request names a `focus` (e.g. 'reading:daily-home'): this word is seen there */
  focus?: boolean;
  /** every written form met in the readings (inflected tokens): searched, never sent */
  variants?: string[];
}

export interface VocabInput {
  /** the stop's day-set words, in set order */
  words: Array<{ id: string; singular: string; plural: string; gloss: string; image: string | null; audioSg: string | null; audioPl: string | null; root?: string | null }>;
  /** the stop's readings with the `keys` of every read block, in order */
  readings: Array<{ slug: string; titleEn: string; titleAr: string; keys: Array<{ w: string; en: string }>; vocab?: ReadingVocab[] }>;
  /** dialogues and sentences name the day-set word they put to use */
  dialogues: Array<{ id: string; titleAr: string; titleEn: string | null; wordIds: string[] }>;
  sentenceWordIds: string[];
  /** words taught earlier on the same map (bare lemmas): not repeated here */
  taughtBefore: Set<string>;
  /** where each node stands (node id → room key), and the rooms in plan order */
  roomOf: Map<string, string>;
  rooms: Array<{ key: string; title: string; titleAr: string | null }>;
}

/** A stored key becomes its URL; a reading's block already holds a URL ("/api/ar/audio/…"), which stays as it is. */
const asset = (k: string | null) => (k ? (k.startsWith('/') ? k : `/api/ar/audio/${k}`) : null);

/** "a bed (سَرِيرٌ — أَسِرَّةٌ)" → gloss, lemma, form. A key with no brackets is an expression, glossed as written. */
export function parseKey(k: { w: string; en: string }): { gloss: string; lemma: string; form: string | null } {
  const m = k.en.match(/^(.*?)\s*\((.+?)\s*[—–-]\s*(.+?)\)\s*$/);
  if (m) return { gloss: m[1]!.trim(), lemma: m[2]!.trim(), form: m[3]!.trim() };
  return { gloss: k.en.trim(), lemma: k.w.trim(), form: null };
}

/** What a request may narrow the hub by: a search (Arabic with or without marks, English gloss, or root), a room, a kind; and the
 *  `focus` whose words are flagged (a reading's, when the hub is opened from its last page). */
export interface VocabQuery { q?: string; room?: string; kind?: string; focus?: string }

/** "كتب" or "AL:كتب" → the root's letters. */
export const rootOf = (ref: string | null | undefined) => (ref ? ref.replace(/^AL:/, '').replace(/\s+/g, '') : null) || null;

const matches = (w: VocabWord, q: string) => {
  const f = fold(q);
  if (!f) return true;
  const letters = f.replace(/ /g, '');
  const forms = [w.ar, w.form ?? '', ...(w.variants ?? [])].map(fold);
  return forms.some((a) => a.includes(f)) || w.gloss.toLowerCase().includes(q.trim().toLowerCase())
    || (!!w.root && (fold(w.root) === letters));
};

export function buildVocabulary(i: VocabInput, ask: VocabQuery = {}) {
  const seen = new Map<string, VocabWord>();
  const idOf = new Map<string, string>();   // a day-set word's id → its bare lemma
  const add = (lemma: string, make: () => VocabWord, from?: SeenIn, extra?: { picture?: string | null; audio?: string | null; variant?: string }) => {
    const key = bare(lemma);
    if (!key || i.taughtBefore.has(key)) return;
    let w = seen.get(key);
    if (!w) { w = make(); seen.set(key, w); }
    if (from && !w.seenIn.some((s) => s.id === from.id)) w.seenIn.push(from);
    // a picture or voice a later telling brings is kept when the word has none
    if (extra?.picture && !w.picture) w.picture = extra.picture;
    if (extra?.audio && !w.audio) w.audio = extra.audio;
    if (extra?.variant && bare(extra.variant) !== key) (w.variants ??= []).push(extra.variant);
  };
  for (const w of i.words) {
    idOf.set(w.id, bare(w.singular));
    add(w.singular, () => ({ id: w.id, ar: w.singular, form: w.plural, formLabel: VOCAB_WORDS.kinds.noun.form, gloss: w.gloss, kind: 'noun',
      picture: asset(w.image), audio: asset(w.audioSg), audioForm: asset(w.audioPl), seenIn: [], room: null, root: rootOf(w.root), variants: [w.plural] }));
  }
  for (const r of i.readings) {
    const from: SeenIn = { id: `reading:${r.slug}`, kind: 'reading', ref: r.slug, title: r.titleEn, titleAr: r.titleAr };
    // the words the reading teaches with a picture (its ```vocab block): "السُّوقِ" with base "سُوقٌ — أَسْوَاقٌ"
    for (const v of r.vocab ?? []) {
      const m = (v.base ?? '').match(/^(.+?)\s*[—–-]\s*(.+)$/);
      const lemma = (m ? m[1]! : v.base || v.w).trim(), form = m ? m[2]!.trim() : null;
      const kind: VocabKind = form === null && !v.base ? 'expression' : /^to\s/i.test(v.en) ? 'verb' : 'noun';
      add(lemma, () => ({ id: `key:${bare(lemma)}`, ar: lemma, form, formLabel: form ? VOCAB_WORDS.kinds[kind].form : null,
        gloss: v.en.replace(/^(a|an|the)\s+/i, '').trim(), kind, picture: asset(v.img ?? null), audio: asset(v.audio ?? null), audioForm: null, seenIn: [], room: null,
        variants: [v.w] }), from, { picture: asset(v.img ?? null), audio: asset(v.audio ?? null), variant: v.w });
    }
    for (const k of r.keys) {
      const p = parseKey(k);
      const kind: VocabKind = p.form === null ? 'expression' : /^to\s/i.test(p.gloss) ? 'verb' : 'noun';
      add(p.lemma, () => ({ id: `key:${bare(p.lemma)}`, ar: p.lemma, form: p.form, formLabel: p.form ? VOCAB_WORDS.kinds[kind].form : null,
        gloss: p.gloss, kind, picture: null, audio: null, audioForm: null, seenIn: [], room: null, variants: [k.w] }), from, { variant: k.w });
    }
  }
  for (const d of i.dialogues) {
    const from: SeenIn = { id: `dialogue:${d.id}`, kind: 'dialogue', ref: d.id, title: d.titleEn ?? 'Listen in', titleAr: d.titleAr };
    for (const id of d.wordIds) { const l = idOf.get(id); const w = l ? seen.get(l) : undefined; if (w && !w.seenIn.some((s) => s.id === from.id)) w.seenIn.push(from); }
  }
  const sFrom: SeenIn = { id: 'sentences', kind: 'sentences', ref: '', title: 'Say it', titleAr: 'قُلْهَا' };
  for (const id of i.sentenceWordIds) { const l = idOf.get(id); const w = l ? seen.get(l) : undefined; if (w && !w.seenIn.some((s) => s.id === sFrom.id)) w.seenIn.push(sFrom); }

  const every = [...seen.values()];
  for (const w of every) w.room = w.seenIn.map((s) => i.roomOf.get(s.id)).find(Boolean) ?? null;

  const kindOrder: VocabKind[] = ['noun', 'verb', 'expression'];
  const hasRooms = i.rooms.length > 0 && every.some((w) => w.room);
  // the filters offered: the rooms and kinds that hold a word, whatever else is asked
  const filters = {
    rooms: hasRooms ? [...i.rooms.filter((r) => every.some((w) => w.room === r.key)).map((r) => ({ key: r.key, title: r.title, titleAr: r.titleAr })),
                       ...(every.some((w) => !w.room) ? [{ key: 'general', title: VOCAB_WORDS.general.title, titleAr: VOCAB_WORDS.general.titleAr }] : [])] : [],
    kinds: kindOrder.filter((k) => every.some((w) => w.kind === k)).map((k) => ({ key: k, title: VOCAB_WORDS.kinds[k].title, titleAr: VOCAB_WORDS.kinds[k].titleAr })),
  };
  const roomKey = (w: VocabWord) => w.room ?? 'general';
  const all = every.filter((w) => (!ask.room || roomKey(w) === ask.room) && (!ask.kind || w.kind === ask.kind) && (!ask.q || matches(w, ask.q)));
  if (ask.focus) for (const w of all) if (w.seenIn.some((s) => s.id === ask.focus)) w.focus = true;

  const groupsOf = (ws: VocabWord[]) => kindOrder.map((k) => ({ kind: k, title: VOCAB_WORDS.kinds[k].title, titleAr: VOCAB_WORDS.kinds[k].titleAr,
    words: ws.filter((w) => w.kind === k) })).filter((g) => g.words.length);
  const sections = hasRooms
    ? [...i.rooms.map((r) => ({ key: r.key, title: r.title, titleAr: r.titleAr, groups: groupsOf(all.filter((w) => w.room === r.key)) })),
       { key: 'general', title: VOCAB_WORDS.general.title, titleAr: VOCAB_WORDS.general.titleAr, groups: groupsOf(all.filter((w) => !w.room)) }]
        .filter((s) => s.groups.length)
    : all.length ? [{ key: 'all', title: null as string | null, titleAr: null as string | null, groups: groupsOf(all) }] : [];
  // what is sent is the word, not what was searched in it
  for (const w of every) delete w.variants;
  const asked = !!(ask.q || ask.room || ask.kind);
  return {
    count: every.length, shown: all.length,
    caption: !every.length ? VOCAB_WORDS.empty : !all.length ? VOCAB_WORDS.none : asked ? VOCAB_WORDS.shown(all.length, every.length) : VOCAB_WORDS.count(every.length),
    query: ask.q ?? '', filters, ui: VOCAB_WORDS.ui, sections,
  };
}

/** The `keys` of every ```read block of a reading's markdown. */
export function keysOf(md: string | null): Array<{ w: string; en: string }> {
  const out: Array<{ w: string; en: string }> = [];
  for (const m of (md ?? '').matchAll(/```read\s*\n([\s\S]*?)```/g)) {
    try {
      const j = JSON.parse(m[1]!);
      for (const k of j.keys ?? []) if (k?.w) out.push({ w: String(k.w), en: String(k.en ?? '') });
    } catch { /* a block that does not parse holds no keys */ }
  }
  return out;
}

/** The ```vocab blocks of a reading's markdown: its words to learn, with their pictures and voices. */
export function vocabOfReading(md: string | null): ReadingVocab[] {
  const out: ReadingVocab[] = [];
  for (const m of (md ?? '').matchAll(/```vocab\s*\n([\s\S]*?)```/g)) {
    try { for (const v of JSON.parse(m[1]!)) if (v?.w) out.push({ w: String(v.w), en: String(v.en ?? ''), base: v.base ?? null, img: v.img ?? null, audio: v.audio ?? null }); }
    catch { /* a block that does not parse holds no words */ }
  }
  return out;
}
