/// A series' own simple planner, in place of the production pipeline.
///
/// The series row says it all in its meta, so the apps only draw it:
///   steps         [{key, label, hint?, opens?}] — e.g. Read · Notes & questions · Build · Shoot
///   cadence_days  one episode every N days (optional), or
///   weekday       one episode a week, aimed at this weekday (0 Sunday … 6 Saturday)
///   tz            the owner's time zone, for "today" and the labels
///   open_url      a link template for a step that opens something, e.g.
///                 "com.kmaps.app://wv/unit/{unit}"
/// Each episode keeps its ticks in its own meta (`steps_done`: key → ISO time),
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
}
export interface SeriesPlan {
  steps: StepDef[]; cadenceDays: number | null; weekday: number | null; tz: string; openUrl: string | null;
}

export interface Step {
  key: string;
  label: string;
  hint: string | null;
  done: boolean;
  done_at: string | null;
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
      });
    }
  }
  const cadence = meta['cadence_days'];
  const weekday = meta['weekday'];
  const wd = typeof weekday === 'number' && weekday >= 0 && weekday <= 6 ? weekday : null;
  return {
    steps,
    cadenceDays: wd !== null ? 7 : (typeof cadence === 'number' && cadence > 0 ? cadence : null),
    weekday: wd,
    tz: typeof meta['tz'] === 'string' ? meta['tz'] : 'UTC',
    openUrl: typeof meta['open_url'] === 'string' ? meta['open_url'] : null,
  };
}

export function episodeSteps(plan: SeriesPlan, episodeMeta: string | null): Step[] {
  const meta = metaObject(episodeMeta);
  const doneRaw = meta['steps_done'];
  const done = doneRaw && typeof doneRaw === 'object' && !Array.isArray(doneRaw)
    ? doneRaw as Record<string, unknown> : {};
  return plan.steps.map((d) => {
    const at = done[d.key];
    const step: Step = {
      key: d.key, label: d.label, hint: d.hint,
      done: typeof at === 'string', done_at: typeof at === 'string' ? at : null,
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
    const finished = done === steps.length;
    const last = finished
      ? steps.map((s) => s.done_at ?? '').sort().pop() ?? null
      : null;
    return { e, steps, done, finished_on: last ? dayIn(plan.tz, new Date(last)) : null };
  });

  const lastFinish = rows.map((r) => r.finished_on).filter((d): d is string => !!d).sort().pop() ?? null;
  let cursor: string | null = null;
  if (plan.weekday !== null) {
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
    });
  }
  return out;
}

function s0(v: number | null | undefined): number | null { return typeof v === 'number' ? v : null; }
