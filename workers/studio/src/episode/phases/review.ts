/// Review — after recording: fix any claim, and write the chain — the open question and the promise the next
/// episode answers, and which passage comes next.
import type { Phase } from './index';
import { line, obj } from '../text';

export function chain(meta: Record<string, unknown>) {
  const c = obj(meta['chain']);
  return { open_question: line(c['open_question']), promise: line(c['promise']), next: line(c['next']) };
}

export const review: Phase = {
  key: 'review', title: 'Review', icon: 'checklist', color: '#c792ea',
  prepared: (ctx) => { const c = chain(ctx.meta); return [[c.open_question, c.promise, c.next].filter(Boolean).length, 3]; },
  build: (ctx) => ({ chain: chain(ctx.meta) }),
};
