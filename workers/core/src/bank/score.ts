// ─── Scoring an answer ────────────────────────────────────────────────────────
//
// One function, four templates — QTI's responseProcessing, which is why all
// three apps can be scored the same way. The scoring rule is a property of the
// ITEM, so a poll and an MCQ can sit in the same round and the room does not
// have to know which is which.
//
// Every judgement here happens on the server, and so does every clock. A
// client-reported elapsed is a client-chosen score.

export interface ScorableItem {
  interaction: string;
  scoring: string;
  response_json: string | null;
  seconds: number | null;
  points_style: string;
  speed_bonus: number;
}

export interface ScorableOption {
  id: string;
  role: string;
  is_correct: number;
  pair_key: string | null;
  credit: number | null;
  sort_order: number;
}

export interface Judgement {
  /** null ONLY when the item is unscored — not a missing value, the kind of
   *  item. A partially correct answer is `false` with `credit` between 0 and 1. */
  isCorrect: boolean | null;
  credit: number;
  points: number;
}

const BASE_POINTS = 1000;

function parse(json: string | null): Record<string, unknown> | null {
  if (!json) return null;
  try {
    const v = JSON.parse(json);
    return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
  } catch { return null; }
}

/** Text answers are compared with the differences a learner should not lose a
 *  point for: case, surrounding space, and Arabic diacritics — which are
 *  frequently absent from a keyboard and never the thing being tested. */
function normalise(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, '')   // ḥarakāt, dagger alif, taṭwīl
    .replace(/\s+/g, ' ');
}

/** Kahoot's shape: a right answer is worth more the sooner it lands, and a
 *  late-but-right answer is still worth half. Wrong is worth nothing —
 *  guessing fast must never beat thinking. */
function pointsFor(
  item: ScorableItem, credit: number, latencyMs: number | null,
): number {
  if (item.points_style === 'none' || credit <= 0) return 0;
  const multiplier = item.points_style === 'double' ? 2 : 1;
  if (!item.speed_bonus || !item.seconds || latencyMs === null) {
    return Math.round(BASE_POINTS * credit * multiplier);
  }
  const limit = Math.max(1, item.seconds) * 1000;
  const fraction = Math.min(1, Math.max(0, latencyMs / limit));
  return Math.round(BASE_POINTS * credit * multiplier * (1 - fraction / 2));
}

export function judge(
  item: ScorableItem,
  options: ScorableOption[],
  answer: unknown,
  latencyMs: number | null,
): Judgement {
  // An unscored item still records the answer. That is the whole point of a
  // poll, a word cloud and a conversation card: the response is the content.
  if (item.scoring === 'none') {
    return { isCorrect: null, credit: 0, points: 0 };
  }

  const declared = parse(item.response_json);
  let credit = 0;

  switch (item.scoring) {
    case 'match_correct': {
      if (item.interaction === 'true_false') {
        credit = answer === declared?.['correct'] ? 1 : 0;
        break;
      }
      if (item.interaction === 'text_entry' || item.interaction === 'speak'
          || item.interaction === 'listen') {
        const accepted = Array.isArray(declared?.['accept'])
          ? (declared!['accept'] as unknown[]).filter((v): v is string => typeof v === 'string')
          : [];
        const given = typeof answer === 'string' ? normalise(answer) : '';
        credit = accepted.some((a) => normalise(a) === given) ? 1 : 0;
        break;
      }
      if (item.interaction === 'tap_word') {
        // The word bank: the tokens, in order, with the pool ignored.
        const wanted = options
          .filter((o) => o.role === 'order_token')
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((o) => o.id);
        const given = Array.isArray(answer) ? answer.map(String) : [];
        credit = wanted.length > 0 && wanted.join('|') === given.join('|') ? 1 : 0;
        break;
      }
      // choice, choice_multi, inline_choice, gap_match: the whole correct set,
      // and nothing else. A partially correct multi-select is wrong here —
      // `map_response` is the template for giving it part marks.
      const correct = new Set(options.filter((o) => o.is_correct === 1).map((o) => o.id));
      const given = new Set(
        Array.isArray(answer) ? answer.map(String)
          : typeof answer === 'string' ? [answer] : []);
      credit = correct.size > 0
        && correct.size === given.size
        && [...correct].every((id) => given.has(id)) ? 1 : 0;
      break;
    }

    case 'map_response': {
      if (item.interaction === 'order') {
        const wanted = options
          .filter((o) => o.role === 'order_token')
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((o) => o.id);
        const given = Array.isArray(answer) ? answer.map(String) : [];
        // Partial credit by position, so getting most of an ordering right is
        // worth most of the marks.
        const hits = wanted.filter((id, i) => given[i] === id).length;
        credit = wanted.length ? hits / wanted.length : 0;
        break;
      }
      if (item.interaction === 'match' || item.interaction === 'associate') {
        const pairs = new Map<string, string>();
        for (const left of options.filter((o) => o.role === 'match_left')) {
          const right = options.find(
            (o) => o.role === 'match_right' && o.pair_key === left.pair_key);
          if (right) pairs.set(left.id, right.id);
        }
        const given = (answer && typeof answer === 'object' && !Array.isArray(answer))
          ? answer as Record<string, string> : {};
        const hits = [...pairs].filter(([l, r]) => given[l] === r).length;
        credit = pairs.size ? hits / pairs.size : 0;
        break;
      }
      // Per-option credit as declared on the rows.
      const given = new Set(
        Array.isArray(answer) ? answer.map(String)
          : typeof answer === 'string' ? [answer] : []);
      const total = options.reduce((sum, o) => sum + Math.max(0, o.credit ?? 0), 0);
      const earned = options
        .filter((o) => given.has(o.id))
        .reduce((sum, o) => sum + (o.credit ?? 0), 0);
      credit = total > 0 ? Math.max(0, Math.min(1, earned / total)) : 0;
      break;
    }

    case 'nearest': {
      // A slider or a pin: right within a tolerance, and nothing beyond it.
      const target = Number(declared?.['correct'] ?? NaN);
      const tolerance = Number(declared?.['tolerance'] ?? 0);
      const given = Number(answer);
      if (!Number.isFinite(target) || !Number.isFinite(given)) { credit = 0; break; }
      const distance = Math.abs(target - given);
      credit = distance <= tolerance ? 1 : 0;
      break;
    }

    default:
      credit = 0;
  }

  return {
    // Fully right, or not. Partial credit is carried by `credit`, never by a
    // third value here: NULL already means "this item has no correct answer",
    // and letting it also mean "half right" would make every accuracy figure
    // in the scorecard quietly wrong.
    isCorrect: credit >= 1,
    credit,
    points: pointsFor(item, credit, latencyMs),
  };
}
