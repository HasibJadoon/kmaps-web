// ─── A structured card, rendered ─────────────────────────────────────────────
//
// `core_srs_note_type` declares three complete note types — root, lemma and
// word — with field schemas, templates and render hints, and 25 cards carry a
// full payload against them: radicals with their makhraj and ṣifa, a form
// ladder with each maṣdar's authority, a sense arc whose physical rungs are
// marked, aḍdād tagged attested or derived. None of it had ever been drawn.
// `cardToApi` emitted front and back text, so a card whose fields hold a
// seven-stage arc rendered as two strings.
//
// This turns those fields into the same block vocabulary every other layer
// uses, so a card looks like the rest of the system rather than like a special
// case, on all three clients at once.
//
// Three of the render hints are not decoration and are honoured here:
//
//   concrete rungs are LIT · the physical senses are the evidence and the
//     abstract ones the claim. An arc whose concrete rungs are dark asserts a
//     thread it cannot show, so `concrete` becomes `terminal`-grade emphasis
//     and the rest are muted.
//   qiyāsī maṣādir are MUTED · pattern-supplied, with no witness behind them.
//   aḍdād status is a DIFFERENT colour · "an inference shown as an attestation
//     launders our reasoning into the tradition's voice." attested and derived
//     get different tones, never the same one.
//
// Note the field schemas' `desc` strings have drifted from the payloads: they
// say `masadir[{m,s}]` where the data writes `status`, and describe SenseArc as
// a flat list where the data nests `rungs`. The data is what renders, with the
// documented key accepted as a fallback — correcting the schema text is a
// migration, not a renderer's job.

import type { DsBlock, DsCell, DsNode, DsRecord, DsText, DsBar } from '../../../shared/src/contracts/ds';

/** A field payload. Every value is whatever the note type declared. */
type Fields = Record<string, unknown>;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const arr = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter(isObj) : [];
const s = (v: unknown): string => (typeof v === 'string' ? v : '');
const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

const ar = (t: unknown): DsText | undefined =>
  s(t) ? { text: s(t), script: 'ar' } : undefined;
const en = (t: unknown): DsText | undefined =>
  s(t) ? { text: s(t), script: 'latin' } : undefined;
const ur = (t: unknown): DsText | undefined =>
  s(t) ? { text: s(t), script: 'urdu' } : undefined;

/**
 * A trilingual record. The note types' language contract is that `ar`, `en` and
 * `ur` are SEPARATE keys and a script is never mixed into another's string, so
 * they stay three runs here rather than being joined into one.
 */
function trilingual(id: string, o: Record<string, unknown>, arKey = 'ar'): DsRecord {
  return { id, ar: ar(o[arKey]), en: en(o.en), ur: ur(o.ur) };
}

/**
 * Where a block belongs in the reader's page.
 *
 * A card's fields answer several different questions — what the root IS, what
 * it MEANS, who SAYS so — and emitting them as one undifferentiated run would
 * put a seven-stage sense arc and a scholarly attribution under the same
 * heading. So each block names its chapter and its own section at the point it
 * is built, and the composer turns them into sections that sit beside the
 * layers from km_arabic_linguistic rather than in a pile labelled "Cards".
 */
export interface Placed {
  chapter: string;
  code: string;
  title: string;
  title_ar?: string;
  block: DsBlock;
}

/** How much of a list to send. Same caps as every other layer. */
const CAP = { desktop: 8, mobile: 3 } as const;
export type CardForm = keyof typeof CAP;

/**
 * The blocks for one card's fields.
 *
 * Absent fields produce no block. A note type declares many optional fields and
 * a card that carries six of twenty should render six sections, not fourteen
 * empty ones — the empty/unknown distinction is for declared *layers*, where an
 * absence is a build signal. An optional field nobody filled is not.
 */
export function cardBlocks(fields: Fields, form: CardForm = 'desktop'): DsBlock[] {
  return placedBlocks(fields, form).map((p) => p.block);
}

/**
 * The card's blocks as sections, each in the chapter it answers.
 *
 * Consecutive blocks sharing a section code stay together — the eight arcs of
 * كتب are eight chains in one "Sense arc", not eight sections.
 */
export function cardSections(fields: Fields, form: CardForm = 'desktop'): Placed[][] {
  const groups: Placed[][] = [];
  for (const p of placedBlocks(fields, form)) {
    const last = groups[groups.length - 1];
    if (last && last[0].code === p.code) last.push(p);
    else groups.push([p]);
  }
  return groups;
}

function placedBlocks(fields: Fields, form: CardForm = 'desktop'): Placed[] {
  const cap = CAP[form];
  const out: Placed[] = [];
  /** Tag a block with the question it answers. */
  const at = (chapter: string, code: string, title: string, titleAr: string) =>
    (block: DsBlock): Placed => ({ chapter, code, title, title_ar: titleAr, block });

  const asRoot    = at('identity',  'CARD-ID',    'The root',         'الجذر');
  const asLetters = at('identity',  'CARD-LTR',   'The letters',      'الحروف');
  const asThread  = at('meaning',   'CARD-DNA',   'The thread',       'الخيط');
  const asAsl     = at('evidence',  'CARD-ASL',   'The aṣl',          'الأصل');
  const asForms   = at('meaning',   'CARD-FORM',  'The forms',        'الأوزان');
  const asArc     = at('meaning',   'CARD-ARC',   'The sense arc',    'قوس المعنى');
  const asAxes    = at('meaning',   'CARD-AXIS',  'Axes',             'المحاور');
  const asTaqalib = at('relations', 'CARD-TAQ',   'The permutations', 'التقاليب');
  const asFuruq   = at('relations', 'CARD-FURUQ', 'Near-synonyms',    'الفروق');
  const asAddad   = at('relations', 'CARD-ADDAD', 'Opposites',        'الأضداد');
  const asField   = at('relations', 'CARD-FIELD', 'Semantic field',   'الحقل');
  const asLemmas  = at('relations', 'CARD-LEMMA', 'The lemmas',       'المشتقات');
  const asVerse   = at('quran',     'CARD-VERSE', 'Where it was met', 'الشاهد');
  const asExpr    = at('quran',     'CARD-EXPR',  'Expressions',      'التعابير');
  const asSchol   = at('evidence',  'CARD-SCH',   'Scholarship',      'أقوال العلماء');

  // ── The root itself ────────────────────────────────────────────────────────
  const root = s(fields.Root);
  const soundness = isObj(fields.Soundness) ? fields.Soundness : null;
  if (root) {
    out.push(asRoot({
      kind: 'hero',
      mark: { text: root.split('').join(' '), script: 'ar' },
      ar: soundness ? ar(soundness.ar) : undefined,
      en: soundness ? en(soundness.en) : undefined,
      facts: [
        ...(n(fields.QuranTotal)
          ? [{ label: 'in the muṣḥaf', value: { text: `${n(fields.QuranTotal)}×`, script: 'latin' as const } }]
          : []),
      ],
    }));
  }

  // ── The letters, with where each is made ───────────────────────────────────
  const radicals = arr(fields.Radicals);
  if (radicals.length) {
    const cells: DsCell[] = radicals
      .slice()
      .sort((a, b) => n(a.order) - n(b.order))
      .map((r, i): DsCell => ({
        id: `rad-${i}`,
        mark: { text: s(r.l), script: 'ar' },
        caption: s(r.name),
        // Where it is articulated and how — the two facts that decide how the
        // root behaves. Joined because a cell has one footnote.
        footnote: [s(r.makhraj), s(r.sifa)].filter(Boolean).join(' · ') || undefined,
      }));
    out.push(asLetters({ kind: 'grid', title: 'The letters', cells }));
  }

  // ── The thread, and the oldest witness for it ──────────────────────────────
  const dna = isObj(fields.DnaThread) ? fields.DnaThread : null;
  if (dna) {
    out.push(asThread({
      kind: 'card_list',
      title: 'The thread',
      records: [trilingual('dna', dna)],
    }));
  }

  const asl = isObj(fields.AslStatement) ? fields.AslStatement : null;
  if (asl) {
    out.push(asAsl({
      kind: 'card_list',
      title: 'The aṣl',
      // The field's own instruction: the OLDEST witness, not the famous one.
      hint: s(asl.auth)
        ? `${s(asl.auth)}${n(asl.deathAH) ? ` (d. ${n(asl.deathAH)} AH)` : ''}`
        : undefined,
      records: [{
        ...trilingual('asl', asl),
        facts: [
          ...(s(asl.note_en) ? [{ label: 'note', value: { text: s(asl.note_en), script: 'latin' as const } }] : []),
        ],
        provenance: s(asl.auth)
          ? { source: s(asl.auth), is_synthesis: false, ref: s(asl.auth) }
          : undefined,
      }],
    }));
  }

  // ── The form ladder ────────────────────────────────────────────────────────
  const ladder = arr(fields.FormLadder);
  if (ladder.length) {
    const records: DsRecord[] = ladder.slice(0, cap).map((f, i): DsRecord => {
      const form = isObj(f.form) ? f.form : {};
      const bab = isObj(f.bab) ? f.bab : {};
      const masadir = arr(f.masadir);
      return {
        id: `form-${i}`,
        badges: [
          ...(s(form.en) ? [{ label: '', value: s(form.en), tone: 'strong' as const }] : []),
          ...(s(bab.ar) ? [{ label: '', value: s(bab.ar), tone: 'plain' as const }] : []),
        ],
        ar: ar(f.verb),
        facts: [
          // A qiyāsī maṣdar is supplied by the pattern with no witness behind
          // it, and the hints ask for it marked. `°` is that mark; showing it
          // beside an attested one unmarked would claim a source it has not.
          ...masadir.map((m) => ({
            label: statusOf(m) === 'qiyasi' ? 'maṣdar °' : 'maṣdar',
            value: { text: s(m.m), script: 'ar' as const },
          })),
          ...(isObj(f.ap) && s((f.ap as Record<string, unknown>).w)
            ? [{ label: 'active', value: { text: s((f.ap as Record<string, unknown>).w), script: 'ar' as const } }]
            : []),
          ...(isObj(f.pp) && s((f.pp as Record<string, unknown>).w)
            ? [{ label: 'passive', value: { text: s((f.pp as Record<string, unknown>).w), script: 'ar' as const } }]
            : []),
        ],
      };
    });
    out.push(asForms({
      kind: 'card_list', title: 'The forms',
      hint: `${ladder.length} · ° marks a qiyāsī maṣdar, supplied by the pattern`,
      records, overflow_count: Math.max(0, ladder.length - cap),
    }));
  }

  // ── The sense arc ──────────────────────────────────────────────────────────
  // One chain per family, because an arc belongs to the form that carries it.
  for (const [i, a] of arr(fields.SenseArc).entries()) {
    const rungs = arr(a.rungs);
    if (!rungs.length) continue;
    const nodes: DsNode[] = rungs.slice(0, cap).map((r, j): DsNode => ({
      id: `rung-${i}-${j}`,
      title: { text: s(r.ar), script: 'ar' },
      subtitle: s(r.en) || undefined,
      detail: [s(r.auth), n(r.d) ? `d. ${n(r.d)}` : ''].filter(Boolean).join(' · ') || undefined,
      // LIT: a physical rung is the evidence the whole thread rests on.
      terminal: n(r.concrete) === 1,
      // The abstract rungs are the claim, and are shown as such — not hidden,
      // and not dressed as evidence.
      unresolved: n(r.concrete) !== 1,
    }));
    out.push(asArc({
      kind: 'chain',
      title: `The arc · ${s(a.verb) || s(a.fam) || `family ${i + 1}`}`,
      hint: n(a.count) ? `${n(a.count)}× in the muṣḥaf · filled rungs are the physical senses` : 'filled rungs are the physical senses',
      summary: ar(a.arc_ar) ?? en(a.arc_en),
      nodes,
    }));
  }

  // ── What the root moves along ──────────────────────────────────────────────
  const axes = arr(fields.Axes);
  if (axes.length) {
    const top = Math.max(1, ...axes.map((a) => n(a.w)));
    const bars: DsBar[] = axes.map((a, i): DsBar => ({
      id: `axis-${i}`,
      label: ar(a.ar) ?? { text: s(a.en), script: 'latin' },
      sublabel: s(a.en) || undefined,
      value: String(n(a.w)),
      fraction: n(a.w) / top,
    }));
    out.push(asAxes({ kind: 'bars', title: 'Axes', bars }));
  }

  // ── The permutation family ─────────────────────────────────────────────────
  const taq = isObj(fields.Taqalib) ? fields.Taqalib : null;
  const members = taq ? (Array.isArray(taq.members) ? taq.members.map(s) : []) : [];
  if (taq && members.length) {
    const unused = s(taq.unused);
    out.push(asTaqalib({
      kind: 'grid',
      title: 'The permutations',
      // What the language declined to use is information, so the unused member
      // is kept and muted rather than dropped.
      hint: s(taq.note) || undefined,
      cells: members.map((m, i): DsCell => ({
        id: `taq-${i}`,
        mark: { text: m, script: 'ar' },
        muted: m === unused,
        highlighted: m === root,
        footnote: m === unused ? 'unused' : undefined,
      })),
    }));
  }

  // ── Near-synonyms, and what each foregrounds ───────────────────────────────
  const furuq = arr(fields.Furuq);
  if (furuq.length) {
    out.push(asFuruq({
      kind: 'card_list', title: 'Near-synonyms',
      hint: `${furuq.length} · what each foregrounds that this one does not`,
      records: furuq.slice(0, cap).map((f, i): DsRecord => ({
        ...trilingual(`farq-${i}`, f),
        badges: s(f.w) ? [{ label: '', value: s(f.w), tone: 'strong' }] : undefined,
      })),
      overflow_count: Math.max(0, furuq.length - cap),
    }));
  }

  // ── Opposites ──────────────────────────────────────────────────────────────
  const addad = arr(fields.Addad);
  if (addad.length) {
    out.push(asAddad({
      kind: 'card_list', title: 'Opposites',
      hint: 'attested and derived are marked apart',
      records: addad.slice(0, cap).map((a, i): DsRecord => ({
        ...trilingual(`didd-${i}`, a),
        badges: [
          ...(s(a.w) ? [{ label: '', value: s(a.w), tone: 'strong' as const }] : []),
          // Not the same tone. An inference shown as an attestation launders
          // our reasoning into the tradition's voice.
          {
            label: '',
            value: statusOf(a) || 'unmarked',
            tone: statusOf(a) === 'attested' ? ('ok' as const) : ('warn' as const),
          },
        ],
        provenance: s(a.auth)
          ? { source: s(a.auth), is_synthesis: false, ref: s(a.auth) }
          : { source: 'kmaps_derived', is_synthesis: true },
      })),
      overflow_count: Math.max(0, addad.length - cap),
    }));
  }

  // ── The semantic field ─────────────────────────────────────────────────────
  const field = arr(fields.Field);
  if (field.length) {
    out.push(asField({
      kind: 'pills', title: 'Semantic field',
      pills: field.map((f, i) => ({
        id: `field-${i}`,
        label: { text: s(f.en) || s(f.id), script: 'latin' as const },
        // The primary sense stands out by the others receding. `pills` has no
        // emphasis of its own and inventing one would mean a new field every
        // client has to learn, for a distinction muting already carries.
        muted: n(f.primary) !== 1,
      })),
    }));
  }

  // ── Every lemma the root threw off ─────────────────────────────────────────
  // The whole derivational family on one page, which is the thing a reader
  // came for: كتاب at 260 occurrences and كاتب at 6 are the same root wearing
  // two faces, and seeing them apart hides that.
  const lemmas = arr(fields.LemmaInventory);
  if (lemmas.length) {
    const total = lemmas.reduce((a, l) => a + n(l.n), 0);
    out.push(asLemmas({
      kind: 'card_list',
      title: 'The lemmas',
      hint: `${lemmas.length}${total ? ` · ${total} occurrences between them` : ''}`,
      // Commonest first: the frequent lemma is the one a reader has already
      // met and will recognise the root by.
      records: lemmas
        .slice()
        .sort((a, b) => n(b.n) - n(a.n))
        .slice(0, cap)
        .map((l, i): DsRecord => ({
          id: `lemma-${i}`,
          ar: ar(l.t),
          en: en(l.gloss),
          badges: s(l.pos) ? [{ label: '', value: s(l.pos), tone: 'plain' }] : undefined,
          facts: n(l.n)
            ? [{ label: 'in the muṣḥaf', value: { text: `${n(l.n)}×`, script: 'latin' } }]
            : undefined,
        })),
      overflow_count: Math.max(0, lemmas.length - cap),
    }));
  }

  // ── Where it is met ────────────────────────────────────────────────────────
  const verse = s(fields.VerseAr);
  if (verse) {
    out.push(asVerse({
      kind: 'prose_blocks',
      title: 'Where it was met',
      hint: s(fields.VerseRef) || undefined,
      blocks: [{
        id: 'verse', role: 'verse', depth: 0,
        // Qurʾānic text, so the muṣḥaf register — a client sets it in the Hafs
        // face rather than the Arabic UI face.
        text: { text: verse, script: 'ar', register: 'mushaf' },
      }],
    }));
  }

  const expressions = arr(fields.Expressions);
  if (expressions.length) {
    out.push(asExpr({
      // Not `pairs`: an expression carries the āyah it was met in, and a pair
      // is two runs with nowhere to put a third fact.
      kind: 'card_list', title: 'Expressions',
      records: expressions.slice(0, cap).map((e, i): DsRecord => ({
        id: `expr-${i}`,
        ar: ar(e.e),
        en: en(e.en),
        facts: s(e.ref)
          ? [{ label: 'at', value: { text: s(e.ref), script: 'latin' } }]
          : undefined,
      })),
      overflow_count: Math.max(0, expressions.length - cap),
    }));
  }

  // ── Who said what ──────────────────────────────────────────────────────────
  const scholarship = arr(fields.Scholarship);
  if (scholarship.length) {
    out.push(asSchol({
      kind: 'ledger', title: 'Scholarship',
      records: scholarship.slice(0, cap).map((x, i): DsRecord => ({
        id: `sch-${i}`,
        badges: s(x.author) ? [{ label: '', value: s(x.author), tone: 'strong' }] : undefined,
        en: en(x.claim),
        facts: s(x.via) ? [{ label: 'via', value: { text: s(x.via), script: 'latin' } }] : undefined,
        provenance: s(x.author)
          ? { source: s(x.author), is_synthesis: false, ref: s(x.ref) || s(x.author) }
          : undefined,
      })),
      overflow_count: Math.max(0, scholarship.length - cap),
    }));
  }

  return out;
}

/**
 * Whether a maṣdar or a ḍidd is attested or derived.
 *
 * The schema documents this key as `s` and every payload writes `status`. Both
 * are read, because a card authored against the documentation is not wrong.
 */
function statusOf(o: Record<string, unknown>): string {
  return s(o.status) || s(o.s);
}
