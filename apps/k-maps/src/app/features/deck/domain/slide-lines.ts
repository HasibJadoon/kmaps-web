// Contract §3: the structure five layouts read out of the Arabic text itself.
//
// Pure functions on purpose — no DOM, no Angular. The SwiftUI renderer has a
// line-for-line twin of this file (DeckFeature/Domain/SlideLines.swift), and
// the two only stay honest if the rules live somewhere testable.

import type { DeckSlide } from './deck.models';

/** A line plus the gloss that sits under it. */
export interface GlossedLine {
  ar: string;
  en: string | null;
  /** transform: the `←` result line. */
  isResult: boolean;
  /** The line carrying ﴿ ﴾ — a Qurʾānic quotation, in any layout. */
  isQuran: boolean;
  /** The التقدير line — the underlying reading. */
  isTaqdir: boolean;
}

/** table: `مضافٌ إلى معرفةٍ — التعريفُ` splits into value / key on the em dash. */
export interface TableRow {
  /** A line with no em dash spans the row as a header. */
  head: string | null;
  value: string;
  key: string;
  gloss: string | null;
}

/** bayt: the two hemistichs either side of ✧. */
export interface BaytLine {
  first: string;
  second: string | null;
  gloss: string | null;
}

const RESULT_MARK = '←';
const QURAN_OPEN = '﴿';
const TAQDIR = 'التقدير';
const HEMISTICH = '✧';
const EM_DASH = '—';

function gloss(slide: DeckSlide, i: number): string | null {
  return slide.lines_en[i] ?? null;
}

/** Every layout that renders plain lines. Classification flags come along. */
export function glossedLines(slide: DeckSlide): GlossedLine[] {
  return slide.lines_ar.map((ar, i) => ({
    ar,
    en: gloss(slide, i),
    isResult: slide.layout === 'transform' && ar.trimStart().startsWith(RESULT_MARK),
    // A ﴿ is a Qurʾānic quotation whatever the layout — climax quotes too.
    isQuran: ar.includes(QURAN_OPEN),
    isTaqdir: ar.trimStart().startsWith(TAQDIR),
  }));
}

/** split: line 0 is the stem, the rest are columns. */
export function splitStem(slide: DeckSlide): string | null {
  return slide.lines_ar[0] ?? null;
}

export function splitColumns(slide: DeckSlide): GlossedLine[] {
  return glossedLines(slide).slice(1);
}

export function tableRows(slide: DeckSlide): TableRow[] {
  return slide.lines_ar.map((line, i) => {
    const cut = line.indexOf(EM_DASH);
    if (cut === -1) {
      return { head: line, value: '', key: '', gloss: null };
    }
    return {
      head: null,
      value: line.slice(0, cut).trim(),
      // Rejoin on the em dash: a value may legitimately contain another one.
      key: line.slice(cut + EM_DASH.length).trim(),
      gloss: gloss(slide, i),
    };
  });
}

export function baytLines(slide: DeckSlide): BaytLine[] {
  return slide.lines_ar.map((line, i) => {
    const parts = line.split(HEMISTICH);
    return {
      first: parts[0].trim(),
      second: parts.length > 1 ? parts.slice(1).join(HEMISTICH).trim() : null,
      gloss: gloss(slide, i),
    };
  });
}

/**
 * notes_en: inline **strong** / *em*, and Arabic runs isolated so the
 * surrounding Latin punctuation doesn't get dragged across by bidi. Returns
 * segments rather than HTML — the template binds them, so nothing is ever
 * interpolated as markup.
 */
export interface NoteSegment {
  text: string;
  strong: boolean;
  em: boolean;
  arabic: boolean;
}

const ARABIC_RUN = /[؀-ۿݐ-ݿ][؀-ۿݐ-ݿ\sً-ْ]*/;

export function noteSegments(note: string): NoteSegment[] {
  const out: NoteSegment[] = [];

  // Emphasis first, so an Arabic run inside **bold** keeps both flags.
  const emphasis = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;

  const pushPlain = (text: string, strong: boolean, em: boolean) => {
    if (!text) return;
    // Split each chunk on its Arabic runs so they can be bidi-isolated.
    let rest = text;
    let hit: RegExpExecArray | null;
    while ((hit = ARABIC_RUN.exec(rest))) {
      if (hit.index > 0) out.push({ text: rest.slice(0, hit.index), strong, em, arabic: false });
      out.push({ text: hit[0].trim(), strong, em, arabic: true });
      rest = rest.slice(hit.index + hit[0].length);
    }
    if (rest) out.push({ text: rest, strong, em, arabic: false });
  };

  while ((m = emphasis.exec(note))) {
    pushPlain(note.slice(last, m.index), false, false);
    if (m[1] !== undefined) pushPlain(m[1], true, false);
    else pushPlain(m[2] ?? '', false, true);
    last = m.index + m[0].length;
  }
  pushPlain(note.slice(last), false, false);

  return out;
}

/** ٠١٢٣٤٥٦٧٨٩ — the numerals a right-to-left slide counts in. */
export function arabicDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}

/**
 * The k-th Qurʾānic line takes the k-th verse ref, so a parchment card can wear
 * its own reference as a tag. Returns the ref index for each Qurʾānic line.
 */
export function quranRefIndex(slide: DeckSlide): Map<number, number> {
  const out = new Map<number, number>();
  let k = 0;
  slide.lines_ar.forEach((ar, i) => {
    if (ar.includes(QURAN_OPEN)) out.set(i, k++);
  });
  return out;
}
