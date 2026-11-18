/// Research — Day 1: the dig, untimed (for a Worldview book, the deep dive): what caught our eye, one voice and one
/// who reads it differently, the parallel, what we don't know yet.
import type { Phase } from './index';
import { line } from '../text';
import { list, parallel, sources } from './parts';

export const research: Phase = {
  key: 'research', title: 'Research', icon: 'magnifyingglass', color: '#81b29a',
  prepared: (ctx) => [(line(ctx.meta['struck']) ? 1 : 0) + sources(ctx.meta).length + (parallel(ctx.meta) ? 1 : 0)
    + (list(ctx.meta['unknowns']).length ? 1 : 0), 5],
  build: (ctx) => ({
    struck: line(ctx.meta['struck']), sources: sources(ctx.meta), parallel: parallel(ctx.meta), unknowns: list(ctx.meta['unknowns']),
  }),
};
