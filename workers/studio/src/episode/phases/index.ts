/// Four steps (owner 2026-11-18: "Read → Research → Episode → Record" — Review folded into Episode, as Jessica does
/// no separate review). Every step of an episode is one phase: its own look, its own "how much has Claude prepared",
/// its own screen data.
/// A phase reads only the episode meta keys it owns (plus the selected text, which every screen shows).

import type { EpisodeCtx } from '../context';
import { read } from './read';
import { research } from './research';
import { episode } from './episode';
import { record } from './record';

export interface Phase {
  key: string;
  title: string;
  icon: string;
  color: string;
  /// [parts Claude has written, parts the phase wants] — the ring's percentage.
  prepared(ctx: EpisodeCtx): [number, number];
  /// The phase's own screen data (the route adds the step header and the selected text).
  build(ctx: EpisodeCtx): Record<string, unknown>;
}

export const PHASES: Record<string, Phase> = { read, research, episode, record };
// older step keys fold into the four
const ALIASES: Record<string, string> = {
  shoot: 'record', notes: 'read', think: 'research',
  talk: 'episode', learn: 'episode', brainstorm: 'episode', prepare: 'episode', review: 'episode',
};

const plain: Phase = { key: 'step', title: 'Step', icon: 'circle', color: '#9aa0a6', prepared: () => [0, 0], build: () => ({}) };

export function phaseFor(key: string): Phase {
  return PHASES[key] ?? PHASES[ALIASES[key] ?? ''] ?? { ...plain, key, title: key };
}
