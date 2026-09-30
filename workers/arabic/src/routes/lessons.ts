import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArabicEnv } from '../env';
import { LessonRepo } from '../repositories/lesson.repo';

// The curriculum lesson plans (ar_curriculum_lesson). They used to answer at /ar/lessons, which
// curriculum.ts registers first for the lesson tree (ar_lesson) — so these were never reached.
// They live at their own path now.
export function lessonRoutes(router: Router<ArabicEnv>) {

  router.get('/ar/curriculum-lessons', async (req, env) => {
    const url = new URL(req.url);
    return paginated(await new LessonRepo(env.DB_AR).byUnit(url.searchParams.get('unit'), parsePagination(url)));
  });

  router.get('/ar/curriculum-lessons/:id', async (_req, env, { id }) => {
    const row = await new LessonRepo(env.DB_AR).findById(id);
    return row ? ok(row) : notFound(`lesson ${id}`);
  });

  router.post('/ar/curriculum-lessons', async (req, env) => {
    const b = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!b?.unit_id || !b.title || !b.lesson_type) return badRequest('unit_id, title, lesson_type required');
    const s = (k: string) => (typeof b[k] === 'string' ? (b[k] as string) : null);
    return created(await new LessonRepo(env.DB_AR).create({
      unit_id: String(b.unit_id), title: String(b.title), title_ar: s('title_ar'), lesson_type: String(b.lesson_type),
      level: s('level'), skill_focus: s('skill_focus'), content_md: s('content_md'),
    }));
  });

  router.post('/ar/curriculum-lessons/:id/publish', async (_req, env, { id }) => {
    const row = await new LessonRepo(env.DB_AR).publish(id);
    return row ? ok(row) : notFound(`lesson ${id}`);
  });
}
