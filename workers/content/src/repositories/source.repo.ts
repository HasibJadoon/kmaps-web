// ─── SourceRepo — cm_sources ──────────────────────────────────────────────────
//
// A resource: a book, an article, a podcast episode, a video, a lecture. What
// you captured on the way through, with enough bibliography attached to cite it.
//
// Distinct from `wv_sources`, which is a research artefact inside the worldview
// engine — something being read closely, with units, chunks and a reader. The
// relationship is one of promotion: a resource is captured here, and when
// reading actually begins it gains a wv_source and the two point at each other
// through `wv_source_ref`.
//
// WHAT WAS WRONG
//
// Every route on this repository threw. It selected `id`, `author_ref`,
// `author_name`, `url` and `published_at` — none of which exist. The primary key
// is `source_id`; the author and the url live in `cm_source_details`, one row
// per source. It also never set `core_user_ref`, which is NOT NULL, so even a
// corrected SELECT would have failed on the first INSERT.
//
// Bibliography is joined rather than duplicated: `cm_source_details` is where a
// DOI, an ISBN, a publisher and a page count belong, and copying any of it up
// into cm_sources would create a second place to correct a typo.

import { queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface CmSource {
  source_id: string;
  core_user_ref: string;
  source_type: string;
  title: string;
  title_ar: string | null;
  subtitle: string | null;
  language: string;
  status: string;
  /** The wv_sources row this was promoted into, once reading began. */
  wv_source_ref: string | null;
  /** The channel, show or series this belongs to, when it is an episode. */
  parent_source_ref: string | null;
  episode_no: number | null;
  published_at: string | null;
  workspace_ref: string | null;
  meta_json: string;
  created_at: string;
  updated_at: string;

  // Joined from cm_source_details. Present on reads, never stored here.
  author_names_json: string | null;
  publisher: string | null;
  publication_year: number | null;
  isbn: string | null;
  doi: string | null;
  url: string | null;
  pages_total: number | null;
  abstract: string | null;
}

export interface CmSourceCreate {
  core_user_ref: string;
  title: string;
  source_type?: string;
  title_ar?: string | null;
  subtitle?: string | null;
  language?: string;
  workspace_ref?: string | null;
  wv_source_ref?: string | null;
  parent_source_ref?: string | null;
  episode_no?: number | null;
  published_at?: string | null;
  meta_json?: string | null;

  // Optional bibliography, written to cm_source_details in the same call.
  author_names?: string[] | null;
  publisher?: string | null;
  publication_year?: number | null;
  isbn?: string | null;
  doi?: string | null;
  url?: string | null;
}

const S = `s.source_id, s.core_user_ref, s.source_type, s.title, s.title_ar,
           s.subtitle, s.language, s.status, s.wv_source_ref, s.workspace_ref,
           s.parent_source_ref, s.episode_no, s.published_at,
           s.meta_json, s.created_at, s.updated_at`;
const D = `d.author_names_json, d.publisher, d.publication_year, d.isbn, d.doi,
           d.url, d.pages_total, d.abstract`;

/** Source with its bibliography. A LEFT JOIN, because a resource captured in a
 *  hurry has a title and nothing else, and that is a legitimate state. */
const FROM = `FROM cm_sources s LEFT JOIN cm_source_details d ON d.source_id = s.source_id`;

export class CmSourceRepo {
  constructor(private db: D1Database) {}

  list(
    opts: { user: string; type?: string | null; status?: string | null } & PaginateOptions,
  ) {
    const conds = ['s.core_user_ref = ?'];
    const params: unknown[] = [opts.user];
    if (opts.type) { conds.push('s.source_type = ?'); params.push(opts.type); }
    if (opts.status) { conds.push('s.status = ?'); params.push(opts.status); }
    const where = `WHERE ${conds.join(' AND ')}`;
    return paginate<CmSource>(
      this.db,
      `SELECT ${S}, ${D} ${FROM} ${where} ORDER BY s.created_at DESC`,
      `SELECT COUNT(*) AS count FROM cm_sources s ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<CmSource | null> {
    return queryOne<CmSource>(
      this.db, `SELECT ${S}, ${D} ${FROM} WHERE s.source_id = ?`, [id],
    );
  }

  async create(input: CmSourceCreate): Promise<CmSource> {
    const id = typedId('CS');
    await execute(
      this.db,
      `INSERT INTO cm_sources
         (source_id, core_user_ref, source_type, title, title_ar, subtitle,
          language, workspace_ref, wv_source_ref, parent_source_ref,
          episode_no, published_at, meta_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.core_user_ref,
        input.source_type ?? 'other',
        input.title,
        input.title_ar ?? null,
        input.subtitle ?? null,
        input.language ?? 'en',
        input.workspace_ref ?? null,
        input.wv_source_ref ?? null,
        input.parent_source_ref ?? null,
        input.episode_no ?? null,
        input.published_at ?? null,
        input.meta_json ?? '{}',
      ],
    );

    // Only write a details row if there is anything to put in it. An empty one
    // would make "has bibliography" indistinguishable from "has a blank row".
    const hasDetails = input.author_names?.length || input.publisher || input.url
      || input.publication_year || input.isbn || input.doi;
    if (hasDetails) {
      await execute(
        this.db,
        `INSERT INTO cm_source_details
           (detail_id, source_id, author_names_json, publisher, publication_year,
            isbn, doi, url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          typedId('CSD'),
          id,
          input.author_names?.length ? JSON.stringify(input.author_names) : null,
          input.publisher ?? null,
          input.publication_year ?? null,
          input.isbn ?? null,
          input.doi ?? null,
          input.url ?? null,
        ],
      );
    }

    return (await this.findById(id))!;
  }

  /** A channel and everything it has emitted, in order.
   *
   *  A channel is not a separate kind of thing — it is a source whose type is
   *  'channel', and an episode is a source that points at it. That means a
   *  show gets bibliography, capture, promotion and collections for free,
   *  where a dedicated table would have had to reimplement all of them to
   *  express one edge. */
  async channel(id: string): Promise<{ channel: CmSource; episodes: CmSource[] } | null> {
    const channel = await this.findById(id);
    if (!channel) return null;
    const { rows } = await paginate<CmSource>(
      this.db,
      `SELECT ${S}, ${D} ${FROM} WHERE s.parent_source_ref = ?
        ORDER BY s.episode_no IS NULL, s.episode_no, s.published_at`,
      `SELECT COUNT(*) AS count FROM cm_sources s WHERE s.parent_source_ref = ?`,
      [id], { per_page: 500 },
    );
    return { channel, episodes: rows };
  }

  /** Record that this resource has become something being read. Both sides are
   *  written: km_content points forward, and the caller points back from
   *  km_worldview — there is no foreign key across two databases, so the pair
   *  is the only thing that makes the link checkable. */
  async promote(id: string, wvSourceRef: string): Promise<CmSource | null> {
    await execute(
      this.db,
      `UPDATE cm_sources
          SET wv_source_ref = ?, status = 'reading',
              updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
        WHERE source_id = ?`,
      [wvSourceRef, id],
    );
    return this.findById(id);
  }
}
