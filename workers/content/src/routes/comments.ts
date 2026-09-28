import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated, unauthorized } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import { actorRef } from '../../../shared/src/auth';
import type { ContentEnv } from '../env';
import { CommentRepo } from '../repositories/comment.repo';

/**
 * Comments hang off a target reference, and a passage reference is a target
 * like any other: ARL for a book line, WVB for a couplet, QRL for a line of
 * tafsīr. So a remark written against a line of al-Bukhalāʾ and a remark
 * written against a couplet of Iqbal are the same kind of row, found the same
 * way, and neither needs a table of its own.
 */
export function cmCommentRoutes(router: Router<ContentEnv>) {

  router.get('/cm/comments', async (req, env) => {
    const url = new URL(req.url);
    const target = url.searchParams.get('target_ref') ?? url.searchParams.get('ref');
    if (!target) return badRequest('target_ref required');
    return paginated(await new CommentRepo(env.DB_CM).byTarget(target, parsePagination(url)));
  });

  router.post('/cm/comments', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const b = await req.json() as Record<string, unknown>;
    const target = typeof b.target_ref === 'string' ? b.target_ref.trim() : '';
    const text   = typeof b.comment_text === 'string' ? b.comment_text.trim() : '';
    if (!target) return badRequest('target_ref required');
    if (!text)   return badRequest('comment_text required');
    return created(await new CommentRepo(env.DB_CM).create({
      core_user_ref: user,
      target_ref: target,
      comment_text: text,
      comment_ar: typeof b.comment_ar === 'string' ? b.comment_ar : null,
      parent_comment_id: typeof b.parent_comment_id === 'string' ? b.parent_comment_id : null,
      // the quoted words travel with the remark, so it reads on its own
      meta_json: typeof b.quote === 'string' && b.quote.trim()
        ? JSON.stringify({ quote: b.quote.trim() }) : '{}',
    }));
  });

  router.delete('/cm/comments/:id', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const repo = new CommentRepo(env.DB_CM);
    const row  = await repo.findById(id);
    if (!row || row.core_user_ref !== user) return notFound(`comment ${id}`);
    await repo.delete(id);
    return ok({ deleted: id });
  });
}
