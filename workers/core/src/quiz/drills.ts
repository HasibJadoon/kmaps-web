// A live quiz played from the drills of passages the host has studied (drill-engine plan §2.3c,
// Quiz): every drill a class has met is kept with the card it files (core_drill_class_item
// card_json, its drill at extra.drill). The room plays those with one right answer among their
// choices; the answer stays on the server until the host reveals it.

export interface QuizDrill {
  prompt: string;
  /** The Arabic it is asked of (the drill's words, in order), when it has any. */
  line: string | null;
  options: string[];
  correctIndex: number;
  explanation: string | null;
}

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** A kept drill as a quiz question: one right answer among two or more distinct choices; else null. */
export function quizDrillOf(cardJson: string | null): QuizDrill | null {
  let d: Record<string, unknown> | null = null;
  try { d = cardJson ? JSON.parse(cardJson)?.extra?.drill ?? null : null; } catch { return null; }
  if (!d || typeof d !== 'object') return null;
  const options = Array.isArray(d.options) ? (d.options as unknown[]).map(text) : [];
  const answer = text(d.answer);
  if (options.length < 2 || options.some((o) => !o) || new Set(options).size !== options.length || !answer) return null;
  const correctIndex = (options as string[]).indexOf(answer);
  if (correctIndex < 0) return null;
  const prompt = text(d.prompt) ?? text(d.promptEn);
  if (!prompt) return null;
  const words = Array.isArray(d.words) ? (d.words as Array<{ t?: unknown }>).map((w) => text(w?.t)).filter(Boolean) : [];
  const note = d.note as { en?: unknown } | null | undefined;
  return { prompt, line: words.length ? words.join(' ') : null, options: options as string[], correctIndex,
           explanation: text(d.explanation) ?? text(note?.en) };
}
