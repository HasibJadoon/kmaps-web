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

  wv_source_ref: string | null;

  parent_source_ref: string | null;
  episode_no: number | null;
  published_at: string | null;
  workspace_ref: string | null;
  meta_json: string;
  created_at: string;
  updated_at: string;

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
