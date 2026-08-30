import { queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export const CAPTURE_TYPES = ['text', 'url', 'image', 'audio', 'other'] as const;

export const EXPLORE_STATES = ['want', 'exploring', 'explored', 'parked', 'rejected'] as const;

export interface CmCapture {
  capture_id: string;
  core_user_ref: string;
  capture_type: string;
  raw_text: string | null;
  raw_ar: string | null;
  source_url: string | null;
  source_title: string | null;
  media_asset_ref: string | null;
  is_processed: number;

  processed_into_ref: string | null;
  tags_json: string | null;
  workspace_ref: string | null;
  meta_json: string | null;
  captured_at: string;
  created_at: string;
}

export interface CmCaptureCreate {
  core_user_ref: string;
  capture_type?: string;
  raw_text?: string | null;
  raw_ar?: string | null;
  source_url?: string | null;
  source_title?: string | null;
  media_asset_ref?: string | null;
  tags?: string[] | null;
  workspace_ref?: string | null;

  explore_state?: string | null;
  priority?: number | null;
  why?: string | null;
}

const COLS = `capture_id, core_user_ref, capture_type, raw_text, raw_ar,
              source_url, source_title, media_asset_ref, is_processed,
              processed_into_ref, tags_json, workspace_ref, meta_json,
              captured_at, created_at`;

export class CaptureRepo {
  constructor(private db: D1Database) {}

  list(
    opts: {
      user: string;
      type?: string | null;
      state?: string | null;
      processed?: boolean | null;
    } & PaginateOptions,
  ) {
    const conds = ['core_user_ref = ?'];
    const params: unknown[] = [opts.user];
    if (opts.type) { conds.push('capture_type = ?'); params.push(opts.type); }
    if (opts.processed != null) {
      conds.push('is_processed = ?');
      params.push(opts.processed ? 1 : 0);
    }
    if (opts.state) {

      conds.push(`json_extract(meta_json, '$.explore_state') = ?`);
      params.push(opts.state);
    }
    const where = `WHERE ${conds.join(' AND ')}`;
    return paginate<CmCapture>(
      this.db,
      `SELECT ${COLS} FROM cm_capture_entries ${where} ORDER BY captured_at DESC`,
      `SELECT COUNT(*) AS count FROM cm_capture_entries ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<CmCapture | null> {
    return queryOne<CmCapture>(
      this.db, `SELECT ${COLS} FROM cm_capture_entries WHERE capture_id = ?`, [id],
    );
  }

  async create(input: CmCaptureCreate): Promise<CmCapture> {
    const id = typedId('CC');
    const meta: Record<string, unknown> = {};
    if (input.explore_state) meta['explore_state'] = input.explore_state;
    if (input.priority != null) meta['priority'] = input.priority;
    if (input.why) meta['why'] = input.why;

    await execute(
      this.db,
      `INSERT INTO cm_capture_entries
         (capture_id, core_user_ref, capture_type, raw_text, raw_ar, source_url,
          source_title, media_asset_ref, tags_json, workspace_ref, meta_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.core_user_ref,

        input.capture_type ?? (input.source_url ? 'url' : 'text'),
        input.raw_text ?? null,
        input.raw_ar ?? null,
        input.source_url ?? null,
        input.source_title ?? null,
        input.media_asset_ref ?? null,
        input.tags?.length ? JSON.stringify(input.tags) : null,
        input.workspace_ref ?? null,
        JSON.stringify({ ...meta, explore_state: input.explore_state ?? 'want' }),
      ],
    );
    return (await this.findById(id))!;
  }

  async triage(
    id: string,
    patch: {
      explore_state?: string;
      priority?: number;
      why?: string;
      found_what?: string;
      verdict?: string;
    },
  ): Promise<CmCapture | null> {
    const current = await this.findById(id);
    if (!current) return null;
    let meta: Record<string, unknown> = {};
    try { meta = JSON.parse(current.meta_json ?? '{}') as Record<string, unknown>; }
    catch { meta = {}; }
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) meta[k] = v;
    }
    await execute(
      this.db,
      `UPDATE cm_capture_entries SET meta_json = ? WHERE capture_id = ?`,
      [JSON.stringify(meta), id],
    );
    return this.findById(id);
  }

  async markProcessed(id: string, sourceRef: string): Promise<CmCapture | null> {
    await execute(
      this.db,
      `UPDATE cm_capture_entries
          SET is_processed = 1, processed_into_ref = ?
        WHERE capture_id = ?`,
      [sourceRef, id],
    );
    return this.findById(id);
  }

  links(captureId: string) {
    return paginate<{ link_id: string; capture_id: string; target_ref: string; link_type: string }>(
      this.db,
      `SELECT link_id, capture_id, target_ref, link_type, created_at
         FROM cm_capture_links WHERE capture_id = ? ORDER BY created_at`,
      `SELECT COUNT(*) AS count FROM cm_capture_links WHERE capture_id = ?`,
      [captureId], {},
    );
  }

  async addLink(captureId: string, targetRef: string, linkType: string) {
    const id = typedId('CCL');
    await execute(
      this.db,
      `INSERT INTO cm_capture_links (link_id, capture_id, target_ref, link_type)
       VALUES (?, ?, ?, ?)`,
      [id, captureId, targetRef, linkType],
    );
    return id;
  }
}
