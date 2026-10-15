import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query } from '../../../shared/src/db';
import type { CoreEnv } from '../env';
import { tableDeck, type QrPassage, type QrPrompt } from '../table/deck';

// GET /core/table/studied — the Table dealt from the learner's own passages (see table/deck.ts).

async function qrTable(env: CoreEnv, scope: string): Promise<{ passage: QrPassage; prompts: QrPrompt[] } | null> {
  if (!env.QURAN || !scope.startsWith('QR:SP:')) return null;
  try {
    const res = await env.QURAN.fetch(new Request(`http://internal.k-maps.local/qr/practice/table?passage=${encodeURIComponent(scope)}`));
    if (!res.ok) return null;
    const b = await res.json<{ data?: { passage?: QrPassage; prompts?: QrPrompt[] } }>();
    return b?.data?.passage ? { passage: b.data.passage, prompts: b.data.prompts ?? [] } : null;
  } catch { return null; }
}

export function tableRoutes(router: Router<CoreEnv>): void {
  router.get('/core/table/studied', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const classes = await query<{ scope_ref: string; status: string; last_at: string | null }>(env.DB_CORE,
      `SELECT scope_ref, status, COALESCE(completed_at, last_at, started_at) AS last_at FROM core_drill_class
        WHERE user_ref = ? ORDER BY COALESCE(completed_at, last_at, started_at) DESC LIMIT 20`, [ctx.userId]);
    if (!classes.length) return ok({ passages: [] });
    const scopes = classes.map((c) => c.scope_ref);
    const [bank, ...qr] = await Promise.all([
      query<Record<string, unknown>>(env.DB_CORE,
        `SELECT i.id, i.slug, i.prompt_en AS promptEn, i.prompt_ar AS promptAr, i.prompt_ur AS promptUr, i.stimulus_md AS stimulusMd,
                i.interaction, i.scoring, NULL AS responseJson, i.seconds, i.difficulty, i.module, i.surah,
                i.ayah_from AS ayahFrom, i.ayah_to AS ayahTo, i.step_key AS stepKey, i.passage_ref AS passageRef
           FROM core_bank_item i JOIN core_bank_pack p ON p.id = i.pack_ref
          WHERE p.app = 'table' AND i.status = 'live' AND i.passage_ref IN (${scopes.map(() => '?').join(',')})
          ORDER BY i.slug`, scopes),
      ...scopes.map((s) => qrTable(env, s)),
    ]);
    const byScope = new Map(scopes.flatMap((s, i) => (qr[i] ? [[s, qr[i]!] as const] : [])));
    return ok({ passages: tableDeck(classes.map((c) => ({ scope: c.scope_ref, status: c.status, lastAt: c.last_at })),
                                    bank.map((b) => ({ ...b, options: [] })), byScope) });
  });
}
