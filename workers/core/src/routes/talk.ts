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
    const rows = await query(
      env.DB_CORE,
      `SELECT d.id, d.title, d.description, d.audience, d.language, d.is_shared,
              d.owner_ref, d.created_at,
              (SELECT COUNT(*) FROM core_talk_card c WHERE c.deck_ref = d.id) AS cards,
              (d.owner_ref = ?) AS is_mine
         FROM core_talk_deck d
        WHERE d.owner_ref = ? OR d.is_shared = 1
        ORDER BY d.created_at DESC`,
      [ctx.userId, ctx.userId],
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
      `INSERT INTO core_talk_deck (id, owner_ref, title, description, audience, language, is_shared)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, ctx.userId, title, str(body?.['description']), audience,
       str(body?.['language']) ?? 'en', body?.['is_shared'] ? 1 : 0],
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
    if (deck['owner_ref'] !== ctx.userId && !deck['is_shared']) {
      return forbidden('Not your deck');
    }
    // Ordered by depth then sequence, so a client that deals straight through
    // opens light and ends deep. Shuffling is the client's choice; the order
    // stored is the one the deck was written in.
    const cards = await query(
      env.DB_CORE,
      `SELECT id, prompt, depth, tags, seq FROM core_talk_card
        WHERE deck_ref = ? ORDER BY depth, seq, created_at`, [id]);
    return ok({ deck, cards });
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
        `INSERT INTO core_talk_card (id, deck_ref, prompt, depth, tags, seq)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [cardId, id, prompt,
         Number.isInteger(depth) && depth >= 1 && depth <= 3 ? depth : 1,
         str(body?.['tags']), seq++],
      );
      made.push({ id: cardId, prompt });
    }
    return created({ added: made.length, cards: made });
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
