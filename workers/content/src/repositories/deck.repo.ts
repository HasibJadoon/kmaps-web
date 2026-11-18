import { fold, latinRoots, matches } from '../lib/deck-search';
import { query, queryOne } from '../../../shared/src/db';
import type {
  Deck, DeckCollection, DeckFolder, DeckSlide, DeckSummary, DeckTheme, DeckVerseRef,
} from '../schemas/deck.schema';
import { asDeckLayout } from '../schemas/deck.schema';

// A deck is a cm_documents row of doc_type 'deck' whose slides are cm_blocks of
// block_type 'slide'. Three queries, assembled into the contract shape — the
// clients do no shaping of their own.

interface DocRow {
  doc_id: string; slug: string | null; title: string; title_ar: string | null;
  language: string; domain: string | null; subdomain: string | null;
  meta_json: string | null; updated_at: string | null;
}

interface BlockRow {
  block_id: string; seq_order: number; attrs_json: string | null;
}

interface RefRow {
  block_id: string; target_ref: string; ref_type: string;
  anchor_text: string | null; seq_order: number; meta_json: string | null;
}

const DOC_COLUMNS = `doc_id, slug, title, title_ar, language, domain, subdomain, meta_json, updated_at`;

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    // A malformed attrs_json is a seeding bug, not a request error. Fall back
    // so one bad row cannot take the whole deck down mid-lesson.
    return fallback;
  }
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

/** Deck-level fields the table has no columns for all live in meta_json. */
interface DeckMeta {
  contract_version?: number;
  direction?: string;
  slide_count?: number;
  duration_min?: number;
  videos?: unknown;
  theme?: DeckTheme;
  collection?: DeckCollection;
  xref_gateway?: Record<string, unknown>;
  /** The deck's pace (contract §6): { speed }. */
  motion?: { speed?: number };
  /** Opens playing: narration and page turns start by themselves (key-term story decks). */
  autoplay?: boolean;
  /** What a search finds the deck by besides its titles: its root, word, meaning, Latin name. */
  search?: string[];
  /** The AL roots (ar_ling_roots.id) the deck is about. */
  root_uids?: string[];
}

function direction(meta: DeckMeta, language: string): 'rtl' | 'ltr' {
  if (meta.direction === 'rtl' || meta.direction === 'ltr') return meta.direction;
  return language === 'ar' || language === 'ur' || language === 'fa' ? 'rtl' : 'ltr';
}

/// The deck's folder in full contract shape. A seeded deck may leave out `path` or `terms`; the clients decode every
/// field, so one short row would stop the whole list loading — fill them in here instead.
function collectionOf(meta: DeckMeta): DeckCollection | null {
  const c = meta.collection;
  if (!c || typeof c.collection_id !== 'string' || !c.collection_id) return null;
  const node = (n: Partial<DeckCollection>) => ({ collection_id: String(n.collection_id ?? ''), title: String(n.title ?? ''),
    title_ar: typeof n.title_ar === 'string' ? n.title_ar : null });
  return {
    ...node(c),
    path: (Array.isArray(c.path) ? c.path : []).filter((n) => n && typeof n.collection_id === 'string' && n.collection_id).map(node),
    terms: Array.isArray(c.terms) ? c.terms.filter((t): t is string => typeof t === 'string') : [],
  };
}

function toSlide(row: BlockRow, refs: RefRow[]): DeckSlide {
  const attrs = parseJson<Record<string, unknown>>(row.attrs_json, {});
  return {
    n: row.seq_order,
    block_id: row.block_id,
    layout: asDeckLayout(attrs.layout),
    accent: (attrs.accent === 'warn' || attrs.accent === 'gold') ? attrs.accent : null,
    kicker: typeof attrs.kicker === 'string' ? attrs.kicker : null,
    source: typeof attrs.source === 'string' ? attrs.source : null,
    lines_ar: strings(attrs.lines_ar),
    lines_en: strings(attrs.lines_en),
    notes_en: strings(attrs.notes_en),
    image: toImage(attrs.image),
    graphic: toGraphic(attrs.graphic),
    sources: toSources(attrs.sources),
    narration: toNarration(attrs.narration),
    verse_refs: refs
      .filter((r) => r.block_id === row.block_id)
      .sort((a, b) => a.seq_order - b.seq_order)
      .map(toVerseRef),
  };
}

/** A slide's source links: a label and one of the app's own links, nothing else. */
function toSources(value: unknown): DeckSlide['sources'] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) => {
    if (!v || typeof v !== 'object') return [];
    const o = v as Record<string, unknown>;
    return typeof o.label === 'string' && typeof o.url === 'string' && o.url.startsWith('com.kmaps.app://')
      ? [{ label: o.label, url: o.url }] : [];
  });
}

/** What is spoken over a slide: the narrator's words and, once voiced, their audio (gateway-relative /api/...). */
function toNarration(value: unknown): DeckSlide['narration'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.text !== 'string' || !v.text) return null;
  return { text: v.text, audio: typeof v.audio === 'string' && v.audio ? v.audio : null };
}

function toImage(value: unknown): DeckSlide['image'] {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.url !== 'string' || !v.url) return null;
  return { url: v.url, alt: typeof v.alt === 'string' ? v.alt : null };
}

function toGraphic(value: unknown): DeckSlide['graphic'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  return typeof v.kind === 'string' && v.kind ? (v as DeckSlide['graphic']) : null;
}

function toVerseRef(row: RefRow): DeckVerseRef {
  const meta = parseJson<Record<string, unknown>>(row.meta_json, {});
  const num = (v: unknown) => (typeof v === 'number' ? v : null);
  return {
    ref: row.target_ref,
    kind: row.ref_type,
    surah: num(meta.surah),
    ayah_from: num(meta.ayah_from),
    ayah_to: num(meta.ayah_to),
    relation: typeof meta.relation === 'string' ? meta.relation : null,
    label_ar: row.anchor_text,
  };
}

/// What each deck's slides say, per deck version (cm_documents.updated_at), kept for the life of the isolate.
const SLIDE_TEXT = new Map<string, { at: string | null; text: string }>();

/// Keys that hold no words a reader sees: layout names, icons, colours, links, audio.
const NOT_WORDS = new Set(['layout', 'kind', 'icon', 'tone', 'color', 'colour', 'url', 'audio', 'image', 'video', 'id',
  'ref', 'slug', 'theme', 'motion', 'focus', 'style', 'variant', 'align', 'anchor']);

/// Every word in a slide's attributes, from any depth — English, Arabic, notes and graphic labels alike.
function wordsOf(value: unknown, out: string[], key = ''): void {
  if (NOT_WORDS.has(key)) return;
  if (typeof value === 'string') {
    const v = value.trim();
    if (v && !/^(https?:|com\.kmaps|#[0-9a-f]{3,8}$)/i.test(v) && !/^[A-Z]{2,}:[^\s]+$/.test(v)) out.push(v);
  } else if (Array.isArray(value)) {
    for (const v of value) wordsOf(v, out);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) wordsOf(v, out, k);
  }
}

export class DeckRepo {
  constructor(private readonly db: D1Database) {}

  /** `q` keeps only the decks a search finds — by title, Arabic title, folder, root, word, meaning or Latin name. */
  /** `root` keeps only the decks about that AL root (its ar_ling_roots.id), so a root's page can list them. */
  /** `in` keeps only the decks filed in that folder (a collection id) or anywhere beneath it — a folder's own search. */
  /** `rootsOf` reads a search as roots (AL's root table: جدل, ج د ل, jdl, a word of the root); null when AL can't answer. */
  async list(filters: { domain?: string; subdomain?: string; q?: string; root?: string; in?: string } = {},
             rootsOf?: (q: string) => Promise<Array<{ id: string; root: string }> | null>): Promise<DeckSummary[]> {
    const where = [`doc_type = 'deck'`];
    const params: unknown[] = [];
    if (filters.domain) { where.push('domain = ?'); params.push(filters.domain); }
    if (filters.subdomain) { where.push('subdomain = ?'); params.push(filters.subdomain); }

    const rows = await query<DocRow>(
      this.db,
      `SELECT ${DOC_COLUMNS} FROM cm_documents WHERE ${where.join(' AND ')} ORDER BY updated_at DESC`,
      params,
    );

    const q = filters.q?.trim();
    const kept = rows.flatMap((row) => {
      const meta = parseJson<DeckMeta>(row.meta_json, {});
      const rootUids = Array.isArray(meta.root_uids) ? meta.root_uids : [];
      if (filters.root && !rootUids.includes(filters.root)) return [];
      const folder = collectionOf(meta);
      if (filters.in && folder?.collection_id !== filters.in && !folder?.path.some((n) => n.collection_id === filters.in)) return [];
      const summary: DeckSummary = {
        doc_id: row.doc_id,
        slug: row.slug ?? row.doc_id,
        title: row.title,
        title_ar: row.title_ar,
        language: row.language,
        direction: direction(meta, row.language),
        domain: row.domain,
        subdomain: row.subdomain,
        slide_count: meta.slide_count ?? 0,
        duration_min: meta.duration_min ?? null,
        theme: meta.theme ?? {},
        updated_at: row.updated_at,
        collection: folder,
        root_uids: rootUids,
      };
      const own = [row.title, row.title_ar, row.slug, ...(meta.collection?.path ?? []).flatMap((n) => [n.title, n.title_ar]),
                   ...(Array.isArray(meta.search) ? meta.search : [])];
      return [{ row, summary, own, search: (Array.isArray(meta.search) ? meta.search : []).filter((x): x is string => typeof x === 'string') }];
    });
    if (!q) return kept.map((k) => k.summary);

    // A root, however it is typed — نزل, ن ز ل, jdl, ʿqb, a word of it (يجادلون, jidal) — read through AL's root table:
    // the decks about exactly those roots (by the deck's root ids, its folder's Arabic title or its search words) and
    // only those, not every deck with a word of it on a slide. Without AL, the root as typed (Arabic or Latin letters).
    // No deck about any of them: the search goes on as for any word, English included.
    const folded = fold(q);
    const fromAl = rootsOf ? await rootsOf(q).catch(() => null) : null;
    const roots = fromAl ?? (/^[\u0621-\u064A]{2,4}$/.test(folded) && /^[\u0621-\u0652\u0670\s]+$/.test(q)
      ? [{ id: '', root: folded }] : latinRoots(q).map((r) => ({ id: '', root: r })));
    if (roots.length) {
      const ids = new Set(roots.map((r) => r.id).filter(Boolean));
      const want = new Set(roots.map((r) => fold(r.root)));
      const about = kept.filter((k) => {
        if (k.summary.root_uids?.some((u) => ids.has(u))) return true;
        const c = k.summary.collection;
        const names = [c?.title_ar, ...(c?.path ?? []).map((n) => n.title_ar), ...k.search];
        return names.some((t) => !!t && want.has(fold(t)));
      });
      if (about.length) return about.map((k) => k.summary);
    }

    // A search reads the decks themselves too: any English or Arabic word on a slide finds its deck. Decks found by
    // their title, folder, root or word come first; then the decks found only by what their slides say.
    const byOwn = kept.filter((k) => matches(k.own, q));
    const rest = kept.filter((k) => !byOwn.includes(k));
    // On the slides the words count only together, as a phrase: "let us make" must not find every slide with "us" on it.
    const slides = await this.slideText(rest.map((k) => k.row));
    const phrase = fold(q);
    const bySlides = phrase ? rest.filter((k) => slides.get(k.row.doc_id)?.includes(phrase)) : [];
    return [...byOwn, ...bySlides].map((k) => k.summary);
  }

  /** Every word a deck's slides show (English and Arabic, notes included), folded for matching, read once per deck version and kept. */
  private async slideText(rows: DocRow[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const missing: DocRow[] = [];
    for (const r of rows) {
      const hit = SLIDE_TEXT.get(r.doc_id);
      if (hit && hit.at === r.updated_at) out.set(r.doc_id, hit.text); else missing.push(r);
    }
    for (let i = 0; i < missing.length; i += 90) {
      const part = missing.slice(i, i + 90);
      const blocks = await query<{ doc_id: string; attrs_json: string | null }>(
        this.db,
        `SELECT doc_id, attrs_json FROM cm_blocks WHERE block_type = 'slide' AND doc_id IN (${part.map(() => '?').join(',')})`,
        part.map((r) => r.doc_id),
      );
      const words = new Map<string, string[]>();
      for (const b of blocks) {
        const list = words.get(b.doc_id) ?? [];
        wordsOf(parseJson<unknown>(b.attrs_json, null), list);
        words.set(b.doc_id, list);
      }
      for (const r of part) {
        const text = fold((words.get(r.doc_id) ?? []).join(' '));
        SLIDE_TEXT.set(r.doc_id, { at: r.updated_at, text });
        out.set(r.doc_id, text);
      }
    }
    return out;
  }

  /**
   * The root folders of the deck library, with how many decks sit anywhere
   * beneath each. A root is a `cm_collections` row whose meta says so; the
   * count walks `meta_json.collection.path` on each deck, which is where the
   * deck records the folders it belongs to.
   */
  async folders(): Promise<DeckFolder[]> {
    const roots = await query<{
      collection_id: string; title: string; title_ar: string | null; description: string | null;
    }>(
      this.db,
      `SELECT collection_id, title, title_ar, description
         FROM cm_collections
        WHERE json_extract(meta_json, '$.level') = 'root'
        ORDER BY title`,
    );

    const decks = await query<{ meta_json: string | null }>(
      this.db,
      `SELECT meta_json FROM cm_documents WHERE doc_type = 'deck'`,
    );

    const counts = new Map<string, number>();
    for (const row of decks) {
      const meta = parseJson<DeckMeta>(row.meta_json, {});
      const rootId = meta.collection?.path?.[0]?.collection_id;
      if (rootId) counts.set(rootId, (counts.get(rootId) ?? 0) + 1);
    }

    return roots.map((r) => ({
      collection_id: r.collection_id,
      title: r.title,
      title_ar: r.title_ar,
      description: r.description,
      deck_count: counts.get(r.collection_id) ?? 0,
    }));
  }

  /** Accepts a slug or a full doc_id, so a link can carry either. */
  async find(slugOrId: string): Promise<Deck | null> {
    const doc = await queryOne<DocRow>(
      this.db,
      `SELECT ${DOC_COLUMNS} FROM cm_documents
        WHERE doc_type = 'deck' AND (slug = ? OR doc_id = ?) LIMIT 1`,
      [slugOrId, slugOrId],
    );
    if (!doc) return null;

    const blocks = await query<BlockRow>(
      this.db,
      `SELECT block_id, seq_order, attrs_json FROM cm_blocks
        WHERE doc_id = ? AND block_type = 'slide' ORDER BY seq_order ASC`,
      [doc.doc_id],
    );

    // One query for every ref in the deck rather than one per slide — 25 slides
    // would otherwise be 26 round trips.
    const refs = blocks.length
      ? await query<RefRow>(
          this.db,
          `SELECT r.block_id, r.target_ref, r.ref_type, r.anchor_text, r.seq_order, r.meta_json
             FROM cm_block_refs r
             JOIN cm_blocks b ON b.block_id = r.block_id
            WHERE b.doc_id = ? AND b.block_type = 'slide'`,
          [doc.doc_id],
        )
      : [];

    const meta = parseJson<DeckMeta>(doc.meta_json, {});
    const slides = blocks.map((b) => toSlide(b, refs));

    return {
      doc_id: doc.doc_id,
      slug: doc.slug ?? doc.doc_id,
      contract_version: meta.contract_version ?? null,
      title: doc.title,
      title_ar: doc.title_ar,
      language: doc.language,
      direction: direction(meta, doc.language),
      domain: doc.domain,
      subdomain: doc.subdomain,
      // Trust the rows over the stored count — the count is a seed-time claim.
      slide_count: slides.length,
      duration_min: meta.duration_min ?? null,
      videos: strings(meta.videos),
      theme: meta.theme ?? {},
      slides,
      collection: collectionOf(meta),
      xref_gateway: meta.xref_gateway ?? null,
      motion: typeof meta.motion?.speed === 'number' ? { speed: meta.motion.speed } : null,
      autoplay: meta.autoplay === true,
    };
  }
}
