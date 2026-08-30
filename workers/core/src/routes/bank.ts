// ─── /core/bank/* — the bank ──────────────────────────────────────────────────
//
//   GET  /core/bank/packs                 — what exists, for an app
//   GET  /core/bank/packs/:slug           — the pack with its units
//   GET  /core/bank/packs/:slug/document  — the JSON it was built from
//   GET  /core/bank/units/:id/items       — a unit's items, ready to play
//   POST /core/bank/import[?dry_run=1]    — feed it
//
// The bank is owner-less content. A pack with `owner_ref` set is one person's
// private deck; NULL is the published corpus, and that is what a brand-new
// account walks into — the reason this exists at all.

import type { Router } from '../../../shared/src/router';
import { ok, created, badRequest, notFound, forbidden } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query, queryOne } from '../../../shared/src/db';
import type { CoreEnv } from '../env';
import { importPack } from '../bank/import';
import type { PackDoc } from '../bank/types';

/** Who may write to the bank. The same list that may publish into the shared
 *  library — the people trusted with the corpus. */
async function isOwner(env: CoreEnv, ctx: { userId: string; isAdmin: boolean }): Promise<boolean> {
  if (ctx.isAdmin) return true;
  const allowed = (env.CARD_APPROVERS ?? '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (allowed.length === 0) return false;
  const rows = await query<{ email: string }>(
    env.DB_CORE, 'SELECT email FROM core_users WHERE id = ?', [ctx.userId]);
  const email = rows[0]?.email?.toLowerCase();
  return !!email && allowed.includes(email);
}

export function bankRoutes(router: Router<CoreEnv>): void {
  /** Fisher-Yates over a copy. Only used where the stored order is the answer. */
  const shuffle = <T,>(rows: T[]): T[] => {
    const out = [...rows];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  router.get('/core/bank/packs', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const url = new URL(req.url);
    const app = url.searchParams.get('app');

    const conds = ["p.status != 'retired'", '(p.owner_ref IS NULL OR p.owner_ref = ?)'];
    const params: unknown[] = [ctx.userId];
    if (app) { conds.push('p.app = ?'); params.push(app); }

    const rows = await query(
      env.DB_CORE,
      `SELECT p.id, p.slug, p.app, p.title, p.title_ar, p.description_md, p.language,
              p.audience, p.cefr_from, p.cefr_to, p.visibility, p.owner_ref, p.status,
              p.sort_order,
              (SELECT COUNT(*) FROM core_bank_unit u
                WHERE u.pack_ref = p.id AND u.status = 'live') AS units,
              (SELECT COUNT(*) FROM core_bank_item i
                WHERE i.pack_ref = p.id AND i.status = 'live') AS items,
              (p.owner_ref IS NULL) AS is_bank
         FROM core_bank_pack p
        WHERE ${conds.join(' AND ')}
        ORDER BY p.sort_order, p.title`,
      params,
    );
    return ok(rows);
  });

  router.get('/core/bank/packs/:slug', async (req, env, { slug }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const pack = await queryOne<Record<string, unknown>>(
      env.DB_CORE,
      `SELECT id, slug, app, title, title_ar, description_md, language, audience,
              cefr_from, cefr_to, visibility, owner_ref, status
         FROM core_bank_pack WHERE slug = ?`, [slug]);
    if (!pack) return notFound(`pack ${slug}`);
    if (pack['owner_ref'] && pack['owner_ref'] !== ctx.userId) {
      return forbidden('Not your pack');
    }

    const units = await query(
      env.DB_CORE,
      `SELECT u.id, u.slug, u.parent_ref, u.depth, u.unit_index, u.title, u.title_ar,
              u.subtitle, u.node_type, u.icon, u.item_count, u.item_order,
              u.pass_threshold, u.xp_award, u.estimated_mins, u.module, u.resource_ref,
              u.step_key, u.qr_scope_ref, u.status,
              (SELECT COUNT(*) FROM core_bank_unit_item ui
                JOIN core_bank_item i ON i.id = ui.item_ref
               WHERE ui.unit_ref = u.id AND i.status = 'live') AS items
         FROM core_bank_unit u
        WHERE u.pack_ref = ? AND u.status != 'retired'
        ORDER BY u.depth, u.unit_index`,
      [pack['id']],
    );

    // A quiz round and a table deck have no units — their items hang off the
    // pack itself, and without this they were unreachable: the only route that
    // served items asked for a unit id. Same withholding as that route, since
    // this is the payload a live room is dealt from.
    const loose = await query<Record<string, unknown>>(
      env.DB_CORE,
      `SELECT i.id, i.slug, i.prompt_en, i.prompt_ar, i.prompt_ur, i.stimulus_md,
              i.media_r2_key, i.interaction, i.scoring, i.seconds, i.points_style,
              i.speed_bonus, i.difficulty, i.renderer, i.module, i.resource_ref,
              i.surah, i.ayah_from, i.ayah_to, i.step_key
         FROM core_bank_item i
        WHERE i.pack_ref = ? AND i.status = 'live'
          AND NOT EXISTS (SELECT 1 FROM core_bank_unit_item ui WHERE ui.item_ref = i.id)
        ORDER BY i.slug`,
      [pack['id']],
    );
    const looseOptions = loose.length
      ? await query<Record<string, unknown>>(
          env.DB_CORE,
          `SELECT o.item_ref, o.id, o.role, o.label_en, o.label_ar, o.label_ur,
                  o.media_r2_key, o.sort_order
             FROM core_bank_item_option o
            WHERE o.item_ref IN (${loose.map(() => '?').join(',')})
            ORDER BY o.sort_order`,
          loose.map((i) => i['id']))
      : [];
    const byLoose = new Map<string, Record<string, unknown>[]>();
    for (const option of looseOptions) {
      const key = String(option['item_ref']);
      byLoose.set(key, [...(byLoose.get(key) ?? []), option]);
    }

    return ok({
      pack,
      units,
      items: loose.map((i) => {
        const own = byLoose.get(String(i['id'])) ?? [];
        return {
          ...i,
          options: i['interaction'] === 'order' || i['interaction'] === 'tap_word'
            ? shuffle(own).map(({ sort_order: _drop, ...rest }) => rest)
            : own,
        };
      }),
    });
  });

  /** The document the pack was built from. JSON lives in the table, so the bank
   *  can be re-read, diffed or rebuilt without the file that made it. */
  router.get('/core/bank/packs/:slug/document', async (req, env, { slug }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const row = await queryOne<{ source_json: string | null; owner_ref: string | null }>(
      env.DB_CORE, 'SELECT source_json, owner_ref FROM core_bank_pack WHERE slug = ?', [slug]);
    if (!row) return notFound(`pack ${slug}`);
    if (row.owner_ref && row.owner_ref !== ctx.userId) return forbidden('Not your pack');
    if (!row.source_json) return notFound(`pack ${slug} was not built from a document`);
    return new Response(row.source_json, {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  });

  /** A unit's items, with their options, ready to play.
   *
   *  The correct answer is included — this is the authoring/solo read. The live
   *  quiz room does NOT use it: a room withholds the answer until the reveal,
   *  and that rule lives in the Durable Object. */
  router.get('/core/bank/units/:id/items', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const unit = await queryOne<{ id: string; item_count: number | null; item_order: string;
                                 pack_ref: string }>(
      env.DB_CORE,
      'SELECT id, item_count, item_order, pack_ref FROM core_bank_unit WHERE id = ?', [id]);
    if (!unit) return notFound(`unit ${id}`);

    const items = await query<Record<string, unknown>>(
      env.DB_CORE,
      `SELECT i.id, i.slug, i.prompt_en, i.prompt_ar, i.prompt_ur, i.stimulus_md,
              i.media_r2_key, i.interaction, i.scoring, i.response_json, i.seconds,
              i.points_style, i.speed_bonus, i.explanation_en, i.explanation_ar,
              i.explanation_ur, i.difficulty, i.renderer, i.module, i.resource_ref,
              i.surah, i.ayah_from, i.ayah_to, i.step_key, ui.seq
         FROM core_bank_unit_item ui
         JOIN core_bank_item i ON i.id = ui.item_ref
        WHERE ui.unit_ref = ? AND i.status = 'live'
        ORDER BY ui.seq, i.slug`,
      [id],
    );

    // What a client may see. Deliberately NOT is_correct, why_wrong_*, credit
    // or pair_key: the server grades, so a payload carrying the answer buys
    // nothing and costs everything — in a live room it hands the answer to
    // every phone at once, and even alone it turns a lesson into a reading
    // exercise. The why-wrong sentence comes back with the verdict instead,
    // which is also when a person is ready to read it.
    const options = items.length
      ? await query<Record<string, unknown>>(
          env.DB_CORE,
          `SELECT o.item_ref, o.id, o.role, o.label_en, o.label_ar, o.label_ur,
                  o.media_r2_key, o.sort_order
             FROM core_bank_item_option o
            WHERE o.item_ref IN (${items.map(() => '?').join(',')})
            ORDER BY o.sort_order`,
          items.map((i) => i['id']))
      : [];

    const byItem = new Map<string, Record<string, unknown>[]>();
    for (const option of options) {
      const key = String(option['item_ref']);
      byItem.set(key, [...(byItem.get(key) ?? []), option]);
    }
    return ok({
      unit,
      items: items.map((i) => {
        const own = byItem.get(String(i['id'])) ?? [];
        // An ordering's answer IS the order, so serving the tokens sorted
        // serves the answer. Shuffle them and drop sort_order with the rest.
        const shuffled = i['interaction'] === 'order' || i['interaction'] === 'tap_word'
          ? shuffle(own).map(({ sort_order: _drop, ...rest }) => rest)
          : own;
        return { ...i, options: shuffled };
      }),
    });
  });

  /** Feed the bank.
   *
   *  `?dry_run=1` writes the ledger row with the counts and the errors and
   *  rolls the content back — the review step a hand-written INSERT can never
   *  give you. */
  router.post('/core/bank/import', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    if (!(await isOwner(env, ctx))) return forbidden('Not allowed to write to the bank');

    let doc: PackDoc;
    try {
      doc = await req.json<PackDoc>();
    } catch {
      return badRequest('Body must be a JSON pack document');
    }
    const dryRun = new URL(req.url).searchParams.get('dry_run') === '1';
    const result = await importPack(env.DB_CORE, ctx.userId, doc, {
      dryRun,
      filePath: new URL(req.url).searchParams.get('path'),
    });
    if (result.errors.length > 0) {
      return badRequest(`import refused: ${result.errors.join(' · ')}`);
    }
    return dryRun ? ok(result) : created(result);
  });

  router.get('/core/bank/imports', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const rows = await query(
      env.DB_CORE,
      `SELECT id, pack_ref, file_path, dry_run, units_created, units_updated,
              items_created, items_updated, items_unchanged, items_retired,
              errors_json, created_at
         FROM core_bank_import
        WHERE actor_ref = ?
        ORDER BY created_at DESC LIMIT 50`, [ctx.userId]);
    return ok(rows);
  });
}
