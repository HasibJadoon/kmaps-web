import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface WvRhetoricDevice {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  title_ur: string | null;
  classical_name: string | null;
  device_family: string;
  definition_en: string | null;
  al_concept_ref: string | null;
  balagha_fit: string | null;
  divergence_en: string | null;
  sort_order: number;
  status: string;
  created_at: string;
}

export interface WvRhetoricTerm {
  id: string;
  slug: string;
  term: string;
  lang: string;
  term_ar: string | null;
  term_ur: string | null;
  device_id: string | null;
  literal_sense: string | null;
  figurative_sense: string | null;
  source_domain: string | null;
  target_domain: string | null;
  register: string;
  stance: string;
  origin_note: string | null;
  highlights: string | null;
  hides: string | null;
  counter_term: string | null;
  tradition_id: string | null;
  al_concept_ref: string | null;
  quran_ref: string | null;
  concept_ref: string | null;
  notes_md: string | null;
  sort_order: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WvRhetoricUsage {
  id: string;
  rhetoric_term_id: string;
  quote: string;
  speaker: string | null;
  speaker_ref: string | null;
  venue: string | null;
  said_on: string | null;
  source_url: string | null;
  function_note: string | null;
  is_locus_classicus: number;
  sort_order: number;
  created_at: string;
}

export interface RhetoricDeviceCreate {
  slug: string;
  title: string;
  title_ar?: string | null;
  title_ur?: string | null;
  classical_name?: string | null;
  device_family?: string;
  definition_en?: string | null;
  al_concept_ref?: string | null;
  balagha_fit?: string | null;
  divergence_en?: string | null;
  sort_order?: number;
}

export interface RhetoricTermCreate {
  slug: string;
  term: string;
  lang?: string;
  term_ar?: string | null;
  term_ur?: string | null;
  device_id?: string | null;
  literal_sense?: string | null;
  figurative_sense?: string | null;
  source_domain?: string | null;
  target_domain?: string | null;
  register?: string;
  stance?: string;
  origin_note?: string | null;
  highlights?: string | null;
  hides?: string | null;
  counter_term?: string | null;
  tradition_id?: string | null;
  al_concept_ref?: string | null;
  quran_ref?: string | null;
  concept_ref?: string | null;
  notes_md?: string | null;
  sort_order?: number;
}

export type RhetoricTermUpdate = Partial<Omit<RhetoricTermCreate, 'slug'>> & { status?: string };

/** Columns a PATCH may set. Anything else in the body is ignored. */
const TERM_UPDATABLE: ReadonlyArray<keyof RhetoricTermUpdate> = [
  'term', 'lang', 'term_ar', 'term_ur', 'device_id',
  'literal_sense', 'figurative_sense', 'source_domain', 'target_domain',
  'register', 'stance', 'origin_note', 'highlights', 'hides', 'counter_term',
  'tradition_id', 'al_concept_ref', 'quran_ref', 'concept_ref', 'notes_md',
  'sort_order', 'status',
];

export interface RhetoricUsageCreate {
  rhetoric_term_id: string;
  quote: string;
  speaker?: string | null;
  speaker_ref?: string | null;
  venue?: string | null;
  said_on?: string | null;
  source_url?: string | null;
  function_note?: string | null;
  is_locus_classicus?: boolean | number;
  sort_order?: number;
}

export interface TermListFilters {
  device_id?: string | null;
  slug?: string | null;
  lang?: string | null;
  source_domain?: string | null;
  target_domain?: string | null;
  register?: string | null;
  stance?: string | null;
  q?: string | null;
  live_only?: boolean;
}

const DEVICE_COLS = `id, slug, title, title_ar, title_ur, classical_name, device_family,
                     definition_en, al_concept_ref, balagha_fit, divergence_en,
                     sort_order, status, created_at`;

const TERM_COLS = `id, slug, term, lang, term_ar, term_ur, device_id,
                   literal_sense, figurative_sense, source_domain, target_domain,
                   register, stance, origin_note, highlights, hides, counter_term,
                   tradition_id, al_concept_ref, quran_ref, concept_ref, notes_md,
                   sort_order, status, created_at, updated_at`;

const USAGE_COLS = `id, rhetoric_term_id, quote, speaker, speaker_ref, venue, said_on,
                    source_url, function_note, is_locus_classicus, sort_order, created_at`;

export class RhetoricRepo {
  constructor(private db: D1Database) {}

  // ------------------------------------------------------------- devices ---

  listDevices(opts: { device_family?: string | null } & PaginateOptions = {}) {
    const { device_family } = opts;
    const where  = device_family ? 'WHERE device_family = ?' : '';
    const params = device_family ? [device_family] : [];
    return paginate<WvRhetoricDevice>(
      this.db,
      `SELECT ${DEVICE_COLS} FROM wv_rhetoric_devices ${where} ORDER BY sort_order, title`,
      `SELECT COUNT(*) AS count FROM wv_rhetoric_devices ${where}`,
      params, opts,
    );
  }

  /** Accepts either the typed id or the slug, so URLs can stay readable. */
  findDevice(idOrSlug: string): Promise<WvRhetoricDevice | null> {
    return queryOne<WvRhetoricDevice>(
      this.db,
      `SELECT ${DEVICE_COLS} FROM wv_rhetoric_devices WHERE id = ? OR slug = ?`,
      [idOrSlug, idOrSlug],
    );
  }

  async createDevice(input: RhetoricDeviceCreate): Promise<WvRhetoricDevice | null> {
    const id = typedId('WV');
    await execute(
      this.db,
      `INSERT INTO wv_rhetoric_devices
         (id, slug, title, title_ar, title_ur, classical_name, device_family,
          definition_en, al_concept_ref, balagha_fit, divergence_en, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.title_ar ?? null,
        input.title_ur ?? null,
        input.classical_name ?? null,
        input.device_family ?? 'trope',
        input.definition_en ?? null,
        input.al_concept_ref ?? null,
        input.balagha_fit ?? null,
        input.divergence_en ?? null,
        input.sort_order ?? 0,
      ],
    );
    return this.findDevice(id);
  }

  // --------------------------------------------------------------- terms ---

  listTerms(opts: TermListFilters & PaginateOptions = {}) {
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (opts.device_id)     { conds.push('t.device_id = ?');      params.push(opts.device_id); }
    if (opts.slug)          { conds.push('t.slug = ?');           params.push(opts.slug); }
    if (opts.lang)          { conds.push('t.lang = ?');           params.push(opts.lang); }
    if (opts.source_domain) { conds.push('t.source_domain = ?');  params.push(opts.source_domain); }
    if (opts.target_domain) { conds.push('t.target_domain = ?');  params.push(opts.target_domain); }
    if (opts.register)      { conds.push('t.register = ?');       params.push(opts.register); }
    if (opts.stance)        { conds.push('t.stance = ?');         params.push(opts.stance); }
    if (opts.live_only)     { conds.push("t.status = 'live'"); }
    if (opts.q) {
      conds.push(`(t.term LIKE ? OR t.slug LIKE ? OR t.figurative_sense LIKE ?
                   OR t.literal_sense LIKE ? OR t.hides LIKE ? OR t.highlights LIKE ?)`);
      const like = `%${opts.q}%`;
      params.push(like, like, like, like, like, like);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    return paginate<WvRhetoricTerm & { device_title: string | null; device_slug: string | null }>(
      this.db,
      `SELECT ${TERM_COLS.split(',').map(c => `t.${c.trim()}`).join(', ')},
              d.title AS device_title, d.slug AS device_slug
         FROM wv_rhetoric_terms t
         LEFT JOIN wv_rhetoric_devices d ON d.id = t.device_id
         ${where}
        ORDER BY t.sort_order, t.term`,
      `SELECT COUNT(*) AS count FROM wv_rhetoric_terms t ${where}`,
      params, opts,
    );
  }

  findTerm(idOrSlug: string): Promise<WvRhetoricTerm | null> {
    return queryOne<WvRhetoricTerm>(
      this.db,
      `SELECT ${TERM_COLS} FROM wv_rhetoric_terms WHERE id = ? OR slug = ?`,
      [idOrSlug, idOrSlug],
    );
  }

  listUsagesForTerm(termId: string): Promise<WvRhetoricUsage[]> {
    return query<WvRhetoricUsage>(
      this.db,
      `SELECT ${USAGE_COLS} FROM wv_rhetoric_usages
        WHERE rhetoric_term_id = ?
        ORDER BY is_locus_classicus DESC, sort_order, said_on`,
      [termId],
    );
  }

  /** Every device, for building cards over a whole filtered set in one pass. */
  allDevices(): Promise<WvRhetoricDevice[]> {
    return query<WvRhetoricDevice>(
      this.db, `SELECT ${DEVICE_COLS} FROM wv_rhetoric_devices ORDER BY sort_order, title`,
    );
  }

  /** Usages for many terms at once, so a bulk card build stays one query. */
  async listUsagesForTerms(termIds: string[]): Promise<WvRhetoricUsage[]> {
    if (!termIds.length) return [];
    const holes = termIds.map(() => '?').join(', ');
    return query<WvRhetoricUsage>(
      this.db,
      `SELECT ${USAGE_COLS} FROM wv_rhetoric_usages
        WHERE rhetoric_term_id IN (${holes})
        ORDER BY rhetoric_term_id, is_locus_classicus DESC, sort_order, said_on`,
      termIds,
    );
  }

  async createTerm(input: RhetoricTermCreate): Promise<WvRhetoricTerm | null> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_rhetoric_terms
         (id, slug, term, lang, term_ar, term_ur, device_id,
          literal_sense, figurative_sense, source_domain, target_domain,
          register, stance, origin_note, highlights, hides, counter_term,
          tradition_id, al_concept_ref, quran_ref, concept_ref, notes_md,
          sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.term,
        input.lang ?? 'en',
        input.term_ar ?? null,
        input.term_ur ?? null,
        input.device_id ?? null,
        input.literal_sense ?? null,
        input.figurative_sense ?? null,
        input.source_domain ?? null,
        input.target_domain ?? null,
        input.register ?? 'general',
        input.stance ?? 'neutral',
        input.origin_note ?? null,
        input.highlights ?? null,
        input.hides ?? null,
        input.counter_term ?? null,
        input.tradition_id ?? null,
        input.al_concept_ref ?? null,
        input.quran_ref ?? null,
        input.concept_ref ?? null,
        input.notes_md ?? null,
        input.sort_order ?? 0,
        now,
        now,
      ],
    );
    return this.findTerm(id);
  }

  /** Patches only the keys actually present, so an omitted field is left alone. */
  async updateTerm(id: string, patch: Record<string, unknown>): Promise<WvRhetoricTerm | null> {
    const sets: string[]    = [];
    const params: unknown[] = [];
    for (const col of TERM_UPDATABLE) {
      const value = patch[col];
      if (value === undefined) continue;
      sets.push(`${col} = ?`);
      if (value === null) params.push(null);
      else if (col === 'sort_order') params.push(Number(value));
      else params.push(String(value));
    }
    if (sets.length) {
      sets.push('updated_at = ?');
      params.push(new Date().toISOString(), id);
      await execute(
        this.db,
        `UPDATE wv_rhetoric_terms SET ${sets.join(', ')} WHERE id = ?`,
        params,
      );
    }
    return this.findTerm(id);
  }

  // -------------------------------------------------------------- usages ---

  async createUsage(input: RhetoricUsageCreate): Promise<WvRhetoricUsage | null> {
    const id = typedId('WV');
    await execute(
      this.db,
      `INSERT INTO wv_rhetoric_usages
         (id, rhetoric_term_id, quote, speaker, speaker_ref, venue, said_on,
          source_url, function_note, is_locus_classicus, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.rhetoric_term_id,
        input.quote,
        input.speaker ?? null,
        input.speaker_ref ?? null,
        input.venue ?? null,
        input.said_on ?? null,
        input.source_url ?? null,
        input.function_note ?? null,
        input.is_locus_classicus ? 1 : 0,
        input.sort_order ?? 0,
      ],
    );
    return queryOne<WvRhetoricUsage>(
      this.db, `SELECT ${USAGE_COLS} FROM wv_rhetoric_usages WHERE id = ?`, [id],
    );
  }

  // ------------------------------------------------------------- facets ----

  /**
   * The vocabulary actually in use, for filter chips: which source domains the
   * figures are borrowed from, which targets they are aimed at, and how the
   * entries split by stance.
   */
  async facets() {
    const [source_domains, target_domains, stances, registers] = await Promise.all([
      query<{ value: string; n: number }>(this.db,
        `SELECT source_domain AS value, COUNT(*) AS n FROM wv_rhetoric_terms
          WHERE source_domain IS NOT NULL AND status = 'live'
          GROUP BY source_domain ORDER BY n DESC, value`),
      query<{ value: string; n: number }>(this.db,
        `SELECT target_domain AS value, COUNT(*) AS n FROM wv_rhetoric_terms
          WHERE target_domain IS NOT NULL AND status = 'live'
          GROUP BY target_domain ORDER BY n DESC, value`),
      query<{ value: string; n: number }>(this.db,
        `SELECT stance AS value, COUNT(*) AS n FROM wv_rhetoric_terms
          WHERE status = 'live' GROUP BY stance ORDER BY n DESC, value`),
      query<{ value: string; n: number }>(this.db,
        `SELECT register AS value, COUNT(*) AS n FROM wv_rhetoric_terms
          WHERE status = 'live' GROUP BY register ORDER BY n DESC, value`),
    ]);
    return { source_domains, target_domains, stances, registers };
  }
}
