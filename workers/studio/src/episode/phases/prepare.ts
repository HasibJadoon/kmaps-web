/// Prepare — Day 1 evening: the timed run sheet, and the 3–5 min short (Ali's hook + the open question).
import type { Phase } from './index';
import { runSheet } from './runsheet';
import { line, obj } from '../text';

export function short(meta: Record<string, unknown>): { hook: string; open_question: string | null } | null {
  const s = obj(meta['short']);
  const hook = line(s['hook']);
  return hook ? { hook, open_question: line(s['open_question']) } : null;
}

export const prepare: Phase = {
  key: 'prepare', title: 'Prepare', icon: 'list.bullet.rectangle', color: '#e07a5f',
  prepared: (ctx) => [Math.min(runSheet(ctx.meta).segments.length, 9) + (short(ctx.meta) ? 1 : 0), 10],
  build: (ctx) => ({ ...runSheet(ctx.meta), short: short(ctx.meta) }),
};
