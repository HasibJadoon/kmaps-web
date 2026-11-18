/// Episode — Day 1 evening: the whole episode in Jessica's shape, for two people, as guidelines — the short that goes
/// out first, her nine sections (who · time · what it is for · this episode's pointer · its slides), Ali's objections,
/// and at the bottom what is ready to record and the chain to the next (the old Review step, folded in).
import type { Phase } from './index';
import { episodeTemplate } from '../template';
import { hostAndPartner } from '../people';
import { list } from './parts';

export const episode: Phase = {
  key: 'episode', title: 'Episode', icon: 'list.bullet.rectangle', color: '#e07a5f',
  prepared: (ctx) => { const t = episodeTemplate(ctx); return [t.ready.filter((c) => c.ok).length, t.ready.length]; },
  build: (ctx) => ({ ...episodeTemplate(ctx), objections: list(ctx.meta['objections']), partner: hostAndPartner(ctx).partner }),
};
