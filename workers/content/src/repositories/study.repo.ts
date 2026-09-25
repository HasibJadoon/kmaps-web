import { execute, query, queryOne } from '../../../shared/src/db';

// A study is a cm_documents row of doc_type 'study': a passage worked through
// in steps, each step a deck. Everything about it — the passage, the steps,
// who it is for, the words its screens show — is in meta_json, so a new study
// is a row, not a build.
//
// A step is either the workspace's (one deck everyone shares — the text) or
// each person's own (their questions, notes, points). For a person step the
// study maps core_user_ref → deck slug, and the caller gets theirs.

interface StudyMeta {
  status?: string;
  people?: string[];
  /** Names and colours for the people, by core_user_ref. */
  names?: Record<string, { name: string; color?: string }>;
  /** Simple dates: when the study starts and when the episode is recorded. */
  plan?: { start?: string; record?: string };
  passage?: Record<string, unknown>;
  path?: Array<{ title: string; title_ar?: string }>;
  episode?: { id: string; title?: string };
  labels?: Record<string, string>;
  steps?: Array<{
    n: number; key: string; scope?: string;
    title: string; title_ar?: string; subtitle?: string;
    deck?: string; decks?: Record<string, string>;
    /** The planned day this step should be done by (YYYY-MM-DD). */
    due?: string;
  }>;
}

export interface StudyStep {
  n: number; key: string; scope: 'workspace' | 'person';
  title: string; title_ar: string | null; subtitle: string | null;
  due: string | null;
  deck: { slug: string; title: string; slide_count: number } | null;
}

export interface Study {
  doc_id: string; slug: string; title: string; title_ar: string | null;
  workspace_ref: string | null; status: string;
  passage: Record<string, unknown> | null;
  /** Qurʾān → Sūra → Passage, as the library files it. */
  path: Array<{ title: string; title_ar: string | null }>;
  /** The Studio episode the study feeds, if any. */
  episode: { id: string; title: string | null } | null;
  labels: Record<string, string>;
  plan: { start: string | null; record: string | null };
  steps: StudyStep[];
}

export interface ProgressRow {
  core_user_ref: string; step_n: number;
  started_at: string | null; last_at: string | null; completed_at: string | null;
  active_seconds: number; slides_seen: number; slide_count: number | null;
}

/** Both people × every step, and each person's review points. */
export interface StudyMonitor {
  study: Study;
  people: Array<{ ref: string; name: string; color: string | null }>;
  progress: ProgressRow[];
  /** The review step's points per person, in order: what each slide asks. */
  review: Record<string, Array<{ n: number; prompt: string; answer: string | null }>>;
}

function parse(raw: string | null): StudyMeta {
  try { return (raw ? JSON.parse(raw) : {}) ?? {}; } catch { return {}; }
}

export class StudyRepo {
  constructor(private readonly db: D1Database) {}

  /** The studies this user is part of, optionally only those with a status. */
  async list(user: string | null, status?: string): Promise<Study[]> {
    const rows = await query<{ doc_id: string; slug: string | null; title: string; title_ar: string | null;
      workspace_ref: string | null; meta_json: string | null }>(
      this.db,
      `SELECT doc_id, slug, title, title_ar, workspace_ref, meta_json FROM cm_documents
        WHERE doc_type = 'study' ORDER BY updated_at DESC`,
    );
    const studies = rows
      .map((r) => ({ r, meta: parse(r.meta_json) }))
      .filter(({ meta }) => !status || meta.status === status)
      .filter(({ meta }) => !meta.people?.length || (user != null && meta.people.includes(user)));

    const slugs = new Set<string>();
    for (const { meta } of studies) {
      for (const step of meta.steps ?? []) {
        const slug = step.scope === 'person' ? (user ? step.decks?.[user] : undefined) : step.deck;
        if (slug) slugs.add(slug);
      }
    }
    const decks = new Map<string, { title: string; slide_count: number }>();
    if (slugs.size) {
      const list = [...slugs];
      const found = await query<{ slug: string; title: string; n: number }>(
        this.db,
        `SELECT d.slug, d.title,
                (SELECT COUNT(*) FROM cm_blocks b WHERE b.doc_id = d.doc_id AND b.block_type = 'slide') AS n
           FROM cm_documents d
          WHERE d.doc_type = 'deck' AND d.slug IN (${list.map(() => '?').join(',')})`,
        list,
      );
      for (const d of found) decks.set(d.slug, { title: d.title, slide_count: d.n });
    }

    return studies.map(({ r, meta }) => ({
      doc_id: r.doc_id,
      slug: r.slug ?? r.doc_id,
      title: r.title,
      title_ar: r.title_ar,
      workspace_ref: r.workspace_ref,
      status: meta.status ?? 'draft',
      passage: meta.passage ?? null,
      path: (meta.path ?? []).map((p) => ({ title: p.title, title_ar: p.title_ar ?? null })),
      episode: meta.episode?.id ? { id: meta.episode.id, title: meta.episode.title ?? null } : null,
      labels: meta.labels ?? {},
      plan: { start: meta.plan?.start ?? null, record: meta.plan?.record ?? null },
      steps: (meta.steps ?? [])
        .slice()
        .sort((a, b) => a.n - b.n)
        .map((step) => {
          const scope = step.scope === 'person' ? 'person' : 'workspace';
          const slug = scope === 'person' ? (user ? step.decks?.[user] : undefined) : step.deck;
          const deck = slug ? decks.get(slug) : undefined;
          return {
            n: step.n, key: step.key, scope,
            title: step.title, title_ar: step.title_ar ?? null, subtitle: step.subtitle ?? null,
            due: step.due ?? null,
            deck: slug && deck ? { slug, ...deck } : null,
          };
        }),
    }));
  }

  /**
   * Record time on a step. `seconds` is the active time since the last report
   * (capped, so a phone left open overnight does not count), `slide` the
   * furthest slide reached; reaching the last slide, or `done`, completes it.
   */
  /** A study's doc_id from its slug or its doc_id. */
  async resolve(slugOrId: string): Promise<string | null> {
    const row = await queryOne<{ doc_id: string }>(
      this.db, `SELECT doc_id FROM cm_documents WHERE doc_type = 'study' AND (slug = ? OR doc_id = ?) LIMIT 1`,
      [slugOrId, slugOrId]);
    return row?.doc_id ?? null;
  }

  /** Whether this user is one of the study's people (an open study has none listed). */
  async isMember(studyId: string, user: string): Promise<boolean> {
    const row = await queryOne<{ meta_json: string | null }>(
      this.db, `SELECT meta_json FROM cm_documents WHERE doc_id = ? AND doc_type = 'study'`, [studyId]);
    const people = parse(row?.meta_json ?? null).people ?? [];
    return !people.length || people.includes(user);
  }

  async report(studyId: string, user: string, r: { step: number; seconds: number; slide: number; slideCount: number; done: boolean }) {
    const seconds = Math.max(0, Math.min(Math.round(r.seconds), 300));
    const complete = r.done || (r.slideCount > 0 && r.slide >= r.slideCount);
    await execute(
      this.db,
      `INSERT INTO cm_study_progress (study_id, core_user_ref, step_n, started_at, last_at, completed_at,
                                      active_seconds, slides_seen, slide_count)
       VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'), strftime('%Y-%m-%dT%H:%M:%SZ','now'),
               CASE WHEN ? THEN strftime('%Y-%m-%dT%H:%M:%SZ','now') END, ?, ?, ?)
       ON CONFLICT (study_id, core_user_ref, step_n) DO UPDATE SET
         last_at = excluded.last_at,
         completed_at = COALESCE(cm_study_progress.completed_at, excluded.completed_at),
         active_seconds = cm_study_progress.active_seconds + excluded.active_seconds,
         slides_seen = MAX(cm_study_progress.slides_seen, excluded.slides_seen),
         slide_count = excluded.slide_count`,
      [studyId, user, r.step, complete ? 1 : 0, seconds, Math.max(0, r.slide), r.slideCount || null],
    );
  }

  async monitor(studyId: string, user: string | null): Promise<StudyMonitor | null> {
    const row = await queryOne<{ meta_json: string | null }>(
      this.db, `SELECT meta_json FROM cm_documents WHERE doc_id = ? AND doc_type = 'study'`, [studyId]);
    if (!row) return null;
    const meta = parse(row.meta_json);
    if (meta.people?.length && (user == null || !meta.people.includes(user))) return null;
    const study = (await this.list(user)).find((s) => s.doc_id === studyId);
    if (!study) return null;

    const progress = await query<ProgressRow>(
      this.db,
      `SELECT core_user_ref, step_n, started_at, last_at, completed_at, active_seconds, slides_seen, slide_count
         FROM cm_study_progress WHERE study_id = ? ORDER BY core_user_ref, step_n`,
      [studyId],
    );

    // Review points: each person's review deck, slide by slide.
    const review: StudyMonitor['review'] = {};
    const reviewStep = (meta.steps ?? []).find((s) => s.key === 'review');
    for (const ref of meta.people ?? []) {
      const slug = reviewStep?.scope === 'person' ? reviewStep.decks?.[ref] : reviewStep?.deck;
      if (!slug) { review[ref] = []; continue; }
      const blocks = await query<{ seq_order: number; attrs_json: string | null }>(
        this.db,
        `SELECT b.seq_order, b.attrs_json FROM cm_blocks b JOIN cm_documents d ON d.doc_id = b.doc_id
          WHERE d.slug = ? AND d.doc_type = 'deck' AND b.block_type = 'slide' ORDER BY b.seq_order`,
        [slug],
      );
      review[ref] = blocks.flatMap((b) => {
        let attrs: { graphic?: { kind?: string; term?: string; note?: string } } = {};
        try { attrs = JSON.parse(b.attrs_json ?? '{}'); } catch { /* skip */ }
        const g = attrs.graphic;
        return g?.kind === 'recall' && g.term ? [{ n: b.seq_order, prompt: g.term, answer: g.note ?? null }] : [];
      });
    }

    return {
      study,
      people: (meta.people ?? []).map((ref) => ({
        ref, name: meta.names?.[ref]?.name ?? ref, color: meta.names?.[ref]?.color ?? null,
      })),
      progress,
      review,
    };
  }
}
