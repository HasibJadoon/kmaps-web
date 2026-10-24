// A live quiz played from the drills of passages the host has studied (drill-engine plan §2.3c,
// Quiz): every drill a class has met is kept with the card it files (core_drill_class_item
// card_json, its drill at extra.drill). The room plays three ways of answering, as the drills do:
//   one    one plate of several (choose, odd_one_out, translate_pick — options with one answer)
//   all    every plate that holds (choose_all — options with the indices that hold)
//   order  tiles in their order (tiles — tokens, decoys among them, and the indices that build it)
// The answer stays on the server until the host reveals it.

export type QuizMode = 'one' | 'all' | 'order';

/** The recitation a drill is heard in (the full āyah): its file, and the stretch of it to play. */
export interface QuizAudio { url: string; start: number; end: number }

export interface QuizDrill {
  mode: QuizMode;
  prompt: string;
  /** The Arabic it is asked of (the drill's words, in order), when it has any. */
  line: string | null;
  /** The plates, or the tiles. */
  options: string[];
  /** one: the plate that holds. */
  correctIndex: number;
  /** all: the plates that hold, ascending; order: the tiles in their order. */
  correct: number[];
  explanation: string | null;
  /** The drill's own audio, when it has any; the room plays it as the question comes. */
  audio: QuizAudio | null;
}

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
/** A drill's audio as it stands ({url, start, end}); else null. */
export function quizAudioOf(v: unknown): QuizAudio | null {
  const a = v as { url?: unknown; start?: unknown; end?: unknown } | null;
  const url = text(a?.url), start = num(a?.start), end = num(a?.end);
  return url && start !== null && end !== null ? { url, start, end } : null;
}
const ints = (v: unknown) => (Array.isArray(v) && v.every((x) => Number.isInteger(x)) ? v as number[] : null);

/** A kept drill as a quiz question in one of the three ways; else null. */
export function quizDrillOf(cardJson: string | null): QuizDrill | null {
  let d: Record<string, unknown> | null = null;
  try { d = cardJson ? JSON.parse(cardJson)?.extra?.drill ?? null : null; } catch { return null; }
  if (!d || typeof d !== 'object') return null;
  const words = Array.isArray(d.words) ? (d.words as Array<{ t?: unknown }>).map((w) => text(w?.t)).filter(Boolean) : [];
  const line = words.length ? words.join(' ') : null;
  const note = d.note as { en?: unknown } | null | undefined;
  const explanation = text(d.explanation) ?? text(note?.en);
  const audio = quizAudioOf(d.audio);
  // what it asks: its prompt, else the instruction its kind carries (a tile drill has no prompt of its own)
  const prompt = text(d.prompt) ?? text(d.promptEn) ?? text(d.instruction);
  if (!prompt) return null;
  const distinct = (xs: Array<string | null>) => xs.length >= 2 && xs.every(Boolean) && new Set(xs).size === xs.length;

  if (d.interaction === 'tiles') {
    const tokens = Array.isArray(d.tokens) ? (d.tokens as unknown[]).map(text) : [];
    const sol = ints(d.solution);
    if (tokens.length < 2 || tokens.some((t) => !t) || !sol || sol.length < 2
        || sol.some((i) => i < 0 || i >= tokens.length) || new Set(sol).size !== sol.length) return null;
    return { mode: 'order', prompt, line, options: tokens as string[], correctIndex: -1, correct: sol, explanation, audio };
  }
  const options = Array.isArray(d.options) ? (d.options as unknown[]).map(text) : [];
  if (!distinct(options)) return null;
  if (d.interaction === 'choose_all') {
    const correct = ints(d.correct);
    if (!correct || !correct.length || correct.some((i) => i < 0 || i >= options.length)) return null;
    return { mode: 'all', prompt, line, options: options as string[], correctIndex: -1, correct: [...new Set(correct)].sort((a, b) => a - b), explanation, audio };
  }
  const answer = text(d.answer);
  const correctIndex = answer ? (options as string[]).indexOf(answer) : -1;
  if (correctIndex < 0) return null;
  return { mode: 'one', prompt, line, options: options as string[], correctIndex, correct: [correctIndex], explanation, audio };
}

/** Whether an answer holds: one plate; exactly the set that holds; the tiles in their order. */
export function quizAnswerHolds(q: Pick<QuizDrill, 'mode' | 'correctIndex' | 'correct'>, a: { choice?: number; picked?: number[] }): boolean {
  if (q.mode === 'one') return a.choice === q.correctIndex;
  const p = a.picked ?? [];
  if (q.mode === 'all') { const s = [...new Set(p)].sort((x, y) => x - y); return s.length === q.correct.length && s.every((v, i) => v === q.correct[i]); }
  return p.length === q.correct.length && p.every((v, i) => v === q.correct[i]);
}

/** A live question as the room hears it: what is asked, never the answer before it is revealed; the drill's
 *  audio relayed as it came. */
export interface LiveLike {
  questionId: string; prompt: string; options: string[]; seconds: number; module: string; resourceRef: string | null;
  askedAt: number; correctIndex: number | null; explanation: string | null;
  line?: string | null; mode?: QuizMode; correct?: number[] | null; audio?: QuizAudio | null;
}
export function liveMessage(live: LiveLike | null) {
  if (!live) return null;
  return {
    questionId: live.questionId,
    prompt: live.prompt,
    options: live.options,
    seconds: live.seconds,
    module: live.module,
    resourceRef: live.resourceRef,
    askedAt: live.askedAt,
    revealed: live.correctIndex !== null || !!live.correct,
    correctIndex: live.correctIndex,
    explanation: live.explanation,
    line: live.line ?? null,
    mode: live.mode ?? 'one',
    correct: live.correct ?? null,
    audio: live.audio ?? null,
  };
}
