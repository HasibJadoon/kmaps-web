// The checks every drill must pass before it is dealt or filed (AR srsCardFor, QR ensureCard, WV filed()) — the same
// checks become the AGR:DRL rules Claude-authored drills are gated by.

/** Kinds whose options differ by their vowels on purpose (an iʿrāb ending, a ṣarf pattern): compared as written. */
const VOWEL_GRADED = /^(grammar|feature|plural|nuance|sarf|sarf_|sf_|irab|gt_wazn|adima_pattern)/;
const strip = (s: string) => s.replace(/[ً-ْٰـ]/g, '').replace(/\s+/g, ' ').trim();

/** Whether a drill's choices are sound: the answer among them, no two the same, at least two to choose from. */
export function validOptions(d: Record<string, unknown>): boolean {
  const opts = d.options;
  if (!Array.isArray(opts)) {
    // pairs need three partners to be a matching task
    if (Array.isArray(d.pairs)) return (d.pairs as unknown[]).length >= 3;
    return true;                                    // tiles, order, listen …: their own shape is checked by the app
  }
  const list = opts.map((o) => String(o));
  if (list.length < 2) return false;
  const key = VOWEL_GRADED.test(String(d.kind ?? '')) || VOWEL_GRADED.test(String(d.ask ?? '')) ? (x: string) => x.trim() : strip;
  if (new Set(list.map(key)).size !== list.length) return false;
  if (Array.isArray(d.correct)) return (d.correct as unknown[]).length > 0 && (d.correct as number[]).every((i) => i >= 0 && i < list.length);
  return typeof d.answer === 'string' && list.includes(d.answer);
}

// A drill's GLOBAL id is made by core when it is filed, by the km_core standard (core migration 050):
// DRL:<cyb_domain.code>:<cyb_discipline.code>:<the drill's stable id>. A worker gives the stable id, and a drill that
// knows its discipline better than its kind (a grammar-term drill: its term's) carries it as `discipline`.
