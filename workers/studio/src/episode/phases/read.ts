/// Read — Day 1: the text, slowly, with the one concept. Untimed (owner 2026-11-18: "no 25 min").
import type { Phase } from './index';
import { concept } from '../focus';
import { str } from '../text';

export const read: Phase = {
  key: 'read', title: 'Read', icon: 'book', color: '#e8c96a',
  prepared: (ctx) => [(str(ctx.meta['read_unit']) || str(ctx.meta['read_note']) || str(ctx.meta['read_doc']) ? 1 : 0)
    + (concept(ctx.meta) ? 1 : 0), 2],
  build: () => ({}),
};
