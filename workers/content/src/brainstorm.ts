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
  /** Docs and slides linked to it. */
  links: Array<{ label: string; open: { type: string; ref: string; at?: number } }>;
}

/// What can be linked to a sticky: the Library's docs and slides, in its sections.
export interface ShelfGroup { group: string; items: Array<{ label: string; title_ar: string | null; open: { type: string; ref: string } }> }

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
  shelf: ShelfGroup[];
  labels: Record<string, string>;
}

interface Graphic { term?: string; term_ar?: string; ref?: string; items?: Array<{ en?: string }> }

export const CLAUDE = 'claude';

export async function buildBoard(
  db: D1Database,
  studyId: string,
  raw: Record<string, unknown>,
  user: string | null,
  shelf: ShelfGroup[] = [],
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
  const linked = await query<{ sticky_ref: string; open_type: string; open_ref: string; open_at: number | null; label: string }>(db,
    `SELECT sticky_ref, open_type, open_ref, open_at, label FROM cm_study_sticky_link WHERE study_id = ? ORDER BY created_at`, [studyId]);
  const linksOf = new Map<string, Sticky['links']>();
  for (const l of linked) {
    const list = linksOf.get(l.sticky_ref) ?? [];
    list.push({ label: l.label, open: l.open_at == null ? { type: l.open_type, ref: l.open_ref }
      : { type: l.open_type, ref: l.open_ref, at: l.open_at } });
    linksOf.set(l.sticky_ref, list);
  }
  const tally = new Map<string, { n: number; mine: boolean }>();
  for (const v of votes) {
    const t = tally.get(v.sticky_ref) ?? { n: 0, mine: false };
    t.n += 1;
    if (v.user_ref === user) t.mine = true;
    tally.set(v.sticky_ref, t);
  }
  const sticky = (id: string, ref: string, kind: string, text: string, note: string | null, source: string | null): Sticky =>
    ({ id, by: person(ref), kind, text, note, source, votes: tally.get(id)?.n ?? 0, voted: tally.get(id)?.mine ?? false,
       mine: ref === user && !id.startsWith('deck:'), links: linksOf.get(id) ?? [] });

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
      if (it.en) f.stickies.push(sticky(`deck:${q.deck}:${q.slide}:${n}`, owner, 'question', it.en, null, null));
    });
  }
  for (const r of rows) frameOf.get(r.point_key)?.stickies.push(sticky(r.sticky_id, r.author_ref, r.kind, r.text, r.note, r.source));

  // Stickies dragged on the board: each to its frame, in the order it was left in; the rest keep their own order after.
  const placed = await query<{ sticky_ref: string; point_key: string; seq: number }>(db,
    `SELECT sticky_ref, point_key, seq FROM cm_study_sticky_place WHERE study_id = ?`, [studyId]);
  if (placed.length) {
    const at = new Map(placed.map((p) => [p.sticky_ref, p]));
    const all = frames.flatMap((f) => f.stickies.map((st, i) => ({ st, from: f.key, i })));
    for (const f of frames) f.stickies = [];
    const order = (x: { st: Sticky; from: string; i: number }) => at.get(x.st.id)?.seq ?? 1e6 + x.i;
    for (const x of all.sort((a, b) => order(a) - order(b))) {
      (frameOf.get(at.get(x.st.id)?.point_key ?? x.from) ?? frameOf.get(x.from))?.stickies.push(x.st);
    }
  }

  // Who is on the board, with how many stickies each: the study's people, then Claude.
  const count = new Map<string, number>();
  for (const f of frames) for (const s of f.stickies) count.set(s.by.ref, (count.get(s.by.ref) ?? 0) + 1);
  const people = [...((raw['people'] as string[] | undefined) ?? []), CLAUDE]
    .map((ref) => ({ ...person(ref), count: count.get(ref) ?? 0 }));

  return {
    title: spec.title ?? 'Brainstorm', title_ar: spec.title_ar ?? null, hint: spec.hint ?? null,
    people, frames, shelf, labels: spec.labels ?? {},
  };
}

/// The shelf from the study page's Library: each doc and deck once, a key term's Read · Study · Story each a line.
export function shelfOf(items: Array<{ title: string; title_ar: string | null; group?: string | null;
  open: { type: string; ref: string | null } | null; links?: Array<{ label: string; open: { type: string; ref: string } }> }>): ShelfGroup[] {
  const groups = new Map<string, ShelfGroup>();
  const seen = new Set<string>();
  const put = (group: string, label: string, title_ar: string | null, open: { type: string; ref: string | null } | null) => {
    if (!open?.ref || !['essay', 'deck', 'note'].includes(open.type)) return;
    const k = `${open.type}|${open.ref}`;
    if (seen.has(k)) return;
    seen.add(k);
    const g = groups.get(group) ?? { group, items: [] };
    g.items.push({ label, title_ar, open: { type: open.type, ref: open.ref } });
    groups.set(group, g);
  };
  for (const it of items) {
    const group = it.group ?? '';
    if (it.links?.length) for (const l of it.links) put(group, `${it.title} · ${l.label}`, it.title_ar, l.open);
    else put(group, it.title, it.title_ar, it.open);
  }
  return [...groups.values()];
}

/// A doc's parts, to link a sticky to one of them: an essay's sections (its ## headings, numbered from 1, as the
/// reader counts them) or a deck's slides (numbered from 0, in order).
export async function outlineOf(db: D1Database, type: string, slug: string): Promise<Array<{ label: string; at: number }>> {
  if (type === 'essay') {
    const row = (await query<{ body: string | null }>(db,
      `SELECT (SELECT b.content_text FROM cm_blocks b WHERE b.doc_id = d.doc_id AND b.block_type = 'markdown'
                ORDER BY b.seq_order LIMIT 1) AS body FROM cm_documents d WHERE d.slug = ? LIMIT 1`, [slug]))[0];
    const out: Array<{ label: string; at: number }> = [];
    let fenced = false;
    for (const line of (row?.body ?? '').split('\n')) {
      if (line.trimStart().startsWith('```')) { fenced = !fenced; continue; }
      if (fenced || !line.startsWith('## ')) continue;
      out.push({ label: line.slice(3).replace(/:[a-z0-9.]+:\s*/gi, '').trim(), at: out.length + 1 });
    }
    return out;
  }
  if (type === 'deck') {
    const rows = await query<{ attrs_json: string | null }>(db,
      `SELECT b.attrs_json FROM cm_documents d JOIN cm_blocks b ON b.doc_id = d.doc_id
        WHERE d.slug = ? AND b.block_type = 'slide' ORDER BY b.seq_order`, [slug]);
    return rows.map((r, i) => {
      let a: { lines_en?: string[]; kicker?: string; graphic?: { term?: string } } = {};
      try { a = JSON.parse(r.attrs_json ?? '{}'); } catch { /* untitled */ }
      const label = a.lines_en?.find(Boolean) ?? a.graphic?.term ?? a.kicker ?? '';
      return { label: `${i + 1} · ${label}`.trim(), at: i };
    });
  }
  return [];
}
