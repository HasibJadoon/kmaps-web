/// The episode's steps as the ring draws them, each with the day it falls on, its cue, who does it, whether it is
/// logged, and how much of it Claude has prepared.

import { dayIn } from '../checklist';
import type { EpisodeCtx } from './context';
import { phaseFor } from './phases';
import { daysBetween } from './text';

export interface StepView {
  key: string;
  phase: string;
  title: string;
  label: string;
  day: number;
  cue: string | null;
  cue_prayer: string | null;
  cue_after_min: number | null;
  minutes: number | null;
  who: string | null;
  color: string;
  icon: string;
  state: 'done' | 'now' | 'later';
  /// "today" · "tomorrow" · "in 3 days" · "done" · "waits its turn".
  when: string | null;
  /// The day it is planned for (YYYY-MM-DD; today when the plan has rolled past it), for the phone's reminder.
  cue_on: string | null;
  prepared: { have: number; total: number; pct: number };
}

export function stepViews(ctx: EpisodeCtx): StepView[] {
  const { plan, checklist: c } = ctx;
  const today = dayIn(plan.tz, ctx.now);
  const minOff = Math.min(0, ...plan.steps.map((d) => d.offset ?? 0));
  const firstOpen = c.state === 'active' ? c.steps.findIndex((s) => !s.done) : -1;
  return c.steps.map((st, i) => {
    const def = plan.steps.find((d) => d.key === st.key);
    const phase = phaseFor(def?.phase ?? st.key);
    const [have, total] = phase.prepared(ctx);
    let when: string | null = null, cueOn: string | null = null;
    if (st.done) when = 'done';
    else if (c.state === 'queued') when = 'waits its turn';
    else if (st.planned_on) {
      const d = daysBetween(today, st.planned_on);
      cueOn = d < 0 ? today : st.planned_on;
      when = d <= 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`;
    }
    return {
      key: st.key, phase: phase.key, title: phase.title, label: st.label,
      day: (def?.offset ?? 0) - minOff + 1,
      cue: def?.cue ?? null, cue_prayer: def?.cuePrayer ?? null, cue_after_min: def?.cueAfterMin ?? null,
      minutes: def?.minutes ?? null, who: def?.who ?? null, color: phase.color, icon: phase.icon,
      state: st.done ? 'done' : i === firstOpen ? 'now' : 'later', when, cue_on: cueOn,
      prepared: { have, total, pct: total ? Math.round((have / total) * 100) : 100 },
    };
  });
}
