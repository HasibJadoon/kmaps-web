// A commentary line as it is read. The books write the basmala as one sign, ﷽ — a single glyph
// that fonts draw as a stretched ligature and a reader cannot follow word by word. It is spelt
// out here, and the time the aligner gave that one word is shared out among the four.

export const BASMALA = ['بِسْمِ', 'اللَّهِ', 'الرَّحْمَنِ', 'الرَّحِيمِ'];
const SIGN = '﷽';

/** The line's text and its per-word times (one per whitespace word), the basmala sign spelt out. */
export function spelled<T>(text: string, times: T[] | null): { text: string; times: Array<T | number[]> | null } {
  if (!text.includes(SIGN)) return { text, times };
  const tokens = text.split(/\s+/).filter(Boolean);
  const timed = times && times.length === tokens.length ? times : null;
  const outTokens: string[] = [];
  const outTimes: Array<T | number[]> = [];
  tokens.forEach((t, i) => {
    if (!t.includes(SIGN)) { outTokens.push(t); if (timed) outTimes.push(timed[i]); return; }
    // the sign may carry punctuation either side: it stays on the first and last word
    const [before, after] = t.split(SIGN);
    const words = BASMALA.map((w, k) => (k === 0 ? before + w : w) + (k === BASMALA.length - 1 ? after ?? '' : ''));
    outTokens.push(...words);
    if (timed) {
      const x = timed[i] as unknown;
      const ok = Array.isArray(x) && x.length === 2 && Number(x[1]) > Number(x[0]);
      const s = ok ? Number((x as number[])[0]) : 0, e = ok ? Number((x as number[])[1]) : 0, step = (e - s) / words.length;
      words.forEach((_, k) => outTimes.push(ok ? [s + step * k, s + step * (k + 1)] : []));
    }
  });
  return { text: outTokens.join(' '), times: timed ? outTimes : times };
}
