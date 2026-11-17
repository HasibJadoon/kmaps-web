/// Brainstorm — Ali's honest objections and the hook question he opens with; the episode's questions.
import type { Phase } from './index';
import { hostAndPartner, people, personNamed } from '../people';
import { line } from '../text';

const list = (v: unknown) => (Array.isArray(v) ? v : []).map(line).filter((s): s is string => !!s);

export const brainstorm: Phase = {
  key: 'brainstorm', title: 'Brainstorm', icon: 'note.text', color: '#e5484d',
  prepared: (ctx) => [(line(ctx.meta['hook']) ? 1 : 0) + (list(ctx.meta['objections']).length ? 1 : 0)
    + (list(ctx.meta['questions']).length ? 1 : 0), 3],
  build: (ctx) => ({
    hook: line(ctx.meta['hook']), objections: list(ctx.meta['objections']), questions: list(ctx.meta['questions']),
    partner: hostAndPartner(ctx).partner, partner_points: personNamed(people(ctx), hostAndPartner(ctx).partner),
  }),
};
