import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { queryOne } from '../../../shared/src/db';
import type { ArLinguisticsEnv } from '../env';

interface Expression {
  id: string;
  expression_ar: string;
  expression_type: string;
  gloss_en: string | null;
  notes: string | null;
}

export function expressionRoutes(router: Router<ArLinguisticsEnv>) {

  router.get('/al/expressions/:id', async (_req, env, { id }) => {
    const row = await queryOne<Expression>(
      env.DB_AL,
      `SELECT id, expression_ar, expression_type, gloss_en, notes
       FROM ar_ling_root_lemma_tabir WHERE id = ?`,
      [id],
    );
    return row ? ok(row) : notFound(`expression ${id}`);
  });
}
