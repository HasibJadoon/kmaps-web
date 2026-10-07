import { query } from '../../../shared/src/db';
import {
  byDeathHijri, normaliseWeights, arcNodes, offArcSenses, sortedBy,
  sortedByInferredKey, slotName, str, num, flag, jsonArrayOf,
} from '../../../shared/src/shaping';
import type {
  DisplaySpec, DsBlock, DsForm, DsSection, DsState, DsText, DsCell,
  DsRecord, DsFact,
} from '../../../shared/src/contracts/ds';
import type { DsSource } from '../../../shared/src/contracts/ds';
import { RegistryRepo, type CarrierRows } from './registry.repo';
import { SOURCES } from '../routes/arcs';

type Row = Record<string, unknown>;
type BookLink = { slug: string; blocks: Map<string, number | null>; quote: string | null; cites: number; refs: string[] };

const CAP: Record<DsForm, { rows: number; cells: number; chars: number }> = {
  desktop: { rows: 8, cells: 24, chars: 220 },
  mobile:  { rows: 3, cells: 12, chars: 90 },
};

const AR = /[؀-ۿ]/;

const CHAPTERS: { key: string; title: string; title_ar: string; question: string }[] = [
  { key: 'identity',  title: 'What it is',        title_ar: 'الهوية',
    question: 'The letters, and what kind of root they make.' },
  { key: 'meaning',   title: 'What it means',     title_ar: 'المعنى',
    question: 'Its senses, and how each grew out of the last.' },
  { key: 'evidence',  title: 'Who says so',       title_ar: 'الشواهد',
    question: 'The witnesses, oldest first, and what they attest.' },
  { key: 'relations', title: 'What it stands with and against', title_ar: 'الشبكة',
    question: 'Opposites, semantic fields, and the roots it neighbours.' },
  { key: 'quran',     title: 'Where it lives',    title_ar: 'في القرآن',
    question: 'Its spread across the muṣḥaf.' },
  { key: 'remember',  title: 'What to remember',  title_ar: 'الحفظ',
    question: 'What has been built to keep it.' },
  { key: 'sources',   title: 'Where it was read', title_ar: 'المصادر',
    question: 'The books and pages this came out of.' },
];

const CHAPTER_OF: Record<string, string> = {
  '00-CORE': 'identity', '02-VARI': 'identity', '03-ASWAT': 'identity', '06-TAQL': 'identity',
  '10-DNA': 'meaning', '14-SENSE': 'meaning', '15-AXIS': 'meaning',
  '16-TAT': 'meaning', '17-ARC': 'meaning', '18-STEP': 'meaning',
  '12-ASL': 'evidence', '19-ATT': 'evidence', '52-SCHOL': 'evidence',
  '30-KIN': 'relations', '32-FIELD': 'relations', '40-LINK': 'relations',
  '70-VOCAB': 'remember', '72-MEM': 'remember',
  '010-SRC': 'sources', '50-META': 'sources',
};

const DEFAULT_CHAPTER = 'sources';

const CHAPTER_ORDER = new Map(CHAPTERS.map((c, i) => [c.key, i]));

function t(value: unknown, script?: DsText['script']): DsText {
  const text = str(value);
  return { text, script: script ?? (AR.test(text) ? 'ar' : 'latin') };
}

function clamp(value: string, chars: number): string {
  return value.length > chars ? `${value.slice(0, chars)}…` : value;
}

const PLUMBING = new Set([
  'id', 'created_at', 'updated_at', 'canonical_id', 'root_id', 'scope_key',
  'generated_by', 'synthesis_version',
]);

export class DsRepo {
  private readonly registry: RegistryRepo;
  constructor(private db: D1Database) {
    this.registry = new RegistryRepo(db);
  }

  async root(rootRef: string, form: DsForm = 'desktop', scope = 'root'): Promise<DisplaySpec> {
    const cap = CAP[form] ?? CAP.desktop;

    // the books that bridge to this root, whole (the carriers above are capped per table): its citations and the
    // Qurʾān references each book files under it — and every book's short name
    const [links, books] = await Promise.all([this.bookLinks(rootRef), this.bookNames()]);
    this.links = links; this.books = books; this.rootRef = rootRef;

    const [model, fill, carriers, bands, coverage] = await Promise.all([
      this.registry.layerModel(),
      this.registry.rootFill(rootRef, { scope }),

      this.registry.rootRowsScope(rootRef, scope, cap.rows, { skipBookBodies: true }),
      this.bandColours(),
      this.registry.rootSourceCoverage(rootRef),
    ]);

    const subs = (model.layers ?? [])
      .filter((l) => l.scope === scope)
      .flatMap((l) => l.subs);

    const byCode = new Map<string, CarrierRows[]>();
    for (const c of carriers) {
      const list = byCode.get(c.sub_code) ?? [];
      list.push(c);
      byCode.set(c.sub_code, list);
    }

    if (coverage.length) {
      byCode.set('010-SRC', [{
        sub_code: '010-SRC',
        carrier_table: 'ar_ling_source',
        bind_col: 'via ar_ling_lexicon_entry.root_norm',
        rows: coverage as unknown as Record<string, unknown>[],
        total: coverage.length,
      }]);
    }
    const fillOf = new Map(fill.map((f) => [f.sub_code, f]));

    const identity = byCode.get('00-CORE')?.[0]?.rows?.[0];

    const sections: DsSection[] = subs.map((sl) => {
      const held = byCode.get(sl.sub_code) ?? [];
      const counted = fillOf.get(sl.sub_code);

      const state: DsState = counted === undefined ? 'unknown'
        : counted.rows > 0 ? 'filled' : 'empty';
      const total = counted?.rows ?? held.reduce((a, c) => a + c.total, 0);

      return {
        chapter: CHAPTER_OF[sl.sub_code] ?? DEFAULT_CHAPTER,
        code: sl.sub_code,
        band: sl.band_key,
        title: sl.name_en,
        title_ar: sl.name_ar || undefined,
        icon: sl.display_icon ?? undefined,
        accent: bands.get(sl.band_key) ?? null,
        state,
        total_rows: total,
        carriers: held.map((c) => c.carrier_table),
        blocks: state === 'filled'
          ? this.blocksFor(sl.sub_code, held, cap, identity)
          : [{
              kind: 'note' as const,
              note_kind: state === 'unknown' ? ('unknown' as const) : ('empty' as const),
              text: state === 'unknown'
                ? 'No audited carrier binds this sub-layer, so nothing has been read for this root. Unknown is not zero.'
                : 'The carrier was read and holds nothing for this root yet.',
            }],
      };
    });

    sections.sort((a, b) =>
      (CHAPTER_ORDER.get(a.chapter) ?? 99) - (CHAPTER_ORDER.get(b.chapter) ?? 99));

    return {
      chapters: CHAPTERS.filter((c) => sections.some((s) => s.chapter === c.key)),
      subject: {
        kind: 'root',
        ref: rootRef,
        display: this.heroMark(rootRef, identity),
      },
      scope,
      form,
      sections,
      summary: {
        filled: sections.filter((s) => s.state === 'filled').length,
        empty: sections.filter((s) => s.state === 'empty').length,
        unknown: sections.filter((s) => s.state === 'unknown').length,
        rows: sections.reduce((a, s) => a + s.total_rows, 0),
      },
    };
  }

  private async bandColours(): Promise<Map<string, string>> {
    const rows = await query<{ band_key: string; color_hex: string }>(
      this.db, 'SELECT band_key, color_hex FROM ar_ling_reg_band_color',
    ).catch(() => [] as { band_key: string; color_hex: string }[]);
    return new Map(rows.map((r) => [r.band_key, r.color_hex]));
  }

  private heroMark(rootRef: string, identity: Row | undefined): DsText {
    const letters = jsonArrayOf(identity?.['root_letters']);
    if (letters.length) return t(letters.join(' '), 'ar');
    return t(rootRef.replace(/\s+/g, '').split('').join(' '), 'ar');
  }

  private blocksFor(
    sub: string, held: CarrierRows[], cap: typeof CAP['desktop'], identity: Row | undefined,
  ): DsBlock[] {
    const rowsOf = (table: string) => held.find((c) => c.carrier_table === table)?.rows ?? [];
    const first = held[0];

    switch (sub) {
      case '00-CORE':      return this.identityBlocks(identity, cap);
      case '03-ASWAT':     return this.phonologyBlocks(rowsOf, cap);
      case '06-TAQL':      return this.permutationBlocks(rowsOf('ar_ling_root_taqalib'), cap);
      case '02-VARI':      return this.variantBlocks(rowsOf('ar_ling_root_lugha'), cap);
      case '10-DNA':       return this.dnaBlocks(rowsOf('ar_ling_root_dna')[0]);
      case '12-ASL':       return this.usulBlocks(rowsOf('ar_ling_root_asl'), cap);
      case '14-SENSE':     return this.senseBlocks(rowsOf('ar_ling_root_sense'), cap);
      case '17-ARC':       return this.arcBlocks(rowsOf('ar_ling_sense_arc'), cap);
      case '15-AXIS':      return this.weightBlocks(rowsOf('ar_ling_root_sense_axis'), 'axis', cap);
      case '32-FIELD':     return this.weightBlocks(rowsOf('ar_ling_root_haql'), 'field', cap);
      case '30-KIN':       return this.antonymBlocks(rowsOf('ar_ling_root_didd'), cap);
      case '19-ATT':       return this.attestationBlocks(rowsOf('ar_ling_sense_attestation'), cap);
      case '40-LINK':      return this.links.length ? this.linkBlocks(cap) : first ? [this.tableBlock(first, cap)] : [];
      default:             return first ? [this.tableBlock(first, cap)] : [];
    }
  }

  private identityBlocks(r: Row | undefined, cap: typeof CAP['desktop']): DsBlock[] {
    if (!r) return [];
    const facts: DsFact[] = [];
    const push = (label: string, v: unknown) => {
      const s = str(v).trim();
      if (s) facts.push({ label, value: t(s.replace(/_/g, ' ')) });
    };
    push('type', r['root_type']);
    push('soundness', r['weak_pattern']);
    if (num(r['frequency_quran']) > 0) {
      facts.push({ label: 'in the muṣḥaf', value: t(`${num(r['frequency_quran'])}×`) });
    }
    return [{
      kind: 'hero',
      mark: this.heroMark(str(r['root_text']), r),
      facts,
      ar: str(r['meaning_core_ar']) ? t(r['meaning_core_ar'], 'ar') : undefined,
      en: str(r['meaning_core_en']) ? t(clamp(str(r['meaning_core_en']), cap.chars * 2)) : undefined,
      ur: str(r['meaning_core_ur']) ? t(r['meaning_core_ur'], 'urdu') : undefined,
    }];
  }

  private phonologyBlocks(rowsOf: (t: string) => Row[], cap: typeof CAP['desktop']): DsBlock[] {
    const slots = sortedBy(rowsOf('ar_ling_root_letter_slot'), 'slot_index');
    const nature = rowsOf('ar_ling_root_naw_sawti')[0];
    const out: DsBlock[] = [];

    if (slots.length) {
      out.push({
        kind: 'grid',
        title: 'Letters',
        hint: `${slots.length} · fāʾ · ʿayn · lām`,
        cells: slots.slice(0, cap.cells).map((s, i): DsCell => ({
          id: str(s['id']) || `slot-${i}`,
          mark: t(s['letter_ar'], 'ar'),
          caption: slotName(str(s['slot_role'])),

          footnote: flag(s, 'is_weak') ? 'weak' : flag(s, 'is_hamza') ? 'hamza' : undefined,
          highlighted: flag(s, 'is_weak') || flag(s, 'is_hamza'),
        })),
        overflow_count: Math.max(0, slots.length - cap.cells),
      });
    }
    if (nature) {
      const facts: DsFact[] = [];
      for (const [label, col] of [['soundness', 'soundness'], ['category', 'category'],
                                  ['radicals', 'radical_count'], ['weak letter', 'weak_letter'],
                                  ['hamza slot', 'hamza_slot']] as const) {
        const v = str(nature[col]).trim();
        if (v) facts.push({ label, value: t(v.replace(/_/g, ' ')) });
      }
      if (facts.length) out.push({ kind: 'pairs', title: 'Nature', pairs: facts.map((f, i) => ({
        id: `nature-${i}`, label: t(f.label), value: f.value,
      })) });
    }
    return out;
  }

  private permutationBlocks(rows: Row[], cap: typeof CAP['desktop']): DsBlock[] {
    if (!rows.length) return [];
    const perms = sortedBy(rows, 'perm_index');
    const used = perms.filter((p) => flag(p, 'is_used')).length;
    return [{
      kind: 'grid',
      title: 'Permutations',

      hint: `${used} of ${perms.length} used · taqālīb`,
      cells: perms.slice(0, cap.cells).map((p, i): DsCell => ({
        id: str(p['id']) || `perm-${i}`,
        mark: t(p['permutation'], 'ar'),
        caption: flag(p, 'is_used') ? 'used' : 'unused',
        muted: !flag(p, 'is_used'),
        highlighted: flag(p, 'is_used'),
      })),
      overflow_count: Math.max(0, perms.length - cap.cells),
    }];
  }

  private variantBlocks(rows: Row[], cap: typeof CAP['desktop']): DsBlock[] {
    if (!rows.length) return [];
    return [{
      kind: 'grid',
      title: 'Variants',
      hint: `${rows.length} · lughāt`,
      cells: rows.slice(0, cap.cells).map((v, i): DsCell => ({
        id: str(v['id']) || `var-${i}`,
        mark: t(v['variant_text'] ?? v['lugha_ar'], 'ar'),
        caption: str(v['variant_type']) || undefined,
      })),
      overflow_count: Math.max(0, rows.length - cap.cells),
    }];
  }

  private dnaBlocks(r: Row | undefined): DsBlock[] {
    if (!r) return [];
    return [{
      kind: 'hero',
      title: 'Root DNA',
      mark: t(r['headline_ar'] ?? '', 'ar'),
      ar: str(r['core_ar']) ? t(r['core_ar'], 'ar') : undefined,
      en: str(r['headline_en']) ? t(r['headline_en']) : undefined,
      ur: str(r['headline_ur']) ? t(r['headline_ur'], 'urdu') : undefined,
    }];
  }

  private usulBlocks(rows: Row[], cap: typeof CAP['desktop']): DsBlock[] {
    if (!rows.length) return [];
    const ordered = byDeathHijri(rows);
    return [{
      kind: 'card_list',
      title: 'Uṣūl',
      hint: `${rows.length} · oldest witness first`,
      records: ordered.slice(0, cap.rows).map((a, i): DsRecord => ({
        id: str(a['id']) || `asl-${i}`,
        badges: [
          ...(str(a['death_hijri']) ? [{ label: 'd.', value: `${str(a['death_hijri'])} AH`, tone: 'strong' as const }] : []),
          ...(flag(a, 'is_primary') ? [{ label: 'primary', value: '', tone: 'ok' as const }] : []),
        ],
        ar: str(a['statement_ar']) ? t(a['statement_ar'], 'ar') : undefined,
        en: str(a['statement_en']) ? t(clamp(str(a['statement_en']), cap.chars)) : undefined,
        facts: [
          ...(str(a['authority_ar']) ? [{ label: 'authority', value: t(a['authority_ar'], 'ar') }] : []),
          ...(str(a['page_ref']) ? [{ label: 'page', value: t(a['page_ref']) }] : []),
        ],
        provenance: this.provenanceOf(a),
        sources: this.sourcesOf(a),
      })),
      overflow_count: Math.max(0, rows.length - cap.rows),
    }];
  }

  private senseBlocks(rows: Row[], cap: typeof CAP['desktop']): DsBlock[] {
    if (!rows.length) return [];
    const ordered = offArcSenses(rows, []);
    return [{
      kind: 'card_list',
      title: 'Senses',
      hint: `${rows.length} · core first`,
      records: ordered.slice(0, cap.rows).map((s, i): DsRecord => ({
        id: str(s['id']) || `sense-${i}`,
        badges: [
          ...(flag(s, 'is_core') ? [{ label: 'core', value: '', tone: 'strong' as const }] : []),
          ...(str(s['sense_key']) ? [{ label: '', value: str(s['sense_key']), tone: 'plain' as const }] : []),
          ...(str(s['status']) ? [{ label: '', value: str(s['status']),
              tone: (str(s['status']) === 'live' ? 'ok' : 'warn') as 'ok' | 'warn' }] : []),
        ],
        ar: str(s['gloss_ar']) ? t(s['gloss_ar'], 'ar') : undefined,
        en: str(s['gloss_en']) ? t(clamp(str(s['gloss_en']), cap.chars)) : undefined,
        ur: str(s['gloss_ur']) ? t(s['gloss_ur'], 'urdu') : undefined,
        provenance: this.provenanceOf(s),
        sources: this.sourcesOf(s),
      })),
      overflow_count: Math.max(0, rows.length - cap.rows),
    }];
  }

  private arcBlocks(arcs: Row[], cap: typeof CAP['desktop']): DsBlock[] {
    if (!arcs.length) return [];
    return arcs.slice(0, cap.rows).map((arc): DsBlock => {

      const nodes = arcNodes(arc, [], []);
      return {
        kind: 'chain',
        title: flag(arc, 'is_primary') ? 'Root arc · primary' : 'Root arc',
        hint: str(arc['arc_en']) || undefined,
        summary: str(arc['arc_ar']) ? t(arc['arc_ar'], 'ar') : undefined,
        nodes: nodes.map((n, i) => ({
          id: `${str(arc['id'])}-${i}`,
          title: { text: n.title, script: n.titleIsArabic ? 'ar' as const : 'latin' as const },
          subtitle: n.subtitle ?? undefined,
          detail: n.detail ?? undefined,
          terminal: n.isTerminal,
          unresolved: n.unresolved,
        })),
      };
    });
  }

  private weightBlocks(rows: Row[], kind: 'axis' | 'field', cap: typeof CAP['desktop']): DsBlock[] {
    if (!rows.length) return [];
    const weighted = normaliseWeights(rows, 'weight');
    return [{
      kind: 'bars',
      title: kind === 'axis' ? 'Axes' : 'Semantic fields',
      hint: `${rows.length} · weighted`,
      bars: weighted.slice(0, cap.rows).map(({ row, weight, fraction }, i) => ({
        id: str(row['id']) || `${kind}-${i}`,
        label: t(row['axis_ar'] ?? row['field_id'] ?? row['axis_key'] ?? '', undefined),
        sublabel: str(row['axis_en']) || str(row['sense_id']).split(':').pop() || undefined,
        note: str(row['note_en']) ? clamp(str(row['note_en']), cap.chars) : undefined,
        value: String(weight),
        fraction,
      })),
      overflow_count: Math.max(0, rows.length - cap.rows),
    }];
  }

  private antonymBlocks(rows: Row[], cap: typeof CAP['desktop']): DsBlock[] {
    if (!rows.length) return [];
    const ordered = sortedBy(rows, 'sort_order');
    return [{
      kind: 'grid',
      title: 'Opposites',
      hint: `${rows.length} · aḍdād`,
      cells: ordered.slice(0, cap.cells).map((a, i): DsCell => ({
        id: str(a['id']) || `didd-${i}`,
        mark: t(a['antonym_ar'], 'ar'),
        caption: str(a['antonym_root']) || undefined,
        footnote: str(a['antonym_en']) ? clamp(str(a['antonym_en']), 40) : undefined,
        highlighted: str(a['relation_kind']) === 'antonym',
      })),
      overflow_count: Math.max(0, rows.length - cap.cells),
    }];
  }

  private attestationBlocks(rows: Row[], cap: typeof CAP['desktop']): DsBlock[] {
    if (!rows.length) return [];
    return [{
      kind: 'ledger',
      title: 'Attestations',
      hint: `${rows.length} · who said it`,
      records: rows.slice(0, cap.rows).map((a, i): DsRecord => ({
        id: str(a['id']) || `att-${i}`,
        badges: [{
          label: '', value: str(a['agreement']) || 'attests',

          tone: (str(a['agreement']).startsWith('sup') ? 'ok' : 'warn') as 'ok' | 'warn',
        }],
        ar: str(a['quote_ar']) ? t(a['quote_ar'], 'ar') : undefined,
        en: str(a['quote_en']) ? t(clamp(str(a['quote_en']), cap.chars)) : undefined,
        facts: str(a['locator']) ? [{ label: 'at', value: t(a['locator']) }] : undefined,
        provenance: this.provenanceOf(a),
        sources: this.sourcesOf(a),
      })),
      overflow_count: Math.max(0, rows.length - cap.rows),
    }];
  }

  private tableBlock(c: CarrierRows, cap: typeof CAP['desktop']): DsBlock {
    const all = c.rows.length ? Object.keys(c.rows[0]) : [];
    const nulls = all.filter((col) =>
      c.rows.every((r) => r[col] === null || r[col] === undefined || r[col] === ''));
    const cols = all.filter((col) => !PLUMBING.has(col) && !nulls.includes(col));
    const rows = sortedByInferredKey(c.rows).slice(0, cap.rows);
    return {
      kind: 'table',
      title: c.carrier_table,
      hint: `${c.rows.length} of ${c.total}`,
      columns: cols,
      rows: rows.map((r) => cols.map((col) => {
        const v = r[col];
        if (v === null || v === undefined) return null;
        const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return clamp(s, cap.chars);
      })),
      null_columns: nulls.length ? nulls : undefined,
      overflow_count: Math.max(0, c.total - rows.length),
    };
  }

  private links: BookLink[] = [];
  private books = new Map<string, string>();
  private rootRef = '';

  /** A book's short name: AL's own (al-Rāghib, Lane), else the author its English title names. */
  private bookName(slug: string): string {
    return SOURCES[slug]?.short?.replace(/^the /, '') ?? this.books.get(slug) ?? slug;
  }

  private async bookNames(): Promise<Map<string, string>> {
    const rows = await query<{ slug: string; title_en: string | null }>(this.db,
      `SELECT slug, title_en FROM ar_ling_source WHERE slug IS NOT NULL`).catch(() => []);
    // "Jamharat al-lugha (Ibn Durayd)" → "Ibn Durayd"
    return new Map(rows.map((r) => [r.slug, r.title_en?.match(/\(([^)]+)\)\s*$/)?.[1] ?? r.title_en ?? r.slug]));
  }

  /** Each book that bridges to the root: what it is cited for (its blocks, pages, quotes) and the Qurʾān verses it files under it. */
  private async bookLinks(root: string): Promise<BookLink[]> {
    const [cites, refs] = await Promise.all([
      query<{ source_slug: string; to_ref: string; page_no: number | null; quote_ar: string | null }>(this.db,
        `SELECT source_slug, to_ref, page_no, quote_ar FROM ar_ling_source_citation
          WHERE root_norm = ? AND to_kind = 'lexicon_block' AND status = 'live' AND source_slug IS NOT NULL
          ORDER BY source_slug, page_no`, [root]).catch(() => []),
      query<{ source_slug: string; block_id: string | null; s: number; a: number }>(this.db,
        `SELECT source_slug, block_id, COALESCE(hafs_surah, surah) AS s, COALESCE(hafs_ayah, ayah) AS a
           FROM ar_ling_lexicon_quran_ref WHERE root_norm = ? ORDER BY s, a`, [root]).catch(() => []),
    ]);
    const by = new Map<string, BookLink>();
    const of = (slug: string) => by.get(slug) ?? (by.set(slug, { slug, blocks: new Map(), quote: null, cites: 0, refs: [] }), by.get(slug)!);
    for (const c of cites) {
      const b = of(c.source_slug);
      b.cites += 1;
      b.quote ??= c.quote_ar;
      const block = c.to_ref.replace(/^ALB:/, '');
      if (!b.blocks.has(block)) b.blocks.set(block, c.page_no);
    }
    for (const r of refs) {
      const b = of(r.source_slug);
      const ref = `${r.s}:${r.a}`;
      if (!b.refs.includes(ref)) b.refs.push(ref);
      if (r.block_id && !b.blocks.has(r.block_id)) b.blocks.set(r.block_id, null);
    }
    return [...by.values()].sort((x, y) => (y.cites + y.refs.length) - (x.cites + x.refs.length));
  }

  /** The bridge, as back-links: one record per book — its name, what it is cited for and the verses it files under the
   *  root, each of its pages a back-link to the lexicon reader. */
  private linkBlocks(cap: typeof CAP['desktop']): DsBlock[] {
    const root = this.rootRef;
    return [{
      kind: 'ledger',
      title: 'Every book',
      hint: `${this.links.length} books · each opens at its page`,
      records: this.links.map((b): DsRecord => ({
        id: `book-${b.slug}`,
        badges: [{ label: '', value: this.bookName(b.slug), tone: 'strong' }],
        ar: b.quote ? t(clamp(b.quote, cap.chars), 'ar') : undefined,
        en: t([b.cites ? `cited ${b.cites}×` : '', b.refs.length ? `${b.refs.length} Qurʾān reference${b.refs.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ')),
        facts: b.refs.length ? [{ label: 'Qurʾān', value: t(b.refs.slice(0, 10).join(' · ') + (b.refs.length > 10 ? ' …' : '')) }] : undefined,
        sources: [...b.blocks.entries()].slice(0, 12).map(([block, page]): DsSource =>
          ({ book: this.bookName(b.slug), page: page ?? undefined, source: b.slug, root, block })),
      })),
      overflow_count: 0,
    }];
  }

  /** A row's book as a back-link, when it names a book (not a K-Maps synthesis). */
  private sourcesOf(r: Row): DsSource[] | undefined {
    const source = str(r['source_slug']);
    if (!source || source.startsWith('kmaps')) return undefined;
    const page = Number(str(r['page_ref']) || str(r['page_no']));
    const block = str(r['block_id']) || undefined;
    return [{ book: this.bookName(source), page: Number.isInteger(page) && page > 0 ? page : undefined, source, root: this.rootRef, block }];
  }

  private provenanceOf(r: Row): DsRecord['provenance'] {
    const source = str(r['source_slug']);
    if (!source) return undefined;
    const isSynthesis = source.startsWith('kmaps');
    return {
      source,
      is_synthesis: isSynthesis,
      ref: str(r['page_ref']) || str(r['locator']) || undefined,
      confidence: str(r['confidence']) || undefined,
    };
  }

  static kindsFor(sub: string): string[] {
    switch (sub) {
      case '00-CORE':  return ['hero'];
      case '03-ASWAT': return ['grid', 'pairs'];
      case '06-TAQL':
      case '02-VARI':
      case '30-KIN':   return ['grid'];
      case '10-DNA':   return ['hero'];
      case '12-ASL':
      case '14-SENSE': return ['card_list'];
      case '17-ARC':   return ['chain'];
      case '15-AXIS':
      case '32-FIELD': return ['bars'];
      case '19-ATT':   return ['ledger'];
      default:         return ['table'];
    }
  }
}
