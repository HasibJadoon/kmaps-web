import type { Router } from '../../../shared/src/router';
import { badRequest, forbidden, notFound, ok } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { execute, query, queryOne } from '../../../shared/src/db';
import type { CoreEnv } from '../env';

// A sūra's question bank: every bank item about the sūra, from any pack,
// sorted into scope levels — sūra, passage, passage comparison, motif, verse,
// concept — and playable as slides.
//
// The template is data: the sūra's bank pack (slug quran-<n>-bank) carries it
// in source_json — each level's words, icon, colour and slide graphic, the
// deck's theme, the passages. Nothing here names a level or draws a slide.
//
// Private by default: every route needs a signed-in caller, and only what the
// caller may read counts — packs that are the published corpus (no owner),
// their own, public, or workspace packs they are an active member of — plus
// any single question shared with one of their workspaces
// (core_bank_item_share). A bank opens for someone who can read its pack, or
// who has been shared at least one of its questions.
//
// An item's level is its meta_json.scope when it declares one; otherwise it is
// read from what the row is tied to: a concept → concept, a verse range →
// verse, a passage → passage, nothing narrower → sūra.

interface Level { key: string; title: string; title_ar?: string; subtitle?: string; icon?: string; colour?: string; graphic?: string }
interface Passage { ref: string; no: number; title: string; ayah_from?: number; ayah_to?: number }
interface Template {
  template?: string; surah?: number; title?: string; title_ar?: string;
  theme?: Record<string, string>; labels?: Record<string, string>;
  levels?: Level[]; passages?: Passage[];
}
interface ItemRow {
  id: string; pack_ref: string; pack_owner: string | null; slug: string; prompt_en: string | null; prompt_ar: string | null;
  explanation_en: string | null; interaction: string; scoring: string;
  ayah_from: number | null; ayah_to: number | null; passage_ref: string | null; concept_ref: string | null;
  step_key: string | null; difficulty: number; meta_json: string | null;
}

function parse<T>(raw: string | null | undefined, fallback: T): T {
  try { return raw ? (JSON.parse(raw) ?? fallback) : fallback; } catch { return fallback; }
}

function levelOf(row: ItemRow): string {
  const meta = parse<{ scope?: string }>(row.meta_json, {});
  if (meta.scope) return meta.scope;
  if (row.concept_ref) return 'concept';
  if (row.ayah_from != null) return 'verse';
  if (row.passage_ref) return 'passage';
  return 'surah';
}

/** SQL: the pack `p` is one this user may read. Binds the user id twice. */
const VISIBLE = `(p.owner_ref IS NULL OR p.owner_ref = ? OR p.visibility = 'public'
  OR (p.visibility = 'workspace' AND EXISTS (SELECT 1 FROM core_workspace_members m
      WHERE m.workspace_id = p.workspace_ref AND m.user_id = ? AND m.status = 'active')))`;

/** SQL: the item `i` (of pack `p`) is one this user may read. Binds the user id three times. */
const ITEM_VISIBLE = `(${VISIBLE} OR EXISTS (SELECT 1 FROM core_bank_item_share s
  JOIN core_workspace_members m2 ON m2.workspace_id = s.workspace_id
  WHERE s.item_ref = i.id AND m2.user_id = ? AND m2.status = 'active'))`;

async function load(env: CoreEnv, surah: number, user: string) {
  const found = await queryOne<{ id: string; slug: string; title: string; title_ar: string | null; source_json: string | null; visible: number }>(
    env.DB_CORE, `SELECT p.id, p.slug, p.title, p.title_ar, p.source_json, ${VISIBLE} AS visible FROM core_bank_pack p
                   WHERE p.slug = ? LIMIT 1`,
    [user, user, `quran-${surah}-bank`]);
  const rows = await query<ItemRow>(
    env.DB_CORE,
    `SELECT i.id, i.pack_ref, p.owner_ref AS pack_owner, i.slug, i.prompt_en, i.prompt_ar, i.explanation_en, i.interaction, i.scoring,
            i.ayah_from, i.ayah_to, i.passage_ref, i.concept_ref, i.step_key, i.difficulty, i.meta_json
       FROM core_bank_item i JOIN core_bank_pack p ON p.id = i.pack_ref
      WHERE i.module = 'QR' AND i.surah = ? AND i.status = 'live' AND p.status = 'live' AND ${ITEM_VISIBLE}
      ORDER BY (i.pack_ref = ?) DESC, i.ayah_from, i.slug`,
    [surah, user, user, user, found?.id ?? '']);
  // The bank opens for whoever can read its pack, or holds a question of it.
  const readable = !!found && (found.visible === 1 || rows.some((r) => r.pack_ref === found.id));
  const pack = readable ? found : null;
  const template = parse<Template>(pack?.source_json, {});
  return { pack, template, rows: pack ? rows : [] };
}

/** The passage an item belongs to: its passage_ref, or the passage holding its verses. */
function passageOf(row: ItemRow, passages: Passage[]): string | null {
  if (row.passage_ref) return row.passage_ref;
  if (row.ayah_from == null) return null;
  return passages.find((p) => (p.ayah_from ?? 0) <= row.ayah_from! && row.ayah_from! <= (p.ayah_to ?? 0))?.ref ?? null;
}

export function bankScopeRoutes(router: Router<CoreEnv>) {
  // Every sūra bank this user may read, with the path it is filed under
  // (Qurʾān › Sūra) and how many questions it holds — the banks' hierarchy.
  router.get('/core/bank/scopes', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const packs = await query<{ slug: string; title: string; title_ar: string | null; source_json: string | null }>(
      env.DB_CORE,
      `SELECT p.slug, p.title, p.title_ar, p.source_json FROM core_bank_pack p
        WHERE p.source_format = 'surah-questions' AND p.status = 'live'
        ORDER BY p.sort_order, p.slug`);
    const out = [];
    for (const pk of packs) {
      const t = parse<Template & { path?: Array<{ title: string; title_ar?: string }> }>(pk.source_json, {});
      if (!t.surah) continue;
      const { pack: readable, rows } = await load(env, t.surah, ctx.userId);
      if (!readable) continue;
      out.push({
        surah: t.surah, title: t.title ?? pk.title, title_ar: t.title_ar ?? pk.title_ar,
        total: rows.length, passages: (t.passages ?? []).length,
        path: t.path ?? [{ title: 'Quran', title_ar: 'القرآن' }, { title: t.title ?? pk.title, title_ar: t.title_ar ?? null }],
        labels: t.labels ?? {},
      });
    }
    return ok(out);
  });

  // The bank at a glance: its template, each level with a count, each passage with a count.
  // ?passage= narrows the level counts to that passage (Passage › levels).
  router.get('/core/bank/scopes/qr/:surah', async (req, env, { surah }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const n = Number(surah);
    if (!Number.isInteger(n)) return badRequest('surah must be a number');
    const within = new URL(req.url).searchParams.get('passage');
    const { pack, template, rows } = await load(env, n, ctx.userId);
    if (!pack) return notFound(`bank for surah ${n}`);
    const passages = template.passages ?? [];
    const byLevel = new Map<string, number>();
    const byPassage = new Map<string, number>();
    for (const r of rows) {
      if (within && passageOf(r, passages) !== within) {
        const p = passageOf(r, passages);
        if (p) byPassage.set(p, (byPassage.get(p) ?? 0) + 1);
        continue;
      }
      byLevel.set(levelOf(r), (byLevel.get(levelOf(r)) ?? 0) + 1);
      const p = passageOf(r, passages);
      if (p) byPassage.set(p, (byPassage.get(p) ?? 0) + 1);
    }
    return ok({
      surah: n, title: template.title ?? pack.title, title_ar: template.title_ar ?? pack.title_ar,
      labels: template.labels ?? {}, theme: template.theme ?? {},
      total: within ? rows.filter((r) => passageOf(r, passages) === within).length : rows.length,
      levels: (template.levels ?? []).map((l) => ({ ...l, count: byLevel.get(l.key) ?? 0 })),
      passages: passages.map((p) => ({ ...p, count: byPassage.get(p.ref) ?? 0 })),
    });
  });

  // The questions, by level and/or passage, answers included: a study bank.
  router.get('/core/bank/scopes/qr/:surah/items', async (req, env, { surah }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const url = new URL(req.url);
    const level = url.searchParams.get('level');
    const passage = url.searchParams.get('passage');
    const { pack, template, rows } = await load(env, Number(surah), ctx.userId);
    if (!pack) return notFound(`bank for surah ${surah}`);
    const items = await shape(env, rows, template, level, passage, ctx.userId);
    return ok(items);
  });

  // The same questions as a deck (contract v5), drawn by the template.
  router.get('/core/bank/scopes/qr/:surah/deck', async (req, env, { surah }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const url = new URL(req.url);
    const level = url.searchParams.get('level');
    const passage = url.searchParams.get('passage');
    const n = Number(surah);
    const { pack, template, rows } = await load(env, n, ctx.userId);
    if (!pack) return notFound(`bank for surah ${n}`);
    const items = await shape(env, rows, template, level, passage, ctx.userId);
    const lv = (template.levels ?? []).find((l) => l.key === level);
    const ps = (template.passages ?? []).find((p) => p.ref === passage);
    const labels = template.labels ?? {};
    const heading = [lv?.title, ps ? `${labels.passage ?? 'Passage'} ${ps.no}` : null].filter(Boolean).join(' · ')
      || (labels.all ?? 'All questions');
    const slug = `bank-qr-${n}-${level ?? 'all'}${passage ? '-' + passage.replace(/[^0-9-]/g, '') : ''}`;
    const slides = [
      {
        n: 1, block_id: `${slug}:s01`, layout: 'title', accent: null, kicker: lv?.title_ar ?? template.title_ar ?? null,
        source: null, image: null, verse_refs: [], notes_en: ps ? [ps.title] : (lv?.subtitle ? [lv.subtitle] : []),
        lines_ar: [lv?.title_ar ?? (labels.bank_ar ?? 'بنك الأسئلة'), template.title_ar ?? ''].filter(Boolean),
        lines_en: [heading, template.title ?? ''].filter(Boolean),
        graphic: null,
      },
      ...items.map((it, i) => {
        const lvl = (template.levels ?? []).find((l) => l.key === it.level);
        return {
          n: i + 2, block_id: `${slug}:s${String(i + 2).padStart(2, '0')}`, layout: 'rule', accent: null,
          kicker: it.ref_label ?? lvl?.title_ar ?? null, source: lvl?.title ?? null, image: null,
          verse_refs: [], lines_ar: [], lines_en: [], notes_en: [],
          graphic: {
            kind: lvl?.graphic ?? 'recall',
            term_ar: it.anchor_ar ?? it.prompt_ar ?? lvl?.title_ar ?? '',
            term: it.prompt_en ?? it.prompt_ar ?? '',
            note: it.answer ?? '',
          },
        };
      }),
    ];
    return ok({
      doc_id: `CORE:BANK:QR:${n}:${level ?? 'all'}`, slug, contract_version: 5,
      title: `${template.title ?? pack.title} · ${heading}`, title_ar: template.title_ar ?? null,
      language: 'ar', direction: 'rtl', domain: 'quran', subdomain: 'bank',
      slide_count: slides.length, duration_min: null, videos: [], theme: template.theme ?? {},
      slides, xref_gateway: null, motion: null,
      collection: {
        collection_id: `CORE:BANK:QR:${n}`, title: labels.bank ?? 'Question bank', title_ar: labels.bank_ar ?? null,
        path: [
          { collection_id: 'CM:COL:quran', title: 'Quran', title_ar: 'القرآن' },
          { collection_id: `CM:COL:qr:${n}`, title: template.title ?? `Surah ${n}`, title_ar: template.title_ar ?? null },
          { collection_id: `CORE:BANK:QR:${n}`, title: labels.bank ?? 'Question bank', title_ar: labels.bank_ar ?? null },
        ],
        terms: [],
      },
    });
  });
}

export function bankShareRoutes(router: Router<CoreEnv>) {
  // The workspaces the caller can share a question with — their active ones.
  router.get('/core/bank/share-targets', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    return ok(await query<{ id: string; title: string }>(
      env.DB_CORE,
      `SELECT w.id, w.title FROM core_workspaces w
         JOIN core_workspace_members m ON m.workspace_id = w.id
        WHERE m.user_id = ? AND m.status = 'active' AND w.status = 'active' ORDER BY w.title`,
      [ctx.userId]));
  });

  // Share a question with a workspace, or stop: { item, workspace, share }.
  // Only the owner of the question's pack, into a workspace they belong to.
  router.post('/core/bank/items/shares', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const b = await req.json().catch(() => null) as { item?: string; workspace?: string; share?: boolean } | null;
    if (!b?.item || !b.workspace) return badRequest('item and workspace required');
    const owns = await queryOne<{ ok: number }>(env.DB_CORE,
      `SELECT 1 AS ok FROM core_bank_item i JOIN core_bank_pack p ON p.id = i.pack_ref WHERE i.id = ? AND p.owner_ref = ?`,
      [b.item, ctx.userId]);
    if (!owns && !ctx.isAdmin) return forbidden('Only the owner of this question can share it');
    const member = await queryOne<{ ok: number }>(env.DB_CORE,
      `SELECT 1 AS ok FROM core_workspace_members WHERE workspace_id = ? AND user_id = ? AND status = 'active'`,
      [b.workspace, ctx.userId]);
    if (!member) return forbidden('You can only share into a workspace you belong to');
    if (b.share === false) {
      await execute(env.DB_CORE, `DELETE FROM core_bank_item_share WHERE item_ref = ? AND workspace_id = ?`, [b.item, b.workspace]);
    } else {
      await execute(env.DB_CORE,
        `INSERT OR IGNORE INTO core_bank_item_share (item_ref, workspace_id, shared_by) VALUES (?, ?, ?)`,
        [b.item, b.workspace, ctx.userId]);
    }
    const rows = await query<{ workspace_id: string }>(env.DB_CORE,
      `SELECT workspace_id FROM core_bank_item_share WHERE item_ref = ?`, [b.item]);
    return ok({ item: b.item, shared_with: rows.map((r) => r.workspace_id) });
  });
}

/** Items as the bank shows them: level, what they point at, the answer. */
async function shape(env: CoreEnv, rows: ItemRow[], template: Template, level: string | null, passage: string | null,
                     user: string) {
  const passages = template.passages ?? [];
  const picked = rows.filter((r) => (!level || levelOf(r) === level) && (!passage || passageOf(r, passages) === passage));
  if (!picked.length) return [];
  const opts = await query<{ item_ref: string; label_en: string | null; label_ar: string | null; is_correct: number; sort_order: number }>(
    env.DB_CORE,
    `SELECT item_ref, label_en, label_ar, is_correct, sort_order FROM core_bank_item_option
      WHERE role = 'choice' AND item_ref IN (${picked.map(() => '?').join(',')}) ORDER BY sort_order`,
    picked.map((r) => r.id));
  // Where the caller's own questions are already shared.
  const mine = picked.filter((r) => r.pack_owner === user).map((r) => r.id);
  const shares = mine.length ? await query<{ item_ref: string; workspace_id: string }>(
    env.DB_CORE,
    `SELECT item_ref, workspace_id FROM core_bank_item_share WHERE item_ref IN (${mine.map(() => '?').join(',')})`,
    mine) : [];
  return picked.map((r) => {
    const meta = parse<{ anchor_ar?: string; ref_label?: string; compare?: string[]; motif?: string }>(r.meta_json, {});
    const options = opts.filter((o) => o.item_ref === r.id).map((o) => ({ label: o.label_en ?? o.label_ar ?? '', correct: o.is_correct === 1 }));
    const correct = options.filter((o) => o.correct).map((o) => o.label);
    const answer = [correct.length ? correct.join(' · ') : null, r.explanation_en].filter(Boolean).join(' — ') || null;
    const ref = meta.ref_label
      ?? (r.ayah_from != null ? `${template.surah ?? ''}:${r.ayah_from}${r.ayah_to && r.ayah_to !== r.ayah_from ? '–' + r.ayah_to : ''}` : null);
    return {
      id: r.id, level: levelOf(r), prompt_en: r.prompt_en, prompt_ar: r.prompt_ar, answer,
      anchor_ar: meta.anchor_ar ?? null, ref_label: ref, passage_ref: passageOf(r, passages),
      compare: meta.compare ?? null, motif: meta.motif ?? null,
      interaction: r.interaction, difficulty: r.difficulty, step_key: r.step_key, options,
      can_share: r.pack_owner === user,
      shared_with: r.pack_owner === user ? shares.filter((s) => s.item_ref === r.id).map((s) => s.workspace_id) : [],
    };
  });
}
