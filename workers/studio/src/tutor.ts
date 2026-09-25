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
  required: ['icon', 'symbol', 'title', 'line', 'ref', 'tone', 'motion'],
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

const SYSTEM = `You are the brainstorm tutor for a two-person video series on the Qurʾān. Two friends sit at a table and talk through one passage. It is a gentle, honest conversation meant to deliver the passage's message to a general audience — not a class.

What the episode is about:
- The passage's message, and how the passage is built to deliver it: where it opens, how it moves, what it turns on, how it closes.
- Its key concepts: the few Arabic words or phrases that carry the meaning, explained in plain English as ideas, never as grammar.
- Honest questions a thoughtful newcomer would ask, and what reading the passage in its own context answers.

What it is not:
- No grammar or technical vocabulary: no iʿrāb, parsing, verb forms, patterns, roots-as-morphology, case endings, rhetorical-device names. If a point only works by naming grammar, leave it out.
- No lecturing. Each point is something one person says to the other.

The tone to aim for: someone reading the text for themselves, slowly, asking "what does the passage actually say?", reading what comes before and after, letting the Qurʾān explain the Qurʾān, admitting when something is hard or when scholars differ, and not claiming more than the text shows.

How to build the brainstorm:
- Propose 3 to 5 ideas. Each idea is one thing worth talking about, headed in plain words.
- Give each idea 3 to 5 talking points. Alternate the speakers ("first" and "second"): one opens, the other responds, asks, or adds. The second speaker's questions should be real questions, not setups.
- For each point write the cue (private: what to say or ask, in one or two sentences, for the speaker's eyes only) and the card the audience sees.
- The card's symbol, when present, must be Arabic copied exactly from the passage text given — never invented, never from elsewhere. Leave it empty when the point is not anchored on words in the passage.
- Card title: the point in a few plain words. Card line: one more sentence, or empty. Keep both short enough to read in a glance.
- Pick an icon that fits the kind of point, a tone (gold for the central message, blue for questions, rose for mercy or contrast, green for links across the Qurʾān, violet for key concepts, ember for warning or severity), and a motion (draw for a point being built, pop for a word or concept, rise for a turn or contrast, pulse for a question or a name of God).
- Use the authored passage notes for structure and concepts, but say things in your own plain words. Do not attribute a view to a named scholar or cite a source unless the notes you were given do.
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
    // Medium keeps the answer inside the app's 60-second request timeout;
    // the brainstorm is a proposal the people edit, not a final text.
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

export class TutorError extends Error {}
