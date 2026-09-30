import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// An authored exercise (ar_exercises): a question on a curriculum lesson — prompt in Arabic and
// English, its options and answer as JSON ({"correct": i} for an MCQ), and why.

export interface Exercise {
  id: string;
  lesson_id: string | null;
  unit_id: string | null;
  exercise_type: string;
  prompt_ar: string | null;
  prompt_en: string | null;
  options_json: string | null;
  answer_json: string | null;
  explanation_md: string | null;
  grammar_id: string | null;
  al_concept_ref: string | null;
  level: string | null;
  skill_focus: string | null;
  difficulty: number | null;
  created_at: string;
}

export interface ExerciseCreate {
  lesson_id: string;
  unit_id?: string | null;
  exercise_type: string;
  prompt_ar: string;
  prompt_en?: string | null;
  options_json?: string | null;
  answer_json?: string | null;
  explanation_md?: string | null;
  grammar_id?: string | null;
  level?: string | null;
}

const COLS = `id, lesson_id, unit_id, exercise_type, prompt_ar, prompt_en, options_json, answer_json, explanation_md,
              grammar_id, al_concept_ref, level, skill_focus, difficulty, created_at`;

export class ExerciseRepo {
  constructor(private db: D1Database) {}

  byLesson(lessonId: string, opts: PaginateOptions = {}) {
    return paginate<Exercise>(
      this.db,
      `SELECT ${COLS} FROM ar_exercises WHERE lesson_id = ? ORDER BY id`,
      `SELECT COUNT(*) AS count FROM ar_exercises WHERE lesson_id = ?`,
      [lessonId],
      opts,
    );
  }

  findById(id: string): Promise<Exercise | null> {
    return queryOne<Exercise>(this.db, `SELECT ${COLS} FROM ar_exercises WHERE id = ?`, [id]);
  }

  sample(lessonId: string, limit = 10): Promise<Exercise[]> {
    return query<Exercise>(this.db, `SELECT ${COLS} FROM ar_exercises WHERE lesson_id = ? ORDER BY RANDOM() LIMIT ?`, [lessonId, limit]);
  }

  async create(input: ExerciseCreate): Promise<Exercise> {
    const id = typedId('AR');
    await execute(
      this.db,
      `INSERT INTO ar_exercises
         (id, lesson_id, unit_id, exercise_type, prompt_ar, prompt_en, options_json, answer_json, explanation_md, grammar_id, level, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.lesson_id, input.unit_id ?? null, input.exercise_type, input.prompt_ar, input.prompt_en ?? null,
       input.options_json ?? null, input.answer_json ?? null, input.explanation_md ?? null, input.grammar_id ?? null,
       input.level ?? null, new Date().toISOString()],
    );
    return (await this.findById(id))!;
  }
}
