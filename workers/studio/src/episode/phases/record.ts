/// Record — Day 2: the episode's deck on both iPads, section by section, with the sections' guidelines (the clock
/// lights the section you are in) and who records.
import type { Phase } from './index';
import { episodeTemplate } from '../template';
import { hostAndPartner } from '../people';

export const record: Phase = {
  key: 'record', title: 'Record', icon: 'record.circle', color: '#e05a4f',
  prepared: (ctx) => { const t = episodeTemplate(ctx); return [(t.deck_url ? 1 : 0) + (t.segments.some((s) => s.pointer) ? 1 : 0), 2]; },
  build: (ctx) => {
    const t = episodeTemplate(ctx);
    return { segments: t.segments, total_minutes: t.total_minutes, deck_url: t.deck_url, partner: hostAndPartner(ctx).partner };
  },
};
