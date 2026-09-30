import { queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// A curriculum lesson plan (ar_curriculum_lesson): the hour of teaching inside a curriculum unit,
// its plan as markdown and the grammar items it covers. Not the lesson tree (ar_lesson, served by
// curriculum.ts at /ar/lessons) — these are authored plans, keyed to a unit.

export interface Lesson {
  id: string;
  unit_id: string | null;
  title: string;
  title_ar: string | null;
  lesson_type: string | null;
  level: string | null;
  skill_focus: string | null;
  content_md: string | null;
  vocab_ids_json: string | null;
  grammar_ids_json: string | null;
  qr_scope_ref: string | null;
  estimated_mins: number | null;
  is_published: number;
  meta_json: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface LessonCreate {
  unit_id: string;
  title: string;
  title_ar?: string | null;
  lesson_type: string;
  level?: string | null;
  skill_focus?: string | null;
  content_md?: string | null;
}

const COLS = `id, unit_id, title, title_ar, lesson_type, level, skill_focus, content_md, vocab_ids_json,
              grammar_ids_json, qr_scope_ref, estimated_mins, is_published, meta_json, created_at, updated_at`;

export class LessonRepo {
  constructor(private db: D1Database) {}

  byUnit(unitId: string | null, opts: PaginateOptions = {}) {
    const where = unitId ? 'WHERE unit_id = ?' : '';
    return paginate<Lesson>(
      this.db,
      `SELECT ${COLS} FROM ar_curriculum_lesson ${where} ORDER BY unit_id, id`,
      `SELECT COUNT(*) AS count FROM ar_curriculum_lesson ${where}`,
      unitId ? [unitId] : [],
      opts,
    );
  }

  findById(id: string): Promise<Lesson | null> {
    return queryOne<Lesson>(this.db, `SELECT ${COLS} FROM ar_curriculum_lesson WHERE id = ?`, [id]);
  }

  async create(input: LessonCreate): Promise<Lesson> {
    const id = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_curriculum_lesson
         (id, unit_id, title, title_ar, lesson_type, level, skill_focus, content_md, is_published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, input.unit_id, input.title, input.title_ar ?? null, input.lesson_type, input.level ?? null,
       input.skill_focus ?? null, input.content_md ?? null, now, now],
    );
    return (await this.findById(id))!;
  }

  async publish(id: string): Promise<Lesson | null> {
    await execute(this.db, `UPDATE ar_curriculum_lesson SET is_published = 1, updated_at = ? WHERE id = ?`, [new Date().toISOString(), id]);
    return this.findById(id);
  }
}
