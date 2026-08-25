// ─── DsRepo — the display spec for one subject ───────────────────────────────
//
// Reads what the carriers hold for a root (or lemma, or word) and shapes each
// sub-layer into the block vocabulary the clients render. The shape decisions
// live here so the three clients stop making them separately — see the contract
// in shared/src/contracts/ds.ts for why.
//
// Two halves:
//   the registry  · which sub-layers exist, their band, order, names, icon and
//                   colour. Static; the same for every subject.
//   the carriers  · what this subject actually holds. Live; read now, never
//                   stored — three attempts to store a display projection have
//                   each stalled at a handful of hand-authored rows.
//
// A sub-layer with no builder of its own falls back to a table of what it
// holds. That is a fallback, not a default: a table is always readable, and it
// is how a new carrier shows up the day it is bound rather than the day someone
// writes a view for it.

import { query } from '../../../shared/src/db';
import {
  byDeathHijri, normaliseWeights, arcNodes, offArcSenses, sortedBy,
  sortedByInferredKey, slotName, str, num, flag, jsonArrayOf,
} from '../../../shared/src/shaping';
import type {
  DisplaySpec, DsBlock, DsForm, DsSection, DsState, DsText, DsCell,
  DsRecord, DsFact,
} from '../../../shared/src/contracts/ds';
import { RegistryRepo, type CarrierRows } from './registry.repo';

type Row = Record<string, unknown>;

/** How much of a carrier each form factor is willing to carry. A phone is not
 *  a small desktop: it gets fewer rows and shorter text, decided here so the
 *  same cap is not written four different ways in four clients. */
const CAP: Record<DsForm, { rows: number; cells: number; chars: number }> = {
  desktop: { rows: 8, cells: 24, chars: 220 },
  mobile:  { rows: 3, cells: 12, chars: 90 },
};

const AR = /[؀-ۿ]/;

/**
 * The reader's chapters, in the order a reader wants them.
 *
 * The registry organises a root by how it is BUILT — 00-CORE, 12-ASL, 18-STEP.
 * Those codes are right for a build plan and wrong for someone trying to
 * understand a word: nobody opens a root asking what is in sub-layer 18-STEP.
 * They ask what it is, what it means, who says so, what it stands against, and
 * where it turns up.
 *
 * So the sections come back grouped and ordered by that question. The registry
 * codes stay on every section — a builder still needs them, and they are how
 * you find the carrier — but they stop being the organising idea.
 */
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

/** Which chapter a registry sub-layer belongs under. */
const CHAPTER_OF: Record<string, string> = {
  '00-CORE': 'identity', '02-VARI': 'identity', '03-ASWAT': 'identity', '06-TAQL': 'identity',
  '10-DNA': 'meaning', '14-SENSE': 'meaning', '15-AXIS': 'meaning',
  '16-TAT': 'meaning', '17-ARC': 'meaning', '18-STEP': 'meaning',
  '12-ASL': 'evidence', '19-ATT': 'evidence', '52-SCHOL': 'evidence',
  '30-KIN': 'relations', '32-FIELD': 'relations', '40-LINK': 'relations',
  '70-VOCAB': 'remember', '72-MEM': 'remember',
  '010-SRC': 'sources', '50-META': 'sources',
};

/** A sub-layer nobody has placed still has to appear somewhere; "where it was
 *  read" is the honest home for an unplaced carrier. */
const DEFAULT_CHAPTER = 'sources';

const CHAPTER_ORDER = new Map(CHAPTERS.map((c, i) => [c.key, i]));

/** Text plus the script it is in — the client picks the face from this. */
function t(value: unknown, script?: DsText['script']): DsText {
  const text = str(value);
  return { text, script: script ?? (AR.test(text) ? 'ar' : 'latin') };
}

function clamp(value: string, chars: number): string {
  return value.length > chars ? `${value.slice(0, chars)}…` : value;
}

/** The columns every carrier has and no reader wants to see. */
const PLUMBING = new Set([
  'id', 'created_at', 'updated_at', 'canonical_id', 'root_id', 'scope_key',
  'generated_by', 'synthesis_version',
]);


export class DsRepo {
  private readonly registry: RegistryRepo;
  constructor(private db: D1Database) {
    this.registry = new RegistryRepo(db);
  }

  /**
   * The whole spec for one root.
   *
   * Every declared sub-layer of the scope appears, including the ones holding
   * nothing — for a typical root that is most of them, and a screen that omits
   * them implies the root has fewer layers than it does.
   */
  async root(rootRef: string, form: DsForm = 'desktop', scope = 'root'): Promise<DisplaySpec> {
    const cap = CAP[form] ?? CAP.desktop;

    const [model, fill, carriers, bands] = await Promise.all([
      this.registry.layerModel(),
      this.registry.rootFill(rootRef, { scope }),
      this.registry.rootRowsScope(rootRef, scope, cap.rows),
      this.bandColours(),
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
    const fillOf = new Map(fill.map((f) => [f.sub_code, f]));

    // The identity row is the subject's own card; every section can use it.
    const identity = byCode.get('00-CORE')?.[0]?.rows?.[0];

    const sections: DsSection[] = subs.map((sl) => {
      const held = byCode.get(sl.sub_code) ?? [];
      const counted = fillOf.get(sl.sub_code);
      // Three states, and the third is the one a build plan needs: no audited
      // binding means nothing was ever read here.
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

    // Reading order, not build order. Within a chapter the registry's own
    // display_order still decides, because that IS the order those layers make
    // sense in relative to each other.
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

  /** `CORE` has no colour row and neither does `SENSE`; a section says so with
   *  null rather than borrowing another band's. */
  private async bandColours(): Promise<Map<string, string>> {
    const rows = await query<{ band_key: string; color_hex: string }>(
      this.db, 'SELECT band_key, color_hex FROM ar_ling_reg_band_color',
    ).catch(() => [] as { band_key: string; color_hex: string }[]);
    return new Map(rows.map((r) => [r.band_key, r.color_hex]));
  }

  /** The root's letters, spaced the way the lexica space them. */
  private heroMark(rootRef: string, identity: Row | undefined): DsText {
    const letters = jsonArrayOf(identity?.['root_letters']);
    if (letters.length) return t(letters.join(' '), 'ar');
    return t(rootRef.replace(/\s+/g, '').split('').join(' '), 'ar');
  }

  // ── one shape per sub-layer ────────────────────────────────────────────────

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
      default:             return first ? [this.tableBlock(first, cap)] : [];
    }
  }

  /** CORE · the root itself: its letters, what kind it is, and what it means. */
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

  /** CORE · the three positions every root is described by, plus its soundness. */
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
          // A weak letter or a hamza is why a root behaves the way it does.
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

  /** CORE · the taqālīb family, and which members the language declined to use. */
  private permutationBlocks(rows: Row[], cap: typeof CAP['desktop']): DsBlock[] {
    if (!rows.length) return [];
    const perms = sortedBy(rows, 'perm_index');
    const used = perms.filter((p) => flag(p, 'is_used')).length;
    return [{
      kind: 'grid',
      title: 'Permutations',
      // An unused permutation is real information: the family is closed, and
      // which members the language kept is part of what the root is.
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

  /** SYN · the root's thesis in one line. */
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

  /** SYN · the witnesses, oldest first — which is the whole reason a death
   *  date is recorded. */
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
      })),
      overflow_count: Math.max(0, rows.length - cap.rows),
    }];
  }

  /** SENSE · the inventory, core first. */
  private senseBlocks(rows: Row[], cap: typeof CAP['desktop']): DsBlock[] {
    if (!rows.length) return [];
    const ordered = offArcSenses(rows, []);   // no arcs here: core first, then order
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
      })),
      overflow_count: Math.max(0, rows.length - cap.rows),
    }];
  }

  /** SENSE · an arc is a path, so it is drawn as one. */
  private arcBlocks(arcs: Row[], cap: typeof CAP['desktop']): DsBlock[] {
    if (!arcs.length) return [];
    return arcs.slice(0, cap.rows).map((arc): DsBlock => {
      // The senses and steps that resolve this arc live in sibling sub-layers,
      // which this read does not carry; the path still renders from arc_key and
      // the unresolved rungs say so honestly.
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

  /** A weight is a magnitude, so it is published as a fraction of the largest. */
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

  /** GRAPH · an opposition only means something beside what it opposes. */
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

  /** SENSE · who stands behind the senses, and whether they agree. */
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
          // Agreement is a stance, not a score: a source that qualifies a claim
          // is evidence, and colouring it like a failure would misread it.
          tone: (str(a['agreement']).startsWith('sup') ? 'ok' : 'warn') as 'ok' | 'warn',
        }],
        ar: str(a['quote_ar']) ? t(a['quote_ar'], 'ar') : undefined,
        en: str(a['quote_en']) ? t(clamp(str(a['quote_en']), cap.chars)) : undefined,
        facts: str(a['locator']) ? [{ label: 'at', value: t(a['locator']) }] : undefined,
        provenance: this.provenanceOf(a),
      })),
      overflow_count: Math.max(0, rows.length - cap.rows),
    }];
  }

  /**
   * The fallback: what the carrier holds, as the columns it holds them in.
   *
   * Always readable, and it names the columns that were NULL in every row —
   * a build gap that becomes invisible the moment a row is rendered as prose.
   */
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

  /** A synthesis is ours and says so; anything else cites where to check it. */
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

  /** The block kinds a sub-layer renders as, so a client can be told what it
   *  will get before it asks. Used by the route's `?explain=1`. */
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
