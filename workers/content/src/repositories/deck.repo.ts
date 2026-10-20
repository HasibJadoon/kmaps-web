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
}

function direction(meta: DeckMeta, language: string): 'rtl' | 'ltr' {
  if (meta.direction === 'rtl' || meta.direction === 'ltr') return meta.direction;
  return language === 'ar' || language === 'ur' || language === 'fa' ? 'rtl' : 'ltr';
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

export class DeckRepo {
  constructor(private readonly db: D1Database) {}

  async list(filters: { domain?: string; subdomain?: string } = {}): Promise<DeckSummary[]> {
    const where = [`doc_type = 'deck'`];
    const params: unknown[] = [];
    if (filters.domain) { where.push('domain = ?'); params.push(filters.domain); }
    if (filters.subdomain) { where.push('subdomain = ?'); params.push(filters.subdomain); }

    const rows = await query<DocRow>(
      this.db,
      `SELECT ${DOC_COLUMNS} FROM cm_documents WHERE ${where.join(' AND ')} ORDER BY updated_at DESC`,
      params,
    );

    return rows.map((row) => {
      const meta = parseJson<DeckMeta>(row.meta_json, {});
      return {
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
        collection: meta.collection ?? null,
      };
    });
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
      collection: meta.collection ?? null,
      xref_gateway: meta.xref_gateway ?? null,
      motion: typeof meta.motion?.speed === 'number' ? { speed: meta.motion.speed } : null,
    };
  }
}
