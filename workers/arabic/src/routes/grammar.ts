import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArabicEnv } from '../env';
import { GrammarRepo } from '../repositories/grammar.repo';

// The teaching grammar items (ar_grammar). Registered after the grammar path (grammar-path.ts):
// /ar/grammar/:id would otherwise take /ar/grammar/path.
export function grammarRoutes(router: Router<ArabicEnv>) {

  router.get('/ar/grammar', async (req, env) => {
    const url = new URL(req.url);
    const repo = new GrammarRepo(env.DB_AR);
    const ref = url.searchParams.get('nahw');
    return paginated(ref ? await repo.byNahwRef(ref, parsePagination(url))
                         : await repo.list(url.searchParams.get('type'), parsePagination(url)));
  });

  router.get('/ar/grammar/:id', async (_req, env, { id }) => {
    const row = await new GrammarRepo(env.DB_AR).findById(id);
    return row ? ok(row) : notFound(`grammar item ${id}`);
  });

  router.post('/ar/grammar', async (req, env) => {
    const b = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!b?.title) return badRequest('title required');
    const s = (k: string) => (typeof b[k] === 'string' ? (b[k] as string) : null);
    return created(await new GrammarRepo(env.DB_AR).create({
      title: String(b.title), title_ar: s('title_ar'), al_nahw_ref: s('al_nahw_ref'), grammar_type: s('grammar_type'),
      level: s('level'), explanation_md: s('explanation_md'), rule_summary: s('rule_summary'),
    }));
  });
}
