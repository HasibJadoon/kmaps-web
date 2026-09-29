import { query } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';

// Words the drills never ask about (ar_common_word, migration 0014): function
// words, and every form of a noun or verb the Qurʾān uses often. Only the
// higher-end vocabulary is drilled. Read once an hour per isolate.

const MARKS = /[ً-ْٰـۖ-ۭ]/g;
const PUNCT = /[؟،؛.!?"«»:…,()\[\]]/g;
export const fold = (w: string) =>
  w.replace(PUNCT, '').replace(MARKS, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').trim();
const CLITICS = /^(وال|فال|بال|كال|لل|ال|و|ف|ب|ل|ك)/;

export type Common = Map<string, string>;   // bare form → 'function' | 'quran_common'
let memo: { at: number; map: Common } | null = null;

export async function commonWords(env: ArabicEnv): Promise<Common> {
  if (memo && Date.now() - memo.at < 3_600_000) return memo.map;
  const rows = await query<{ bare: string; kind: string }>(env.DB_AR, `SELECT bare, kind FROM ar_common_word`).catch(() => []);
  memo = { at: Date.now(), map: new Map(rows.map((r) => [r.bare, r.kind])) };
  return memo.map;
}

/// Not to be drilled: a function word always; with `functionOnly` false (Middle, Advanced),
/// also a word the Qurʾān uses often. The form as said, or without its clitics.
export function isCommon(map: Common, word: string, functionOnly = false) {
  const hit = (k: string) => { const kind = map.get(k); return !!kind && (!functionOnly || kind === 'function'); };
  const f = fold(word);
  if (!f || hit(f)) return true;
  const s = f.replace(CLITICS, '');
  if (s.length < 2 || hit(s)) return true;
  // an inflected form the Qurʾān does not have in this shape: try it without its endings
  for (const t of [s, f]) {
    for (const end of SUFFIXES) {
      if (t.length - end.length >= 3 && t.endsWith(end) && hit(t.slice(0, -end.length))) return true;
    }
  }
  return false;
}
const SUFFIXES = ['هما', 'كما', 'تما', 'تموه', 'تم', 'هم', 'هن', 'كم', 'كن', 'نا', 'ها', 'ون', 'ين', 'وا', 'ات', 'ان', 'ني', 'ه', 'ك', 'ي', 'ة', 'ت', 'ن', 'ا'];
