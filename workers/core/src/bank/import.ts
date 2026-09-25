import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import { nonBlank } from '../../../shared/src/validate';
import type {
  PackDoc, UnitDoc, ItemDoc, OptionDoc, ImportResult,
} from './types';

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

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

    const scoring = item.scoring ?? 'match_correct';
    const interaction = item.interaction ?? 'choice';
    if (scoring !== 'none') {
      const hasCorrectOption = (item.options ?? []).some((o) => o.correct);
      const hasDeclared = item.response !== undefined && item.response !== null;

      const ordered = (interaction === 'order' || interaction === 'tap_word')
        && (item.options ?? []).some((o) => (o.role ?? 'choice') === 'order_token');

      const paired = (interaction === 'match' || interaction === 'associate'
                      || interaction === 'gap_match')
        && (item.options ?? []).some((o) => o.pair_key);
      if (!hasCorrectOption && !hasDeclared && !ordered && !paired) {
        errors.push(`item ${item.slug} is scored '${scoring}' but declares no correct answer`);
      }
    }
    if ((item.options ?? []).length === 1) {
      errors.push(`item ${item.slug} has a single option`);
    }
  }
  return errors;
}

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
        [p.app, p.title, nonBlank(p.title_ar), nonBlank(p.description_md), p.language ?? 'en',
         nonBlank(p.audience), nonBlank(p.cefr_from), nonBlank(p.cefr_to), p.visibility ?? 'private',
         nonBlank(p.workspace_ref), nonBlank(p.owner_ref), p.status ?? 'live',
         num(p.sort_order) ?? 0, raw, packId]);
    } else {
      await execute(db,
        `INSERT INTO core_bank_pack
           (id, slug, app, title, title_ar, description_md, language, audience,
            cefr_from, cefr_to, visibility, workspace_ref, owner_ref, status,
            sort_order, source_json, source_format)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'json')`,
        [packId, p.slug, p.app, p.title, nonBlank(p.title_ar), nonBlank(p.description_md),
         p.language ?? 'en', nonBlank(p.audience), nonBlank(p.cefr_from), nonBlank(p.cefr_to),
         p.visibility ?? 'private', nonBlank(p.workspace_ref), nonBlank(p.owner_ref),
         p.status ?? 'live', num(p.sort_order) ?? 0, raw]);
    }
  }

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
      unit.title, nonBlank(unit.title_ar), nonBlank(unit.subtitle), unit.node_type ?? 'lesson',
      num(unit.unit_index) ?? index, num(unit.item_count), unit.item_order ?? 'fixed',
      num(unit.pass_threshold) ?? 1.0, num(unit.hearts), num(unit.xp_award) ?? 10,
      num(unit.estimated_mins), nonBlank(unit.module), nonBlank(unit.resource_ref),
      nonBlank(unit.step_key), nonBlank(unit.qr_scope_ref), nonBlank(unit.skill_focus),
      nonBlank(unit.level), unit.status ?? 'live',
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
      nonBlank(item.prompt_en), nonBlank(item.prompt_ar), nonBlank(item.prompt_ur),
      nonBlank(item.stimulus_md), nonBlank(item.media_r2_key),
      item.interaction ?? 'choice', item.scoring ?? 'match_correct',
      item.response === undefined || item.response === null
        ? null : JSON.stringify(item.response),
      num(item.seconds), item.points_style ?? 'standard', item.speed_bonus ? 1 : 0,
      nonBlank(item.explanation_en), nonBlank(item.explanation_ar), nonBlank(item.explanation_ur),
      num(item.difficulty) ?? 3, nonBlank(item.renderer),
      nonBlank(item.module) ?? 'other', nonBlank(item.resource_type), nonBlank(item.resource_ref),
      num(item.surah), num(item.ayah_from), num(item.ayah_to),
      nonBlank(item.passage_ref), nonBlank(item.step_key), nonBlank(item.concept_ref),
      nonBlank(item.root_norm), nonBlank(item.lemma_ref), nonBlank(item.tags),
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

    await execute(db, 'DELETE FROM core_bank_item_option WHERE item_ref=?', [itemId]);
    for (const [i, option] of (item.options ?? []).entries()) {
      await writeOption(db, itemId, option, i);
    }
    await linkUnits(db, itemId, unitSlugs, unitIds, item.seq);
  }

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

  await ledger(db, importId, opts.dryRun && !existing ? null : packId,
               actorRef, opts, fileDigest, counts, [], raw);
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
     nonBlank(option.en), nonBlank(option.ar), nonBlank(option.ur), nonBlank(option.media_r2_key),
     option.correct ? 1 : 0, nonBlank(option.pair_key), num(option.credit),
     nonBlank(option.distractor_kind), nonBlank(option.why_wrong_en), nonBlank(option.why_wrong_ar),
     nonBlank(option.why_wrong_ur), index]);
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
