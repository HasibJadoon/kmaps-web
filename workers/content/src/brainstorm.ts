import { query } from '../../shared/src/db';

/// A study's brainstorm board: its talking points as frames, and on each the stickies — questions and ideas by
/// the study's people and by Claude. Shared live through the study's room: every change pings it, and both
/// boards load again.
///
/// The study row says what the board holds (meta_json.brainstorm):
///   points     [{ key, ring, deck, slide }] — a point card in someone's points deck (its owner is the deck's
///              person), or [{ key, title, title_ar }] for a frame of its own ("Across the passage")
///   questions  [{ point, deck, slide }] — a slide of someone's questions deck: each of its questions a sticky
///   claude     { name, color } — how Claude's stickies are signed
///   labels     the board's words
/// Stickies added on the board, and Claude's, are cm_study_sticky rows.

export interface BoardSpec {
  title?: string;
  title_ar?: string;
  hint?: string;
  claude?: { name: string; color?: string };
  points?: Array<{ key: string; ring?: string; deck?: string; slide?: number; title?: string; title_ar?: string }>;
  questions?: Array<{ point: string; deck: string; slide: number }>;
  labels?: Record<string, string>;
}

export interface BoardPerson { ref: string; who: string; color: string | null; count: number }

export interface Sticky {
  id: string;
  by: { ref: string; who: string; color: string | null };
  kind: string;
  text: string;
  note: string | null;
  source: string | null;
  votes: number;
  voted: boolean;
  /** Yours, so you can take it off the board. */
  mine: boolean;
}

export interface Frame {
  key: string;
  ring: string | null;
  title: string;
  title_ar: string | null;
  ref: string | null;
  owner: { ref: string; who: string; color: string | null } | null;
  lines: string[];
  stickies: Sticky[];
}

export interface Board {
  title: string;
  title_ar: string | null;
  hint: string | null;
  people: BoardPerson[];
  frames: Frame[];
  labels: Record<string, string>;
}

interface Graphic { term?: string; term_ar?: string; ref?: string; items?: Array<{ en?: string }> }

export const CLAUDE = 'claude';

export async function buildBoard(
  db: D1Database,
  studyId: string,
  raw: Record<string, unknown>,
  user: string | null,
): Promise<Board | null> {
  const spec = raw['brainstorm'] as BoardSpec | undefined;
  if (!spec) return null;
  const names = (raw['names'] as Record<string, { name: string; color?: string }> | undefined) ?? {};
  const steps = (raw['steps'] as Array<{ decks?: Record<string, string>; deck?: string }> | undefined) ?? [];
  // Whose deck is whose: the person steps map each person to their own deck.
  const ownerOf = new Map<string, string>();
  for (const s of steps) for (const [ref, slug] of Object.entries(s.decks ?? {})) ownerOf.set(slug, ref);
  const claude = { ref: CLAUDE, who: spec.claude?.name ?? 'Claude', color: spec.claude?.color ?? null };
  const person = (ref: string) => ref === CLAUDE ? claude
    : { ref, who: names[ref]?.name ?? ref, color: names[ref]?.color ?? null };

  // The deck slides the board reads, in one query.
  const slugs = [...new Set([...(spec.points ?? []).map((p) => p.deck), ...(spec.questions ?? []).map((q) => q.deck)]
    .filter(Boolean) as string[])];
  const slides = new Map<string, Graphic>();
  if (slugs.length) {
    const rows = await query<{ slug: string; seq_order: number; attrs_json: string | null }>(db,
      `SELECT d.slug, b.seq_order, b.attrs_json FROM cm_documents d JOIN cm_blocks b ON b.doc_id = d.doc_id
        WHERE d.slug IN (${slugs.map(() => '?').join(',')}) AND b.block_type = 'slide'`, slugs);
    for (const r of rows) {
      try { slides.set(`${r.slug}:${r.seq_order}`, (JSON.parse(r.attrs_json ?? '{}').graphic ?? {}) as Graphic); }
      catch { /* a slide that does not parse is left off */ }
    }
  }

  const rows = await query<{ sticky_id: string; point_key: string; author_ref: string; kind: string; text: string;
    note: string | null; source: string | null }>(db,
    `SELECT sticky_id, point_key, author_ref, kind, text, note, source FROM cm_study_sticky
      WHERE study_id = ? AND deleted_at IS NULL ORDER BY seq, created_at`, [studyId]);
  const votes = await query<{ sticky_ref: string; user_ref: string }>(db,
    `SELECT sticky_ref, user_ref FROM cm_study_sticky_vote WHERE study_id = ?`, [studyId]);
  const tally = new Map<string, { n: number; mine: boolean }>();
  for (const v of votes) {
    const t = tally.get(v.sticky_ref) ?? { n: 0, mine: false };
    t.n += 1;
    if (v.user_ref === user) t.mine = true;
    tally.set(v.sticky_ref, t);
  }
  const sticky = (id: string, ref: string, kind: string, text: string, note: string | null, source: string | null): Sticky =>
    ({ id, by: person(ref), kind, text, note, source, votes: tally.get(id)?.n ?? 0, voted: tally.get(id)?.mine ?? false,
       mine: ref === user && !id.startsWith('deck:') });

  const frames: Frame[] = (spec.points ?? []).map((p) => {
    const g = p.deck != null && p.slide != null ? slides.get(`${p.deck}:${p.slide}`) : undefined;
    const owner = p.deck ? ownerOf.get(p.deck) : undefined;
    return {
      key: p.key, ring: p.ring ?? null,
      title: p.title ?? g?.term ?? p.key, title_ar: p.title_ar ?? g?.term_ar ?? null, ref: g?.ref ?? null,
      owner: owner ? person(owner) : null,
      lines: (g?.items ?? []).map((i) => i.en ?? '').filter(Boolean),
      stickies: [],
    };
  });
  const frameOf = new Map(frames.map((f) => [f.key, f]));
  // The people's questions, from their decks, then what was added on the board.
  for (const q of spec.questions ?? []) {
    const f = frameOf.get(q.point);
    const g = slides.get(`${q.deck}:${q.slide}`);
    const owner = ownerOf.get(q.deck);
    if (!f || !g || !owner) continue;
    (g.items ?? []).forEach((it, n) => {
      if (it.en) f.stickies.push(sticky(`deck:${q.deck}:${q.slide}:${n}`, owner, 'question', it.en, null, g.term_ar ?? null));
    });
  }
  for (const r of rows) frameOf.get(r.point_key)?.stickies.push(sticky(r.sticky_id, r.author_ref, r.kind, r.text, r.note, r.source));

  // Who is on the board, with how many stickies each: the study's people, then Claude.
  const count = new Map<string, number>();
  for (const f of frames) for (const s of f.stickies) count.set(s.by.ref, (count.get(s.by.ref) ?? 0) + 1);
  const people = [...((raw['people'] as string[] | undefined) ?? []), CLAUDE]
    .map((ref) => ({ ...person(ref), count: count.get(ref) ?? 0 }));

  return {
    title: spec.title ?? 'Brainstorm', title_ar: spec.title_ar ?? null, hint: spec.hint ?? null,
    people, frames, labels: spec.labels ?? {},
  };
}
