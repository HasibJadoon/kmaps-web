import { query, queryOne } from '../../../shared/src/db';
import { gradeOrBank, cleanSecs } from './grade-or-bank';
import type { CoreEnv } from '../env';
import { SrsRepo } from '../repositories/srs.repo';
import { isRating } from './fsrs';
import { answerCard } from './answer';

// Filing cards: what POST /core/srs/cards/bulk does with each entry, shared with the class
// (a studied class files every drill it met). An entry is the shape /core/srs/cards takes,
// with an optional `rating` (1–4) that grades the new card at once, as a review would.

export const MODULES = new Set(['AR', 'AL', 'QR', 'WV', 'EN', 'other']);

export const DOMAIN_OF_MODULE: Record<string, string> = {
  QR: 'Quran',
  AR: 'Arabic',
  AL: 'Arabic Linguistics',
  WV: 'WorldView',
  EN: 'English Language',
};
export const CONCEPT_DOMAINS = [
  'Quran', 'Arabic', 'Arabic Linguistics', 'WorldView', 'English Language',
] as const;

export function domainOfModule(module: string | null | undefined): string | null {
  return module ? DOMAIN_OF_MODULE[module] ?? null : null;
}

export const RESOURCE_TYPES = new Set([
  'vocabulary', 'grammar', 'root', 'lemma', 'word',
  'ayah', 'passage', 'concept', 'other',
]);

const RESOURCE_ALIASES: Record<string, string> = { vocab: 'vocabulary' };

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

export const DECK_TITLES: Record<string, string> = {
  QR: 'Qurʾān',
  AL: 'Arabic Linguistics',
  AR: 'Arabic',
  WV: 'Worldview',
  EN: 'English Language',
  other: 'Other',
};

export function introOf(extra: unknown): { intro_surah?: number; intro_ayah?: number } {
  const g = (extra as { group?: { workId?: unknown; work?: unknown } } | null)?.group;
  const m = /^QR:SURAH:(\d+)$/.exec(String(g?.workId ?? ''));
  if (!m) return {};
  const a = /^\d+:(\d+)/.exec(String(g?.work ?? ''));
  return { intro_surah: Number(m[1]), ...(a ? { intro_ayah: Number(a[1]) } : {}) };
}

export async function deckForModule(env: CoreEnv, userId: string, module: string) {
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

/**
 * Files each entry: to `deckId`, or with `byModule` to the learner's own deck for its
 * module. Says per card whether it was newly inserted, and whether it was graded.
 */
export async function fileCards(
  env: CoreEnv, userId: string, entries: unknown[],
  opts: { deckId?: string; byModule: boolean; holdMisses?: boolean },
): Promise<{ inserted: number; skipped: number; held: number; cards: Array<Record<string, unknown>>; moduleDecks: Map<string, string> }> {
  const repo = new SrsRepo(env.DB_CORE);
  const { deckId, byModule } = opts;
  const ctx = { userId };
  const moduleDecks = new Map<string, string>();

  const results: Array<Record<string, unknown>> = [];
  let inserted = 0;
  let skipped  = 0;
  // holdMisses (the open drill rounds): review takes in only what has been mastered. A drill met for the
  // first time and missed (Again · Hard) goes to the BANK — kept, ungraded (state 'new'), so its lesson deals
  // it again first (GET /core/srs/bank) until it is answered well; that answer moves it into review, which
  // adapts to every answer from then on. A card already in review is graded as always, a miss included.
  // Class drills gate their own filing (only what is right or perfected) and leave it off.
  let held = 0;

  for (const raw of entries) {
    const entry = typeof raw === 'object' && raw !== null && !Array.isArray(raw)
      ? raw as Record<string, unknown> : null;
    const module       = entry ? str(entry['module']) : undefined;
    // 'vocab' is the name the Qurʾān's vocabulary drills once carried (practice-vocab.ts): cards kept with it in class
    // records and kept draws are filed under the contract's name, never refused (refused, they could never reach review)
    const resourceType = entry ? RESOURCE_ALIASES[str(entry['resource_type']) ?? ''] ?? str(entry['resource_type']) : undefined;
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

    // a drill filed by practice: it must carry its drill and how it went — nothing reaches SRS unpractised
    const extra0 = entry!['extra'] as { drill?: unknown } | undefined;
    if (byModule && (!extra0?.drill || !isRating(entry!['rating']))) {
      results.push({ resource_ref: resourceRef, error: 'a drill and its answer are required' });
      skipped += 1;
      continue;
    }

    let cardDeck = deckId!;
    if (byModule) {
      if (!moduleDecks.has(module)) moduleDecks.set(module, await deckForModule(env, ctx.userId, module));
      cardDeck = moduleDecks.get(module)!;
    }
    // a drill already in review and not yet due, met again in practice: seen, not graded off its schedule
    const known = await queryOne<{ id: string; card_state: string; next_review_at: string | null }>(env.DB_CORE,
      `SELECT id, card_state, next_review_at FROM core_srs_card WHERE deck_id = ? AND resource_ref = ? AND card_template = ? LIMIT 1`,
      [cardDeck, resourceRef, str(entry!['card_template']) ?? 'freeform']);
    if (known && known.card_state !== 'new' && known.next_review_at && Date.parse(known.next_review_at) > Date.now()) {
      results.push({ graded: false, id: known.id, resource_ref: resourceRef, card_template: str(entry!['card_template']) ?? 'freeform',
                     inserted: false, seen: true });
      skipped += 1;
      continue;
    }
    const outcome = await repo.insertCard({
      deck_id: cardDeck, user_ref: ctx.userId,
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
      // a drill card says where it stands (extra.group: workId QR:SURAH:n, work "s:a"), so a surah's review finds it
      ...introOf(entry!['extra']),
    });

    if (outcome.inserted) inserted += 1; else skipped += 1;
    // a card filed from a drill carries how the learner did: graded now, as a review would be
    const rating: unknown = entry!['rating'];
    let graded = false;
    // the one rule (gradeOrBank): a resend changes nothing; a first miss — or a banked drill missed again — stays in
    // the bank for its lesson; answered well, it graduates into review
    let banked = false;
    if (outcome.card && isRating(rating)) {
      const g = await gradeOrBank(repo, outcome.card, ctx.userId, rating, cleanSecs(entry!['duration_secs']),
                                  str(entry!['op_id']) ?? null);
      graded = g.outcome === 'graded';
      banked = g.outcome === 'banked';
      if (banked) held += 1;
    }
    results.push({
      graded,
      id: outcome.card?.id ?? null,
      resource_ref: resourceRef,
      card_template: str(entry!['card_template']) ?? 'freeform',
      inserted: outcome.inserted,
      ...(banked ? { held: true, banked: true } : {}),
    });
  }

  return { inserted, skipped, held, cards: results, moduleDecks };
}
