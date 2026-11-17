/// A series' own simple planner, in place of the production pipeline.
///
/// The series row says it all in its meta, so the apps only draw it:
///   steps         [{key, label, hint?, opens?}] — e.g. Read · Notes & questions · Build · Shoot
///   cadence_days  one episode every N days (optional), or
///   weekday       one episode a week, aimed at this weekday (0 Sunday … 6 Saturday)
///   weekdays      several fixed recording days a week, e.g. [1, 4] = Monday and Thursday (owner 2026-11-17:
///                 "weekly 4 episodes" — two Qurʾān, two Worldview); wins over cadence_days
///   tz            the owner's time zone, for "today" and the labels
///   open_url      a link template for a step that opens something, e.g.
///                 "com.kmaps.app://wv/unit/{unit}"
/// Each episode keeps its study time in its own meta (`study`: step key → seconds, owner 2026-11-17: "no log, capture
/// study time, the user just studies") and is finished when its Episode is published (`published.long.at`). Ticks
/// from before (`steps_done`: key → ISO time) still finish an episode whose every step was ticked.
/// and a step with `opens: "read_unit"` takes its target from the episode's
/// meta `read_unit`.
///
/// A step can carry `offset` (days before the episode's aim day: -5 Monday for a
/// Saturday episode) and `action` (what its button does: notes, shoot …).
/// Episodes whose meta says `planner: false` are left out.
///
/// The dates roll: the next unfinished episode is due `cadence_days` after the
/// last one was finished (or on the next `weekday`), never before today, and
/// each one after it a cadence later. Fall behind and the plan moves with you;
/// nothing is ever shown as overdue.

export interface StepDef {
  key: string; label: string; hint: string | null; opens: string | null;
  offset: number | null; action: string | null;
  /// The if-then cue ("After Fajr"), the prayer it follows and the minutes after it (for the phone's reminder), and
  /// the minutes of the step's focus timer — all from the series row.
  cue: string | null; cuePrayer: string | null; cueAfterMin: number | null; minutes: number | null;
  /// Who does the step (Hasib · Ali · both) and which phase screen it opens (read · think · brainstorm · prepare ·
  /// record · review; the key itself when absent).
  who: string | null; phase: string | null;
}
export interface SeriesPlan {
  steps: StepDef[]; cadenceDays: number | null; weekday: number | null; tz: string; openUrl: string | null;
  /// Fixed recording weekdays (0 Sunday … 6 Saturday), when the series records on set days.
  weekdays: number[] | null;
}

export interface Step {
  key: string;
  label: string;
  hint: string | null;
  done: boolean;
  done_at: string | null;
  /// Seconds studied on this step's screen, captured by the app.
  studied: number;
  /// What this step opens, when it opens something (the reading).
  open?: { unit: string; url: string | null };
  /// What the step's button does (notes, shoot …), from the series row.
  action: string | null;
  /// The day this step is planned for (its offset from the aim day), when it has one.
  planned_on: string | null;
  planned_label: string | null;
}

export interface Checklist {
  steps: Step[];
  done: number;
  total: number;
  /// YYYY-MM-DD in the series' time zone, and the same as "Thu 20 Nov".
  target_on: string | null;
  target_label: string | null;
  /// The one to work on now: the first unfinished episode in order.
  up_next: boolean;
  /// active — the one episode in hand (it alone has dates); queued — waiting its turn; done — recorded.
  state: 'active' | 'queued' | 'done';
  finished_on: string | null;
  finished_label: string | null;
  /// Seconds studied on all the steps.
  studied: number;
}

export interface PlanEpisode { id: string; session_no: number | null; meta_json: string | null }

function metaObject(json: string | null): Record<string, unknown> {
  if (!json) return {};
  try {
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown> : {};
  } catch { return {}; }
}

export function seriesPlan(seriesMeta: string | null): SeriesPlan {
  const meta = metaObject(seriesMeta);
  const steps: StepDef[] = [];
  if (Array.isArray(meta['steps'])) {
    for (const item of meta['steps']) {
      if (!item || typeof item !== 'object') continue;
      const r = item as Record<string, unknown>;
      if (typeof r['key'] !== 'string' || typeof r['label'] !== 'string') continue;
      steps.push({
        key: r['key'], label: r['label'],
        hint: typeof r['hint'] === 'string' ? r['hint'] : null,
        opens: typeof r['opens'] === 'string' ? r['opens'] : null,
        offset: typeof r['offset'] === 'number' ? r['offset'] : null,
        action: typeof r['action'] === 'string' ? r['action'] : null,
        cue: typeof r['cue'] === 'string' ? r['cue'] : null,
        cuePrayer: typeof r['cue_prayer'] === 'string' ? r['cue_prayer'] : null,
        cueAfterMin: typeof r['cue_after_min'] === 'number' ? r['cue_after_min'] : null,
        minutes: typeof r['minutes'] === 'number' ? r['minutes'] : null,
        who: typeof r['who'] === 'string' ? r['who'] : null,
        phase: typeof r['phase'] === 'string' ? r['phase'] : null,
      });
    }
  }
  const cadence = meta['cadence_days'];
  const weekday = meta['weekday'];
  const wd = typeof weekday === 'number' && weekday >= 0 && weekday <= 6 ? weekday : null;
  const wds = Array.isArray(meta['weekdays'])
    ? [...new Set((meta['weekdays'] as unknown[]).filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6))].sort()
    : [];
  return {
    steps,
    // set recording days space episodes ~7/n days apart (the streak's gap); one weekday = weekly
    cadenceDays: wds.length ? Math.ceil(7 / wds.length) : wd !== null ? 7 : (typeof cadence === 'number' && cadence > 0 ? cadence : null),
    weekday: wds.length ? null : wd,
    weekdays: wds.length ? wds : null,
    tz: typeof meta['tz'] === 'string' ? meta['tz'] : 'UTC',
    openUrl: typeof meta['open_url'] === 'string' ? meta['open_url'] : null,
  };
}

export function episodeSteps(plan: SeriesPlan, episodeMeta: string | null): Step[] {
  const meta = metaObject(episodeMeta);
  const doneRaw = meta['steps_done'];
  const done = doneRaw && typeof doneRaw === 'object' && !Array.isArray(doneRaw)
    ? doneRaw as Record<string, unknown> : {};
  const studyRaw = meta['study'];
  const study = studyRaw && typeof studyRaw === 'object' && !Array.isArray(studyRaw) ? studyRaw as Record<string, unknown> : {};
  return plan.steps.map((d) => {
    const at = done[d.key];
    const secs = study[d.key];
    const step: Step = {
      key: d.key, label: d.label, hint: d.hint,
      done: typeof at === 'string', done_at: typeof at === 'string' ? at : null,
      studied: typeof secs === 'number' && secs > 0 ? Math.round(secs) : 0,
      action: d.action, planned_on: null, planned_label: null,
    };
    const target = d.opens ? meta[d.opens] : undefined;
    if (typeof target === 'string' && target) {
      step.open = { unit: target, url: plan.openUrl ? plan.openUrl.replace('{unit}', target) : null };
    }
    return step;
  });
}

/// A calendar day in a time zone, as YYYY-MM-DD.
export function dayIn(tz: string, at: Date): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
      .format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/// "2026-11-20" → "Thu 20 Nov".
export function dayLabel(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const wd = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short' }).format(d);
  const dm = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(d);
  return `${wd} ${dm}`;
}

/// The first `weekday` (0 Sunday … 6 Saturday) on or after `day`.
export function nextWeekday(day: string, weekday: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  return addDays(day, (weekday - d.getUTCDay() + 7) % 7);
}

function isPlanned(e: PlanEpisode): boolean {
  if (!e.meta_json) return true;
  try { return JSON.parse(e.meta_json)?.planner !== false; } catch { return true; }
}

/// Every episode's checklist and rolling target date, for one series.
export function checklists(plan: SeriesPlan, episodes: PlanEpisode[], now: Date): Map<string, Checklist> {
  const out = new Map<string, Checklist>();
  if (!plan.steps.length) return out;
  const ordered = episodes.filter(isPlanned).sort((a, b) => (a.session_no ?? 1e9) - (b.session_no ?? 1e9));
  const today = dayIn(plan.tz, now);

  const rows = ordered.map((e) => {
    const steps = episodeSteps(plan, e.meta_json);
    const done = steps.filter((s) => s.done).length;
    // finished: its Episode is published; or, from before study time, every step was ticked
    const pub = publishedAt(e.meta_json);
    const last = pub ?? (done === steps.length ? steps.map((s) => s.done_at ?? '').sort().pop() ?? null : null);
    return { e, steps, done, finished_on: last ? dayIn(plan.tz, new Date(last)) : null };
  });

  const lastFinish = rows.map((r) => r.finished_on).filter((d): d is string => !!d).sort().pop() ?? null;
  let cursor: string | null = null;
  if (plan.weekdays?.length) {
    // the next set recording day whose first planned step is still today or later, after the last finished episode
    const lead = -Math.min(0, ...plan.steps.map((st) => st.offset ?? 0));
    const earliest = addDays(today, lead);
    const afterLast = lastFinish ? addDays(lastFinish, 1) : earliest;
    const from = afterLast > earliest ? afterLast : earliest;
    cursor = plan.weekdays.map((w) => nextWeekday(from, w)).sort()[0]!;
  } else if (plan.weekday !== null) {
    // the next aim day after the last finished episode, never before today
    const after = lastFinish && addDays(lastFinish, 1) > today ? addDays(lastFinish, 1) : today;
    cursor = nextWeekday(after, plan.weekday);
  } else if (plan.cadenceDays) {
    // the earliest aim day whose first planned step is still today or later (day 1 read → day 2 record)
    const lead = -Math.min(0, ...plan.steps.map((st) => st.offset ?? 0));
    const earliest = addDays(today, lead);
    const fromLast = lastFinish ? addDays(lastFinish, plan.cadenceDays) : earliest;
    cursor = fromLast < earliest ? earliest : fromLast;
  }

  // One episode is active at a time: only it gets an aim day and planned sessions; the rest wait their turn and
  // the next is queued up once this one is recorded (owner 2026-11-17).
  let nextFound = false;
  for (const r of rows) {
    const unfinished = r.finished_on === null;
    const upNext = unfinished && !nextFound;
    if (upNext) nextFound = true;
    const target: string | null = upNext && cursor && plan.cadenceDays ? cursor : null;
    if (target) {
      for (const [i, st] of r.steps.entries()) {
        const off = s0(plan.steps[i]?.offset);
        if (off === null) continue;
        st.planned_on = addDays(target, off);
        st.planned_label = dayLabel(st.planned_on);
      }
    }
    out.set(r.e.id, {
      steps: r.steps, done: r.done, total: r.steps.length,
      target_on: target, target_label: target ? dayLabel(target) : null,
      up_next: upNext, state: !unfinished ? 'done' : upNext ? 'active' : 'queued', finished_on: r.finished_on,
      finished_label: r.finished_on ? dayLabel(r.finished_on) : null,
      studied: r.steps.reduce((n, st) => n + st.studied, 0),
    });
  }
  return out;
}

/// When the episode's long one went out (meta `published.long.at`), or null.
export function publishedAt(episodeMeta: string | null): string | null {
  const p = metaObject(episodeMeta)['published'];
  const long = p && typeof p === 'object' ? (p as Record<string, unknown>)['long'] : null;
  const at = long && typeof long === 'object' ? (long as Record<string, unknown>)['at'] : null;
  return typeof at === 'string' && at ? at : null;
}

function s0(v: number | null | undefined): number | null { return typeof v === 'number' ? v : null; }
