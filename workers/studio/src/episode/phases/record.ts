/// Record — Day 2 after ʿIshāʾ: the run sheet on air, who records, and the deck when there is one.
import type { Phase } from './index';
import { runSheet } from './runsheet';
import { hostAndPartner } from '../people';

export const record: Phase = {
  key: 'record', title: 'Record', icon: 'record.circle', color: '#e05a4f',
  prepared: (ctx) => [runSheet(ctx.meta).segments.length ? 1 : 0, 1],
  build: (ctx) => ({
    ...runSheet(ctx.meta), partner: hostAndPartner(ctx).partner,
    slides: ctx.slides ? { title: ctx.slides.title, url: `com.kmaps.app://deck/${ctx.slides.deck}` } : null,
  }),
};
