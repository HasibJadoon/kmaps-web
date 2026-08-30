// ─── Importing a pack ─────────────────────────────────────────────────────────
//
// Idempotent by three mechanisms, generalising what migration 028 established
// for generated questions:
//
//   1. `UNIQUE (pack_ref, slug)` — the slug is hand-authored and stable, so a
//      re-import UPSERTs. It is to a written item what `generated_from` is to a
//      generated one: the identity the author controls.
//   2. `content_digest` — an unchanged item is counted and skipped, not
//      rewritten. This is what makes re-importing a hundred cards cheap and a
//      dry run's diff worth reading.
//   3. A slug present in the bank and absent from the document is RETIRED,
//      never deleted, because responses point at it and deleting an item
//      deletes the history of everyone who answered it.

import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type {
  PackDoc, UnitDoc, ItemDoc, OptionDoc, ImportResult,
} from './types';

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null;

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** A stable digest of everything that decides what this item IS. Deliberately
 *  excludes ids and timestamps: re-importing an unchanged document must produce
 *  an unchanged digest, or the skip never fires. */
async function digestOf(item: ItemDoc): Promise<string> {
  const normalised = JSON.stringify({
    i: item.interaction ?? 'choice',
    s: item.scoring ?? 'match_correct',
    p: [item.prompt_en, item.prompt_ar, item.prompt_ur, item.stimulus_md],
    r: item.response ?? null,
    e: [item.explanation_en, item.explanation_ar, item.explanation_ur],
    d: item.difficulty ?? 3,
    t: item.seconds ?? null,
    o: (item.options ?? []).map((o) => [
      o.en, o.ar, o.ur, o.correct ? 1 : 0, o.role ?? 'choice',
      o.pair_key ?? null, o.credit ?? null,
      o.why_wrong_en, o.why_wrong_ar, o.why_wrong_ur,
    ]),
    scope: [item.module, item.resource_ref, item.surah, item.ayah_from,
            item.ayah_to, item.step_key, item.concept_ref],
  });
  const bytes = new TextEncoder().encode(normalised);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Every item in the document, whether written under a unit or at pack level. */
function collectItems(doc: PackDoc): Array<{ item: ItemDoc; unitSlugs: string[] }> {
  const out: Array<{ item: ItemDoc; unitSlugs: string[] }> = [];
  for (const item of doc.items ?? []) {
    out.push({ item, unitSlugs: item.units ?? [] });
  }
  for (const unit of doc.units ?? []) {
    for (const item of unit.items ?? []) {
      out.push({ item, unitSlugs: [unit.slug, ...(item.units ?? [])] });
    }
  }
  return out;
}

/** What the document says before anything is written.
 *
 *  Validation is deliberately strict about the two things that cannot be fixed
 *  later without a data migration: a duplicate slug (which would silently make
 *  two items one) and a scored item with no way to be right. */
export function validate(doc: PackDoc): string[] {
  const errors: string[] = [];
  if (!doc?.pack?.slug) errors.push('pack.slug is required');
  if (!doc?.pack?.app) errors.push('pack.app is required (path | quiz | table)');
  if (!doc?.pack?.title) errors.push('pack.title is required');

  const unitSlugs = new Set<string>();
  for (const unit of doc.units ?? []) {
    if (!unit.slug) { errors.push('a unit has no slug'); continue; }
    if (unitSlugs.has(unit.slug)) errors.push(`duplicate unit slug: ${unit.slug}`);
    unitSlugs.add(unit.slug);
  }
  for (const unit of doc.units ?? []) {
    for (const from of unit.unlocks_from ?? []) {
      if (!unitSlugs.has(from)) {
        errors.push(`unit ${unit.slug} unlocks_from unknown unit: ${from}`);
      }
    }
    if (unit.parent && !unitSlugs.has(unit.parent)) {
      errors.push(`unit ${unit.slug} has unknown parent: ${unit.parent}`);
    }
  }

  const itemSlugs = new Set<string>();
  for (const { item, unitSlugs: refs } of collectItems(doc)) {
    if (!item.slug) { errors.push('an item has no slug'); continue; }
    if (itemSlugs.has(item.slug)) errors.push(`duplicate item slug: ${item.slug}`);
    itemSlugs.add(item.slug);

    for (const ref of refs) {
      if (!unitSlugs.has(ref)) {
        errors.push(`item ${item.slug} refers to unknown unit: ${ref}`);
      }
    }

    // A scored item that nothing can answer correctly is the failure this
    // catches: it looks fine in the file and is unanswerable in the room.
    const scoring = item.scoring ?? 'match_correct';
    if (scoring !== 'none') {
      const hasCorrectOption = (item.options ?? []).some((o) => o.correct);
      const hasDeclared = item.response !== undefined && item.response !== null;
      if (!hasCorrectOption && !hasDeclared) {
        errors.push(`item ${item.slug} is scored '${scoring}' but declares no correct answer`);
      }
    }
    if ((item.options ?? []).length === 1) {
      errors.push(`item ${item.slug} has a single option`);
    }
  }
  return errors;
}

/** Refuse a document whose unlock edges form a cycle.
 *
 *  Checked HERE rather than at render time: a cycle discovered while drawing a
 *  path is an infinite loop in a Worker, and a cycle discovered at import is a
 *  message naming the units involved. */
export function findCycle(doc: PackDoc): string[] | null {
  const edges = new Map<string, string[]>();
  for (const unit of doc.units ?? []) {
    edges.set(unit.slug, unit.unlocks_from ?? []);
  }
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];

  const walk = (slug: string): string[] | null => {
    if (state.get(slug) === 'done') return null;
    if (state.get(slug) === 'visiting') {
      return [...stack.slice(stack.indexOf(slug)), slug];
    }
    state.set(slug, 'visiting');
    stack.push(slug);
    for (const next of edges.get(slug) ?? []) {
      const cycle = walk(next);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(slug, 'done');
    return null;
  };

  for (const slug of edges.keys()) {
    const cycle = walk(slug);
    if (cycle) return cycle;
  }
  return null;
}

export async function importPack(
  db: D1Database, actorRef: string, doc: PackDoc,
  opts: { dryRun: boolean; filePath?: string | null },
): Promise<ImportResult> {
  const importId = typedId('BIM');
  const raw = JSON.stringify(doc);
  const fileDigest = await digestOf({ slug: 'pack', prompt_en: raw } as ItemDoc);

  const errors = validate(doc);
  const cycle = findCycle(doc);
  if (cycle) errors.push(`unlock cycle: ${cycle.join(' → ')}`);

  const counts = {
    units_created: 0, units_updated: 0,
    items_created: 0, items_updated: 0, items_unchanged: 0, items_retired: 0,
  };

  if (errors.length > 0) {
    await ledger(db, importId, null, actorRef, opts, fileDigest, counts, errors, raw);
    return { import_id: importId, pack_ref: null, dry_run: opts.dryRun, ...counts, errors };
  }

  // ── the pack ───────────────────────────────────────────────────────────────
  const p = doc.pack;
  const existing = await queryOne<{ id: string }>(
    db, 'SELECT id FROM core_bank_pack WHERE slug = ?', [p.slug]);
  const packId = existing?.id ?? typedId('BPK');

  if (!opts.dryRun) {
    if (existing) {
      await execute(db,
        `UPDATE core_bank_pack
            SET app=?, title=?, title_ar=?, description_md=?, language=?, audience=?,
                cefr_from=?, cefr_to=?, visibility=?, workspace_ref=?, owner_ref=?,
                status=?, sort_order=?, source_json=?, source_format='json',
                updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')
          WHERE id=?`,
        [p.app, p.title, str(p.title_ar), str(p.description_md), p.language ?? 'en',
         str(p.audience), str(p.cefr_from), str(p.cefr_to), p.visibility ?? 'private',
         str(p.workspace_ref), str(p.owner_ref), p.status ?? 'live',
         num(p.sort_order) ?? 0, raw, packId]);
    } else {
      await execute(db,
        `INSERT INTO core_bank_pack
           (id, slug, app, title, title_ar, description_md, language, audience,
            cefr_from, cefr_to, visibility, workspace_ref, owner_ref, status,
            sort_order, source_json, source_format)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'json')`,
        [packId, p.slug, p.app, p.title, str(p.title_ar), str(p.description_md),
         p.language ?? 'en', str(p.audience), str(p.cefr_from), str(p.cefr_to),
         p.visibility ?? 'private', str(p.workspace_ref), str(p.owner_ref),
         p.status ?? 'live', num(p.sort_order) ?? 0, raw]);
    }
  }

  // ── units ──────────────────────────────────────────────────────────────────
  const unitIds = new Map<string, string>();
  const units = doc.units ?? [];
  for (const [index, unit] of units.entries()) {
    const found = await queryOne<{ id: string }>(
      db, 'SELECT id FROM core_bank_unit WHERE pack_ref=? AND slug=?', [packId, unit.slug]);
    const unitId = found?.id ?? typedId('BUN');
    unitIds.set(unit.slug, unitId);
    found ? counts.units_updated++ : counts.units_created++;
    if (opts.dryRun) continue;

    const cols = [
      unit.title, str(unit.title_ar), str(unit.subtitle), unit.node_type ?? 'lesson',
      num(unit.unit_index) ?? index, num(unit.item_count), unit.item_order ?? 'fixed',
      num(unit.pass_threshold) ?? 1.0, num(unit.hearts), num(unit.xp_award) ?? 10,
      num(unit.estimated_mins), str(unit.module), str(unit.resource_ref),
      str(unit.step_key), str(unit.qr_scope_ref), str(unit.skill_focus),
      str(unit.level), unit.status ?? 'live',
    ];
    if (found) {
      await execute(db,
        `UPDATE core_bank_unit
            SET title=?, title_ar=?, subtitle=?, node_type=?, unit_index=?,
                item_count=?, item_order=?, pass_threshold=?, hearts=?, xp_award=?,
                estimated_mins=?, module=?, resource_ref=?, step_key=?, qr_scope_ref=?,
                skill_focus=?, level=?, status=?,
                updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')
          WHERE id=?`, [...cols, unitId]);
    } else {
      await execute(db,
        `INSERT INTO core_bank_unit
           (id, pack_ref, slug, title, title_ar, subtitle, node_type, unit_index,
            item_count, item_order, pass_threshold, hearts, xp_award, estimated_mins,
            module, resource_ref, step_key, qr_scope_ref, skill_focus, level, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [unitId, packId, unit.slug, ...cols]);
    }
  }

  // Parents in a second pass: a unit may name a parent written after it.
  if (!opts.dryRun) {
    for (const unit of units) {
      if (!unit.parent) continue;
      const child = unitIds.get(unit.slug);
      const parent = unitIds.get(unit.parent);
      if (child && parent) {
        await execute(db, 'UPDATE core_bank_unit SET parent_ref=?, depth=1 WHERE id=?',
                      [parent, child]);
      }
    }
  }

  // ── items ──────────────────────────────────────────────────────────────────
  const seenSlugs = new Set<string>();
  for (const { item, unitSlugs } of collectItems(doc)) {
    seenSlugs.add(item.slug);
    const digest = await digestOf(item);
    const found = await queryOne<{ id: string; content_digest: string | null }>(
      db, 'SELECT id, content_digest FROM core_bank_item WHERE pack_ref=? AND slug=?',
      [packId, item.slug]);

    if (found && found.content_digest === digest) {
      counts.items_unchanged++;
      if (!opts.dryRun) await linkUnits(db, found.id, unitSlugs, unitIds, item.seq);
      continue;
    }

    const itemId = found?.id ?? typedId('BIT');
    found ? counts.items_updated++ : counts.items_created++;
    if (opts.dryRun) continue;

    const cols = [
      str(item.prompt_en), str(item.prompt_ar), str(item.prompt_ur),
      str(item.stimulus_md), str(item.media_r2_key),
      item.interaction ?? 'choice', item.scoring ?? 'match_correct',
      item.response === undefined || item.response === null
        ? null : JSON.stringify(item.response),
      num(item.seconds), item.points_style ?? 'standard', item.speed_bonus ? 1 : 0,
      str(item.explanation_en), str(item.explanation_ar), str(item.explanation_ur),
      num(item.difficulty) ?? 3, str(item.renderer),
      str(item.module) ?? 'other', str(item.resource_type), str(item.resource_ref),
      num(item.surah), num(item.ayah_from), num(item.ayah_to),
      str(item.passage_ref), str(item.step_key), str(item.concept_ref),
      str(item.root_norm), str(item.lemma_ref), str(item.tags),
      item.status ?? 'live', digest, importId,
    ];
    if (found) {
      await execute(db,
        `UPDATE core_bank_item
            SET prompt_en=?, prompt_ar=?, prompt_ur=?, stimulus_md=?, media_r2_key=?,
                interaction=?, scoring=?, response_json=?, seconds=?, points_style=?,
                speed_bonus=?, explanation_en=?, explanation_ar=?, explanation_ur=?,
                difficulty=?, renderer=?, module=?, resource_type=?, resource_ref=?,
                surah=?, ayah_from=?, ayah_to=?, passage_ref=?, step_key=?,
                concept_ref=?, root_norm=?, lemma_ref=?, tags=?, status=?,
                content_digest=?, import_ref=?, source='imported',
                updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')
          WHERE id=?`, [...cols, itemId]);
    } else {
      await execute(db,
        `INSERT INTO core_bank_item
           (id, pack_ref, slug, prompt_en, prompt_ar, prompt_ur, stimulus_md,
            media_r2_key, interaction, scoring, response_json, seconds, points_style,
            speed_bonus, explanation_en, explanation_ar, explanation_ur, difficulty,
            renderer, module, resource_type, resource_ref, surah, ayah_from, ayah_to,
            passage_ref, step_key, concept_ref, root_norm, lemma_ref, tags, status,
            content_digest, import_ref, source)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'imported')`,
        [itemId, packId, item.slug, ...cols]);
    }

    // Options are replaced wholesale: their identity is (item, role, order), and
    // reconciling them one by one buys nothing an author would ever notice.
    await execute(db, 'DELETE FROM core_bank_item_option WHERE item_ref=?', [itemId]);
    for (const [i, option] of (item.options ?? []).entries()) {
      await writeOption(db, itemId, option, i);
    }
    await linkUnits(db, itemId, unitSlugs, unitIds, item.seq);
  }

  // ── retire what the document no longer contains ────────────────────────────
  if (!opts.dryRun && seenSlugs.size > 0) {
    const live = await query<{ id: string; slug: string }>(
      db, `SELECT id, slug FROM core_bank_item WHERE pack_ref=? AND status != 'retired'`,
      [packId]);
    for (const row of live) {
      if (seenSlugs.has(row.slug)) continue;
      await execute(db, `UPDATE core_bank_item SET status='retired',
                          updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id=?`,
                    [row.id]);
      counts.items_retired++;
    }
  }

  await ledger(db, importId, packId, actorRef, opts, fileDigest, counts, [], raw);
  return { import_id: importId, pack_ref: packId, dry_run: opts.dryRun, ...counts, errors: [] };
}

async function writeOption(
  db: D1Database, itemId: string, option: OptionDoc, index: number,
): Promise<void> {
  await execute(db,
    `INSERT INTO core_bank_item_option
       (id, item_ref, role, label_en, label_ar, label_ur, media_r2_key, is_correct,
        pair_key, credit, distractor_kind, why_wrong_en, why_wrong_ar, why_wrong_ur,
        sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [typedId('BOP'), itemId, option.role ?? 'choice',
     str(option.en), str(option.ar), str(option.ur), str(option.media_r2_key),
     option.correct ? 1 : 0, str(option.pair_key), num(option.credit),
     str(option.distractor_kind), str(option.why_wrong_en), str(option.why_wrong_ar),
     str(option.why_wrong_ur), index]);
}

async function linkUnits(
  db: D1Database, itemId: string, unitSlugs: string[],
  unitIds: Map<string, string>, seq: number | undefined,
): Promise<void> {
  for (const slug of unitSlugs) {
    const unitId = unitIds.get(slug);
    if (!unitId) continue;
    await execute(db,
      `INSERT INTO core_bank_unit_item (unit_ref, item_ref, seq)
       VALUES (?,?,?) ON CONFLICT (unit_ref, item_ref) DO UPDATE SET seq=excluded.seq`,
      [unitId, itemId, num(seq) ?? 0]);
  }
}

async function ledger(
  db: D1Database, importId: string, packId: string | null, actorRef: string,
  opts: { dryRun: boolean; filePath?: string | null }, fileDigest: string,
  counts: Record<string, number>, errors: string[], raw: string,
): Promise<void> {
  // The ledger row is written even for a dry run and even for a failure — that
  // is what makes "what did the last import say" answerable.
  await execute(db,
    `INSERT INTO core_bank_import
       (id, pack_ref, actor_ref, file_path, file_digest, dry_run, units_created,
        units_updated, items_created, items_updated, items_unchanged, items_retired,
        errors_json, source_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [importId, packId, actorRef, opts.filePath ?? null, fileDigest,
     opts.dryRun ? 1 : 0, counts.units_created, counts.units_updated,
     counts.items_created, counts.items_updated, counts.items_unchanged,
     counts.items_retired, JSON.stringify(errors), raw]);
}
