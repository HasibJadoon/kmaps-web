// ─── RootDocRepo — one root, shaped for a reader ────────────────────────────
//
// The display spec (`ds.repo.ts`) answers a builder's question: which layers
// exist, what do they hold, how far along are they. This answers a reader's:
// what is this root, and what hangs off what.
//
// The difference is the hierarchy. A form family owns its government, and the
// lemmas built from it hang underneath; a sense owns its witnesses and the path
// that reaches it. Nothing here is a flat list of rows keyed by a band code.
//
// Generic by construction: every query is parameterised by the root, no root is
// named anywhere, and a layer a root does not have comes back empty rather than
// absent — so a thin root renders as a short honest page, not a broken deep one.
//
// READ-ONLY, and DB_AL only. Qurʾānic examples live in km_quran, which this
// worker cannot read and should not; each lemma carries the key a composer uses
// to fetch them. See `gaps` on the returned document.

import { query, queryOne } from '../../../shared/src/db';

/** Two witnesses is the floor. A sense with one is a sense with an anecdote. */
const WITNESSES_PER_SENSE = 2;

export interface RootDoc {
  root: RootIdentity;
  asl: Statement[];
  senses: Sense[];
  development: Stage[];
  forms: Form[];
  /** Lemmas the corpus binds to no form. For many roots this is most of them. */
  unassigned: Lemma[];
  /** Government the carrier does not tie to a form. Most of it, corpus-wide. */
  government: Government[];
  expressions: Expression[];
  relations: Relations;
  sources: SourceRef[];
  /** Declared, never silent. A reader sees nothing; a builder sees this. */
  gaps: Gap[];
}

interface RootIdentity {
  ar: string; display: string; buckwalter: string | null;
  type: string | null; soundness: string | null;
  letters: { l: string; name: string | null; makhraj: string | null; order: number }[];
  meaning: Tri;
  counts: {
    forms_attested: number; forms_in_quran: number;
    lemmas: number; lemmas_in_quran: number;
    senses: number; source_notes: number; works_cited: number;
    quran_tokens: number | null;
  };
}
interface Tri { ar: string | null; en: string | null; ur: string | null }
interface Statement { ar: string | null; en: string | null; ur: string | null; by: Attrib; primary: boolean; confidence: string | null }
interface Attrib { author: string | null; work: string | null; died_ah: number | null; at: string | null; slug: string }
interface Sense {
  key: string; label: Tri; gloss: Tri; is_core: boolean;
  witness_count: number; witnesses: Witness[];
  /** How this sense is reached from the origin. Null when none is recorded. */
  path: { nodes: { ar: string | null; en: string | null }[]; basis: Basis } | null;
}
interface Witness { quote_ar: string | null; quote_en: string | null; by: Attrib; agreement: string | null }
interface Stage { no: number; ar: string | null; en: string | null; ur: string | null; note: string | null }
/**
 * الصرف الصغير — the minimal paradigm a student is actually taught: the past,
 * the present, the maṣdar, the two participles, and what the form does or does
 * not yield beyond them.
 *
 * A slot reading `غير مأثور` or `غير مستعمل` is NOT an empty slot. It is the
 * language declining to build one, recorded by a lexicographer, and it must
 * reach the reader as a statement rather than a blank.
 */
interface SarfSaghir {
  past: string | null;
  present: string | null;
  masadir: string[];
  active_participle: string | null;
  passive_participle: Slot;
  passive_present: string | null;
  elative: Slot;
  intensive: Slot;
  noun_of_place_time: Slot;
  /** Where the form's own row carries a note — an iʿlāl, a technical usage. */
  notes: { key: string; text: string }[];
  by: string[];
}
/** Present, or explicitly not built. `null` means nobody recorded either way. */
type Slot = { value: string; state: 'attested' } | { value: string; state: 'not_built' } | null;

interface Form {
  roman: string; verb_ar: string | null; chain_ar: string | null;
  sarf_saghir: SarfSaghir | null;
  masadir: { ar: string; basis: Basis }[];
  active_participle: string | null; passive_participle: string | null; passive_note: string | null;
  meaning: Tri;
  government: Government[];
  in_quran: { finite: number; derived: number; total: number };
  lemmas: Lemma[];
  basis: Basis;
  /** Always null today — see `gaps`. The note type declares the link; no carrier holds it. */
  arc: null;
}
interface Government { transitivity: string | null; route: string | null; particle: string | null; meaning: Tri; by: Attrib | null }
interface Lemma {
  ar: string; bare: string | null; pos: string | null; form_roman: string | null;
  derivation: string | null; in_quran: number; is_quran_word: boolean;
  /** The key a composer uses to fetch this lemma's verses from km_quran. */
  examples_key: string;
  examples: null;
}
/**
 * An idiom, and the verses it is cited at.
 *
 * `ar_ling_root_lemma_tabir` stores one row per (idiom × verse × source page),
 * not one per idiom: اخذ has 58 rows carrying 8 idioms over 51 āyāt and 7
 * pages. Counting rows reports eight idioms as fifty-eight.
 */
interface Expression {
  ar: string; preposition: string | null; lemma_ar: string | null;
  construction: Tri; citations: { surah: number; ayah: number; translation_en: string | null }[];
  by: string | null;
}
interface Relations {
  addad: { ar: string | null; en: string | null; axis: string | null; basis: Basis; by: Attrib | null }[];
  field: { id: string; weight: number; primary: boolean; basis: Basis }[];
  taqalib: { group: string | null; members: { ar: string; used: boolean; is_self: boolean }[] } | null;
  neighbours: { ar: string; kind: string | null; gloss: string | null }[];
}
type Basis = 'attested' | 'ours';
interface Gap { at: string; what: string; why: string }
interface SourceRef extends Attrib { cited_for: string[] }

const basisOf = (slug: string | null, synth?: unknown): Basis =>
  (synth === 1 || (slug ?? '').startsWith('kmaps_')) ? 'ours' : 'attested';

/** The tradition writes a missing slot in words, not as a blank. */
const NOT_BUILT = /غير\s*(مأثور|مستعمل|مستعملة)/;
const slot = (v: unknown): Slot => {
  const t = (v as string)?.trim();
  if (!t) return null;
  return { value: t, state: NOT_BUILT.test(t) ? 'not_built' : 'attested' };
};

const tri = (a: unknown, e: unknown, u: unknown): Tri => ({
  ar: (a as string) || null, en: (e as string) || null, ur: (u as string) || null,
});

export class RootDocRepo {
  constructor(private readonly db: D1Database) {}

  async doc(rootRef: string): Promise<RootDoc | null> {
    const r = await queryOne<Record<string, unknown>>(this.db,
      `SELECT id, root_text, root_normalized, buckwalter, root_type, weak_pattern,
              frequency_quran, meaning_core_ar, meaning_core_en, meaning_core_ur
         FROM ar_ling_roots
        WHERE root_text = ?1 OR root_normalized = ?1 LIMIT 1`, [rootRef]);
    if (!r) return null;

    const rootAr = String(r['root_text']);
    const rootId = String(r['id']);
    const bw = (r['buckwalter'] as string) ?? null;
    const gaps: Gap[] = [];

    const [letters, asl, senses, development, forms, lemmas, relations] = await Promise.all([
      this.letters(rootAr), this.asl(rootAr), this.senses(rootAr, gaps),
      this.development(rootAr), this.forms(rootAr), this.lemmas(rootId, bw), this.relations(rootAr, rootId),
    ]);

    // A lemma belongs to the form that built it. Everything the corpus does not
    // bind is grouped once, visibly, rather than distributed by guesswork.
    for (const f of forms) f.lemmas = lemmas.filter((l) => l.form_roman === f.roman);
    const unassigned = lemmas.filter((l) => !l.form_roman);
    for (const f of forms) {
      const d = f.lemmas.reduce((n, l) => n + l.in_quran, 0);
      f.in_quran = { finite: 0, derived: 0, total: d };
    }

    // The note type declares SenseArc.fam — "ties each rung to a FormLadder
    // entry" — but no carrier holds it. Say so; do not infer it from a gloss.
    if (forms.length && senses.some((s) => s.path)) {
      gaps.push({
        at: 'forms[].arc',
        what: 'no arc is attached to a form',
        why: 'the root note type declares SenseArc.fam, but ar_ling_sense_arc_step has no form '
           + 'column and ar_ling_root_sense has none either. Reading a form onto a pole from its '
           + 'government gloss is an inference, so it is left out rather than presented as data.',
      });
    }
    const withSarf = forms.filter((f) => f.sarf_saghir).length;
    if (forms.length) {
      gaps.push({
        at: 'forms[].sarf_saghir',
        what: withSarf
          ? 'the imperative and the prohibitive are absent from every form'
          : 'no paradigm rows for this root — only the past, maṣdar and participles',
        why: withSarf
          ? 'ar_ling_root_form_paradigm carries the past, present, maṣādir, participles, elative '
          + 'and noun of place, but no carrier anywhere holds الأمر or النهي, so the ṣarf ṣaghīr '
          + 'is shown short rather than completed by rule.'
          : 'ar_ling_root_form_paradigm holds rows for a handful of roots only; without one there '
          + 'is no muḍāriʿ, and a paradigm generated from the pattern would not be attested. '
          + 'ar_ling_root_form_template covers sound roots only.',
      });
    }
    if (lemmas.length) {
      gaps.push({
        at: 'forms[].lemmas[].examples',
        what: 'no verses attached',
        why: `occurrences live in km_quran, which this worker cannot read; fetch by examples_key `
           + `and merge. At least ${WITNESSES_PER_SENSE} per lemma where the corpus allows — a `
           + 'lemma occurring once cannot have two, and must say so rather than be padded.',
      });
    }

    const [government, expressions, sources] = await Promise.all([
      this.rootGovernment(rootAr), this.expressions(rootAr), this.sources(rootAr),
    ]);
    const senseRows = await queryOne<{ n: number; labelled: number }>(this.db,
      `SELECT COUNT(*) AS n, SUM(CASE WHEN label_ar IS NOT NULL THEN 1 ELSE 0 END) AS labelled
         FROM ar_ling_root_sense WHERE root_norm = ?`, [rootAr]);

    return {
      root: {
        ar: rootAr,
        display: rootAr.split('').join(' '),
        buckwalter: bw,
        type: (r['root_type'] as string) ?? null,
        soundness: (r['weak_pattern'] as string) ?? null,
        letters,
        meaning: tri(r['meaning_core_ar'], r['meaning_core_en'], r['meaning_core_ur']),
        counts: {
          forms_attested: forms.length,
          forms_in_quran: forms.filter((f) => f.lemmas.some((l) => l.is_quran_word)).length,
          lemmas: lemmas.length,
          lemmas_in_quran: lemmas.filter((l) => l.is_quran_word).length,
          senses: senses.length,
          source_notes: (senseRows?.n ?? 0) - (senseRows?.labelled ?? 0),
          works_cited: sources.length,
          // Derived from km_quran at compose time. The stored column drifts.
          quran_tokens: null,
        },
      },
      asl, senses, development, forms, unassigned, government, expressions, relations, sources, gaps,
    };
  }

  private async letters(root: string) {
    return (await query<Record<string, unknown>>(this.db,
      `SELECT slot_no, letter, letter_name, makhraj FROM ar_ling_root_letter_slot
        WHERE root_norm = ? ORDER BY slot_no`, [root]))
      .map((x) => ({
        l: String(x['letter'] ?? ''), name: (x['letter_name'] as string) ?? null,
        makhraj: (x['makhraj'] as string) ?? null, order: Number(x['slot_no'] ?? 0),
      }));
  }

  /** Oldest first — a reader wants the earliest witness, not the famous one. */
  private async asl(root: string): Promise<Statement[]> {
    return (await query<Record<string, unknown>>(this.db,
      `SELECT a.statement_ar, a.statement_en, a.statement_ur, a.is_primary, a.confidence,
              a.source_slug, a.page_ref, a.volume_no,
              COALESCE(a.authority_en, s.author_name) AS author,
              COALESCE(a.death_hijri, s.author_death_ah) AS died, s.title_ar AS work
         FROM ar_ling_root_asl a
         LEFT JOIN ar_ling_source s ON s.slug = a.source_slug
        WHERE a.root_norm = ?
        ORDER BY COALESCE(a.death_hijri, s.author_death_ah, 9999), a.is_primary DESC`, [root]))
      .map((x) => ({
        ar: (x['statement_ar'] as string) ?? null,
        en: (x['statement_en'] as string) ?? null,
        ur: (x['statement_ur'] as string) ?? null,
        primary: Number(x['is_primary'] ?? 0) === 1,
        confidence: (x['confidence'] as string) ?? null,
        by: {
          author: (x['author'] as string) ?? null, work: (x['work'] as string) ?? null,
          died_ah: x['died'] == null ? null : Number(x['died']),
          at: [x['volume_no'] ? `v.${x['volume_no']}` : null, x['page_ref'] ? `p.${x['page_ref']}` : null]
                .filter(Boolean).join(' ') || null,
          slug: String(x['source_slug'] ?? ''),
        },
      }));
  }

  /**
   * The labelled senses only, each with its witnesses and its path.
   *
   * A root's sense table holds two different things: the labelled inventory,
   * and one unlabelled note per source. Flattening them tells a reader the root
   * has forty-one meanings when it has thirteen — so the notes are counted and
   * left to their sources.
   */
  private async senses(root: string, gaps: Gap[]): Promise<Sense[]> {
    const rows = await query<Record<string, unknown>>(this.db,
      `SELECT id, sense_key, label_ar, label_en, label_ur, gloss_ar, gloss_en, gloss_ur,
              is_core, sort_order, source_slug
         FROM ar_ling_root_sense
        WHERE root_norm = ? AND label_ar IS NOT NULL
        ORDER BY sort_order`, [root]);
    if (!rows.length) return [];

    const ids = rows.map((x) => String(x['id']));
    const marks = ids.map(() => '?').join(',');

    const atts = await query<Record<string, unknown>>(this.db,
      `SELECT t.target_id, t.quote_ar, t.quote_en, t.locator, t.agreement, t.source_slug,
              s.author_name, s.author_death_ah, s.title_ar
         FROM ar_ling_sense_attestation t
         LEFT JOIN ar_ling_source s ON s.slug = t.source_slug
        WHERE t.target_id IN (${marks}) AND t.status = 'live'
        ORDER BY COALESCE(s.author_death_ah, 9999)`, ids);

    const arcs = await query<Record<string, unknown>>(this.db,
      `SELECT a.id, a.terminal_sense_id, a.is_synthesis, p.step_no, p.sense_id,
              n.label_ar, n.label_en
         FROM ar_ling_sense_arc a
         JOIN ar_ling_sense_arc_step p ON p.arc_id = a.id
         LEFT JOIN ar_ling_root_sense n ON n.id = p.sense_id
        WHERE a.root_norm = ?
        ORDER BY a.id, p.step_no`, [root]);

    const thin: string[] = [];
    const out = rows.map((x) => {
      const id = String(x['id']);
      const mine = atts.filter((a) => a['target_id'] === id);
      if (mine.length < WITNESSES_PER_SENSE) thin.push(String(x['sense_key']));
      const arc = arcs.filter((a) => a['terminal_sense_id'] === id);
      return {
        key: String(x['sense_key']),
        label: tri(x['label_ar'], x['label_en'], x['label_ur']),
        gloss: tri(x['gloss_ar'], x['gloss_en'], x['gloss_ur']),
        is_core: Number(x['is_core'] ?? 0) === 1,
        witness_count: mine.length,
        witnesses: mine.slice(0, WITNESSES_PER_SENSE).map((a) => ({
          quote_ar: (a['quote_ar'] as string) ?? null,
          quote_en: (a['quote_en'] as string) ?? null,
          agreement: (a['agreement'] as string) ?? null,
          by: {
            author: (a['author_name'] as string) ?? null,
            work: (a['title_ar'] as string) ?? null,
            died_ah: a['author_death_ah'] == null ? null : Number(a['author_death_ah']),
            at: (a['locator'] as string) ?? null,
            slug: String(a['source_slug'] ?? ''),
          },
        })),
        path: arc.length ? {
          nodes: arc.map((p) => ({
            ar: (p['label_ar'] as string) ?? null, en: (p['label_en'] as string) ?? null,
          })),
          basis: (Number(arc[0]['is_synthesis'] ?? 0) === 1 ? 'ours' : 'attested') as Basis,
        } : null,
      };
    });

    if (thin.length) {
      gaps.push({
        at: 'senses[].witnesses',
        what: `${thin.length} sense(s) rest on fewer than ${WITNESSES_PER_SENSE} attestations`,
        why: `${thin.join(', ')} — shown with what exists; a single witness is stated as one, `
           + 'never padded from a neighbouring sense.',
      });
    }
    return out;
  }

  private async development(root: string): Promise<Stage[]> {
    return (await query<Record<string, unknown>>(this.db,
      `SELECT stage_no, stage_ar, stage_en, stage_ur, note_en
         FROM ar_ling_root_tatawwur WHERE root_norm = ? ORDER BY stage_no`, [root]))
      .map((x) => ({
        no: Number(x['stage_no'] ?? 0),
        ar: (x['stage_ar'] as string) ?? null, en: (x['stage_en'] as string) ?? null,
        ur: (x['stage_ur'] as string) ?? null, note: (x['note_en'] as string) ?? null,
      }));
  }

  /**
   * A form owns its government and the words built from it.
   *
   * The English is read from the government carrier, not from the form carrier:
   * `ar_ling_root_form_masmu.meaning_en` is empty corpus-wide, while
   * `ar_ling_root_lemma_tadiya` carries all three languages with a source.
   */
  /** Government rows the carrier ties to no form — 80% of them, corpus-wide. */
  async rootGovernment(root: string): Promise<Government[]> {
    const rows = await query<Record<string, unknown>>(this.db,
      `SELECT g.transitivity, g.taddiya_route, g.harf, g.meaning_ar, g.meaning_en, g.meaning_ur,
              g.source_ref, s.author_name, s.author_death_ah, s.title_ar
         FROM ar_ling_root_lemma_tadiya g
         LEFT JOIN ar_ling_source s
                ON s.slug = substr(g.source_ref, 1, instr(g.source_ref || ':', ':') - 1)
        WHERE g.root_norm = ? AND g.status = 'live' AND g.verb_form IS NULL
        ORDER BY g.sort_order`, [root]);
    return rows.map((v) => ({
      transitivity: (v['transitivity'] as string) ?? null,
      route: (v['taddiya_route'] as string) ?? null,
      particle: (v['harf'] as string) ?? null,
      meaning: tri(v['meaning_ar'], v['meaning_en'], v['meaning_ur']),
      by: v['source_ref'] ? {
        author: (v['author_name'] as string) ?? null,
        work: (v['title_ar'] as string) ?? null,
        died_ah: v['author_death_ah'] == null ? null : Number(v['author_death_ah']),
        at: null, slug: String(v['source_ref']).split(':')[0],
      } : null,
    }));
  }

  /** Idioms, folded onto their citations. See `Expression`. */
  async expressions(root: string): Promise<Expression[]> {
    const rows = await query<Record<string, unknown>>(this.db,
      `SELECT expression_ar, preposition_ar, lemma_ar, surah, ayah, ayah_translation_en,
              construction_ar, construction_en, construction_ur, source_slug
         FROM ar_ling_root_lemma_tabir
        WHERE root_ar = ? AND status = 'live'
        ORDER BY preposition_ar, expression_ar, surah, ayah`, [root]);
    const byIdiom = new Map<string, Expression>();
    for (const x of rows) {
      const ar = String(x['expression_ar'] ?? '').trim();
      if (!ar) continue;
      const prep = (x['preposition_ar'] as string) ?? null;
      const key = `${ar}|${prep ?? ''}`;
      let e = byIdiom.get(key);
      if (!e) {
        e = {
          ar, preposition: prep, lemma_ar: (x['lemma_ar'] as string) ?? null,
          construction: tri(x['construction_ar'], x['construction_en'], x['construction_ur']),
          citations: [], by: (x['source_slug'] as string) ?? null,
        };
        byIdiom.set(key, e);
      }
      const su = Number(x['surah'] ?? 0), ay = Number(x['ayah'] ?? 0);
      if (su && ay && !e.citations.some((c) => c.surah === su && c.ayah === ay)) {
        e.citations.push({ surah: su, ayah: ay,
          translation_en: (x['ayah_translation_en'] as string) || null });
      }
    }
    return [...byIdiom.values()];
  }

  private async forms(root: string): Promise<Form[]> {
    const rows = await query<Record<string, unknown>>(this.db,
      `SELECT verb_form, verb_ar, active_participle_ar, passive_participle_ar,
              masdar_json, meaning_ar, meaning_en, meaning_ur, source_slug, is_curated
         FROM ar_ling_root_form_masmu
        WHERE root_norm = ? AND status = 'live'`, [root]);

    const gov = await query<Record<string, unknown>>(this.db,
      `SELECT g.verb_form, g.transitivity, g.taddiya_route, g.harf,
              g.meaning_ar, g.meaning_en, g.meaning_ur, g.source_ref,
              s.author_name, s.author_death_ah, s.title_ar
         FROM ar_ling_root_lemma_tadiya g
         LEFT JOIN ar_ling_source s
                ON s.slug = substr(g.source_ref, 1, instr(g.source_ref || ':', ':') - 1)
        WHERE g.root_norm = ? AND g.status = 'live'
        ORDER BY g.sort_order`, [root]);

    // `ar_ling_root_form_paradigm` is the fuller carrier: it holds the muḍāriʿ,
    // which `form_masmu` does not, plus the elative, the intensive and the noun
    // of place — and it records where the language declines a slot. Only a
    // handful of roots have it, so it leads and the masmu carrier fills in.
    const pars = await query<Record<string, unknown>>(this.db,
      `SELECT verb_form, paradigm_json FROM ar_ling_root_form_paradigm
        WHERE id LIKE 'PAR:' || ? || ':%'`, [root]);
    const parFor = new Map<string, Record<string, unknown>>();
    for (const x of pars) {
      try { parFor.set(String(x['verb_form']), JSON.parse(String(x['paradigm_json'] ?? '{}'))); }
      catch { /* a malformed row is not a paradigm */ }
    }

    const NOTE_KEYS = new Set(['past','present','masadir','masdar','active_participle',
      'passive_participle','passive_present','passive_past','elative','intensive',
      'noun_of_place_time','meaning','source_ref']);

    // `verb_form` here is NULL on 317 of 395 rows corpus-wide, and four of the
    // rest read `I-participle`, `I-participle-fp`, `I-masdar`. Normalise the
    // suffixed ones onto their form; the unkeyed ones are root-scope government
    // and are returned beside the forms rather than dropped.
    const formOf = (v: unknown): string | null => {
      const t = (v as string)?.trim();
      if (!t) return null;
      return t.split('-')[0];
    };

    const order = (f: string) => ['I','II','III','IV','V','VI','VII','VIII','IX','X'].indexOf(f);
    return rows.map((x) => {
      const f = String(x['verb_form']);
      const g = gov.filter((v) => formOf(v['verb_form']) === f);
      let masadir: { ar: string; basis: Basis }[] = [];
      try {
        masadir = (JSON.parse(String(x['masdar_json'] ?? '[]')) as { m: string; status: string }[])
          .map((m) => ({ ar: m.m, basis: (m.status === 'attested' ? 'attested' : 'ours') as Basis }));
      } catch { masadir = []; }
      const pj = parFor.get(f);
      const pp = (pj?.['passive_participle'] as string) ?? (x['passive_participle_ar'] as string) ?? null;
      const ppSlot = slot(pp);
      const sarf: SarfSaghir | null = pj ? {
        past: (pj['past'] as string) ?? (x['verb_ar'] as string) ?? null,
        present: (pj['present'] as string) ?? null,
        masadir: Array.isArray(pj['masadir']) ? (pj['masadir'] as string[])
               : masadir.map((m) => m.ar),
        active_participle: (pj['active_participle'] as string)
                        ?? (x['active_participle_ar'] as string) ?? null,
        passive_participle: ppSlot,
        passive_present: (pj['passive_present'] as string) ?? null,
        elative: slot(pj['elative']),
        intensive: slot(pj['intensive']),
        noun_of_place_time: slot(pj['noun_of_place_time']),
        notes: Object.entries(pj)
          .filter(([k, v]) => !NOTE_KEYS.has(k) && typeof v === 'string' && v)
          .map(([k, v]) => ({ key: k, text: String(v) })),
        by: String(pj['source_ref'] ?? '').split(';').map((t) => t.trim()).filter(Boolean),
      } : null;
      return {
        roman: f,
        verb_ar: (pj?.['past'] as string) ?? (x['verb_ar'] as string) ?? null,
        chain_ar: null,
        sarf_saghir: sarf,
        masadir,
        active_participle: sarf?.active_participle ?? (x['active_participle_ar'] as string) ?? null,
        passive_participle: ppSlot?.state === 'attested' ? ppSlot.value : null,
        passive_note: ppSlot?.state === 'not_built' ? ppSlot.value : null,
        // form carrier first, government carrier for the English it lacks
        meaning: tri(x['meaning_ar'] ?? g[0]?.['meaning_ar'],
                     x['meaning_en'] ?? g[0]?.['meaning_en'],
                     x['meaning_ur'] ?? g[0]?.['meaning_ur']),
        government: g.map((v) => ({
          transitivity: (v['transitivity'] as string) ?? null,
          route: (v['taddiya_route'] as string) ?? null,
          particle: (v['harf'] as string) ?? null,
          meaning: tri(v['meaning_ar'], v['meaning_en'], v['meaning_ur']),
          by: v['source_ref'] ? {
            author: (v['author_name'] as string) ?? null,
            work: (v['title_ar'] as string) ?? null,
            died_ah: v['author_death_ah'] == null ? null : Number(v['author_death_ah']),
            at: null, slug: String(v['source_ref']).split(':')[0],
          } : null,
        })),
        in_quran: { finite: 0, derived: 0, total: 0 },
        lemmas: [],
        basis: basisOf((x['source_slug'] as string) ?? null, x['is_curated']),
        arc: null,
      };
    }).sort((a, b) => order(a.roman) - order(b.roman));
  }

  /**
   * The corpus assigns a form to verbs and their derivations; nouns it does not
   * touch. Those come back with `form_roman: null` and are grouped apart — for
   * many roots that group carries most of the occurrences, and saying so is the
   * work queue.
   */
  private async lemmas(rootId: string, bw: string | null): Promise<Lemma[]> {
    const rows = await query<Record<string, unknown>>(this.db,
      `SELECT id, lemma_text, lemma_text_bare, part_of_speech, verb_form,
              is_quran_word, frequency_quran
         FROM ar_ling_root_lemma
        WHERE root_id = ?
        ORDER BY frequency_quran DESC, lemma_text`, [rootId]);

    // The QAC map carries the derivation type (participle, maṣdar) and is keyed
    // on the lemma's Buckwalter — but `ar_ling_root_lemma_form_map.lemma_ar` is
    // NULL corpus-wide and lemmas store no Buckwalter, so there is no join to
    // make. `derivation` stays null until one side gains the other's key.
    void bw;

    // Deduplicate: a lemma repeated with frequency 0 is a stale row, not a word.
    const seen = new Set<string>();
    const out: Lemma[] = [];
    for (const x of rows) {
      const bare = (x['lemma_text_bare'] as string) ?? String(x['lemma_text']);
      const key = `${bare}|${x['part_of_speech']}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        ar: String(x['lemma_text']),
        bare,
        pos: (x['part_of_speech'] as string) ?? null,
        form_roman: (x['verb_form'] as string) ?? null,
        derivation: null,
        in_quran: Number(x['frequency_quran'] ?? 0),
        is_quran_word: Number(x['is_quran_word'] ?? 0) === 1,
        examples_key: String(x['id']),
        examples: null,
      });
    }
    return out;
  }

  private async relations(root: string, rootId: string): Promise<Relations> {
    const [didd, haql, taq, nb] = await Promise.all([
      query<Record<string, unknown>>(this.db,
        `SELECT d.antonym_ar, d.antonym_en, d.relation_kind, d.generated_by, d.source_ref,
                s.author_name, s.author_death_ah
           FROM ar_ling_root_didd d
           LEFT JOIN ar_ling_source s
                  ON s.slug = substr(d.source_ref, 1, instr(d.source_ref || ':', ':') - 1)
          WHERE d.root_norm = ? AND d.status = 'live' ORDER BY d.sort_order`, [root]),
      query<Record<string, unknown>>(this.db,
        `SELECT field_id, weight, is_primary, source_slug FROM ar_ling_root_haql
          WHERE root_norm = ? ORDER BY is_primary DESC, weight DESC`, [root]),
      query<Record<string, unknown>>(this.db,
        `SELECT t.permutation, t.is_used, t.group_key
           FROM ar_ling_root_taqalib t
          WHERE t.group_key IN (SELECT group_key FROM ar_ling_root_taqalib WHERE permutation = ?)
          ORDER BY t.perm_index`, [root]),
      query<Record<string, unknown>>(this.db,
        `SELECT to_root_norm AS ar, relation_kind, gloss_en FROM ar_ling_root_relation
          WHERE from_root_norm = ? AND status = 'live'`, [root]),
    ]);
    void rootId;
    return {
      addad: didd.map((d) => ({
        ar: (d['antonym_ar'] as string) ?? null, en: (d['antonym_en'] as string) ?? null,
        axis: (d['relation_kind'] as string) ?? null,
        basis: (d['generated_by'] ? 'ours' : 'attested') as Basis,
        by: d['source_ref'] ? {
          author: (d['author_name'] as string) ?? null, work: null,
          died_ah: d['author_death_ah'] == null ? null : Number(d['author_death_ah']),
          at: null, slug: String(d['source_ref']).split(':')[0],
        } : null,
      })),
      field: haql.map((h) => ({
        id: String(h['field_id']), weight: Number(h['weight'] ?? 0),
        primary: Number(h['is_primary'] ?? 0) === 1,
        basis: basisOf((h['source_slug'] as string) ?? null),
      })),
      taqalib: taq.length ? {
        group: (taq[0]['group_key'] as string) ?? null,
        members: taq.map((t) => ({
          ar: String(t['permutation']), used: Number(t['is_used'] ?? 0) === 1,
          is_self: String(t['permutation']) === root,
        })),
      } : null,
      neighbours: nb.map((n) => ({
        ar: String(n['ar']), kind: (n['relation_kind'] as string) ?? null,
        gloss: (n['gloss_en'] as string) ?? null,
      })),
    };
  }

  /** Every work this root's page cites, oldest first. */
  private async sources(root: string): Promise<SourceRef[]> {
    const rows = await query<Record<string, unknown>>(this.db,
      `WITH used(slug, cited_for) AS (
         SELECT source_slug, 'asl'    FROM ar_ling_root_asl        WHERE root_norm = ?1
         UNION ALL
         SELECT t.source_slug, 'sense' FROM ar_ling_sense_attestation t
           JOIN ar_ling_root_sense n ON n.id = t.target_id WHERE n.root_norm = ?1
         UNION ALL
         SELECT source_slug, 'scholarship' FROM ar_ling_root_scholarship WHERE root_norm = ?1)
       SELECT u.slug, GROUP_CONCAT(DISTINCT u.cited_for) AS roles,
              s.author_name, s.author_death_ah, s.title_ar
         FROM used u LEFT JOIN ar_ling_source s ON s.slug = u.slug
        WHERE u.slug IS NOT NULL
        GROUP BY u.slug
        ORDER BY COALESCE(s.author_death_ah, 9999)`, [root]);
    return rows.map((x) => ({
      author: (x['author_name'] as string) ?? null,
      work: (x['title_ar'] as string) ?? null,
      died_ah: x['author_death_ah'] == null ? null : Number(x['author_death_ah']),
      at: null,
      slug: String(x['slug']),
      cited_for: String(x['roles'] ?? '').split(',').filter(Boolean),
    }));
  }
}
