import type { Router } from '../../../shared/src/router';
import {
  ok, created, notFound, badRequest, forbidden, noContent,
} from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { CoreEnv } from '../env';
import {
  SrsRepo, DEFAULT_NEW_PER_DAY, DEFAULT_REVIEW_PER_DAY,
  type SrsCard, type SrsDeck, type SrsParams,
} from '../repositories/srs.repo';
import {
  grade as gradeCard, previewDays, retrievabilityOf, evaluate, optimize,
  buildParams, isRating, default_w,
  type RatingValue, type StoredParams,
} from '../srs/fsrs';
import type { FSRSParameters } from 'ts-fsrs';
import { storedOf } from '../srs/stored-params';
import { answerCard } from '../srs/answer';

const MODULES = new Set(['AR', 'AL', 'QR', 'WV', 'EN', 'other']);

const DOMAIN_OF_MODULE: Record<string, string> = {
  QR: 'Quran',
  AR: 'Arabic',
  AL: 'Arabic Linguistics',
  WV: 'WorldView',
  EN: 'English Language',
};
const CONCEPT_DOMAINS = [
  'Quran', 'Arabic', 'Arabic Linguistics', 'WorldView', 'English Language',
] as const;

function domainOfModule(module: string | null | undefined): string | null {
  return module ? DOMAIN_OF_MODULE[module] ?? null : null;
}

const RESOURCE_TYPES = new Set([
  'vocabulary', 'grammar', 'root', 'lemma', 'word',
  'ayah', 'passage', 'concept', 'other',
]);

async function readJson(req: Request): Promise<Record<string, unknown> | undefined> {
  try {
    const body = await req.json();
    return typeof body === 'object' && body !== null && !Array.isArray(body)
      ? body as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function rootSpread(
  env: CoreEnv, root: string,
): Promise<{ surah: number; n_occur: number }[]> {
  if (!env.QURAN || !root) return [];
  try {
    const res = await env.QURAN.fetch(new Request(
      'http://internal.k-maps.local/qr/internal/root-spread',
      { method: 'POST', body: JSON.stringify({ root }),
        headers: { 'content-type': 'application/json' } },
    ));
    if (!res.ok) return [];
    const body = await res.json<{ data?: { spread?: { surah: number; n_occur: number }[] } }>();
    return body?.data?.spread ?? [];
  } catch {
    return [];
  }
}

function cardToApi(c: SrsCard, params: FSRSParameters) {
  const extra = parseJson(c.extra_json);
  return {
    id: c.id,
    deck_id: c.deck_id,
    module: c.module,
    resource_type: c.resource_type,
    resource_ref: c.resource_ref,
    card_template: c.card_template,
    card_kind: c.card_kind,
    concept_domain: c.concept_domain,
    front_text: c.front_text,
    back_text: c.back_text,

    note_type_id: c.note_type_id,
    fields: parseJson(c.fields_json),
    root_norm: c.root_norm,
    intro_surah: c.intro_surah,
    extra,
    tags: c.tags ? c.tags.split(',').filter(Boolean) : [],
    suspended: c.suspended === 1,
    stability: c.stability,
    difficulty: c.difficulty,
    card_state: c.card_state,
    learning_step: c.learning_step,
    reps: c.reps,
    lapses: c.lapses,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    last_review_at: c.last_review_at,
    next_review_at: c.next_review_at,

    preview_days: previewDays(c, new Date(), params),

    retrievability: retrievabilityOf(c, new Date(), params),
  };
}

const TAXONOMY = {
  modules: {
    QR: {
      label: 'Qurʾān',
      kinds: ['vocabulary', 'idiom', 'expression', 'translation',
              'sarf', 'nahw', 'balagha', 'irab',
              'structure', 'context', 'tajwid', 'concept'],
    },
    AL: {
      label: 'Arabic Linguistics',
      kinds: ['root_dna', 'sarf', 'nahw', 'balagha', 'furuq',
              'senses', 'concept'],
    },
    AR: {
      label: 'Arabic',
      kinds: ['vocabulary', 'grammar', 'expression', 'idiom', 'concept'],
    },
    WV: {
      label: 'Worldview',
      kinds: ['concept', 'argument', 'quote', 'definition'],
    },
    EN: {
      label: 'English Language',
      kinds: ['vocabulary', 'grammar', 'expression', 'idiom', 'concept', 'rhetoric'],
    },
    other: { label: 'Other', kinds: ['concept'] },
  },
  concept_domains: CONCEPT_DOMAINS,
} as const;

function capOf(
  decks: Map<string, SrsDeck>,
  deckId: string,
  fallback: { newPerDay: number | null; reviewPerDay: number | null },
) {
  const deck = decks.get(deckId);
  if (!deck) return { newCap: null as number | null, reviewCap: null as number | null, scope: 'deck' };
  if ((deck.limit_scope ?? 'deck') === 'deck') {

    return {
      newCap: deck.new_per_day ?? fallback.newPerDay,
      reviewCap: deck.review_per_day ?? fallback.reviewPerDay,
      scope: 'deck',
    };
  }
  let newCap: number | null = null;
  let reviewCap: number | null = null;
  let node: SrsDeck | undefined = deck;
  while (node) {
    if ((node.limit_scope ?? 'deck') === 'tree') {
      if (node.new_per_day != null) newCap = newCap == null ? node.new_per_day : Math.min(newCap, node.new_per_day);
      if (node.review_per_day != null) reviewCap = reviewCap == null ? node.review_per_day : Math.min(reviewCap, node.review_per_day);
    }
    node = node.parent_id ? decks.get(node.parent_id) : undefined;
  }

  return { newCap: newCap ?? fallback.newPerDay, reviewCap: reviewCap ?? fallback.reviewPerDay, scope: 'tree' };
}

function rootOf(decks: Map<string, SrsDeck>, deckId: string): string | undefined {
  let node = decks.get(deckId);
  while (node?.parent_id && decks.has(node.parent_id)) node = decks.get(node.parent_id);
  return node?.id;
}

function todayFor(
  today: Map<string, { introduced: number; reviewed: number }>,
  decks: Map<string, SrsDeck>,
  deckId: string,
  scope: string,
) {
  if (scope === 'deck') return today.get(deckId) ?? { introduced: 0, reviewed: 0 };
  const root = rootOf(decks, deckId);
  let introduced = 0, reviewed = 0;
  for (const [id, counts] of today) {
    if (rootOf(decks, id) === root) { introduced += counts.introduced; reviewed += counts.reviewed; }
  }
  return { introduced, reviewed };
}

function limitsFor(decks: SrsDeck[], deckId?: string) {
  const byId = new Map(decks.map((d) => [d.id, d]));
  const children = new Map<string, SrsDeck[]>();
  for (const d of decks) {
    const key = d.parent_id ?? '';
    children.set(key, [...(children.get(key) ?? []), d]);
  }
  const subtree = (id: string): string[] => {
    const out = [id];
    for (const c of children.get(id) ?? []) out.push(...subtree(c.id));
    return out;
  };

  if (!deckId || !byId.has(deckId)) {
    return { deckIds: undefined as string[] | undefined, newPerDay: null as number | null, reviewPerDay: null as number | null };
  }

  let newPerDay: number | null = null;
  let reviewPerDay: number | null = null;
  let node: SrsDeck | undefined = byId.get(deckId);
  while (node) {
    if (node.new_per_day != null) {
      newPerDay = newPerDay == null ? node.new_per_day : Math.min(newPerDay, node.new_per_day);
    }
    if (node.review_per_day != null) {
      reviewPerDay = reviewPerDay == null ? node.review_per_day : Math.min(reviewPerDay, node.review_per_day);
    }
    node = node.parent_id ? byId.get(node.parent_id) : undefined;
  }

  return { deckIds: subtree(deckId), newPerDay, reviewPerDay };
}

export function srsRoutes(router: Router<CoreEnv>) {

  router.get('/core/srs/leaderboard', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const rows = await query<{
      user_id: string; display_name: string; total: number;
      mastered: number; learning: number; reviews: number;
    }>(
      env.DB_CORE,
      `SELECT u.id AS user_id,
              u.display_name AS display_name,
              COUNT(c.id) AS total,
              SUM(CASE WHEN c.card_state = 'review' AND c.scheduled_days >= 21 THEN 1 ELSE 0 END) AS mastered,
              SUM(CASE WHEN c.card_state IN ('learning','relearning') THEN 1 ELSE 0 END) AS learning,
              COALESCE(SUM(c.reps), 0) AS reviews
         FROM core_users u
         JOIN core_srs_card c ON c.user_ref = u.id
        WHERE u.account_status = 'active'
        GROUP BY u.id, u.display_name
        HAVING COUNT(c.id) > 0
        ORDER BY mastered DESC, reviews DESC
        LIMIT 100`,
      [],
    );
    return ok({ leaderboard: rows, me: ctx.userId });
  });

  router.patch('/core/srs/decks/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const deck = await repo.findDeck(id);
    if (!deck) return notFound(`deck ${id}`);
    if (deck.user_ref !== ctx.userId) return forbidden('Not your deck');

    const body = await readJson(req);
    const shared = typeof body?.['is_shared'] === 'boolean' ? (body['is_shared'] ? 1 : 0) : deck.is_shared;
    const workspace = body?.['workspace_id'] === null
      ? null
      : (typeof body?.['workspace_id'] === 'string' ? body['workspace_id'] : deck.workspace_id);
    const title = typeof body?.['title'] === 'string' && body['title'].trim()
      ? body['title'].trim() : deck.title;

    await execute(
      env.DB_CORE,
      `UPDATE core_srs_deck SET is_shared = ?, workspace_id = ?, title = ?,
              updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
        WHERE id = ?`,
      [shared, workspace, title, id],
    );
    return ok(await repo.findDeck(id));
  });

  router.get('/core/srs/decks/shared', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const rows = await query(
      env.DB_CORE,
      `SELECT d.id, d.title, d.deck_type, d.description, d.workspace_id,
              u.display_name AS author,
              (SELECT COUNT(*) FROM core_srs_card c WHERE c.deck_id = d.id) AS card_count
         FROM core_srs_deck d
         JOIN core_users u ON u.id = d.user_ref
        WHERE d.user_ref != ?
          AND (d.is_shared = 1
               OR d.workspace_id IN (SELECT workspace_id FROM core_workspace_members WHERE user_id = ?))
        ORDER BY card_count DESC
        LIMIT 100`,
      [ctx.userId, ctx.userId],
    );
    return ok({ decks: rows });
  });

  router.post('/core/srs/decks/:id/copy', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const source = await repo.findDeck(id);
    if (!source) return notFound(`deck ${id}`);

    const visible = source.user_ref === ctx.userId || source.is_shared === 1 || (source.workspace_id
      ? (await query(env.DB_CORE,
          'SELECT 1 AS ok FROM core_workspace_members WHERE workspace_id = ? AND user_id = ?',
          [source.workspace_id, ctx.userId])).length > 0
      : false);
    if (!visible) return forbidden('That deck is not shared with you');

    const cards = await repo.cardsInDeck(id);

    const held = await query<{ card_template: string }>(
      env.DB_CORE,
      'SELECT card_template FROM core_srs_card WHERE user_ref = ?', [ctx.userId]);
    const taken = new Set(held.map((h) => h.card_template));

    let added = 0;
    for (const c of cards) {

      const origin = c.card_template && c.card_template !== 'freeform' ? c.card_template : c.id;
      if (taken.has(origin)) continue;
      const { inserted } = await repo.insertCard({
        deck_id: await deckForModule(env, ctx.userId, c.module),
        user_ref: ctx.userId,
        module: c.module, resource_type: c.resource_type, resource_ref: c.resource_ref,
        card_template: origin, front_text: c.front_text, back_text: c.back_text,
        extra_json: c.extra_json, tags: c.tags,
      });
      taken.add(origin);
      if (inserted) added += 1;
    }
    return created({ added, skipped: cards.length - added });
  });

  const DECK_TITLES: Record<string, string> = {
    QR: 'Qurʾān',
    AL: 'Arabic Linguistics',
    AR: 'Arabic',
    WV: 'Worldview',
    EN: 'English Language',
    other: 'Other',
  };

  async function deckForModule(env: CoreEnv, userId: string, module: string) {
    const code = DECK_TITLES[module] ? module : 'other';
    const found = await query<{ id: string }>(
      env.DB_CORE,
      'SELECT id FROM core_srs_deck WHERE user_ref = ? AND deck_type = ? LIMIT 1',
      [userId, code],
    );
    if (found[0]) return found[0].id;
    const deck = await new SrsRepo(env.DB_CORE).createDeck({
      user_ref: userId,
      title: DECK_TITLES[code],
      deck_type: code,
    });
    return deck.id;
  }

  function refOfNode(nodeId: string, surah: number): string {
    const m = /:ss:(\d+):(\d+)/.exec(nodeId);
    return m ? `${m[1]}:${m[2]}` : String(surah);
  }

  async function isOwner(
    env: CoreEnv, ctx: { userId: string; isAdmin: boolean },
  ): Promise<boolean> {
    return ctx.isAdmin || await isApprover(env, ctx.userId);
  }

  async function isApprover(env: CoreEnv, userId: string): Promise<boolean> {
    const allowed = (env.CARD_APPROVERS ?? '')
      .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (allowed.length === 0) return false;
    const rows = await query<{ email: string }>(
      env.DB_CORE, 'SELECT email FROM core_users WHERE id = ?', [userId]);
    const email = rows[0]?.email?.toLowerCase();
    return !!email && allowed.includes(email);
  }

  router.get('/core/srs/library/items', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const url = new URL(req.url);
    const surah = Number(url.searchParams.get('surah') ?? '0');
    const like = surah > 0 ? `CYB:quran:${surah}:%` : 'CYB:%';
    const refLike = surah > 0 ? `${surah}:%` : '%';

    const held = await query<{ card_template: string }>(
      env.DB_CORE,
      'SELECT card_template FROM core_srs_card WHERE user_ref = ?', [ctx.userId]);
    const taken = new Set(held.map((h) => h.card_template));

    const authored = await query<{
      id: string; node_id: string; card_kind: string;
      front_md: string | null; back_md: string | null;
    }>(
      env.DB_CORE,
      'SELECT id, node_id, card_kind, front_md, back_md FROM cyb_card WHERE node_id LIKE ?',
      [like],
    );

    const community = await query<{
      id: string; module: string; resource_ref: string; card_kind: string | null;
      front_text: string; back_text: string | null; author: string | null;
    }>(
      env.DB_CORE,
      `SELECT l.id, l.module, l.resource_ref, l.card_kind, l.front_text, l.back_text,
              u.display_name AS author
         FROM core_srs_library_card l
         LEFT JOIN core_users u ON u.id = l.author_ref
        WHERE l.status = 'approved' AND l.resource_ref LIKE ?`,
      [refLike],
    );

    const items = [
      ...authored.map((c) => ({
        id: c.id,
        source: 'authored',
        module: c.node_id.startsWith('CYB:ling:') ? 'AL' : 'QR',
        resource_ref: refOfNode(c.node_id, surah),
        kind: c.card_kind,
        front: c.front_md ?? '',
        back: c.back_md ?? '',
        author: null as string | null,
        taken: taken.has(c.id),
      })),
      ...community.map((c) => ({
        id: c.id,
        source: 'community',
        module: c.module,
        resource_ref: c.resource_ref,
        kind: c.card_kind ?? 'community',
        front: c.front_text,
        back: c.back_text ?? '',
        author: c.author,
        taken: taken.has(c.id),
      })),
    ];
    return ok({ items, available: items.length, enrolled: items.filter((i) => i.taken).length });
  });

  router.post('/core/srs/library/take', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const ids = Array.isArray(body?.['ids']) ? (body['ids'] as unknown[]).filter((i) => typeof i === 'string') as string[] : [];
    if (ids.length === 0) return badRequest('ids is required');

    const repo = new SrsRepo(env.DB_CORE);
    let added = 0;
    for (const id of ids) {
      const authored = await query<{
        id: string; node_id: string; card_kind: string; front_md: string | null; back_md: string | null;
      }>(env.DB_CORE, 'SELECT id, node_id, card_kind, front_md, back_md FROM cyb_card WHERE id = ?', [id]);
      if (authored[0]) {
        const c = authored[0];
        const module = c.node_id.startsWith('CYB:ling:') ? 'AL' : 'QR';
        const m = /:ss:(\d+):(\d+)/.exec(c.node_id);
        const { inserted } = await repo.insertCard({
          deck_id: await deckForModule(env, ctx.userId, module),
          user_ref: ctx.userId, module, resource_type: 'concept',
          resource_ref: module === 'AL' ? (c.node_id.split(':')[3] ?? c.node_id) : (m ? `${m[1]}:${m[2]}` : c.node_id),
          card_template: c.id,
          front_text: c.front_md ?? '', back_text: c.back_md ?? '',
          extra_json: JSON.stringify({ cyb_card: c.id, node_id: c.node_id, kind: c.card_kind }),
          tags: c.card_kind,
        });
        if (inserted) added += 1;
        continue;
      }
      const shared = await query<{
        id: string; module: string; resource_type: string; resource_ref: string;
        card_kind: string | null; front_text: string; back_text: string | null; tags: string | null;
      }>(env.DB_CORE,
        `SELECT id, module, resource_type, resource_ref, card_kind, front_text, back_text, tags
           FROM core_srs_library_card WHERE id = ? AND status = 'approved'`, [id]);
      if (!shared[0]) continue;
      const c = shared[0];
      const { inserted } = await repo.insertCard({
        deck_id: await deckForModule(env, ctx.userId, c.module),
        user_ref: ctx.userId, module: c.module, resource_type: c.resource_type,
        resource_ref: c.resource_ref, card_template: c.id,
        front_text: c.front_text, back_text: c.back_text ?? '',
        extra_json: JSON.stringify({ library_card: c.id, kind: c.card_kind }),
        tags: c.tags,
      });
      if (inserted) added += 1;
    }
    return created({ added, requested: ids.length });
  });

  router.post('/core/srs/library/submit', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const module = str(body?.['module']) ?? 'QR';
    const resourceRef = str(body?.['resource_ref']);
    const front = str(body?.['front_text']);
    if (!resourceRef) return badRequest('resource_ref is required');
    if (!front) return badRequest('front_text is required');

    const id = typedId('SRSLIB');
    await execute(env.DB_CORE,
      `INSERT INTO core_srs_library_card
         (id, author_ref, module, resource_type, resource_ref, card_kind,
          front_text, back_text, tags, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
       ON CONFLICT (author_ref, resource_ref, front_text) DO NOTHING`,
      [id, ctx.userId, module, str(body?.['resource_type']) ?? 'concept', resourceRef,
       str(body?.['card_kind']) ?? null, front, str(body?.['back_text']) ?? null,
       str(body?.['tags']) ?? null]);

    const row = await query<{ id: string; status: string }>(
      env.DB_CORE,
      `SELECT id, status FROM core_srs_library_card
        WHERE author_ref = ? AND resource_ref = ? AND front_text = ?`,
      [ctx.userId, resourceRef, front]);
    if (!row[0]) return badRequest('Could not record the submission');
    return created({ id: row[0].id, status: row[0].status, duplicate: row[0].id !== id });
  });

  router.get('/core/srs/library/pending', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const approver = await isApprover(env, ctx.userId);
    const rows = await query(
      env.DB_CORE,
      approver
        ? `SELECT l.*, u.display_name AS author, u.email AS author_email
             FROM core_srs_library_card l
             LEFT JOIN core_users u ON u.id = l.author_ref
            WHERE l.status = 'pending' ORDER BY l.created_at`
        : `SELECT l.*, NULL AS author, NULL AS author_email
             FROM core_srs_library_card l
            WHERE l.author_ref = ? ORDER BY l.created_at DESC`,
      approver ? [] : [ctx.userId],
    );
    return ok({ submissions: rows, can_approve: approver });
  });

  router.delete('/core/srs/library/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    if (!(await isApprover(env, ctx.userId))) {
      return forbidden('Only a card approver can remove library cards');
    }
    const rows = await query<{ id: string }>(env.DB_CORE,
      `SELECT id FROM core_srs_library_card WHERE id = ?`, [id]);
    if (!rows[0]) return notFound(`library card ${id}`);
    await execute(env.DB_CORE, `DELETE FROM core_srs_library_card WHERE id = ?`, [id]);
    return noContent();
  });

  router.post('/core/srs/library/:id/review', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    if (!(await isApprover(env, ctx.userId))) {
      return forbidden('Only a card approver can review submissions');
    }
    const body = await readJson(req);
    const decision = str(body?.['decision']);
    if (decision !== 'approved' && decision !== 'rejected') {
      return badRequest("decision must be 'approved' or 'rejected'");
    }
    const exists = await query<{ id: string }>(
      env.DB_CORE, 'SELECT id FROM core_srs_library_card WHERE id = ?', [id]);
    if (!exists[0]) return notFound(`submission ${id}`);
    await execute(env.DB_CORE,
      `UPDATE core_srs_library_card
          SET status = ?, review_note = ?, reviewed_by = ?,
              reviewed_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'),
              updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
        WHERE id = ?`,
      [decision, str(body?.['note']) ?? null, ctx.userId, id]);
    return ok({ id, status: decision });
  });

  router.get('/core/srs/all', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    if (!(await isOwner(env, ctx))) return forbidden('Not available for this account');

    const url = new URL(req.url);
    const module = url.searchParams.get('module') ?? undefined;
    const search = (url.searchParams.get('q') ?? '').trim();
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') ?? '200')));
    const offset = Math.max(0, Number(url.searchParams.get('offset') ?? '0'));

    const conds: string[] = [];
    const params: unknown[] = [];
    if (module) { conds.push('c.module = ?'); params.push(module); }
    if (search) {
      conds.push('(c.front_text LIKE ? OR c.back_text LIKE ? OR c.resource_ref LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const [rows, counted] = await Promise.all([
      query(
        env.DB_CORE,
        `SELECT c.id, c.module, c.resource_type, c.resource_ref, c.card_template,
                c.front_text, c.back_text, c.card_state, c.reps, c.lapses,
                c.suspended, c.next_review_at, c.deck_id,
                d.title AS deck_title,
                u.email AS owner_email, u.display_name AS owner_name,
                (c.user_ref = ?) AS is_mine
           FROM core_srs_card c
           LEFT JOIN core_srs_deck d ON d.id = c.deck_id
           LEFT JOIN core_users u ON u.id = c.user_ref
           ${where}
          ORDER BY u.email, c.module, c.resource_ref
          LIMIT ? OFFSET ?`,
        [ctx.userId, ...params, limit, offset],
      ),
      query<{ n: number }>(
        env.DB_CORE, `SELECT COUNT(*) AS n FROM core_srs_card c ${where}`, params,
      ),
    ]);

    return ok({ cards: rows, total: counted[0]?.n ?? 0, limit, offset });
  });

  router.get('/core/srs/library', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const url = new URL(req.url);
    const surah = Number(url.searchParams.get('surah') ?? '0');
    const like = surah > 0 ? `CYB:quran:${surah}:%` : 'CYB:%';

    const available = await query<{ n: number }>(
      env.DB_CORE,
      'SELECT COUNT(*) AS n FROM cyb_card WHERE node_id LIKE ?', [like],
    );

    const enrolled = await query<{ n: number }>(
      env.DB_CORE,
      `SELECT COUNT(*) AS n FROM core_srs_card
        WHERE user_ref = ?
          AND json_extract(extra_json, '$.cyb_card') IN
              (SELECT id FROM cyb_card WHERE node_id LIKE ?)`,
      [ctx.userId, like],
    );
    const kinds = await query(
      env.DB_CORE,
      'SELECT card_kind, COUNT(*) AS n FROM cyb_card WHERE node_id LIKE ? GROUP BY card_kind ORDER BY n DESC',
      [like],
    );
    return ok({
      available: available[0]?.n ?? 0,
      enrolled: enrolled[0]?.n ?? 0,
      by_kind: kinds,
    });
  });

  router.post('/core/srs/library/enroll', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const surah = Number(body?.['surah'] ?? 0);
    const scope = str(body?.['scope']) ?? (surah > 0 ? 'quran' : 'all');
    const like = scope === 'roots' ? 'CYB:ling:root:%'
      : surah > 0 ? `CYB:quran:${surah}:%`
      : 'CYB:%';

    const repo = new SrsRepo(env.DB_CORE);

    const source = await query<{
      id: string; node_id: string; card_kind: string;
      front_md: string | null; back_md: string | null; tags_json: string | null;
    }>(
      env.DB_CORE,
      'SELECT id, node_id, card_kind, front_md, back_md, tags_json FROM cyb_card WHERE node_id LIKE ?',
      [like],
    );

    const mine = await query<{ extra_json: string | null }>(
      env.DB_CORE,
      `SELECT extra_json FROM core_srs_card WHERE user_ref = ? AND extra_json LIKE '%"cyb_card"%'`,
      [ctx.userId],
    );
    const taken = new Set<string>();
    for (const row of mine) {
      try { const e = JSON.parse(row.extra_json ?? '{}'); if (e.cyb_card) taken.add(e.cyb_card); }
      catch {  }
    }

    let enrolled = 0;
    for (const c of source) {
      if (taken.has(c.id)) continue;

      const module = c.node_id.startsWith('CYB:ling:') ? 'AL' : 'QR';
      const { inserted } = await repo.insertCard({
        deck_id: await deckForModule(env, ctx.userId, module),
        user_ref: ctx.userId,
        module,
        resource_type: 'concept',
        resource_ref: module === 'AL'
          ? (c.node_id.split(':')[3] ?? c.node_id)
          : refOfNode(c.node_id, surah),

        card_template: c.id,
        front_text: c.front_md ?? '',
        back_text: c.back_md ?? '',
        extra_json: JSON.stringify({ cyb_card: c.id, node_id: c.node_id, kind: c.card_kind }),
        tags: c.card_kind,
      });
      if (inserted) enrolled += 1;
    }
    return created({ enrolled, skipped: source.length - enrolled });
  });

  router.patch('/core/srs/cards/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const card = await repo.findCard(id);
    if (!card) return notFound(`card ${id}`);
    if (card.user_ref !== ctx.userId) return forbidden('Not your card');

    const body = await readJson(req);
    const front = str(body?.['front_text']);
    const back = str(body?.['back_text']);
    const kind = str(body?.['card_kind']);
    const suspended = typeof body?.['suspended'] === 'boolean' ? (body['suspended'] ? 1 : 0) : null;

    await execute(env.DB_CORE,
      `UPDATE core_srs_card SET
         front_text = COALESCE(?, front_text),
         back_text = COALESCE(?, back_text),
         card_kind = COALESCE(?, card_kind),
         concept_domain = COALESCE(?, concept_domain),
         suspended = COALESCE(?, suspended),
         updated_at = datetime('now')
       WHERE id = ?`,
      [front ?? null, back ?? null, kind ?? null,
       domainOfModule(card.module), suspended, id]);

    const params = buildParams(storedOf(await repo.params(ctx.userId)));
    const updated = await repo.findCard(id);
    return ok(updated ? cardToApi(updated, params) : null);
  });

  router.get('/core/srs/stats/detail', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const [heatmap, forecast, intervals, ratings, retention, streak, total] = await Promise.all([
      query(env.DB_CORE,
        `SELECT substr(reviewed_at, 1, 10) AS day, COUNT(*) AS n
           FROM core_srs_review
          WHERE user_ref = ? AND reviewed_at >= date('now', '-365 day')
          GROUP BY day ORDER BY day`, [ctx.userId]),

      query(env.DB_CORE,
        `SELECT CASE WHEN date(next_review_at) < date('now') THEN date('now')
                     ELSE date(next_review_at) END AS day,
                COUNT(*) AS n
           FROM core_srs_card
          WHERE user_ref = ? AND suspended = 0 AND next_review_at IS NOT NULL
            AND date(next_review_at) <= date('now', '+30 day')
          GROUP BY day ORDER BY day`, [ctx.userId]),
      query(env.DB_CORE,
        `SELECT CASE
                  WHEN scheduled_days < 1   THEN 'learning'
                  WHEN scheduled_days < 7   THEN '1-6d'
                  WHEN scheduled_days < 21  THEN '1-3w'
                  WHEN scheduled_days < 90  THEN '3w-3m'
                  WHEN scheduled_days < 365 THEN '3m-1y'
                  ELSE '1y+' END AS bucket,
                COUNT(*) AS n
           FROM core_srs_card
          WHERE user_ref = ? AND card_state = 'review'
          GROUP BY bucket`, [ctx.userId]),
      query(env.DB_CORE,
        `SELECT rating, COUNT(*) AS n FROM core_srs_review
          WHERE user_ref = ? GROUP BY rating ORDER BY rating`, [ctx.userId]),
      query<{ total: number; remembered: number }>(env.DB_CORE,
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN rating > 1 THEN 1 ELSE 0 END) AS remembered
           FROM core_srs_review
          WHERE user_ref = ? AND state_before = 'review'`, [ctx.userId]),
      query<{ days: number }>(env.DB_CORE,
        `SELECT COUNT(*) AS days FROM (
           SELECT DISTINCT substr(reviewed_at, 1, 10) AS day
             FROM core_srs_review WHERE user_ref = ?)`, [ctx.userId]),

      query<{ n: number }>(env.DB_CORE,
        `SELECT COUNT(*) AS n FROM core_srs_review WHERE user_ref = ?`, [ctx.userId]),
    ]);

    const r = retention[0];
    return ok({
      heatmap,
      forecast,
      intervals,
      ratings,
      days_studied: streak[0]?.days ?? 0,
      retention: r && r.total > 0 ? r.remembered / r.total : null,
      reviews_total: total[0]?.n ?? 0,
    });
  });

  function tsvEscape(v: string | null | undefined): string {
    return (v ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, '<br>');
  }

  router.get('/core/srs/decks/:id/export', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const deck = await repo.findDeck(id);
    if (!deck) return notFound(`deck ${id}`);
    const mineOrShared = deck.user_ref === ctx.userId || deck.is_shared === 1;
    if (!mineOrShared) return forbidden('That deck is not shared with you');

    const cards = await repo.cardsInDeck(id);
    const lines = [
      '#separator:tab',
      '#html:true',
      '#tags column:3',
      ...cards.map((c) => [
        tsvEscape(c.front_text),
        tsvEscape(c.back_text),
        tsvEscape((c.tags ?? '').split(',').filter(Boolean).join(' ')),
      ].join('\t')),
    ];
    return new Response(lines.join('\n'), {
      headers: {
        'content-type': 'text/tab-separated-values; charset=utf-8',
        'content-disposition': `attachment; filename="${deck.title.replace(/[^\w.-]+/g, '_')}.txt"`,
      },
    });
  });

  router.post('/core/srs/import/anki', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const incoming = Array.isArray(body?.['cards']) ? body['cards'] as Array<Record<string, unknown>> : [];
    if (incoming.length === 0) return badRequest('cards is required');
    if (incoming.length > 50) return badRequest('send at most 50 cards per request');

    const repo = new SrsRepo(env.DB_CORE);
    const params = buildParams(storedOf(await repo.params(ctx.userId)));
    let imported = 0, skipped = 0, replayed = 0;

    for (const raw of incoming) {
      const module = str(raw['module']) ?? 'other';
      if (!MODULES.has(module)) { skipped += 1; continue; }
      const front = str(raw['front_text']) ?? '';
      if (!front.trim()) { skipped += 1; continue; }
      const origin = str(raw['origin']) ?? front.slice(0, 80);

      const { card, inserted } = await repo.insertCard({
        deck_id: await deckForModule(env, ctx.userId, module),
        user_ref: ctx.userId,
        module,
        resource_type: module === 'QR' ? 'ayah' : 'other',
        resource_ref: str(raw['resource_ref']) ?? origin,

        card_template: origin,
        front_text: front,
        back_text: str(raw['back_text']) ?? '',
        card_kind: str(raw['card_kind']) ?? null,

        concept_domain: domainOfModule(module),
        tags: Array.isArray(raw['tags']) ? (raw['tags'] as string[]).join(',') : null,
        extra_json: JSON.stringify({ source: 'anki', origin }),
      });
      if (!inserted) { skipped += 1; continue; }
      imported += 1;

      const reviews = (Array.isArray(raw['reviews']) ? raw['reviews'] : [])
        .map((r) => r as Record<string, unknown>)
        .filter((r) => isRating(r['rating']) && typeof r['at'] === 'number')
        .sort((a, b) => (a['at'] as number) - (b['at'] as number));
      if (reviews.length === 0) continue;

      let row = { ...card } as typeof card;
      for (const r of reviews) {
        const at = new Date(r['at'] as number);
        const rating = r['rating'] as RatingValue;
        const next = gradeCard(row, rating, at, params);
        await repo.logReview({
          card_id: card.id, user_ref: ctx.userId, rating,
          state_before: next.state_before,
          stability_after: next.columns.stability,
          difficulty_after: next.columns.difficulty,
          elapsed_days: next.columns.elapsed_days,
          scheduled_days_after: next.columns.scheduled_days,
          state_after: next.columns.card_state,
          review_duration_secs: null,
          reviewed_at: at.toISOString(),
        });
        row = { ...row, ...next.columns };
        replayed += 1;
      }
      await repo.applySchedule(card.id, {
        card_state: row.card_state, stability: row.stability!, difficulty: row.difficulty!,
        elapsed_days: row.elapsed_days, scheduled_days: row.scheduled_days,
        learning_step: row.learning_step, reps: row.reps, lapses: row.lapses,
        next_review_at: row.next_review_at!, last_review_at: row.last_review_at!,
      });
    }
    return created({ imported, skipped, replayed });
  });

  router.post('/core/srs/import', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const text = typeof body?.['text'] === 'string' ? body['text'] : '';
    if (!text.trim()) return badRequest('text is required');

    const repo = new SrsRepo(env.DB_CORE);
    const deckId = str(body?.['deck_id'])
      ?? (await repo.createDeck({
            user_ref: ctx.userId,
            title: str(body?.['title']) ?? 'Imported',
          })).id;
    const deck = await repo.findDeck(deckId);
    if (!deck) return notFound(`deck ${deckId}`);
    if (deck.user_ref !== ctx.userId) return forbidden('Not your deck');

    let imported = 0;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const cols = line.split('\t');
      const front = (cols[0] ?? '').trim();
      if (!front) continue;
      const { inserted } = await repo.insertCard({
        deck_id: deckId, user_ref: ctx.userId,
        module: 'other', resource_type: 'other',
        resource_ref: front.slice(0, 120),
        front_text: front,
        back_text: (cols[1] ?? '').trim(),
        tags: (cols[2] ?? '').trim().split(/\s+/).filter(Boolean).join(',') || null,
      });
      if (inserted) imported += 1;
    }
    return created({ deck_id: deckId, imported });
  });

  router.get('/core/srs/taxonomy', async () => ok(TAXONOMY));

  router.get('/core/srs/decks', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const rows = await query(
      env.DB_CORE,
      `SELECT d.id, d.title, d.deck_type, d.description, d.is_shared,
              d.workspace_id, d.created_at, d.updated_at,
              d.parent_id, d.slug, d.sort_order,
              d.new_per_day, d.review_per_day, d.limit_scope,
              (SELECT COUNT(*) FROM core_srs_card c WHERE c.deck_id = d.id) AS card_count,
              (SELECT COUNT(*) FROM core_srs_card c
                WHERE c.deck_id = d.id AND c.suspended = 0
                  AND (c.next_review_at IS NULL
                       OR datetime(c.next_review_at) <= datetime('now'))) AS due_count,
              (SELECT COUNT(*) FROM core_srs_card c
                WHERE c.deck_id = d.id AND c.suspended = 0 AND c.card_state = 'new') AS new_count
         FROM core_srs_deck d
        WHERE d.user_ref = ?
        ORDER BY COALESCE(d.sort_order, 0), d.title`,
      [ctx.userId],
    );
    return ok(rows);
  });

  router.get('/core/srs/settings', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const row = await repo.params(ctx.userId);
    return ok({
      new_per_day: row?.new_per_day ?? DEFAULT_NEW_PER_DAY,
      review_per_day: row?.review_per_day ?? DEFAULT_REVIEW_PER_DAY,
      is_default: row?.new_per_day == null && row?.review_per_day == null,
      default_new_per_day: DEFAULT_NEW_PER_DAY,
      default_review_per_day: DEFAULT_REVIEW_PER_DAY,
    });
  });

  router.patch('/core/srs/settings', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const repo = new SrsRepo(env.DB_CORE);
    const current = await repo.params(ctx.userId);
    const cap = (v: unknown, fallback: number | null): number | null => {
      if (v === undefined) return fallback;
      if (v === null) return null;
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return fallback;
      return Math.min(9999, Math.floor(v));
    };
    const newPerDay = cap(body?.['new_per_day'], current?.new_per_day ?? null);
    const reviewPerDay = cap(body?.['review_per_day'], current?.review_per_day ?? null);
    await repo.saveDailyLimits(ctx.userId, newPerDay, reviewPerDay);
    return ok({
      new_per_day: newPerDay ?? DEFAULT_NEW_PER_DAY,
      review_per_day: reviewPerDay ?? DEFAULT_REVIEW_PER_DAY,
      is_default: newPerDay == null && reviewPerDay == null,
      default_new_per_day: DEFAULT_NEW_PER_DAY,
      default_review_per_day: DEFAULT_REVIEW_PER_DAY,
    });
  });

  router.patch('/core/srs/decks/:id/limits', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const deck = await repo.findDeck(id);
    if (!deck) return notFound(`deck ${id}`);
    if (deck.user_ref !== ctx.userId) return forbidden('Not your deck');

    const body = await readJson(req);
    const cap = (v: unknown, current: number | null): number | null => {
      if (v === undefined) return current;
      if (v === null) return null;
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return current;
      return Math.min(9999, Math.floor(v));
    };
    const newPerDay = cap(body?.['new_per_day'], deck.new_per_day);
    const reviewPerDay = cap(body?.['review_per_day'], deck.review_per_day);
    const scope = str(body?.['limit_scope']) ?? deck.limit_scope ?? 'tree';
    if (scope !== 'tree' && scope !== 'deck') return badRequest("limit_scope must be 'tree' or 'deck'");

    await execute(env.DB_CORE,
      `UPDATE core_srs_deck
          SET new_per_day = ?, review_per_day = ?, limit_scope = ?, updated_at = datetime('now')
        WHERE id = ?`,
      [newPerDay, reviewPerDay, scope, id]);
    return ok(await repo.findDeck(id));
  });

  router.post('/core/srs/decks', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const title = str(body?.['title']);
    if (!title) return badRequest('title is required');
    const deck = await new SrsRepo(env.DB_CORE).createDeck({
      user_ref: ctx.userId,
      workspace_id: str(body?.['workspace_id']) ?? null,
      title,
      deck_type: str(body?.['deck_type']) ?? 'mixed',
      description: str(body?.['description']) ?? null,
    });
    return created(deck);
  });

  router.delete('/core/srs/decks/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const deck = await repo.findDeck(id);
    if (!deck) return notFound(`deck ${id}`);
    if (deck.user_ref !== ctx.userId) return forbidden('Not your deck');
    await repo.deleteDeck(id);
    return noContent();
  });

  router.get('/core/srs/decks/:id/cards', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const deck = await repo.findDeck(id);
    if (!deck) return notFound(`deck ${id}`);
    if (deck.user_ref !== ctx.userId) return forbidden('Not your deck');
    const params = buildParams(storedOf(await repo.params(ctx.userId)));
    const cards = await repo.cardsInDeck(id);
    return ok(cards.map((c) => cardToApi(c, params)));
  });

  /**
   * Many cards in one call, for a generator that builds a whole set at once —
   * a WGRT rhetoric entry, a root's card family. Each entry is the same shape
   * POST /core/srs/cards takes; the reply says per card whether it was newly
   * inserted or already there, so a re-run reads as a no-op rather than as
   * silent success. Deck resolution happens once for the whole batch: an
   * explicit deck_id, else a deck matching `title`, else the default deck.
   */
  router.post('/core/srs/cards/bulk', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const entries = Array.isArray(body?.['cards']) ? body['cards'] as unknown[] : null;
    if (!entries) return badRequest('cards must be an array');
    if (!entries.length) return badRequest('cards must not be empty');
    if (entries.length > 500) return badRequest('at most 500 cards per call');

    const repo = new SrsRepo(env.DB_CORE);

    let deckId = str(body?.['deck_id']);
    if (!deckId) {
      const title = str(body?.['title']);
      if (title) {
        const existing = await queryOne<{ id: string }>(
          env.DB_CORE,
          `SELECT id FROM core_srs_deck WHERE user_ref = ? AND title = ? ORDER BY created_at LIMIT 1`,
          [ctx.userId, title]);
        deckId = existing?.id
          ?? (await repo.createDeck({
                user_ref: ctx.userId,
                title,
                deck_type: str(body?.['deck_type']) ?? 'mixed',
                description: str(body?.['description']) ?? null,
              })).id;
      } else {
        deckId = (await repo.defaultDeck(ctx.userId)).id;
      }
    }

    const deck = await repo.findDeck(deckId);
    if (!deck) return notFound(`deck ${deckId}`);
    if (deck.user_ref !== ctx.userId) return forbidden('Not your deck');

    const results: Array<Record<string, unknown>> = [];
    let inserted = 0;
    let skipped  = 0;

    for (const raw of entries) {
      const entry = typeof raw === 'object' && raw !== null && !Array.isArray(raw)
        ? raw as Record<string, unknown> : null;
      const module       = entry ? str(entry['module']) : undefined;
      const resourceType = entry ? str(entry['resource_type']) : undefined;
      const resourceRef  = entry ? str(entry['resource_ref']) : undefined;

      if (!module || !MODULES.has(module)) {
        results.push({ resource_ref: resourceRef ?? null, error: 'invalid module' });
        skipped += 1;
        continue;
      }
      if (!resourceType || !RESOURCE_TYPES.has(resourceType)) {
        results.push({ resource_ref: resourceRef ?? null, error: 'invalid resource_type' });
        skipped += 1;
        continue;
      }
      if (!resourceRef) {
        results.push({ resource_ref: null, error: 'resource_ref is required' });
        skipped += 1;
        continue;
      }

      const outcome = await repo.insertCard({
        deck_id: deckId, user_ref: ctx.userId,
        module, resource_type: resourceType, resource_ref: resourceRef,
        card_kind: str(entry!['card_kind']) ?? null,
        concept_domain: domainOfModule(module),
        card_template: str(entry!['card_template']) ?? 'freeform',
        front_text: str(entry!['front_text']) ?? '',
        back_text: str(entry!['back_text']) ?? '',
        extra_json: entry!['extra'] ? JSON.stringify(entry!['extra']) : null,
        tags: Array.isArray(entry!['tags'])
          ? (entry!['tags'] as string[]).join(',')
          : str(entry!['tags']) ?? null,
        note_type_id: str(entry!['note_type_id']) ?? null,
        fields_json: entry!['fields'] ? JSON.stringify(entry!['fields']) : null,
      });

      if (outcome.inserted) inserted += 1; else skipped += 1;
      results.push({
        id: outcome.card?.id ?? null,
        resource_ref: resourceRef,
        card_template: str(entry!['card_template']) ?? 'freeform',
        inserted: outcome.inserted,
      });
    }

    return created({ deck_id: deckId, inserted, skipped, cards: results });
  });

  router.post('/core/srs/cards', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const module = str(body?.['module']);
    const resourceType = str(body?.['resource_type']);
    const resourceRef = str(body?.['resource_ref']);
    if (!module || !MODULES.has(module)) {
      return badRequest(`module must be one of ${[...MODULES].join(', ')}`);
    }
    if (!resourceType || !RESOURCE_TYPES.has(resourceType)) {
      return badRequest(`resource_type must be one of ${[...RESOURCE_TYPES].join(', ')}`);
    }
    if (!resourceRef) return badRequest('resource_ref is required');

    const repo = new SrsRepo(env.DB_CORE);
    const deckId = str(body?.['deck_id']) ?? (await repo.defaultDeck(ctx.userId)).id;
    const deck = await repo.findDeck(deckId);
    if (!deck) return notFound(`deck ${deckId}`);
    if (deck.user_ref !== ctx.userId) return forbidden('Not your deck');

    const rootNorm = str(body?.['root_norm']) ?? null;

    const introRaw = Number(body?.['intro_surah']);
    const introSurah = Number.isInteger(introRaw) && introRaw > 0 ? introRaw : null;

    const card = await repo.createCard({
      deck_id: deckId, user_ref: ctx.userId,
      module, resource_type: resourceType, resource_ref: resourceRef,
      card_kind: str(body?.['card_kind']) ?? null,
      concept_domain: domainOfModule(module),
      card_template: str(body?.['card_template']) ?? 'freeform',
      front_text: str(body?.['front_text']) ?? '',
      back_text: str(body?.['back_text']) ?? '',
      extra_json: body?.['extra'] ? JSON.stringify(body['extra']) : null,
      tags: Array.isArray(body?.['tags']) ? (body['tags'] as string[]).join(',') : null,

      note_type_id: str(body?.['note_type_id']) ?? null,
      fields_json: body?.['fields'] ? JSON.stringify(body['fields']) : null,
      root_norm: rootNorm,
      intro_surah: introSurah,
    });

    if (rootNorm && card.id) {
      const spread = await rootSpread(env, rootNorm);
      if (spread.length) await repo.linkSurahs(card.id, spread, introSurah);
    }

    return created(cardToApi(card, buildParams(storedOf(await repo.params(ctx.userId)))));
  });

  router.get('/core/srs/cards/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const card = await repo.findCard(id);
    if (!card) return notFound(`card ${id}`);
    if (card.user_ref !== ctx.userId) return forbidden('Not your card');
    return ok(cardToApi(card, buildParams(storedOf(await repo.params(ctx.userId)))));
  });

  router.delete('/core/srs/cards/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const card = await repo.findCard(id);
    if (!card) return notFound(`card ${id}`);
    if (card.user_ref !== ctx.userId) return forbidden('Not your card');
    await repo.deleteCard(id);
    return noContent();
  });

  router.post('/core/srs/cards/:id/grade', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const repo = new SrsRepo(env.DB_CORE);
    const card = await repo.findCard(id);
    if (!card) return notFound(`card ${id}`);
    if (card.user_ref !== ctx.userId) return forbidden('Not your card');

    const c = card;
    const body = await readJson(req);
    const rating: unknown = body?.['rating'];
    if (!isRating(rating)) {
      return badRequest('rating must be 1 (Again), 2 (Hard), 3 (Good) or 4 (Easy)');
    }
    const duration = typeof body?.['duration_secs'] === 'number'
      ? Math.round(body['duration_secs'] as number) : null;

    const params = buildParams(storedOf(await repo.params(ctx.userId)));
    const updated = await answerCard(repo, c, ctx.userId, rating, duration);
    return ok(cardToApi(updated, params));
  });

  router.get('/core/srs/review', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const url = new URL(req.url);
    const module = url.searchParams.get('module') ?? undefined;
    const limit = Number(url.searchParams.get('limit') ?? '50');
    const surah = Number(url.searchParams.get('surah') ?? '0');

    const from = Number(url.searchParams.get('from') ?? '0');
    const to = Number(url.searchParams.get('to') ?? '0');
    const step = url.searchParams.get('step') ?? undefined;
    const kind = url.searchParams.get('kind') ?? undefined;
    const domain = url.searchParams.get('domain') ?? undefined;
    const deck = url.searchParams.get('deck') ?? undefined;
    const ahead = Number(url.searchParams.get('ahead') ?? '0');
    const repo = new SrsRepo(env.DB_CORE);
    const params = buildParams(storedOf(await repo.params(ctx.userId)));
    const decks = await repo.decks(ctx.userId);
    const defaults = await repo.dailyDefaults(ctx.userId);
    const fallback = { newPerDay: defaults.newPerDay, reviewPerDay: defaults.reviewPerDay };
    const caps = limitsFor(decks, deck);
    const [cards, counts, today] = await Promise.all([
      repo.due(ctx.userId, {
        module,

        limit: Math.min(500, Math.max(Number.isFinite(limit) ? limit : 50, 200)),
        ahead: Number.isFinite(ahead) ? ahead : 0,
        surah: surah > 0 ? surah : undefined,
        from: from > 0 && to > 0 ? from : undefined,
        to: from > 0 && to > 0 ? to : undefined,
        step,
        kind, domain, deck, deckIds: caps.deckIds,
      }),
      repo.dueCounts(ctx.userId),
      repo.todayCountsByDeck(ctx.userId),
    ]);
    const deckById = new Map(decks.map((d) => [d.id, d]));

    const spent = new Map<string, { n: number; r: number }>();
    let served = cards;
    if (ahead <= 0) {
      served = cards.filter((c) => {
        const cap = capOf(deckById, c.deck_id, fallback);
        if (cap.newCap == null && cap.reviewCap == null) return true;

        const key = cap.scope === 'deck' ? c.deck_id : (rootOf(deckById, c.deck_id) ?? c.deck_id);
        const use = spent.get(key) ?? { n: 0, r: 0 };
        const before = todayFor(today, deckById, c.deck_id, cap.scope);
        if (c.card_state === 'new') {
          if (cap.newCap != null && before.introduced + use.n >= cap.newCap) return false;
          use.n += 1; spent.set(key, use); return true;
        }

        if (c.card_state === 'learning' || c.card_state === 'relearning') return true;
        if (cap.reviewCap != null && before.reviewed + use.r >= cap.reviewCap) return false;
        use.r += 1; spent.set(key, use); return true;
      });
    }
    served = served.slice(0, Math.min(500, Math.max(1, Number.isFinite(limit) ? limit : 50)));

    return ok({
      due: served.map((c) => cardToApi(c, params)),
      due_by_module: counts,
      ahead_days: ahead > 0 ? Math.floor(ahead) : 0,

      daily: (() => {

        if (!deck || !deckById.has(deck)) {
          return { new_per_day: null, review_per_day: null, new_today: null,
                   reviews_today: null, new_left: null, reviews_left: null };
        }
        const cap = capOf(deckById, deck, fallback);
        const used = todayFor(today, deckById, deck, cap.scope);
        return {
          new_per_day: cap.newCap,
          review_per_day: cap.reviewCap,
          new_today: used.introduced,
          reviews_today: used.reviewed,
          new_left: cap.newCap == null ? null : Math.max(0, cap.newCap - used.introduced),
          reviews_left: cap.reviewCap == null ? null : Math.max(0, cap.reviewCap - used.reviewed),
          scope: cap.scope,
        };
      })(),
    });
  });

  router.get('/core/srs/stats', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const [byState, dueByModule] = await Promise.all([
      repo.stats(ctx.userId), repo.dueCounts(ctx.userId),
    ]);
    return ok({ by_state: byState, due_by_module: dueByModule });
  });

  router.get('/core/srs/params', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const row = await repo.params(ctx.userId);
    const params = buildParams(storedOf(row));
    const log = await repo.reviewLog(ctx.userId);
    return ok({
      algorithm: 'ts-fsrs',
      fitted: row !== null,
      fitted_at: row?.fitted_at ?? null,
      is_default_weights: params.w.length === default_w.length
        && params.w.every((v, i) => v === default_w[i]),
      weights: params.w,
      request_retention: params.request_retention,
      maximum_interval: params.maximum_interval,
      learning_steps: params.learning_steps,
      relearning_steps: params.relearning_steps,
      enable_fuzz: params.enable_fuzz,
      evaluation: evaluate(log, params),
      note: row?.note ?? null,
    });
  });

  router.post('/core/srs/params/optimize', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const minimumReviews = typeof body?.['minimum_reviews'] === 'number'
      ? (body['minimum_reviews'] as number) : undefined;

    const repo = new SrsRepo(env.DB_CORE);
    const current = storedOf(await repo.params(ctx.userId));
    const log = await repo.reviewLog(ctx.userId);
    const result = optimize(log, current, { minimumReviews });

    if (result.accepted) {
      await repo.saveParams({
        user_ref: ctx.userId,
        weights: result.weights,
        fitted_reviews: result.before.reviews,
        log_loss_before: result.before.log_loss,
        log_loss_after: result.after.log_loss,
        note: result.reason,
      });
    }
    return ok({
      accepted: result.accepted,
      reason: result.reason,
      weights: result.weights,
      holdout_before: result.before,
      holdout_after: result.after,
    });
  });
}
