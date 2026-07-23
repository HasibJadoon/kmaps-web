// ─── StagingRepo — the AL staging spine (ar_ling_root_stage × reg_sub_layer) ──
// The linguistics domain (shared by Qurʾān + Arabic acquisition) squeezes every
// classical source into per-sub-layer *claims*, staged trilingually, then
// promoted to their carrier tables. This repo reads those staged claims so the
// Cybernetics Control Monitor can render the Data Matrix / Staging Spine tabs.
//
// READ-ONLY. Reads only ar_ling_* in DB_AL.

import { query, queryOne } from '../../../shared/src/db';

export interface SubLayer {
  sub_code: string;
  band: number;
  band_key: string;
  band_name_en: string | null;
  name_ar: string;
  name_en: string;
  name_ur: string | null;
  scope_level: string;
  discipline: string;
  produced_by: string;
  fill_state: string;
  display_order: number;
}

export interface StageCell { root_norm: string; sub_code: string; n: number; promoted: number }
export interface RootRollup { root_norm: string; staged: number; promoted: number; layers: number }
export interface StatusCount { status: string; n: number }

/** A claim is promoted when it has reached its carrier table. */
const PROMOTED = `(status = 'promoted' OR promoted_to_table IS NOT NULL)`;

export class StagingRepo {
  constructor(private db: D1Database) {}

  // The 27-row sub-layer registry — column headers for the matrix, in order.
  subLayers(): Promise<SubLayer[]> {
    return query<SubLayer>(
      this.db,
      `SELECT sub_code, band, band_key, band_name_en, name_ar, name_en, name_ur,
              scope_level, discipline, produced_by, fill_state, display_order
       FROM ar_ling_reg_sub_layer
       WHERE status = 'live'
       ORDER BY display_order, band, sub_code`,
    );
  }

  // Per root × sub_code counts (+ how many promoted) — the matrix body.
  matrix(): Promise<StageCell[]> {
    return query<StageCell>(
      this.db,
      `SELECT root_norm, sub_code, COUNT(*) AS n,
              SUM(CASE WHEN ${PROMOTED} THEN 1 ELSE 0 END) AS promoted
       FROM ar_ling_root_stage
       GROUP BY root_norm, sub_code`,
    );
  }

  // Per-root rollup — staged claims, promoted, distinct layers touched.
  rootRollups(): Promise<RootRollup[]> {
    return query<RootRollup>(
      this.db,
      `SELECT root_norm,
              COUNT(*) AS staged,
              SUM(CASE WHEN ${PROMOTED} THEN 1 ELSE 0 END) AS promoted,
              COUNT(DISTINCT sub_code) AS layers
       FROM ar_ling_root_stage
       GROUP BY root_norm
       ORDER BY staged DESC`,
    );
  }

  statusCounts(): Promise<StatusCount[]> {
    return query<StatusCount>(
      this.db,
      `SELECT status, COUNT(*) AS n FROM ar_ling_root_stage GROUP BY status ORDER BY n DESC`,
    );
  }

  async counts(): Promise<{ staged: number; promoted: number; roots: number; sub_layers: number; memlets: number; questions: number }> {
    const row = await queryOne<{
      staged: number; promoted: number; roots: number; sub_layers: number; memlets: number; questions: number;
    }>(
      this.db,
      `SELECT
         (SELECT COUNT(*) FROM ar_ling_root_stage)                                  AS staged,
         (SELECT COUNT(*) FROM ar_ling_root_stage WHERE ${PROMOTED})                AS promoted,
         (SELECT COUNT(DISTINCT root_norm) FROM ar_ling_root_stage)                 AS roots,
         (SELECT COUNT(*) FROM ar_ling_reg_sub_layer WHERE status='live')           AS sub_layers,
         (SELECT COUNT(*) FROM ar_ling_memlets)                                     AS memlets,
         (SELECT COUNT(*) FROM ar_ling_question_items)                              AS questions`,
    );
    return row ?? { staged: 0, promoted: 0, roots: 0, sub_layers: 0, memlets: 0, questions: 0 };
  }
}
