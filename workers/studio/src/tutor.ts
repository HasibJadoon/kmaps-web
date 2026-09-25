import Anthropic from '@anthropic-ai/sdk';
import type { StudioEnv } from './env';

/// Claude as the brainstorm tutor for a two-person passage discussion.
///
/// The Do Zāwiya Qurʾān episodes are a conversation between two people about
/// one passage — no grammar, no lesson. The tutor reads the passage, its
/// assembled English rendering and the authored passage sections (structure,
/// concepts, flow) from QR, and proposes ideas to talk about, each broken into
/// talking points that alternate between the two speakers. Every point comes
/// with the card the frame draws (`talk_card`) and the private cue the speaker
/// reads. Nothing is written: the app shows the proposal and the people accept
/// what they want, so the tutor suggests and the two of them decide.

const MODEL = 'claude-opus-5';

/// The icon vocabulary the stage inlines and the app maps to SF Symbols.
/// Keep in step with `builders/talk_card.js` (kmaps-studio) and
/// `StudioDiscussion.swift` (kmaps-ios).
export const TALK_ICONS = [
  'lightbulb', 'book-open', 'scroll-text', 'key', 'scale', 'shield', 'heart',
  'flame', 'crown', 'sun', 'moon-star', 'mountain', 'eye', 'ear',
  'message-circle', 'compass', 'infinity', 'arrow-down-to-line', 'sparkles',
  'link', 'arrow-left-right', 'rotate-ccw', 'hand', 'star', 'languages',
  'circle-help', 'target',
] as const;
export const TALK_TONES = ['gold', 'blue', 'rose', 'green', 'violet', 'ember'] as const;
export const TALK_MOTIONS = ['draw', 'pop', 'rise', 'pulse'] as const;

export interface PassageBrief {
  span: string;
  ayahs: Array<{ ayah: number; text: string }>;
  translation_en: string | null;
  sections: Array<{ key: string; data: string | null }>;
}

export interface TutorCard {
  icon: string;
  symbol: string;
  title: string;
  line: string;
  ref: string;
  tone: string;
  motion: string;
  visual: 'none' | 'steps' | 'senses' | 'link' | 'contrast';
  steps: Array<{ ref: string; text: string }>;
  senses: string[];
  link: { from: string; to: string; text: string };
  contrast: { told: string; text: string };
}

export interface TutorPoint {
  speaker: 'first' | 'second';
  cue: string;
  card: TutorCard;
}

export interface TutorIdea {
  heading: string;
  why: string;
  points: TutorPoint[];
}

export interface TutorResult {
  ideas: TutorIdea[];
}

const CARD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['icon', 'symbol', 'title', 'line', 'ref', 'tone', 'motion',
             'visual', 'steps', 'senses', 'link', 'contrast'],
  properties: {
    icon: { type: 'string', enum: [...TALK_ICONS] },
    symbol: {
      type: 'string',
      description: 'Arabic copied exactly from the passage text, or empty.',
    },
    title: { type: 'string', description: 'The point in one short line, plain English.' },
    line: { type: 'string', description: 'One more sentence, or empty.' },
    ref: { type: 'string', description: 'The āyah, e.g. "40:3", or empty.' },
    tone: { type: 'string', enum: [...TALK_TONES] },
    motion: { type: 'string', enum: [...TALK_MOTIONS] },
    visual: {
      type: 'string',
      enum: ['none', 'steps', 'senses', 'link', 'contrast'],
      description: 'Which drawing the card animates under its text. Fill only that field; leave the others empty.',
    },
    steps: {
      type: 'array',
      description: 'visual "steps": the passage walked verse by verse, one rung per āyah or turn.',
      items: {
        type: 'object', additionalProperties: false, required: ['ref', 'text'],
        properties: { ref: { type: 'string' }, text: { type: 'string' } },
      },
    },
    senses: {
      type: 'array',
      description: 'visual "senses": the range of meaning of the key word in symbol, 3 to 5 plain English words.',
      items: { type: 'string' },
    },
    link: {
      type: 'object', additionalProperties: false, required: ['from', 'to', 'text'],
      description: 'visual "link": this passage joined to another place in the Qurʾān that speaks to it.',
      properties: { from: { type: 'string' }, to: { type: 'string' }, text: { type: 'string' } },
    },
    contrast: {
      type: 'object', additionalProperties: false, required: ['told', 'text'],
      description: 'visual "contrast": a common assumption or misquotation, then what the passage actually says.',
      properties: { told: { type: 'string' }, text: { type: 'string' } },
    },
  },
} as const;

const RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ideas'],
  properties: {
    ideas: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['heading', 'why', 'points'],
        properties: {
          heading: { type: 'string' },
          why: { type: 'string' },
          points: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['speaker', 'cue', 'card'],
              properties: {
                speaker: { type: 'string', enum: ['first', 'second'] },
                cue: { type: 'string' },
                card: CARD_SCHEMA,
              },
            },
          },
        },
      },
    },
  },
} as const;

const SYSTEM = `You are the brainstorm tutor for a two-person podcast on the Qurʾān. Two friends sit at a table and talk through one passage. It is a gentle, honest conversation that delivers the passage's message to a general audience — not a class. No grammar, no technical discussion: the passage at the level of its message, its concepts and its structure.

The model for the tone is a thoughtful reader going through a passage for themselves. She starts from what people assume the passage says. She asks the basic questions — what comes before this, what comes after it, who is "them", why, when does it stop. She reads the passage in its context and walks it verse by verse. When a key word will not fit one English word (fitna, taqwā) she gives its range of meaning plainly and admits where scholars have read it differently. She lets the Qurʾān explain the Qurʾān by pointing to another place that uses the same idea. She notices the limits and turns the text itself contains. She puts the whole passage together at the end, says honestly what it settles and what it does not, and closes with what it asks of the listener.

Build the brainstorm along that arc, adapted to the passage in front of you:
1. The way in — what a listener might already think or ask about this passage, or why it matters.
2. Reading it in context — where it sits, what comes before and after.
3. Walking it — the turns of the passage, verse by verse, in plain words.
4. The key concepts — the few words or phrases that carry the meaning, as ideas, with their range.
5. The Qurʾān explaining the Qurʾān — a place elsewhere that sheds light on it, only when you are sure of it.
6. Putting it together — the passage's shape as one piece, and honestly what it does and does not settle.
7. What it asks of us — a closing reflection.
Not every passage needs all seven; propose 4 to 6 ideas that follow this order.

Each idea has 3 to 5 talking points that alternate between the two speakers ("first" and "second"). One opens, the other responds, asks, pushes back, or adds. The questions are real questions a newcomer would ask, not setups.

For every point write:
- cue: private, for the speaker only — what to say or ask, in one or two sentences.
- card: what the audience sees, fully animated.
  - title: the point in a few plain words. line: one more sentence, or empty.
  - symbol: Arabic copied exactly from the passage text given, or empty. Never Arabic from elsewhere.
  - ref: the āyah, e.g. "2:191", or empty.
  - icon, tone and motion: tone gold for the central message, blue for questions, rose for mercy or contrast, green for structure and links, violet for key concepts, ember for warning or severity; motion draw for a point being built, pop for a concept, rise for a turn or contrast, pulse for a question or a name of God.
  - visual — give most points one, so the card draws something as it is said:
    · "steps" to walk the passage or put it together: one rung per āyah or turn, ref and a short plain line each.
    · "senses" for a key concept: put the word in symbol and its range in senses.
    · "link" for the Qurʾān explaining the Qurʾān: from is this passage's āyah, to is the other āyah, text is a plain-English description of what that place is about — a description, never a quoted translation. Use it only when you are certain of the reference; otherwise do not use link.
    · "contrast" when a common assumption or misquotation meets what the passage actually says: told is the assumption, text is the passage's own point.
    · "none" when words alone carry it.
    Fill only the selected field; leave the others as empty strings or empty lists.

Rules:
- No grammar or technical vocabulary: no parsing, verb forms, patterns, case endings, rhetorical-device names. If a point only works by naming grammar, leave it out.
- Do not attribute a view to a named scholar or cite a work unless the notes you were given do. "Some commentators read it as…" is fine when true.
- Where the passage is hard, say it is hard. Do not make difficult verses comfortable, and do not make them frightening.
- If the people have already written ideas, do not repeat them; add what is missing.`;

function briefText(brief: PassageBrief): string {
  const lines: string[] = [`Passage ${brief.span}`, '', 'Text:'];
  for (const a of brief.ayahs) lines.push(`(${a.ayah}) ${a.text}`);
  if (brief.translation_en) lines.push('', 'English rendering:', brief.translation_en);
  if (brief.sections.length) {
    lines.push('', 'Authored notes on the passage (JSON, by section):');
    for (const s of brief.sections) {
      if (s.data) lines.push(`[${s.key}] ${s.data}`);
    }
  }
  return lines.join('\n');
}

export async function brainstorm(
  env: StudioEnv,
  input: {
    brief: PassageBrief;
    episodeTitle: string;
    speakers: [string, string];
    existing: Array<{ heading: string; points: string[] }>;
    focus?: string;
  },
): Promise<TutorResult> {
  const { brief, episodeTitle, speakers, existing, focus } = input;

  const request: string[] = [
    `Episode: ${episodeTitle}`,
    `The two speakers: "first" is ${speakers[0]}, "second" is ${speakers[1]}.`,
    '',
    briefText(brief),
  ];
  if (existing.length) {
    request.push('', 'Ideas already written (do not repeat these):');
    for (const idea of existing) {
      request.push(`- ${idea.heading}`);
      for (const p of idea.points) request.push(`    · ${p}`);
    }
  }
  if (focus) request.push('', `What they want to explore this time: ${focus}`);

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    system: SYSTEM,
    messages: [{ role: 'user', content: request.join('\n') }],
    // Medium keeps a full brainstorm to a minute or two (the app waits up to
    // four); it is a proposal the people edit, not a final text.
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: RESULT_SCHEMA } },
  });

  if (response.stop_reason === 'refusal') {
    throw new TutorError('The tutor declined this passage.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new TutorError('The tutor ran out of room before finishing.');
  }

  const text = response.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('');
  let parsed: TutorResult;
  try {
    parsed = JSON.parse(text) as TutorResult;
  } catch {
    throw new TutorError('The tutor answered in a shape that could not be read.');
  }

  // The symbol must be words from this passage. Structured output guarantees
  // the shape, not the content, so a symbol that is not in the text is
  // dropped rather than put on screen as if it were Qurʾān.
  const corpus = brief.ayahs.map((a) => a.text).join(' ');
  for (const idea of parsed.ideas) {
    for (const point of idea.points) {
      const symbol = point.card.symbol.trim();
      point.card.symbol = symbol && corpus.includes(symbol) ? symbol : '';
    }
  }
  return parsed;
}

/// The card as the stage takes it: the text fields, plus only the drawing the
/// tutor chose — an empty ladder or link would otherwise draw an empty frame.
export function cardPayload(card: TutorCard): Record<string, unknown> {
  const out: Record<string, unknown> = {
    icon: card.icon, tone: card.tone, motion: card.motion,
  };
  for (const key of ['symbol', 'title', 'line', 'ref'] as const) {
    if (card[key].trim()) out[key] = card[key].trim();
  }
  const steps = card.steps.filter((r) => r.text.trim());
  const senses = card.senses.map((t) => t.trim()).filter(Boolean);
  if (card.visual === 'steps' && steps.length) out.steps = steps;
  if (card.visual === 'senses' && senses.length) out.senses = senses;
  if (card.visual === 'link' && card.link.to.trim()) out.link = card.link;
  if (card.visual === 'contrast' && card.contrast.told.trim() && card.contrast.text.trim()) {
    out.contrast = card.contrast;
  }
  return out;
}

export class TutorError extends Error {}
