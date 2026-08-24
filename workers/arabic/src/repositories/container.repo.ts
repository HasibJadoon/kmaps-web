// ─── ContainerRepo — ar_curriculum_container ───────────────────────────────────
// Curriculum containers: the three discipline courses, plus books, media and
// literature the library reads.
//
// This repo used to SELECT parent_id and status, neither of which the table
// has — the columns are track_id, discipline and is_published — so every
// /ar/containers request failed at D1 and the library page rendered empty.
// The shape below is the table as it actually stands.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface Container {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  container_type: string;      // course | book | podcast | video_series | …
  track_id: string | null;
  discipline: string | null;   // NH | SF | BL for the three linguistics courses
  level: string | null;
  description_md: string | null;
  cover_ref: string | null;
  source_ref: string | null;
  sort_order: number;
  is_published: number;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContainerCreate {
  title: string;
  container_type: string;
  slug?: string;
  title_ar?: string | null;
  track_id?: string | null;
  discipline?: string | null;
  level?: string | null;
  description_md?: string | null;
  sort_order?: number;
}

const COLS = `id, slug, title, title_ar, container_type, track_id, discipline,
              level, description_md, cover_ref, source_ref, sort_order,
              is_published, meta_json, created_at, updated_at`;

/** Slugify a title so a container created through the API still gets a key. */
function slugify(title: string): string {
  return title.toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export class ContainerRepo {
  constructor(private db: D1Database) {}

  list(type: string | null, opts: PaginateOptions = {}) {
    const where  = type ? 'WHERE container_type = ?' : '';
    const params = type ? [type] : [];
    return paginate<Container>(
      this.db,
      `SELECT ${COLS} FROM ar_curriculum_container ${where} ORDER BY sort_order, title`,
      `SELECT COUNT(*) AS count FROM ar_curriculum_container ${where}`,
      params,
      opts,
    );
  }

  findById(id: string): Promise<Container | null> {
    return queryOne<Container>(
      this.db,
      `SELECT ${COLS} FROM ar_curriculum_container WHERE id = ? OR slug = ?`,
      [id, id],
    );
  }

  /**
   * The units directly under a container. Containers do not nest — their units
   * do, so a caller asking for "children" wants the top level of the unit tree.
   */
  children(containerId: string): Promise<Record<string, unknown>[]> {
    return query(
      this.db,
      `SELECT id, container_id, parent_id, title, title_ar, unit_type,
              unit_index, description_md, estimated_mins, skill_focus,
              gn_node_id, al_group_ref
         FROM ar_curriculum_container_unit
        WHERE container_id = ? AND parent_id IS NULL
        ORDER BY unit_index, id`,
      [containerId],
    );
  }

  async create(input: ContainerCreate): Promise<Container> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_curriculum_container
         (id, slug, title, title_ar, container_type, track_id, discipline,
          level, description_md, sort_order, is_published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, input.slug ?? slugify(input.title), input.title,
       input.title_ar ?? null, input.container_type, input.track_id ?? null,
       input.discipline ?? null, input.level ?? null,
       input.description_md ?? null, input.sort_order ?? 0, now, now],
    );
    return (await this.findById(id))!;
  }

  async update(
    id: string,
    patch: Partial<Pick<Container, 'title' | 'title_ar' | 'level' | 'description_md' | 'is_published' | 'sort_order'>>,
  ): Promise<Container | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.title          !== undefined) { sets.push('title = ?');          vals.push(patch.title); }
    if (patch.title_ar       !== undefined) { sets.push('title_ar = ?');       vals.push(patch.title_ar); }
    if (patch.level          !== undefined) { sets.push('level = ?');          vals.push(patch.level); }
    if (patch.description_md !== undefined) { sets.push('description_md = ?'); vals.push(patch.description_md); }
    if (patch.is_published   !== undefined) { sets.push('is_published = ?');   vals.push(patch.is_published); }
    if (patch.sort_order     !== undefined) { sets.push('sort_order = ?');     vals.push(patch.sort_order); }
    if (!sets.length) return this.findById(id);
    sets.push("updated_at = ?"); vals.push(new Date().toISOString());
    vals.push(id);
    await execute(this.db, `UPDATE ar_curriculum_container SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }
}
