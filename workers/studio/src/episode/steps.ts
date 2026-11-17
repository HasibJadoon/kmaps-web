/// The episode's steps as the ring draws them, each with the day it falls on, its cue, who does it, the minutes
/// studied on it, and how much of it Claude has prepared. Nothing is logged by hand (owner 2026-11-17): the step in
/// hand is the first one not yet studied for its planned minutes, and the episode is finished once it is published.

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
  /// Minutes studied on the step's screen.
  studied_min: number;
  /// What the ring writes on the arc: the minutes studied, or Claude's prepared % before any study.
  badge: string;
}

/// "12 min" · "1 h 5 min" · "<1 min"
export function minutesLabel(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (seconds > 0 && m === 0) return '<1 min';
  return m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`;
}

export function stepViews(ctx: EpisodeCtx): StepView[] {
  const { plan, checklist: c } = ctx;
  const today = dayIn(plan.tz, ctx.now);
  const minOff = Math.min(0, ...plan.steps.map((d) => d.offset ?? 0));
  // the step in hand: the first one not ticked (from before) and not yet studied for its planned minutes
  const enough = (i: number) => {
    const st = c.steps[i]!, mins = plan.steps.find((d) => d.key === st.key)?.minutes ?? null;
    return st.done || (mins ? st.studied >= mins * 60 : st.studied > 0);
  };
  let firstOpen = -1;
  if (c.state === 'active') {
    firstOpen = c.steps.findIndex((_, i) => !enough(i));
    if (firstOpen < 0) firstOpen = c.steps.length - 1;   // all studied: the last step (Review) until it is published
  }
  return c.steps.map((st, i) => {
    const def = plan.steps.find((d) => d.key === st.key);
    const phase = phaseFor(def?.phase ?? st.key);
    const [have, total] = phase.prepared(ctx);
    let when: string | null = null, cueOn: string | null = null;
    if (c.state === 'done' || st.done) when = 'done';
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
      state: c.state === 'done' || st.done ? 'done' : i === firstOpen ? 'now' : 'later', when, cue_on: cueOn,
      prepared: { have, total, pct: total ? Math.round((have / total) * 100) : 100 },
      studied_min: Math.round(st.studied / 60),
      badge: st.studied > 0 ? minutesLabel(st.studied)
        : c.state === 'done' || st.done ? 'done' : `${total ? Math.round((have / total) * 100) : 100}%`,
    };
  });
}
