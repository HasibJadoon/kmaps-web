import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, unauthorized, noContent } from '../../../shared/src/response';
import { query, queryOne, execute } from '../../../shared/src/db';
import { actorRef } from '../../../shared/src/auth';
import { ulid } from '../../../shared/src/ulid';
import type { WorldviewEnv } from '../env';
import { memo } from '../cache';
import { dual } from './prefix';

// An arc read as a hub. The arc is a wv_sources row (source_type 'arc'); its
// phases are its wv_source_units; the originals a phase reads are the
// wv_scriptural_corpora whose meta_json.phase names it, cut into
// wv_corpus_units (books) and wv_corpus_block (passages). A passage links to
// a registered concept through wv_term_links, and a concept's backlinks are
// that table read the other way.
//
// Every string the app shows is shaped here — phase titles split, counts
// worded, pill targets filled in — from the arc's own meta_json.

interface ArcMeta {
  open?: string;
  note_prefix?: string;
  labels?: Record<string, string>;
  pills?: Array<Record<string, string>>;
  lenses?: Array<Record<string, string>>;
  phase_style?: Record<string, { icon?: string; color?: string; empty?: string }>;
}

/** An arc's place on the Arcs screen (meta_json.card, written by kmaps-database arc_cards.py). */
interface ArcCard {
  shelf?: { key: string; title: string; note?: string | null; order?: number };
  order?: number;
  tagline?: string;
  span?: string | null;
  next?: string;
  stats?: { phases: number; works: number; passages: number };
}

interface SourceRow { id: string; slug: string | null; title: string; title_ar: string | null; description_md: string | null; meta_json: string | null }
interface UnitRow { id: string; title: string | null; unit_index: number | null; description_md: string | null; meta_json: string | null }

const parse = <T>(s: string | null | undefined, fallback: T): T => {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
};
const fill = (t: string | undefined, vars: Record<string, string | number>) =>
  (t ?? '').replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
/** A counted label: `key_one` when n is 1 and the data has it ("1 book"), else `key`. */
const count = (L: Record<string, string>, key: string, n: number) =>
  fill(n === 1 && L[`${key}_one`] ? L[`${key}_one`] : L[key], { n });

async function loadArc(db: D1Database, key: string) {
  const arc = await queryOne<SourceRow>(db,
    `SELECT id, slug, title, title_ar, description_md, meta_json FROM wv_sources
      WHERE (id = ? OR slug = ?) AND source_type = 'arc'`, [key, key]);
  if (!arc) return null;
  return { arc, meta: parse<ArcMeta>(arc.meta_json, {}) };
}

/** "The Homeric World — Troy & Ionia" → title and place. */
function splitTitle(t: string | null) {
  const [title, place] = (t ?? '').split(/\s+—\s+/, 2);
  return { title: title ?? '', place: place ?? null };
}

function phaseRefPrefix(meta: ArcMeta, phase: string) {
  return `${meta.note_prefix ?? 'WVA'}:${phase}`;
}

function pillsFor(meta: ArcMeta, phase: string) {
  return (meta.pills ?? []).map((p) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(p)) out[k] = fill(v, { phase });
    return out;
  });
}

/** Works, passages and concept links per phase, in one pass each. */
async function phaseCounts(db: D1Database) {
  const works = await query<{ phase: string; works: number; passages: number }>(db,
    `SELECT json_extract(c.meta_json, '$.phase') AS phase, count(DISTINCT c.id) AS works, count(b.id) AS passages
       FROM wv_scriptural_corpora c LEFT JOIN wv_corpus_block b ON b.corpus_id = c.id
      WHERE json_extract(c.meta_json, '$.phase') IS NOT NULL GROUP BY 1`);
  const links = await query<{ phase: string; links: number }>(db,
    `SELECT json_extract(c.meta_json, '$.phase') AS phase, count(*) AS links
       FROM wv_term_links l JOIN wv_corpus_block b ON b.id = l.entity_id
       JOIN wv_scriptural_corpora c ON c.id = b.corpus_id
      WHERE l.entity_type = 'corpus_block' GROUP BY 1`);
  const m = new Map<string, { works: number; passages: number; links: number }>();
  for (const w of works) m.set(w.phase, { works: w.works, passages: w.passages, links: 0 });
  for (const l of links) m.set(l.phase, { ...(m.get(l.phase) ?? { works: 0, passages: 0 }), links: l.links });
  return m;
}

/** The phase counts, kept once per version of the corpus: counting them reads
 *  every passage (~340k rows, ~0.8 s), and the hub and each phase want them. */
async function keptPhaseCounts(env: WorldviewEnv) {
  const o = await memo(env, 'corpus', 'phase-counts', async () => Object.fromEntries(await phaseCounts(env.DB_WV)));
  return new Map(Object.entries(o));
}

function shapePhase(u: UnitRow, meta: ArcMeta, counts?: { works: number; passages: number; links: number }) {
  const um = parse<Record<string, unknown>>(u.meta_json, {});
  const L = meta.labels ?? {};
  const { title, place } = splitTitle(u.title);
  const style = meta.phase_style?.[u.id] ?? {};
  const stats: string[] = [];
  if (counts?.works) {
    stats.push(count(L, 'works', counts.works), count(L, 'passages', counts.passages));
  } else if (style.empty ?? L.no_text) {
    stats.push((style.empty ?? L.no_text) as string);
  }
  if (counts?.links) stats.push(count(L, 'links', counts.links));
  return {
    id: u.id,
    index: u.unit_index ?? 0,
    kicker: fill(L.phase, { n: u.unit_index ?? 0 }),
    title, place,
    description: u.description_md,
    duration: (um.duration as string) ?? null,
    note: (um.note as string) ?? null,
    readings: (um.readings as string[]) ?? [],
    references: (um.references as Array<Record<string, string>>) ?? [],
    arabic: (um.arabic as string) ?? null,
    gloss: (um.gloss as string) ?? null,
    icon: style.icon ?? 'circle', color: style.color ?? '#D8B657',
    stats,
    note_ref: phaseRefPrefix(meta, u.id),
    pills: pillsFor(meta, u.id),
  };
}

interface BlockRow {
  id: string; corpus_id: string; corpus_unit_id: string; cite_raw: string; cite_end_raw: string | null;
  text_orig: string | null; text_en: string | null; source_url: string | null; meta_json: string | null;
  block_type: string | null; direction: string | null; lang: string | null;
}
interface LinkRow {
  id: string; entity_id: string; al_concept_ref: string; link_type: string; note: string | null; quote: string | null;
  core_user_ref: string | null; label_en: string | null; label_ar: string | null; domain: string | null;
}

/** "1.1" + "1.32" → "1.1–32"; "1.1.1" + "1.1.12" → "1.1.1–12"; across books "1.600–2.10". */
function citeLabel(a: string, b: string | null) {
  if (!b || b === a) return a;
  const pa = a.split('.'), pb = b.split('.');
  if (pa.length !== pb.length) return `${a}–${b}`;
  let i = 0;
  while (i < pa.length - 1 && pa[i] === pb[i]) i++;
  return `${a}–${pb.slice(i).join('.')}`;
}

async function linksFor(db: D1Database, ids: string[]) {
  if (!ids.length) return new Map<string, LinkRow[]>();
  const rows = await query<LinkRow>(db,
    `SELECT l.id, l.entity_id, l.al_concept_ref, l.link_type, l.note, l.quote, l.core_user_ref,
            c.label_en, c.label_ar, c.domain
       FROM wv_term_links l LEFT JOIN core_concept c ON c.id = l.al_concept_ref
      WHERE l.entity_type = 'corpus_block' AND l.entity_id IN (${ids.map(() => '?').join(',')})
      ORDER BY l.created_at`, ids);
  const m = new Map<string, LinkRow[]>();
  for (const r of rows) m.set(r.entity_id, [...(m.get(r.entity_id) ?? []), r]);
  return m;
}

async function proposalsFor(db: D1Database, ids: string[]) {
  if (!ids.length) return new Map<string, Array<{ id: string; label: string; quote: string | null }>>();
  const rows = await query<{ id: string; source_chunk_ref: string; payload_json: string }>(db,
    `SELECT id, source_chunk_ref, payload_json FROM wv_insight_suggestions
      WHERE suggestion_type = 'concept' AND status = 'suggested'
        AND source_chunk_ref IN (${ids.map(() => '?').join(',')})`, ids);
  const m = new Map<string, Array<{ id: string; label: string; quote: string | null }>>();
  for (const r of rows) {
    const p = parse<{ label_en?: string; quote?: string }>(r.payload_json, {});
    m.set(r.source_chunk_ref, [...(m.get(r.source_chunk_ref) ?? []), { id: r.id, label: p.label_en ?? '', quote: p.quote ?? null }]);
  }
  return m;
}

const shapeLink = (l: LinkRow, me: string | null) => ({
  id: l.id, concept: l.al_concept_ref, label: l.label_en ?? l.al_concept_ref, label_ar: l.label_ar,
  domain: l.domain, quote: l.quote, note: l.note, mine: !!me && l.core_user_ref === me,
});

export interface ArcCardOut {
  id: string; slug: string | null; title: string; title_ar: string | null; kicker: string | null;
  tagline: string | null; span: string | null; language: string | null; description: string | null;
  phases: Array<{ id: string; title: string; color: string }>;
  stats: { phases: number; works: number; passages: number } | null; measure: string | null;
  next: { id: string; title: string } | null; prev: { id: string; title: string } | null;
  shelf: { key: string; title: string; note: string | null; order: number };
  order: number;
}

/** Every arc as its card shows it — from meta_json.card, written by kmaps-database
 *  arc_cards.py — so nothing is counted per request. Shared by /arcs and /atlas. */
export async function arcCards(db: D1Database): Promise<ArcCardOut[]> {
  const arcs = await query<SourceRow & { language: string | null }>(db,
    `SELECT id, slug, title, title_ar, description_md, meta_json, language FROM wv_sources WHERE source_type = 'arc'`);
  const phases = await query<{ id: string; source_id: string; title: string | null; unit_index: number | null }>(db,
    `SELECT u.id, u.source_id, u.title, u.unit_index FROM wv_source_units u
       JOIN wv_sources s ON s.id = u.source_id AND s.source_type = 'arc'
      WHERE u.parent_id IS NULL AND u.unit_type = 'phase' ORDER BY u.source_id, u.unit_index`);
  const titles = new Map(arcs.map((a) => [a.id, a.title]));
  const metas = new Map(arcs.map((a) => [a.id, parse<ArcMeta & { card?: ArcCard }>(a.meta_json, {})]));
  return arcs.map((a) => {
    const meta = metas.get(a.id)!;
    const c = meta.card ?? {};
    const L = meta.labels ?? {};
    const s = c.stats;
    const fmt = (key: string, n: number) => count(L, key, n).replace(String(n), n.toLocaleString('en-US'));
    const measure = s ? [
      `${s.phases} ${s.phases === 1 ? 'phase' : 'phases'}`,
      s.works ? fmt('works', s.works) : null,
      s.passages ? fmt('passages', s.passages) : null,
    ].filter(Boolean).join(' · ') : null;
    const prev = arcs.find((o) => metas.get(o.id)?.card?.next === a.id);
    return {
      id: a.id, slug: a.slug, title: a.title, title_ar: a.title_ar,
      kicker: L.kicker ?? null,
      tagline: c.tagline ?? null, span: c.span ?? null, language: a.language,
      description: a.description_md,
      phases: phases.filter((p) => p.source_id === a.id).map((p) => ({
        id: p.id, title: splitTitle(p.title).title,
        color: meta.phase_style?.[p.id]?.color ?? '#D8B657',
      })),
      stats: s ?? null, measure,
      next: c.next && titles.has(c.next) ? { id: c.next, title: titles.get(c.next)! } : null,
      prev: prev ? { id: prev.id, title: prev.title } : null,
      shelf: { key: c.shelf?.key ?? 'more', title: c.shelf?.title ?? 'More', note: c.shelf?.note ?? null, order: c.shelf?.order ?? 99 },
      order: c.order ?? 99,
    };
  });
}

type BlockMeta = {
  lines?: Array<{ n: string; t: string; s?: string }>; en_alt?: string; footnotes?: string[];
  audio_en?: { key: string; voice: string; duration: number; sentences: Array<{ t: string; s: number; e: number }>; words?: number[][] };
  // the Arabic read aloud: a clip of a public recording, cut to this page, with
  // each line's and each word's time inside the clip
  audio_ar?: { key: string; duration: number; lines: Array<{ s: number; e: number }>; words?: number[][]; reader?: string; source?: string };
};

const linesOf = (bm: BlockMeta, text: string | null) =>
  bm.lines ?? (text ?? '').split('\n').map((t, i) => ({ n: String(i + 1), t }));

/** A passage's readings (served by /wv/audio/:key+): the English sentence by
 *  sentence, the Arabic line by line — a line is the sentence the reader lights.
 *  Without timings, each carries only its file, length and sentence count. */
function voicesOf(bm: BlockMeta, lines: Array<{ t: string }>, timings: boolean) {
  const en = bm.audio_en ? {
    path: `audio/${bm.audio_en.key}`, duration: bm.audio_en.duration, lang: 'en',
    reader: bm.audio_en.voice ?? null, source: null, sentence_count: bm.audio_en.sentences.length,
    ...(timings ? { sentences: bm.audio_en.sentences, words: bm.audio_en.words ?? null } : {}),
  } : null;
  const ar = bm.audio_ar ? {
    path: `audio/${bm.audio_ar.key}`, duration: bm.audio_ar.duration, lang: 'ar',
    reader: bm.audio_ar.reader ?? null, source: bm.audio_ar.source ?? null, sentence_count: bm.audio_ar.lines.length,
    ...(timings ? { sentences: bm.audio_ar.lines.map((w, i) => ({ t: lines[i]?.t ?? '', s: w.s, e: w.e })),
                    words: bm.audio_ar.words ?? null } : {}),
  } : null;
  return { en, ar };
}

type UnitCore = { id: string; work: string; title: string; phase: string | null; labels: unknown;
                  prev: unknown; next: unknown; passages: Array<Record<string, unknown>> };

/** A book's passages, the same for every reader (no links, no proposals). */
async function buildUnit(db: D1Database, unit: string, lean: boolean): Promise<UnitCore | null> {
  const u = await queryOne<{ id: string; corpus_id: string; title: string; unit_index: number; meta_json: string | null; work: string }>(db,
    `SELECT u.id, u.corpus_id, u.title, u.unit_index, u.meta_json, c.title AS work
       FROM wv_corpus_units u JOIN wv_scriptural_corpora c ON c.id = u.corpus_id WHERE u.id = ?`, [unit]);
  if (!u) return null;
  const phase = parse<{ phase?: string }>(u.meta_json, {}).phase ?? null;
  const arc = phase ? await queryOne<{ meta_json: string | null }>(db,
    `SELECT s.meta_json FROM wv_sources s JOIN wv_source_units su ON su.source_id = s.id WHERE su.id = ?`, [phase]) : null;
  const meta = parse<ArcMeta>(arc?.meta_json, {});
  const [blocks, siblings] = await Promise.all([
    query<BlockRow>(db,
      `SELECT id, corpus_id, corpus_unit_id, cite_raw, cite_end_raw, text_orig, text_en, source_url, meta_json,
              block_type, direction, lang
         FROM wv_corpus_block WHERE corpus_unit_id = ? ORDER BY display_order`, [unit]),
    query<{ id: string; title: string }>(db,
      `SELECT id, title FROM wv_corpus_units WHERE corpus_id = ? AND unit_index IN (?, ?) ORDER BY unit_index`,
      [u.corpus_id, u.unit_index - 1, u.unit_index + 1]),
  ]);
  return {
    id: u.id, work: u.work, title: u.title, phase,
    labels: meta.labels ?? {},
    prev: siblings.find((s) => s.id !== u.id && s.id < u.id) ?? null,
    next: siblings.find((s) => s.id !== u.id && s.id > u.id) ?? null,
    passages: blocks.map((b) => {
      const bm = parse<BlockMeta>(b.meta_json, {});
      const lines = linesOf(bm, b.text_orig);
      const voices = voicesOf(bm, lines, !lean);
      return {
        id: b.id, cite: citeLabel(b.cite_raw, b.cite_end_raw),
        // prose numbers every section; verse every fifth line
        prose: b.block_type === 'prose', rtl: b.direction === 'rtl', lang: b.lang,
        lines, en: b.text_en, en_alt: bm.en_alt ?? null, url: b.source_url,
        footnotes: bm.footnotes ?? [],
        // `audio` is the one an older app plays (English first); `voices` carries both
        ...(lean ? { voices } : { audio: voices.en ?? voices.ar, voices }),
        note_ref: phase ? `${phaseRefPrefix(meta, phase)}:${b.id}` : `WVC:${b.id}`,
      };
    }),
  };
}

export function arcRoutes(router: Router<WorldviewEnv>) {

  // One search box for the whole of Worldview: arcs, their phases, the works
  // and books they read, and concepts — each hit names where it opens.
  // Transliteration marks set aside on both sides, so "ghazali" finds
  // al-Ghazālī and "farabi" al-Fārābī (SQLite has no unaccent).
  const MARKS: Array<[string, string]> = [['ā', 'a'], ['ī', 'i'], ['ū', 'u'], ['ḥ', 'h'], ['ṣ', 's'], ['ḍ', 'd'],
    ['ṭ', 't'], ['ẓ', 'z'], ['ʿ', ''], ['ʾ', ''], ['Ā', 'a'], ['Ī', 'i'], ['Ḥ', 'h'], ['Ṣ', 's'], ['ē', 'e'], ['ō', 'o']];
  const foldSql = (col: string) => MARKS.reduce((e, [a, b]) => `replace(${e}, '${a}', '${b}')`, `lower(${col})`);
  const foldText = (t: string) => MARKS.reduce((e, [a, b]) => e.split(a).join(b), t.toLowerCase());

  dual(router, 'get', '/search', async (req, env) => {
    const q = foldText((new URL(req.url).searchParams.get('q') ?? '').trim());
    if (q.length < 2) return ok([]);
    const like = `%${q}%`;
    const [arcs, phases, works, units, concepts] = await Promise.all([
      query<{ id: string; title: string; title_ar: string | null }>(env.DB_WV,
        `SELECT id, title, title_ar FROM wv_sources WHERE source_type = 'arc' AND (${foldSql('title')} LIKE ? OR title_ar LIKE ?) LIMIT 5`, [like, like]),
      query<{ id: string; title: string; arc: string; arc_title: string }>(env.DB_WV,
        `SELECT u.id, u.title, s.id AS arc, s.title AS arc_title FROM wv_source_units u JOIN wv_sources s ON s.id = u.source_id
          WHERE s.source_type = 'arc' AND (${foldSql('u.title')} LIKE ? OR ${foldSql('u.description_md')} LIKE ? OR u.meta_json LIKE ?) LIMIT 8`, [like, like, like]),
      query<{ id: string; title: string; unit: string | null }>(env.DB_WV,
        `SELECT c.id, c.title, (SELECT u.id FROM wv_corpus_units u WHERE u.corpus_id = c.id ORDER BY u.unit_index LIMIT 1) AS unit
           FROM wv_scriptural_corpora c WHERE ${foldSql('c.title')} LIKE ? OR c.title_ar LIKE ? LIMIT 10`, [like, like]),
      query<{ id: string; title: string; work: string }>(env.DB_WV,
        `SELECT u.id, u.title, c.title AS work FROM wv_corpus_units u JOIN wv_scriptural_corpora c ON c.id = u.corpus_id
          WHERE ${foldSql('u.title')} LIKE ? LIMIT 12`, [like]),
      query<{ id: string; label_en: string; label_ar: string | null }>(env.DB_WV,
        `SELECT id, label_en, label_ar FROM core_concept WHERE status = 'live' AND (${foldSql('label_en')} LIKE ? OR label_ar LIKE ? OR concept_key LIKE ?) LIMIT 8`,
        [like, like, like]),
    ]);
    return ok([
      ...arcs.map((a) => ({ kind: 'arc', id: a.id, title: a.title, subtitle: a.title_ar, section: 'Arcs' })),
      ...phases.map((p) => ({ kind: 'phase', id: `${p.arc}|${p.id}`, title: p.title, subtitle: p.arc_title, section: 'Arc phases' })),
      ...works.filter((w) => w.unit).map((w) => ({ kind: 'book', id: w.unit as string, title: w.title, subtitle: null, section: 'Works' })),
      ...units.map((u) => ({ kind: 'book', id: u.id, title: u.title, subtitle: u.work, section: 'Books' })),
      ...concepts.map((c) => ({ kind: 'concept', id: c.id, title: c.label_en, subtitle: c.label_ar, section: 'Concepts' })),
    ]);
  });

  // The Arcs screen: every arc as a card, on its shelf. Shelf, order, tagline,
  // span and size come from the arc's meta_json.card (kmaps-database
  // scripts/greek/arc_cards.py counts them), so nothing is counted here; an
  // arc without a card stands on “More”.
  dual(router, 'get', '/arcs', async (_req, env) => {
    const cards = await arcCards(env.DB_WV);
    const shelves = new Map<string, { key: string; title: string; note: string | null; order: number; arcs: ArcCardOut[] }>();
    for (const c of cards) {
      if (!shelves.has(c.shelf.key)) shelves.set(c.shelf.key, { ...c.shelf, arcs: [] });
      shelves.get(c.shelf.key)!.arcs.push(c);
    }
    return ok({
      shelves: [...shelves.values()]
        .sort((x, y) => x.order - y.order)
        .map(({ order: _o, arcs: list, ...shelf }) => ({
          ...shelf,
          arcs: list.sort((x, y) => x.order - y.order || x.title.localeCompare(y.title))
                    .map(({ order: _a, shelf: _s, ...card }) => card),
        })),
    });
  });

  // The hub: the arc and a card per phase.
  dual(router, 'get', '/arcs/:id', async (_req, env, { id }) => {
    const found = await loadArc(env.DB_WV, id);
    if (!found) return notFound(`arc ${id}`);
    const { arc, meta } = found;
    const units = await query<UnitRow>(env.DB_WV,
      `SELECT id, title, unit_index, description_md, meta_json FROM wv_source_units
        WHERE source_id = ? AND parent_id IS NULL ORDER BY unit_index`, [arc.id]);
    const counts = await keptPhaseCounts(env);
    return ok({
      id: arc.id, slug: arc.slug, title: arc.title, title_ar: arc.title_ar,
      description: arc.description_md, kicker: meta.labels?.kicker ?? null,
      open: meta.open ?? 'read', labels: meta.labels ?? {}, lenses: meta.lenses ?? [],
      phases: units.map((u) => shapePhase(u, meta, counts.get(u.id))),
    });
  });

  // One phase: its card, and the works it reads with their books.
  dual(router, 'get', '/arcs/:id/phases/:phase', async (_req, env, { id, phase }) => {
    const found = await loadArc(env.DB_WV, id);
    if (!found) return notFound(`arc ${id}`);
    const { arc, meta } = found;
    const u = await queryOne<UnitRow>(env.DB_WV,
      `SELECT id, title, unit_index, description_md, meta_json FROM wv_source_units WHERE id = ? AND source_id = ?`,
      [phase, arc.id]);
    if (!u) return notFound(`phase ${phase}`);
    const counts = await keptPhaseCounts(env);
    const works = await query<{ id: string; title: string; date_range: string | null; meta_json: string | null }>(env.DB_WV,
      `SELECT id, title, date_range, meta_json FROM wv_scriptural_corpora
        WHERE json_extract(meta_json, '$.phase') = ?
        ORDER BY COALESCE(json_extract(meta_json, '$.order'), 999), id`, [phase]);
    const books = await query<{ id: string; corpus_id: string; title: string; unit_index: number; start_ref: string; end_ref: string; text_excerpt: string | null; passages: number }>(env.DB_WV,
      `SELECT u.id, u.corpus_id, u.title, u.unit_index, u.start_ref, u.end_ref, u.text_excerpt,
              (SELECT count(*) FROM wv_corpus_block b WHERE b.corpus_unit_id = u.id) AS passages
         FROM wv_corpus_units u
        WHERE u.corpus_id IN (SELECT id FROM wv_scriptural_corpora WHERE json_extract(meta_json, '$.phase') = ?)
        ORDER BY u.corpus_id, u.unit_index`, [phase]);
    const L = meta.labels ?? {};
    return ok({
      ...shapePhase(u, meta, counts.get(u.id)),
      labels: L, lenses: meta.lenses ?? [],
      works: works.map((w) => {
        const wm = parse<Record<string, string>>(w.meta_json, {});
        return {
          id: w.id, title: w.title, date: w.date_range,
          facts: [
            wm.edition && { label: L.edition ?? 'Edition', value: wm.edition },
            wm.translation && { label: L.translation ?? 'Translation', value: wm.translation },
            wm.licence && { label: L.licence ?? 'Licence', value: wm.licence },
          ].filter(Boolean),
          books: books.filter((b) => b.corpus_id === w.id).map((b) => ({
            id: b.id, title: b.title, index: b.unit_index,
            range: b.end_ref && b.end_ref !== b.start_ref ? `${b.start_ref}–${b.end_ref}` : (b.start_ref ?? ''),
            opening: b.text_excerpt,
            stat: count(L, 'passages', b.passages),
          })),
        };
      }),
    });
  });

  // One book (a corpus unit) to read: its passages, with the concepts linked to
  // each and the concepts proposed for it. All of it is the same for every
  // reader, so it is built once per version of the corpus and kept (cache.ts);
  // only the "mine" on a link — the reader's own — is laid on per request. With
  // ?lean=1 a passage's voices come without their sentence and word timings
  // (most of the weight of a book); the player fetches those for the passage it
  // is about to read, from /corpus/blocks/:id/voice. Without it, the older
  // shape, `audio` included.
  dual(router, 'get', '/corpus/units/:unit', async (req, env, { unit }) => {
    const lean = new URL(req.url).searchParams.get('lean') === '1';
    type Kept = UnitCore & { links: Record<string, LinkRow[]>; proposals: Record<string, unknown[]> };
    const kept = await memo<Kept | null>(env, 'corpus', `unit:${unit}:${lean ? 'lean' : 'full'}:v2`, async () => {
      const core = await buildUnit(env.DB_WV, unit, lean);
      if (!core) return null;
      const ids = core.passages.map((p) => p.id as string);
      const [links, proposals] = await Promise.all([linksFor(env.DB_WV, ids), proposalsFor(env.DB_WV, ids)]);
      return { ...core, links: Object.fromEntries(links), proposals: Object.fromEntries(proposals) };
    });
    if (!kept) return notFound(`unit ${unit}`);
    const { links, proposals, ...core } = kept;
    const me = actorRef(req);
    return ok({
      ...core,
      passages: core.passages.map((p) => ({
        ...p,
        links: (links[p.id as string] ?? []).map((l) => shapeLink(l, me)),
        proposals: proposals[p.id as string] ?? [],
      })),
    });
  });

  // One passage's voice with all its timings — what the player needs to light
  // the sentence and the word being read.
  dual(router, 'get', '/corpus/blocks/:id/voice', async (req, env, { id }) => {
    const lang = new URL(req.url).searchParams.get('lang') === 'ar' ? 'ar' : 'en';
    const b = await queryOne<{ text_orig: string | null; meta_json: string | null }>(env.DB_WV,
      `SELECT text_orig, meta_json FROM wv_corpus_block WHERE id = ?`, [id]);
    if (!b) return notFound(`passage ${id}`);
    const bm = parse<BlockMeta>(b.meta_json, {});
    const v = voicesOf(bm, linesOf(bm, b.text_orig), true)[lang];
    return v ? ok(v) : notFound(`${lang} voice for ${id}`);
  });

  dual(router, 'get', '/concepts', async (req, env) => {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    const like = `%${q}%`;
    const rows = await query<{ id: string; label_en: string; label_ar: string | null; domain: string; uses: number }>(env.DB_WV,
      `SELECT c.id, c.label_en, c.label_ar, c.domain,
              (SELECT count(*) FROM wv_term_links l WHERE l.al_concept_ref = c.id) AS uses
         FROM core_concept c
        WHERE c.status = 'live' AND (? = '' OR c.label_en LIKE ? OR c.label_ar LIKE ? OR c.concept_key LIKE ?)
        ORDER BY (c.note_md LIKE 'Greek arc%' OR c.note_md LIKE 'Homeric%' OR c.note_md LIKE 'Iliad%' OR c.note_md LIKE 'Odyssey%') DESC,
                 uses DESC, c.label_en
        LIMIT 60`, [q, like, like, like]);
    return ok(rows.map((r) => ({ id: r.id, label: r.label_en, label_ar: r.label_ar, domain: r.domain, uses: r.uses })));
  });

  // Link a passage to a concept.
  dual(router, 'post', '/term-links', async (req, env) => {
    const me = actorRef(req);
    if (!me) return unauthorized('Sign in to link a concept');
    const b = await req.json() as { entity_id?: string; concept?: string; quote?: string; note?: string; link_type?: string };
    if (!b.entity_id || !b.concept) return badRequest('entity_id and concept required');
    const block = await queryOne(env.DB_WV, `SELECT id FROM wv_corpus_block WHERE id = ?`, [b.entity_id]);
    if (!block) return notFound(`passage ${b.entity_id}`);
    const concept = await queryOne(env.DB_WV, `SELECT id FROM core_concept WHERE id = ?`, [b.concept]);
    if (!concept) return badRequest(`${b.concept} is not a registered concept`);
    const id = `WVTL:${ulid()}`;
    await execute(env.DB_WV,
      `INSERT INTO wv_term_links (id, entity_type, entity_id, al_concept_ref, link_type, note, quote, core_user_ref)
       VALUES (?, 'corpus_block', ?, ?, ?, ?, ?, ?)`,
      [id, b.entity_id, b.concept, b.link_type ?? 'key_term', b.note?.trim() || null, b.quote?.trim() || null, me]);
    const [row] = (await linksFor(env.DB_WV, [b.entity_id])).get(b.entity_id)?.filter((l) => l.id === id) ?? [];
    return created(shapeLink(row, me));
  });

  dual(router, 'delete', '/term-links/:id', async (req, env, { id }) => {
    const me = actorRef(req);
    if (!me) return unauthorized('Sign in');
    const r = await execute(env.DB_WV, `DELETE FROM wv_term_links WHERE id = ? AND core_user_ref = ?`, [id, me]);
    return r.meta.changes ? noContent() : notFound(`link ${id}`);
  });

  // A concept the registry does not have: staged for review, never written
  // straight to core_concept (which must stay identical in three databases).
  dual(router, 'post', '/concept-suggestions', async (req, env) => {
    const me = actorRef(req);
    if (!me) return unauthorized('Sign in to propose a concept');
    const b = await req.json() as { entity_id?: string; label?: string; quote?: string; note?: string };
    if (!b.entity_id || !b.label?.trim()) return badRequest('entity_id and label required');
    const id = `WVIS:${ulid()}`;
    await execute(env.DB_WV,
      `INSERT INTO wv_insight_suggestions (id, source_chunk_ref, suggestion_type, payload_json, status, target_table, core_user_ref, meta_json)
       VALUES (?, ?, 'concept', ?, 'suggested', 'core_concept', ?, ?)`,
      [id, b.entity_id, JSON.stringify({ label_en: b.label.trim(), quote: b.quote?.trim() || null, note: b.note?.trim() || null }),
       me, JSON.stringify({ via: 'arc-reader', entity_type: 'corpus_block' })]);
    return created({ id, label: b.label.trim(), quote: b.quote?.trim() || null });
  });

  // Backlinks: every passage linked to a concept, grouped by work.
  dual(router, 'get', '/concepts/:id/backlinks', async (req, env, { id }) => {
    type Row = LinkRow & { cite_raw: string; cite_end_raw: string | null; unit: string; work_id: string; work: string; phase: string | null; en: string | null; lines: string | null };
    type C = { id: string; label_en: string; label_ar: string | null; domain: string; note_md: string | null };
    const kept = await memo<{ c: C; rows: Row[]; positions: number } | null>(env, 'corpus', `backlinks:${id}`, async () => {
      const c = await queryOne<C>(env.DB_WV,
        `SELECT id, label_en, label_ar, domain, note_md FROM core_concept WHERE id = ?`, [id]);
      if (!c) return null;
      const rows = await query<Row>(env.DB_WV,
        `SELECT l.id, l.entity_id, l.al_concept_ref, l.link_type, l.note, l.quote, l.core_user_ref,
                NULL AS label_en, NULL AS label_ar, NULL AS domain,
                b.cite_raw, b.cite_end_raw, b.corpus_unit_id AS unit, c.id AS work_id, c.title AS work,
                json_extract(c.meta_json, '$.phase') AS phase, substr(b.text_en, 1, 220) AS en,
                json_extract(b.meta_json, '$.lines[0].t') AS lines
           FROM wv_term_links l
           JOIN wv_corpus_block b ON b.id = l.entity_id
           JOIN wv_scriptural_corpora c ON c.id = b.corpus_id
          WHERE l.al_concept_ref = ? AND l.entity_type = 'corpus_block'
          ORDER BY c.id, b.cite_sort`, [id]);
      const positions = await queryOne<{ n: number }>(env.DB_WV,
        `SELECT count(*) AS n FROM wv_value_positions WHERE concept_ref = ?`, [id]);
      return { c, rows, positions: positions?.n ?? 0 };
    });
    if (!kept) return notFound(`concept ${id}`);
    const { c, rows, positions } = kept;
    const me = actorRef(req);
    const works = new Map<string, { id: string; title: string; phase: string | null; passages: unknown[] }>();
    for (const r of rows) {
      const w = works.get(r.work_id) ?? { id: r.work_id, title: r.work, phase: r.phase, passages: [] };
      w.passages.push({
        link: r.id, passage: r.entity_id, unit: r.unit, cite: citeLabel(r.cite_raw, r.cite_end_raw),
        quote: r.quote, note: r.note, first_line: r.lines, en: r.en, mine: !!me && r.core_user_ref === me,
      });
      works.set(r.work_id, w);
    }
    return ok({
      id: c.id, label: c.label_en, label_ar: c.label_ar, domain: c.domain, note: c.note_md,
      total: rows.length, positions, works: [...works.values()],
    });
  });

  // The concepts a phase's reading has touched, most linked first.
  dual(router, 'get', '/arcs/:id/phases/:phase/concepts', async (_req, env, { phase }) => {
    const rows = await query<{ id: string; label_en: string; label_ar: string | null; domain: string; n: number; works: number }>(env.DB_WV,
      `SELECT k.id, k.label_en, k.label_ar, k.domain, count(*) AS n, count(DISTINCT b.corpus_id) AS works
         FROM wv_term_links l
         JOIN wv_corpus_block b ON b.id = l.entity_id
         JOIN wv_scriptural_corpora c ON c.id = b.corpus_id
         JOIN core_concept k ON k.id = l.al_concept_ref
        WHERE l.entity_type = 'corpus_block' AND json_extract(c.meta_json, '$.phase') = ?
        GROUP BY k.id ORDER BY n DESC, k.label_en`, [phase]);
    return ok(rows.map((r) => ({ id: r.id, label: r.label_en, label_ar: r.label_ar, domain: r.domain, links: r.n, works: r.works })));
  });

  // Review: each link turned into a recall card — the concept asks, the
  // passage answers.
  dual(router, 'get', '/arcs/:id/phases/:phase/review', async (_req, env, { id, phase }) => {
    return ok(await arcReview(env, id, phase));
  });
}

/// A phase's links as recall items — the concept asks, the passage answers. Shared by the reveal view and the drills
/// (routes/practice.ts), which turn each into a choice among the phase's other passages.
export async function arcReview(env: WorldviewEnv, id: string, phase: string) {
    const found = await loadArc(env.DB_WV, id);
    const L = found?.meta.labels ?? {};
    const rows = await query<{ id: string; label_en: string; label_ar: string | null; quote: string | null; note: string | null; cite_raw: string; cite_end_raw: string | null; work: string; lines: string | null; en: string | null }>(env.DB_WV,
      `SELECT l.id, k.label_en, k.label_ar, l.quote, l.note, b.cite_raw, b.cite_end_raw, c.title AS work,
              json_extract(b.meta_json, '$.lines') AS lines, substr(b.text_en, 1, 400) AS en
         FROM wv_term_links l
         JOIN wv_corpus_block b ON b.id = l.entity_id
         JOIN wv_scriptural_corpora c ON c.id = b.corpus_id
         JOIN core_concept k ON k.id = l.al_concept_ref
        WHERE l.entity_type = 'corpus_block' AND json_extract(c.meta_json, '$.phase') = ?
        ORDER BY l.created_at DESC LIMIT 100`, [phase]);
    return {
      empty: L.review_empty ?? null, reveal: L.reveal ?? 'Reveal', title: found?.arc.title ?? null,
      items: rows.map((r) => {
        const lines = parse<Array<{ n: string; t: string }>>(r.lines, []);
        const hit = r.quote ? lines.find((l) => l.t.includes(r.quote as string)) : undefined;
        return {
          id: r.id, prompt: r.label_en, prompt_ar: r.label_ar,
          hint: r.work,
          answer_cite: `${r.work} ${citeLabel(r.cite_raw, r.cite_end_raw)}`,
          answer_greek: hit ? `${hit.n}  ${hit.t}` : (lines[0] ? `${lines[0].n}  ${lines[0].t}` : null),
          quote: r.quote, note: r.note, en: r.en,
        };
      }),
    };
}
