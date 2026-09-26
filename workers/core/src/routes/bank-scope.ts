import type { Router } from '../../../shared/src/router';
import { badRequest, notFound, ok } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { CoreEnv } from '../env';

// A sūra's question bank: every bank item about the sūra, from any pack,
// sorted into scope levels — sūra, passage, passage comparison, motif, verse,
// concept — and playable as slides.
//
// The template is data: the sūra's bank pack (slug quran-<n>-bank) carries it
// in source_json — each level's words, icon, colour and slide graphic, the
// deck's theme, the passages. Nothing here names a level or draws a slide.
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
  id: string; pack_ref: string; slug: string; prompt_en: string | null; prompt_ar: string | null;
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

async function load(env: CoreEnv, surah: number) {
  const pack = await queryOne<{ id: string; slug: string; title: string; title_ar: string | null; source_json: string | null }>(
    env.DB_CORE, `SELECT id, slug, title, title_ar, source_json FROM core_bank_pack WHERE slug = ? LIMIT 1`,
    [`quran-${surah}-bank`]);
  const template = parse<Template>(pack?.source_json, {});
  const rows = await query<ItemRow>(
    env.DB_CORE,
    `SELECT i.id, i.pack_ref, i.slug, i.prompt_en, i.prompt_ar, i.explanation_en, i.interaction, i.scoring,
            i.ayah_from, i.ayah_to, i.passage_ref, i.concept_ref, i.step_key, i.difficulty, i.meta_json
       FROM core_bank_item i JOIN core_bank_pack p ON p.id = i.pack_ref
      WHERE i.module = 'QR' AND i.surah = ? AND i.status = 'live' AND p.status = 'live'
      ORDER BY (i.pack_ref = ?) DESC, i.ayah_from, i.slug`,
    [surah, pack?.id ?? '']);
  return { pack, template, rows };
}

/** The passage an item belongs to: its passage_ref, or the passage holding its verses. */
function passageOf(row: ItemRow, passages: Passage[]): string | null {
  if (row.passage_ref) return row.passage_ref;
  if (row.ayah_from == null) return null;
  return passages.find((p) => (p.ayah_from ?? 0) <= row.ayah_from! && row.ayah_from! <= (p.ayah_to ?? 0))?.ref ?? null;
}

export function bankScopeRoutes(router: Router<CoreEnv>) {
  // The bank at a glance: its template, each level with a count, each passage with a count.
  router.get('/core/bank/scopes/qr/:surah', async (_req, env, { surah }) => {
    const n = Number(surah);
    if (!Number.isInteger(n)) return badRequest('surah must be a number');
    const { pack, template, rows } = await load(env, n);
    if (!pack) return notFound(`bank for surah ${n}`);
    const passages = template.passages ?? [];
    const byLevel = new Map<string, number>();
    const byPassage = new Map<string, number>();
    for (const r of rows) {
      byLevel.set(levelOf(r), (byLevel.get(levelOf(r)) ?? 0) + 1);
      const p = passageOf(r, passages);
      if (p) byPassage.set(p, (byPassage.get(p) ?? 0) + 1);
    }
    return ok({
      surah: n, title: template.title ?? pack.title, title_ar: template.title_ar ?? pack.title_ar,
      labels: template.labels ?? {}, theme: template.theme ?? {},
      total: rows.length,
      levels: (template.levels ?? []).map((l) => ({ ...l, count: byLevel.get(l.key) ?? 0 })),
      passages: passages.map((p) => ({ ...p, count: byPassage.get(p.ref) ?? 0 })),
    });
  });

  // The questions, by level and/or passage, answers included: a study bank.
  router.get('/core/bank/scopes/qr/:surah/items', async (req, env, { surah }) => {
    const url = new URL(req.url);
    const level = url.searchParams.get('level');
    const passage = url.searchParams.get('passage');
    const { template, rows } = await load(env, Number(surah));
    const items = await shape(env, rows, template, level, passage);
    return ok(items);
  });

  // The same questions as a deck (contract v5), drawn by the template.
  router.get('/core/bank/scopes/qr/:surah/deck', async (req, env, { surah }) => {
    const url = new URL(req.url);
    const level = url.searchParams.get('level');
    const passage = url.searchParams.get('passage');
    const n = Number(surah);
    const { pack, template, rows } = await load(env, n);
    if (!pack) return notFound(`bank for surah ${n}`);
    const items = await shape(env, rows, template, level, passage);
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

/** Items as the bank shows them: level, what they point at, the answer. */
async function shape(env: CoreEnv, rows: ItemRow[], template: Template, level: string | null, passage: string | null) {
  const passages = template.passages ?? [];
  const picked = rows.filter((r) => (!level || levelOf(r) === level) && (!passage || passageOf(r, passages) === passage));
  if (!picked.length) return [];
  const opts = await query<{ item_ref: string; label_en: string | null; label_ar: string | null; is_correct: number; sort_order: number }>(
    env.DB_CORE,
    `SELECT item_ref, label_en, label_ar, is_correct, sort_order FROM core_bank_item_option
      WHERE role = 'choice' AND item_ref IN (${picked.map(() => '?').join(',')}) ORDER BY sort_order`,
    picked.map((r) => r.id));
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
    };
  });
}
