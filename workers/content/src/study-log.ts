import { query } from '../../shared/src/db';
import type { Study } from './repositories/study.repo';

/// The passage's brain: everything worked out before the episode is recorded,
/// and what came of it — one page per passage, the sūra walked passage by
/// passage.
///
/// The page is the study's `meta_json.log.stages`, in order. Each stage names
/// its sources and this file fills them from the rows that already exist:
///   passage   the text itself (the app opens its passage study)
///   step      a study step — the shared deck, or each person's own, with
///             how far each has got
///   notes     cm_notes tied to the passage (cm_note_targets.target_ref =
///             the passage's unit id) whose relation is the stage's kind:
///             tafsir, keyterm, question, discussion, seed, feedback …
///   episodes  the Studio episodes the study feeds, with their scenes
///   takes     what was recorded for those episodes (tries shorter than
///             log.take_min_seconds are counted in the log, not listed)
///   steps     every step once, each person's deck a button on its row
/// A source's `group` heads its rows in a folder (the Library's sections).
/// The log is every dated thing above, merged by day and person, newest first. Nothing is shaped in the
/// app: titles, icons, colours and words are all here or in the study row.

export interface LogSource {
  kind: 'passage' | 'step' | 'steps' | 'notes' | 'episodes' | 'takes' | 'links' | 'terms' | 'docs' | 'record' | 'publish';
  key?: string;
  relation?: string;
  /** The section these rows sit under, in a folder. */
  group?: string;
}

export interface LogStageSpec {
  key: string;
  title: string;
  title_ar?: string;
  icon?: string;
  accent?: string;
  hint?: string;
  /** A folder (the Library): kept folded until opened, never the stage the page opens on. */
  fold?: boolean;
  sources: LogSource[];
}

export interface LogItem {
  kind: string;
  title: string;
  title_ar: string | null;
  subtitle: string | null;
  icon: string | null;
  who: string | null;
  color: string | null;
  date: string | null;
  /** done · open · todo — for a person's step, a take, a seed used or not. */
  state: string | null;
  /** What a tap opens: passage · deck (ref = slug) · note (ref = note id) · episode (ref = id) ·
   *  essay (ref = slug) · path / atlas / practice (ref = the passage unit, QR:SP:40:1-3). */
  open: { type: string; ref: string | null } | null;
  /** More ways in, as small buttons on the row (a key term: Read · Study · Story). */
  links?: Array<{ label: string; open: { type: string; ref: string } }>;
  /** The section the row sits under, in a folder. */
  group?: string | null;
}

export interface LogStage {
  key: string;
  title: string;
  title_ar: string | null;
  icon: string | null;
  accent: string | null;
  hint: string | null;
  fold: boolean;
  state: 'done' | 'open' | 'empty';
  items: LogItem[];
}

export interface LogEvent {
  at: string;
  who: string | null;
  color: string | null;
  icon: string | null;
  text: string;
  /** A second line: how long it took, or what was written. */
  detail?: string | null;
  stage: string | null;
}

/// The log, one day at a time, newest first.
export interface LogDay {
  day: string;
  events: LogEvent[];
}

/// The one thing to do next — the page opens on it, so starting is one tap.
export interface NextStep {
  title: string;
  subtitle: string | null;
  stage: string | null;
  icon: string | null;
  open: LogItem['open'];
}

export interface StudyLog {
  study: Study;
  next: NextStep | null;
  stages: LogStage[];
  log: LogEvent[];
  days: LogDay[];
}

interface NoteRow {
  note_id: string; title: string | null; relation_type: string; seq_order: number;
  core_user_ref: string; created_at: string; updated_at: string; meta_json: string | null;
}

export interface EpisodeDigest {
  id: string;
  title: string;
  status: string;
  sections: Array<{ heading: string; type: string; points: Array<{ overlay_json: string | null }> }>;
  captures: Array<{ id: string; started_at: string | null; ended_at: string | null; marker_count: number }>;
}

type People = Record<string, { name: string; color?: string }>;

function meta(raw: string | null): Record<string, unknown> {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

function minutes(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const m = Math.round((Date.parse(b) - Date.parse(a)) / 60000);
  return Number.isFinite(m) && m >= 0 ? m : null;
}

/// The page, from the study row, its progress, its notes and its episodes.
export async function buildLog(
  db: D1Database,
  study: Study,
  raw: Record<string, unknown>,
  episodes: EpisodeDigest[],
  user: string | null = null,
): Promise<StudyLog> {
  const logSpec = (raw['log'] as { stages?: LogStageSpec[]; take_min_seconds?: number } | undefined) ?? {};
  const spec = logSpec.stages ?? [];
  // A take shorter than this is a try (a tap to test the button): counted in the log, not listed.
  const minTake = Number(logSpec.take_min_seconds) || 0;
  const seconds = (a: string | null, b: string | null) =>
    a && b ? Math.max(0, (Date.parse(b) - Date.parse(a)) / 1000) : null;
  const isTake = (c: EpisodeDigest['captures'][number]) => (seconds(c.started_at, c.ended_at) ?? 0) >= minTake;
  const people = (raw['people'] as string[] | undefined) ?? [];
  const names = (raw['names'] as People | undefined) ?? {};
  const steps = (raw['steps'] as Array<{ n: number; key: string; scope?: string; title: string;
    title_ar?: string; deck?: string; decks?: Record<string, string> }> | undefined) ?? [];
  const unit = String((study.passage as Record<string, unknown> | null)?.['unit_id'] ?? '');
  const labels = study.labels;
  // Every word the page shows is the study's own (meta_json.labels), placeholders
  // filled; a missing label is simply left out.
  const say = (key: string, values: Record<string, string | number> = {}) =>
    Object.entries(values).reduce((out, [k, v]) => out.split(`{${k}}`).join(String(v)), labels[key] ?? '');
  // How long something took: minutes, then hours, then days (the words are the study's).
  const duration = (mins: number) => mins < 60 ? say('minutes', { n: mins })
    : mins < 60 * 24 ? say('hours', { n: Math.round(mins / 60) }) : say('days', { n: Math.round(mins / 60 / 24) });
  const person = (ref: string) => ({ who: names[ref]?.name ?? ref, color: names[ref]?.color ?? null });

  const progress = await query<{ core_user_ref: string; step_n: number; started_at: string | null;
    completed_at: string | null; slides_seen: number; slide_count: number | null }>(
    db,
    `SELECT core_user_ref, step_n, started_at, completed_at, slides_seen, slide_count
       FROM cm_study_progress WHERE study_id = ?`,
    [study.doc_id],
  );
  const notes = unit ? await query<NoteRow>(
    db,
    `SELECT n.note_id, n.title, t.relation_type, t.seq_order, n.core_user_ref,
            n.created_at, n.updated_at, n.meta_json
       FROM cm_note_targets t JOIN cm_notes n ON n.note_id = t.note_id
      WHERE t.target_ref = ? ORDER BY t.seq_order, n.created_at`,
    [unit],
  ) : [];

  // The Library's documents, looked up once: every key term's essay and decks, and the passage's other decks.
  type Term = { key: string; ar?: string; en?: string };
  const library = (raw['library'] as { terms?: Array<Term & { phrase?: Term }>;
    docs?: string[]; links?: Array<{ label: string; subtitle?: string; icon?: string; open: { type: string; ref: string } }> } | undefined) ?? {};
  const wanted = new Set<string>(library.docs ?? []);
  for (const t of library.terms ?? []) {
    for (const key of [t.key, t.phrase?.key].filter(Boolean) as string[]) {
      for (const k of ['essay', 'study', 'story']) wanted.add(`CM:DOC:qr:keyterm-${k}:${key}`);
    }
  }
  const docs = new Map<string, { doc_id: string; doc_type: string; slug: string | null; title: string }>();
  const ids = [...wanted];
  for (let i = 0; i < ids.length; i += 80) {
    const part = ids.slice(i, i + 80);
    for (const d of await query<{ doc_id: string; doc_type: string; slug: string | null; title: string }>(db,
      `SELECT doc_id, doc_type, slug, title FROM cm_documents WHERE doc_id IN (${part.map(() => '?').join(',')})`, part)) {
      docs.set(d.doc_id, d);
    }
  }
  const opener = (d: { doc_type: string; slug: string | null }) =>
    d.slug && (d.doc_type === 'deck' || d.doc_type === 'essay') ? { type: d.doc_type, ref: d.slug } : null;

  const events: LogEvent[] = [];
  const stages: LogStage[] = spec.map((st) => {
    const items: LogItem[] = [];
    for (const src of st.sources ?? []) {
      const from = items.length;
      if (src.kind === 'passage') {
        const p = (study.passage ?? {}) as Record<string, unknown>;
        items.push({
          kind: 'passage', title: String(p['title_en'] ?? study.title), title_ar: (p['title_ar'] as string) ?? null,
          subtitle: [p['ref'], p['subtitle']].filter(Boolean).join(' · ') || null, icon: 'text.book.closed',
          who: null, color: null, date: null, state: null, open: { type: 'passage', ref: String(p['ref'] ?? '') },
        });
      }
      if (src.kind === 'step') {
        const step = steps.find((s) => s.key === src.key);
        if (!step) continue;
        const refs = step.scope === 'person' ? people.filter((r) => step.decks?.[r]) : [null];
        for (const ref of refs) {
          const slug = ref ? step.decks?.[ref] : step.deck;
          const rows = progress.filter((p) => p.step_n === step.n && (ref == null || p.core_user_ref === ref));
          const done = rows.some((p) => p.completed_at);
          const begun = rows.some((p) => p.started_at);
          const seen = rows.reduce((m, p) => Math.max(m, p.slides_seen), 0);
          const total = rows.find((p) => p.slide_count)?.slide_count ?? null;
          items.push({
            kind: 'deck', title: step.title, title_ar: step.title_ar ?? null,
            subtitle: total ? (labels['seen'] ?? '{seen} / {total}').replace('{seen}', String(seen)).replace('{total}', String(total)) : null,
            icon: 'rectangle.stack', ...(ref ? person(ref) : { who: null, color: null }),
            date: rows.map((p) => p.completed_at ?? p.started_at).filter(Boolean).sort().pop() ?? null,
            state: done ? 'done' : begun ? 'open' : 'todo', open: slug ? { type: 'deck', ref: slug } : null,
          });
        }
      }
      if (src.kind === 'steps') {
        // Every step once; the shared deck, or each person's own, as buttons on the row.
        for (const step of steps) {
          const refs = step.scope === 'person' ? people.filter((r) => step.decks?.[r]) : [];
          const links: NonNullable<LogItem['links']> = refs.map((r) => ({ label: person(r).who, open: { type: 'deck', ref: step.decks![r] } }));
          if (!refs.length && step.deck) links.push({ label: say('open'), open: { type: 'deck', ref: step.deck } });
          if (!links.length) continue;
          items.push({ kind: 'deck', title: step.title, title_ar: step.title_ar ?? null,
            subtitle: say('step', { n: step.n }) || null, icon: 'rectangle.stack', who: null, color: null, date: null,
            state: null, open: links[0].open, links });
        }
      }
      if (src.kind === 'notes') {
        for (const n of notes.filter((x) => x.relation_type === src.relation)) {
          const m = meta(n.meta_json);
          const by = (m['by'] as string | undefined) ?? n.core_user_ref;
          items.push({
            kind: 'note', title: n.title ?? '', title_ar: (m['title_ar'] as string) ?? null,
            subtitle: (m['subtitle'] as string) ?? null, icon: (m['icon'] as string) ?? 'doc.text',
            ...(names[by] ? person(by) : { who: (m['who'] as string) ?? null, color: null }),
            date: n.updated_at, state: (m['state'] as string) ?? null, open: { type: 'note', ref: n.note_id },
          });
        }
      }
      if (src.kind === 'episodes') {
        for (const ep of episodes) {
          const scenes = ep.sections;
          const turns = ep.sections.flatMap((s) => s.points).reduce((n, p) => {
            try { return n + ((JSON.parse(p.overlay_json ?? '{}').subs ?? []) as unknown[]).length; } catch { return n; }
          }, 0);
          items.push({
            kind: 'episode', title: ep.title, title_ar: null,
            subtitle: [say('scenes', { n: scenes.length }), turns ? say('turns', { n: turns }) : '', ep.status].filter(Boolean).join(' · '),
            icon: 'film', who: null, color: null, date: null, state: ep.status, open: { type: 'episode', ref: ep.id },
          });
        }
      }
      // Each episode, recorded or not: done once it has a real take (record_done · record_todo).
      if (src.kind === 'record') {
        for (const ep of episodes) {
          const takes = ep.captures.filter(isTake);
          const last = takes.map((c) => c.started_at ?? '').sort().pop() || null;
          items.push({
            kind: 'episode', title: ep.title, title_ar: null,
            subtitle: takes.length ? say('record_done', { n: takes.length }) : say('record_todo'),
            icon: 'record.circle', who: null, color: null, date: last, state: takes.length ? 'done' : 'todo',
            open: { type: 'episode', ref: ep.id },
          });
        }
      }
      // Each episode on its way out: published, shot and waiting, or not yet (publish_<status>).
      if (src.kind === 'publish') {
        for (const ep of episodes) {
          items.push({
            kind: 'episode', title: ep.title, title_ar: null,
            subtitle: say(`publish_${ep.status}`) || ep.status, icon: 'paperplane',
            who: null, color: null, date: null,
            state: ep.status === 'published' ? 'done' : ep.status === 'shot' ? 'open' : 'todo',
            open: { type: 'episode', ref: ep.id },
          });
        }
      }
      if (src.kind === 'links') {
        for (const l of library.links ?? []) {
          items.push({ kind: 'link', title: l.label, title_ar: null, subtitle: l.subtitle ?? null, icon: l.icon ?? 'arrow.up.right.square',
            who: null, color: null, date: null, state: null, open: l.open });
        }
      }
      if (src.kind === 'terms') {
        for (const t of library.terms ?? []) {
          // The word, then the phrase it stands in (غَافِرِ, then غَافِرِ ٱلذَّنۢبِ) on the same row.
          const linksOf = (key: string, prefix: string) => {
            const out: NonNullable<LogItem['links']> = [];
            for (const [k, label] of [['essay', say('read')], ['study', say('study_slides')], ['story', say('story_slides')]] as const) {
              const d = docs.get(`CM:DOC:qr:keyterm-${k}:${key}`);
              const o = d ? opener(d) : null;
              if (o) out.push({ label: prefix ? `${prefix} · ${label}` : label, open: o });
            }
            return out;
          };
          const links = [...linksOf(t.key, ''), ...(t.phrase ? linksOf(t.phrase.key, t.phrase.ar ?? t.phrase.key) : [])];
          if (!links.length) continue;
          const essay = docs.get(`CM:DOC:qr:keyterm-essay:${t.key}`);
          items.push({ kind: 'term', title: t.en ?? essay?.title ?? t.key, title_ar: t.ar ?? null,
            subtitle: [essay?.title, t.phrase ? [t.phrase.ar, t.phrase.en].filter(Boolean).join(' — ') : null].filter(Boolean).join(' · ') || null,
            icon: 'character.book.closed', who: null, color: null, date: null,
            state: null, open: links[0].open, links });
        }
      }
      if (src.kind === 'docs') {
        for (const id of library.docs ?? []) {
          const d = docs.get(id);
          const o = d ? opener(d) : null;
          if (!d || !o) continue;
          items.push({ kind: d.doc_type, title: d.title, title_ar: null, subtitle: say(d.doc_type === 'deck' ? 'slides_word' : 'essay_word') || null,
            icon: d.doc_type === 'deck' ? 'rectangle.stack' : 'doc.richtext', who: null, color: null, date: null,
            state: null, open: o });
        }
      }
      if (src.kind === 'takes') {
        for (const ep of episodes) {
          for (const c of ep.captures.filter(isTake)) {
            const mins = minutes(c.started_at, c.ended_at);
            items.push({
              kind: 'take', title: ep.title, title_ar: null,
              subtitle: [mins != null ? say('minutes', { n: mins }) : '', say('turns_logged', { n: c.marker_count })].filter(Boolean).join(' · '),
              icon: 'record.circle', who: null, color: null, date: c.started_at,
              state: c.ended_at ? 'done' : 'open', open: { type: 'episode', ref: ep.id },
            });
          }
        }
      }
      if (src.group) for (let i = from; i < items.length; i++) items[i].group = src.group;
    }
    // A folder holds each thing once: a row that opens what an earlier row opens is dropped.
    if (st.fold) {
      const seen = new Set<string>();
      const once = items.filter((i) => {
        const k = i.open ? `${i.open.type}|${i.open.ref}` : null;
        if (!k) return true;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      items.splice(0, items.length, ...once);
    }
    const steps_done = items.filter((i) => i.state != null);
    const state: LogStage['state'] = items.length === 0 ? 'empty' : st.fold ? 'done'
      : steps_done.length && steps_done.every((i) => i.state === 'done') ? 'done' : 'open';
    return {
      key: st.key, title: st.title, title_ar: st.title_ar ?? null, icon: st.icon ?? null,
      accent: st.accent ?? null, hint: st.hint ?? null, fold: st.fold === true, state, items,
    };
  });

  // The log: one line per thing done, newest first, then gathered by day.
  //   a step     once — finished (with how long it took) or, until then, started
  //   notes      one line per person, kind and day ("Wrote 9 notes in Read"), their titles below
  //   takes      each take on its own line; the tries of a day folded into one
  const stageOf = (match: (x: LogSource) => boolean) => spec.find((s) => s.sources.some(match)) ?? null;
  for (const p of progress) {
    const step = steps.find((s) => s.n === p.step_n);
    if (!step || !p.started_at) continue;
    const who = person(p.core_user_ref);
    const stage = stageOf((x) => x.kind === 'step' && x.key === step.key)?.key ?? null;
    if (p.completed_at) {
      const mins = minutes(p.started_at, p.completed_at);
      events.push({ at: p.completed_at, ...who, icon: 'checkmark.circle', text: say('log_finished', { step: step.title }),
        detail: mins != null ? say('log_took', { time: duration(mins) }) || null : null, stage });
    } else {
      events.push({ at: p.started_at, ...who, icon: 'play.circle', text: say('log_started', { step: step.title }), detail: null, stage });
    }
  }
  const written = new Map<string, NoteRow[]>();
  for (const n of notes) {
    const by = (meta(n.meta_json)['by'] as string | undefined) ?? n.core_user_ref;
    const key = [n.created_at.slice(0, 10), by, n.relation_type].join('|');
    written.set(key, [...(written.get(key) ?? []), n]);
  }
  for (const [key, group] of written) {
    const [, by, rel] = key.split('|');
    const who = names[by] ? person(by) : { who: null, color: null };
    const stage = stageOf((x) => x.kind === 'notes' && x.relation === rel && !x.group) ?? stageOf((x) => x.kind === 'notes' && x.relation === rel);
    const at = group.map((n) => n.created_at).sort().pop()!;
    events.push(group.length === 1
      ? { at, ...who, icon: 'square.and.pencil', text: say('log_wrote', { title: group[0].title ?? '' }), detail: null, stage: stage?.key ?? null }
      : { at, ...who, icon: 'square.and.pencil', text: say('log_wrote_many', { n: group.length, stage: stage?.title ?? '' }),
          detail: group.map((n) => n.title).filter(Boolean).join(' · ') || null, stage: stage?.key ?? null });
  }
  const stageOfTakes = stageOf((x) => x.kind === 'takes')?.key ?? null;
  for (const ep of episodes) {
    const tries = new Map<string, string[]>();
    for (const c of ep.captures) {
      if (!c.started_at) continue;
      if (isTake(c)) {
        const mins = minutes(c.started_at, c.ended_at);
        events.push({ at: c.started_at, who: null, color: null, icon: 'record.circle',
          text: say('log_recorded', { episode: ep.title, n: c.marker_count }),
          detail: mins != null ? say('log_took', { time: duration(mins) }) || null : null, stage: stageOfTakes });
      } else {
        const day = c.started_at.slice(0, 10);
        tries.set(day, [...(tries.get(day) ?? []), c.started_at]);
      }
    }
    for (const ats of tries.values()) {
      events.push({ at: [...ats].sort()[ats.length - 1], who: null, color: null, icon: 'record.circle.fill',
        text: say(ats.length === 1 ? 'log_try' : 'log_tries', { n: ats.length, episode: ep.title }), detail: null, stage: stageOfTakes });
    }
  }
  events.sort((a, b) => b.at.localeCompare(a.at));
  const days: LogDay[] = [];
  for (const e of events) {
    const day = e.at.slice(0, 10);
    if (days[days.length - 1]?.day !== day) days.push({ day, events: [] });
    days[days.length - 1].events.push(e);
  }

  // Next: your first unfinished deck, in the page's order; then, once the
  // study is read and thought through, the recording; then what you learnt.
  const mine = user ? names[user]?.name ?? null : null;
  let next: NextStep | null = null;
  for (const st of stages) {
    if (st.fold) continue;
    const item = st.items.find((i) => i.kind === 'deck' && i.state !== 'done' && (i.who == null || i.who === mine));
    if (item) {
      next = { title: item.state === 'open' ? say('next_carry_on', { title: item.title }) : item.title, subtitle: st.title,
        stage: st.key, icon: item.icon, open: item.open };
      break;
    }
  }
  const talk = spec.find((s) => s.sources.some((x) => x.kind === 'takes'))?.key ?? null;
  const takes = episodes.reduce((n, e) => n + e.captures.filter(isTake).length, 0);
  // The next episode to record: the first the study feeds with no real take.
  const unrecorded = episodes.find((e) => !e.captures.some(isTake));
  if (!next && unrecorded) {
    next = { title: say('next_record'), subtitle: unrecorded.title, stage: talk, icon: 'record.circle',
      open: { type: 'episode', ref: unrecorded.id } };
  }
  const learn = spec.find((s) => s.sources.some((x) => x.kind === 'notes' && x.relation === 'feedback'))?.key ?? null;
  if (!next && takes > 0 && !notes.some((n) => n.relation_type === 'feedback')) {
    next = { title: say('next_feedback'), subtitle: say('next_feedback_hint') || null,
      stage: learn, icon: 'checklist', open: null };
  }

  return { study, next, stages, log: events, days };
}
