// ─── /core/talk/* — cards to start a conversation ─────────────────────────────
//
//   GET  /core/talk/decks              — yours, plus anything shared
//   POST /core/talk/decks              — make one
//   GET  /core/talk/decks/:id          — the deck with its cards
//   POST /core/talk/decks/:id/cards    — add prompts, one or many
//   DELETE /core/talk/decks/:id/cards/:cardId
//
// No scoring and no schedule. A prompt that made the room talk for twenty
// minutes is a good card, and there is nothing to grade about that — which is
// why this is neither the SRS nor the quiz.
//
// Nothing is seeded from any published deck. Import is a paste box for prompts
// the person owns or wrote; a deck somebody bought is theirs, not ours to copy.

import type { Router } from '../../../shared/src/router';
import { ok, created, badRequest, notFound, forbidden, noContent } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { CoreEnv } from '../env';

const AUDIENCES = ['family', 'friends', 'couples', 'kids', 'work', 'mixed'] as const;

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>) : null;
  } catch { return null; }
}

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null;

export function talkRoutes(router: Router<CoreEnv>): void {
  router.get('/core/talk/decks', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const workspace = new URL(req.url).searchParams.get('workspace');
    const rows = await query(
      env.DB_CORE,
      `SELECT d.id, d.title, d.description, d.audience, d.language, d.is_shared,
              d.owner_ref, d.workspace_ref, d.created_at,
              COALESCE(u.display_name, u.email) AS owner_name,
              (SELECT COUNT(*) FROM core_talk_card c WHERE c.deck_ref = d.id) AS cards,
              (SELECT COUNT(*) FROM core_talk_card c
                WHERE c.deck_ref = d.id AND c.asked_at IS NULL) AS unasked,
              (d.owner_ref = ?) AS is_mine
         FROM core_talk_deck d
         LEFT JOIN core_users u ON u.id = d.owner_ref
        WHERE d.owner_ref = ?
           OR d.is_shared = 1
           -- Membership, not just a matching string. The workspace arrived as a
           -- query parameter and was trusted, so anybody could read any table's
           -- decks by guessing its id. srs.ts:386 already does it this way.
           ${workspace ? `OR (d.workspace_ref = ? AND d.workspace_ref IN
                 (SELECT workspace_id FROM core_workspace_members WHERE user_id = ?))` : ''}
        ORDER BY d.created_at DESC`,
      workspace ? [ctx.userId, ctx.userId, workspace, ctx.userId]
                : [ctx.userId, ctx.userId],
    );
    return ok(rows);
  });

  router.post('/core/talk/decks', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const title = str(body?.['title']);
    if (!title) return badRequest('title is required');

    const audience = str(body?.['audience']) ?? 'friends';
    if (!(AUDIENCES as readonly string[]).includes(audience)) {
      return badRequest(`audience must be one of: ${AUDIENCES.join(', ')}`);
    }
    const id = typedId('TLD');
    await execute(
      env.DB_CORE,
      `INSERT INTO core_talk_deck
         (id, owner_ref, title, description, audience, language, is_shared, workspace_ref)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, ctx.userId, title, str(body?.['description']), audience,
       str(body?.['language']) ?? 'en', body?.['is_shared'] ? 1 : 0,
       str(body?.['workspace_ref'])],
    );
    return created({ id, title, audience, cards: 0 });
  });

  router.get('/core/talk/decks/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const deck = await queryOne<Record<string, unknown>>(
      env.DB_CORE,
      `SELECT id, owner_ref, title, description, audience, language, is_shared, created_at
         FROM core_talk_deck WHERE id = ?`, [id]);
    if (!deck) return notFound(`deck ${id}`);

    // THE PROMPTS ARE THE OWNER'S. Everyone at the table can see that a deck
    // exists and how much is waiting in it — that is what makes a table work —
    // but not what is written in it. A question you know is coming is not the
    // same question, and half the point is being asked something you did not
    // see coming.
    const mine = deck['owner_ref'] === ctx.userId;
    if (!mine && !deck['is_shared']) return forbidden('Not your deck');

    const cards = mine
      ? await query(
          env.DB_CORE,
          // Ordered by depth then sequence, so dealing straight through opens
          // light and ends deep. Shuffling is the client's choice.
          `SELECT id, prompt, depth, tags, seq, for_name, for_ref, asked_at
             FROM core_talk_card
            WHERE deck_ref = ? ORDER BY depth, seq, created_at`, [id])
      : [];
    return ok({ deck, cards, visible: mine });
  });

  /** Add prompts. Accepts one `prompt` or a `prompts` array — pasting a page of
   *  your own questions is the normal way a deck gets made, and doing that one
   *  request at a time is how people give up halfway. */
  router.post('/core/talk/decks/:id/cards', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const deck = await queryOne<{ owner_ref: string }>(
      env.DB_CORE, 'SELECT owner_ref FROM core_talk_deck WHERE id = ?', [id]);
    if (!deck) return notFound(`deck ${id}`);
    if (deck.owner_ref !== ctx.userId) return forbidden('Not your deck');

    const body = await readJson(req);
    const depth = Number(body?.['depth'] ?? 1);
    const single = str(body?.['prompt']);
    const many = Array.isArray(body?.['prompts'])
      ? (body!['prompts'] as unknown[])
          .filter((p): p is string => typeof p === 'string')
          .map((p) => p.trim()).filter(Boolean)
      : [];
    const prompts = single ? [single, ...many] : many;
    if (prompts.length === 0) return badRequest('prompt or prompts is required');

    const start = await queryOne<{ n: number }>(
      env.DB_CORE,
      'SELECT COALESCE(MAX(seq), -1) + 1 AS n FROM core_talk_card WHERE deck_ref = ?', [id]);
    let seq = start?.n ?? 0;

    const made: { id: string; prompt: string }[] = [];
    for (const prompt of prompts) {
      const cardId = typedId('TLC');
      await execute(
        env.DB_CORE,
        `INSERT INTO core_talk_card
           (id, deck_ref, prompt, depth, tags, seq, for_name, for_ref)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [cardId, id, prompt,
         Number.isInteger(depth) && depth >= 1 && depth <= 3 ? depth : 1,
         str(body?.['tags']), seq++,
         str(body?.['for_name']), str(body?.['for_ref'])],
      );
      made.push({ id: cardId, prompt });
    }
    return created({ added: made.length, cards: made });
  });

  /** Mark a card as asked. Not a delete: the point of keeping it is that at
   *  the end of a week you can see what was actually asked, and a card that
   *  vanishes when it is played leaves no record of the evening. */
  router.post('/core/talk/cards/:cardId/asked', async (req, env, { cardId }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    // Scoped through the deck's owner, so one person cannot mark another
    // person's card as asked — including cards they were never able to read.
    await execute(
      env.DB_CORE,
      `UPDATE core_talk_card
          SET asked_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
        WHERE id = ?
          AND deck_ref IN (SELECT id FROM core_talk_deck WHERE owner_ref = ?)`,
      [cardId, ctx.userId],
    );
    return ok({ id: cardId });
  });

  /** Tonight: every card waiting to be asked, across the decks this person can
   *  see, grouped by who is asking.
   *
   *  Cross-deck on purpose. Each person prepares their own during the day, and
   *  at the table nobody wants to hand the phone round four times — one screen
   *  deals from everybody's, in turn. */
  router.get('/core/talk/tonight', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const url = new URL(req.url);
    // Everything unasked by default; `all=1` for a table that wants the lot.
    const all = url.searchParams.get('all') === '1';
    const workspace = url.searchParams.get('workspace');

    // YOUR cards only. Each person prepares their own and asks from their own
    // phone; nobody reads anybody else's deck, which is the whole reason the
    // question lands.
    const rows = await query(
      env.DB_CORE,
      `SELECT c.id, c.prompt, c.depth, c.for_name, c.for_ref, c.asked_at,
              d.id AS deck_id, d.title AS deck_title
         FROM core_talk_card c
         JOIN core_talk_deck d ON d.id = c.deck_ref
        WHERE d.owner_ref = ?
          ${all ? '' : 'AND c.asked_at IS NULL'}
        ORDER BY c.depth, c.seq`,
      [ctx.userId],
    );

    // Who else is at the table and how much they are holding — a count, never
    // a prompt. It is what tells the room whether everybody came prepared.
    const table = workspace
      ? await query(
          env.DB_CORE,
          `SELECT d.owner_ref AS user_id,
                  -- The local part, not the address. This is read by everyone
                  -- at the table, and a seat label does not need a mailbox.
                  COALESCE(u.display_name,
                           substr(u.email, 1, instr(u.email, '@') - 1), u.id) AS name,
                  COUNT(c.id) AS waiting
             FROM core_talk_deck d
             LEFT JOIN core_talk_card c
               ON c.deck_ref = d.id AND c.asked_at IS NULL
             LEFT JOIN core_users u ON u.id = d.owner_ref
            -- Only a table you are actually at: this returned the members and
            -- their counts for any workspace id a caller cared to type.
            WHERE d.workspace_ref = ?
              AND d.workspace_ref IN (SELECT workspace_id FROM core_workspace_members
                                       WHERE user_id = ?)
            GROUP BY d.owner_ref
            ORDER BY name`,
          [workspace, ctx.userId])
      : [];

    return ok({ cards: rows, table });
  });

  router.delete('/core/talk/decks/:id/cards/:cardId', async (req, env, { id, cardId }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const deck = await queryOne<{ owner_ref: string }>(
      env.DB_CORE, 'SELECT owner_ref FROM core_talk_deck WHERE id = ?', [id]);
    if (!deck) return notFound(`deck ${id}`);
    if (deck.owner_ref !== ctx.userId) return forbidden('Not your deck');
    await execute(env.DB_CORE,
      'DELETE FROM core_talk_card WHERE id = ? AND deck_ref = ?', [cardId, id]);
    return noContent();
  });
}
