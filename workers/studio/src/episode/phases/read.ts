/// Read — Day 1 after Fajr: the selected text, slowly, with the one concept and the focus timer.
import type { Phase } from './index';
import { concept } from '../focus';
import { str } from '../text';

export const read: Phase = {
  key: 'read', title: 'Read', icon: 'book', color: '#e8c96a',
  prepared: (ctx) => [(str(ctx.meta['read_unit']) || str(ctx.meta['read_note']) ? 1 : 0) + (concept(ctx.meta) ? 1 : 0), 2],
  build: (ctx) => ({ minutes: ctx.plan.steps.find((s) => s.key === 'read')?.minutes ?? 25 }),
};
