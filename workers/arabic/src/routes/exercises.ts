import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArabicEnv } from '../env';
import { ExerciseRepo } from '../repositories/exercise.repo';

export function exerciseRoutes(router: Router<ArabicEnv>) {

  router.get('/ar/exercises', async (req, env) => {
    const url      = new URL(req.url);
    const lessonId = url.searchParams.get('lesson');
    if (!lessonId) return badRequest('lesson (AR:ULID) param required');
    return paginated(
      await new ExerciseRepo(env.DB_AR).byLesson(lessonId, parsePagination(url)),
    );
  });

  router.get('/ar/exercises/:id', async (_req, env, { id }) => {
    const row = await new ExerciseRepo(env.DB_AR).findById(id);
    return row ? ok(row) : notFound(`exercise ${id}`);
  });

  router.post('/ar/exercises', async (req, env) => {
    const b = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!b?.lesson_id || !b.exercise_type || !b.prompt_ar)
      return badRequest('lesson_id, exercise_type, prompt_ar required');
    const s = (k: string) => (typeof b[k] === 'string' ? (b[k] as string) : null);
    return created(await new ExerciseRepo(env.DB_AR).create({
      lesson_id: String(b.lesson_id), unit_id: s('unit_id'), exercise_type: String(b.exercise_type), prompt_ar: String(b.prompt_ar),
      prompt_en: s('prompt_en'), options_json: s('options_json'), answer_json: s('answer_json'), explanation_md: s('explanation_md'),
      grammar_id: s('grammar_id'), level: s('level'),
    }));
  });
}
