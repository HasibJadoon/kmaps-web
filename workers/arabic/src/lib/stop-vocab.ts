// ── A stop's vocabulary hub (owner, 2026-10-31: "each stop has a full, unique vocabulary hub") ─────────────────────
// Every word a place teaches, gathered once: the day-sets' words (singular and plural, picture, audio), the key words
// its readings mark as they go (the read blocks' `keys`), and the words its dialogues and sentences put to use. A word
// is listed once, at the earliest stop on the map that teaches it, and carries "seen in" links back to the story,
// dialogue or sentences it comes from. Grouped by room where the stop has rooms, then by kind. The app only draws it.

import { bare } from './levels';

export type VocabKind = 'noun' | 'verb' | 'expression';

export const VOCAB_WORDS = {
  title: 'Words', titleAr: 'المُفْرَدَات',
  count: (n: number) => `${n} word${n === 1 ? '' : 's'}`,
  empty: 'Words gather here as this place gets its stories',
  general: { title: 'Around the place', titleAr: 'فِي الْمَكَانِ' },
  kinds: {
    noun: { title: 'Nouns', titleAr: 'أَسْمَاءٌ', form: 'plural' },
    verb: { title: 'Verbs', titleAr: 'أَفْعَالٌ', form: 'present' },
    expression: { title: 'Expressions', titleAr: 'تَعَابِيرُ', form: '' },
  } as Record<VocabKind, { title: string; titleAr: string; form: string }>,
};

export interface SeenIn { id: string; kind: 'reading' | 'dialogue' | 'sentences'; ref: string; title: string; titleAr: string | null }
export interface VocabWord {
  id: string; ar: string; form: string | null; formLabel: string | null; gloss: string; kind: VocabKind;
  picture: string | null; audio: string | null; audioForm: string | null; seenIn: SeenIn[]; room: string | null;
}

export interface VocabInput {
  /** the stop's day-set words, in set order */
  words: Array<{ id: string; singular: string; plural: string; gloss: string; image: string | null; audioSg: string | null; audioPl: string | null }>;
  /** the stop's readings with the `keys` of every read block, in order */
  readings: Array<{ slug: string; titleEn: string; titleAr: string; keys: Array<{ w: string; en: string }> }>;
  /** dialogues and sentences name the day-set word they put to use */
  dialogues: Array<{ id: string; titleAr: string; titleEn: string | null; wordIds: string[] }>;
  sentenceWordIds: string[];
  /** words taught earlier on the same map (bare lemmas): not repeated here */
  taughtBefore: Set<string>;
  /** where each node stands (node id → room key), and the rooms in plan order */
  roomOf: Map<string, string>;
  rooms: Array<{ key: string; title: string; titleAr: string | null }>;
}

const asset = (k: string | null) => (k ? `/api/ar/audio/${k}` : null);

/** "a bed (سَرِيرٌ — أَسِرَّةٌ)" → gloss, lemma, form. A key with no brackets is an expression, glossed as written. */
export function parseKey(k: { w: string; en: string }): { gloss: string; lemma: string; form: string | null } {
  const m = k.en.match(/^(.*?)\s*\((.+?)\s*[—–-]\s*(.+?)\)\s*$/);
  if (m) return { gloss: m[1]!.trim(), lemma: m[2]!.trim(), form: m[3]!.trim() };
  return { gloss: k.en.trim(), lemma: k.w.trim(), form: null };
}

export function buildVocabulary(i: VocabInput) {
  const seen = new Map<string, VocabWord>();
  const idOf = new Map<string, string>();   // a day-set word's id → its bare lemma
  const add = (lemma: string, make: () => VocabWord, from?: SeenIn) => {
    const key = bare(lemma);
    if (!key || i.taughtBefore.has(key)) return;
    let w = seen.get(key);
    if (!w) { w = make(); seen.set(key, w); }
    if (from && !w.seenIn.some((s) => s.id === from.id)) w.seenIn.push(from);
  };
  for (const w of i.words) {
    idOf.set(w.id, bare(w.singular));
    add(w.singular, () => ({ id: w.id, ar: w.singular, form: w.plural, formLabel: VOCAB_WORDS.kinds.noun.form, gloss: w.gloss, kind: 'noun',
      picture: asset(w.image), audio: asset(w.audioSg), audioForm: asset(w.audioPl), seenIn: [], room: null }));
  }
  for (const r of i.readings) {
    const from: SeenIn = { id: `reading:${r.slug}`, kind: 'reading', ref: r.slug, title: r.titleEn, titleAr: r.titleAr };
    for (const k of r.keys) {
      const p = parseKey(k);
      const kind: VocabKind = p.form === null ? 'expression' : /^to\s/i.test(p.gloss) ? 'verb' : 'noun';
      add(p.lemma, () => ({ id: `key:${bare(p.lemma)}`, ar: p.lemma, form: p.form, formLabel: p.form ? VOCAB_WORDS.kinds[kind].form : null,
        gloss: p.gloss, kind, picture: null, audio: null, audioForm: null, seenIn: [], room: null }), from);
    }
  }
  for (const d of i.dialogues) {
    const from: SeenIn = { id: `dialogue:${d.id}`, kind: 'dialogue', ref: d.id, title: d.titleEn ?? 'Listen in', titleAr: d.titleAr };
    for (const id of d.wordIds) { const l = idOf.get(id); const w = l ? seen.get(l) : undefined; if (w && !w.seenIn.some((s) => s.id === from.id)) w.seenIn.push(from); }
  }
  const sFrom: SeenIn = { id: 'sentences', kind: 'sentences', ref: '', title: 'Say it', titleAr: 'قُلْهَا' };
  for (const id of i.sentenceWordIds) { const l = idOf.get(id); const w = l ? seen.get(l) : undefined; if (w && !w.seenIn.some((s) => s.id === sFrom.id)) w.seenIn.push(sFrom); }

  const all = [...seen.values()];
  for (const w of all) w.room = w.seenIn.map((s) => i.roomOf.get(s.id)).find(Boolean) ?? null;

  const kindOrder: VocabKind[] = ['noun', 'verb', 'expression'];
  const groupsOf = (ws: VocabWord[]) => kindOrder.map((k) => ({ kind: k, title: VOCAB_WORDS.kinds[k].title, titleAr: VOCAB_WORDS.kinds[k].titleAr,
    words: ws.filter((w) => w.kind === k) })).filter((g) => g.words.length);
  const byRoom = i.rooms.length > 0 && all.some((w) => w.room);
  const sections = byRoom
    ? [...i.rooms.map((r) => ({ key: r.key, title: r.title, titleAr: r.titleAr, groups: groupsOf(all.filter((w) => w.room === r.key)) })),
       { key: 'general', title: VOCAB_WORDS.general.title, titleAr: VOCAB_WORDS.general.titleAr, groups: groupsOf(all.filter((w) => !w.room)) }]
        .filter((s) => s.groups.length)
    : all.length ? [{ key: 'all', title: null as string | null, titleAr: null as string | null, groups: groupsOf(all) }] : [];
  return { count: all.length, caption: all.length ? VOCAB_WORDS.count(all.length) : VOCAB_WORDS.empty, sections };
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
