import { query, placeholders, chunked } from '../../../shared/src/db';

export interface ResolvedSense {
  id: string; sense_key: string; gloss_ar: string | null; gloss_en: string | null;
  gloss_ur: string | null; label_ar: string | null; label_en: string | null;
  definition_md: string | null; is_core: number; status: string;
}

export interface ResolvedArcStep {
  step_no: number; sense_id: string; note_md: string | null;
  gloss_ar: string | null; gloss_en: string | null;
}

export interface ResolvedArc {
  id: string; arc_key: string; arc_ar: string | null; arc_en: string | null;
  arc_ur: string | null; is_primary: number; is_synthesis: number;
  confidence: number | null; status: string; steps: ResolvedArcStep[];
}

interface GovernanceRow {
  root_norm: string; verb_ar: string;
  transitivity: string; harf: string | null; verb_form: string | null;
  meaning_ar: string | null; meaning_en: string | null; meaning_ur: string | null;
  route: string | null; qr_ref: string | null; status: string;
}

export interface ResolvedGovernance {

  headword_ar: string;

  headword_pos: string | null;

  match_basis: 'form' | 'headword';

  governs_directly: boolean;
  transitivity: string; harf: string | null;

  verb_form: string | null;
  meaning_ar: string | null; meaning_en: string | null; meaning_ur: string | null;
  route: string | null; qr_ref: string | null; status: string;
}

export interface ResolvedFuruq {
  set_id: string; set_name: string; set_summary: string | null;
  gloss: string | null; contrast: string | null; usage_rule: string | null;
  quran_pattern: string | null; nuance: string | null; confidence: string | null;
}

export interface ResolvedTabir {
  expression_ar: string; expression_en: string | null; construction_ar: string | null;
  explanation_ar: string | null; explanation_en: string | null;
  surah: number | null; ayah: number | null; source_slug: string | null; status: string;
}

export interface ResolvedForm {
  roman: string | null; name_ar: string; name_en: string | null; name_ur: string | null;
  wazn: string | null; example_ar: string | null; kind: string; derivation_type: string | null;
}

export interface ResolvedLemma {
  id: string;
  lemma_ar: string;
  lemma_bare: string | null;
  pos: string | null;
  verb_form: string | null;
  frequency_quran: number;
  note_md: string | null;
  root: {
    id: string | null; root_text: string | null; root_norm: string | null;
    meaning_core_ar: string | null; meaning_core_en: string | null;
  } | null;
  form: ResolvedForm | null;
  senses: ResolvedSense[];
  arcs: ResolvedArc[];
  governance: ResolvedGovernance[];
  furuq: ResolvedFuruq[];
  tabir: ResolvedTabir[];

  coverage: Record<string, boolean>;
}

function groupBy<T>(rows: T[], key: (r: T) => string | null): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    if (k == null) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(r);
  }
  return m;
}

const STATUS_RANK = `CASE status WHEN 'live' THEN 0 WHEN 'review' THEN 1 ELSE 2 END`;

const CHUNK = 80;

function pickGovernance(
  rows: GovernanceRow[],
  lemmaText: string,
  verbForm: string | null,
): Array<{ row: GovernanceRow; basis: 'form' | 'headword' }> {
  const out: Array<{ row: GovernanceRow; basis: 'form' | 'headword' }> = [];
  const seen = new Set<string>();
  if (verbForm) {
    const key = verbForm.trim().toUpperCase();
    for (const row of rows) {
      if ((row.verb_form ?? '').trim().toUpperCase() !== key) continue;
      seen.add(rowKey(row));
      out.push({ row, basis: 'form' });
    }
  }
  for (const row of rows) {
    if (row.verb_ar !== lemmaText || seen.has(rowKey(row))) continue;
    out.push({ row, basis: 'headword' });
  }
  return out;
}

function rowKey(r: GovernanceRow): string {
  return `${r.verb_form ?? ''}::${r.verb_ar}::${r.harf ?? ''}::${r.transitivity}`;
}

function stripNamespace(id: string): string {
  return /^AL:[0-9a-f]{26}$/i.test(id) ? id.slice(3) : id;
}

export class LemmaResolveRepo {
  constructor(private db: D1Database) {}

  async byIds(ids: string[]): Promise<Record<string, ResolvedLemma>> {
    const uniq = [...new Set(ids.filter(Boolean).map(s => s.trim()))];
    if (!uniq.length) return {};

    const aliases = new Map<string, string[]>();
    for (const given of uniq) {
      const pk = stripNamespace(given);
      const list = aliases.get(pk) ?? [];
      list.push(given);
      aliases.set(pk, list);
    }
    const pks = [...aliases.keys()];
    const parts = await Promise.all(
      chunked(pks, CHUNK).map(c => this.resolveChunk(c)),
    );
    const byPk = Object.assign({}, ...parts) as Record<string, ResolvedLemma>;

    const out: Record<string, ResolvedLemma> = {};
    for (const [pk, given] of aliases) {
      const hit = byPk[pk];
      if (!hit) continue;
      for (const g of given) out[g] = hit;
    }
    return out;
  }

  private async resolveChunk(uniq: string[]): Promise<Record<string, ResolvedLemma>> {
    const out: Record<string, ResolvedLemma> = {};
    const ph = placeholders(uniq.length);

    const lemmas = await query<{
      id: string; lemma_text: string; lemma_text_bare: string | null;
      part_of_speech: string | null; verb_form: string | null;
      frequency_quran: number; note_md: string | null;
      root_id: string | null; root_text: string | null; root_normalized: string | null;
      meaning_core_ar: string | null; meaning_core_en: string | null;
    }>(
      this.db,
      `SELECT l.id, l.lemma_text, l.lemma_text_bare, l.part_of_speech, l.verb_form,
              l.frequency_quran, l.note_md,
              l.root_id, r.root_text, r.root_normalized, r.meaning_core_ar, r.meaning_core_en
         FROM ar_ling_root_lemma l
         LEFT JOIN ar_ling_roots r ON r.id = l.root_id
        WHERE l.id IN (${ph})`,
      uniq,
    ).catch(() => []);
    if (!lemmas.length) return out;

    const govNorms = [...new Set(
      lemmas.map(l => l.root_normalized ?? l.root_text).filter(Boolean),
    )] as string[];

    const [senses, arcs, steps, furuq, tabir, forms, gov] = await Promise.all([
      query<{ scope_key: string } & ResolvedSense>(
        this.db,
        `SELECT scope_key, id, sense_key, gloss_ar, gloss_en, gloss_ur,
                label_ar, label_en, definition_md, is_core, status
           FROM ar_ling_root_sense
          WHERE scope_level = 'lemma' AND scope_key IN (${ph})
          ORDER BY ${STATUS_RANK}, is_core DESC, sort_order, sense_key`,
        uniq,
      ).catch(() => []),

      query<{
        scope_key: string; id: string; arc_key: string; arc_ar: string | null;
        arc_en: string | null; arc_ur: string | null; is_primary: number;
        is_synthesis: number; confidence: number | null; status: string;
      }>(
        this.db,
        `SELECT scope_key, id, arc_key, arc_ar, arc_en, arc_ur,
                is_primary, is_synthesis, confidence, status
           FROM ar_ling_sense_arc
          WHERE scope_level = 'lemma' AND scope_key IN (${ph})
          ORDER BY ${STATUS_RANK}, is_primary DESC, arc_key`,
        uniq,
      ).catch(() => []),

      query<{ arc_id: string } & ResolvedArcStep>(
        this.db,
        `SELECT st.arc_id, st.step_no, st.sense_id, st.note_md, s.gloss_ar, s.gloss_en
           FROM ar_ling_sense_arc_step st
           JOIN ar_ling_sense_arc a ON a.id = st.arc_id
           LEFT JOIN ar_ling_root_sense s ON s.id = st.sense_id
          WHERE a.scope_level = 'lemma' AND a.scope_key IN (${ph})
          ORDER BY st.arc_id, st.step_no`,
        uniq,
      ).catch(() => []),

      query<{ lemma_id: string } & ResolvedFuruq>(
        this.db,
        `SELECT m.lemma_id, m.set_id, s.set_name, s.short_summary AS set_summary,
                m.basic_gloss AS gloss, m.contrast_note AS contrast, m.usage_rule,
                m.quran_usage_pattern AS quran_pattern, m.nuance_note AS nuance,
                m.confidence
           FROM ar_ling_root_lemma_furuq_member m
           JOIN ar_ling_root_lemma_furuq_set s ON s.id = m.set_id
          WHERE m.lemma_id IN (${ph})
          ORDER BY m.sort_order, s.set_name`,
        uniq,
      ).catch(() => []),

      query<{ primary_lemma_id: string } & ResolvedTabir>(
        this.db,
        `SELECT primary_lemma_id, expression_ar, expression_en, construction_ar,
                explanation_ar, explanation_en, surah, ayah, source_slug, status
           FROM ar_ling_root_lemma_tabir
          WHERE primary_lemma_id IN (${ph})
          ORDER BY ${STATUS_RANK}, surah, ayah`,
        uniq,
      ).catch(() => []),

      query<{
        roman: string | null; verb_form_key: string | null; derivation_type: string | null;
        kind: string; name_ar: string; name_en: string | null; name_ur: string | null;
        wazn: string | null; example_ar: string | null;
      }>(
        this.db,
        `SELECT roman, verb_form_key, derivation_type, kind, name_ar, name_en, name_ur,
                wazn, example_ar
           FROM ar_ling_root_form_family
          WHERE status = 'live'
          ORDER BY family_order`,
      ).catch(() => []),

      govNorms.length
        ? query<GovernanceRow>(
            this.db,
            `SELECT root_norm, verb_ar, transitivity, harf, verb_form,
                    meaning_ar, meaning_en, meaning_ur,
                    taddiya_route AS route, qr_ref, status
               FROM ar_ling_root_lemma_tadiya
              WHERE root_norm IN (${placeholders(govNorms.length)})
              ORDER BY ${STATUS_RANK}, sort_order`,
            govNorms,
          ).catch(() => [])
        : Promise.resolve([]),
    ]);

    const senseBy = groupBy(senses, s => s.scope_key);
    const arcBy = groupBy(arcs, a => a.scope_key);
    const stepBy = groupBy(steps, s => s.arc_id);
    const furuqBy = groupBy(furuq, f => f.lemma_id);
    const tabirBy = groupBy(tabir, t => t.primary_lemma_id);
    const govByRoot = groupBy(gov, g => g.root_norm);

    for (const l of lemmas) {
      const rootNorm = l.root_normalized ?? l.root_text;
      const myGov = rootNorm
        ? pickGovernance(govByRoot.get(rootNorm) ?? [], l.lemma_text, l.verb_form)
        : [];
      const myArcs: ResolvedArc[] = (arcBy.get(l.id) ?? []).map(a => ({
        id: a.id, arc_key: a.arc_key, arc_ar: a.arc_ar, arc_en: a.arc_en, arc_ur: a.arc_ur,
        is_primary: a.is_primary, is_synthesis: a.is_synthesis,
        confidence: a.confidence, status: a.status,
        steps: (stepBy.get(a.id) ?? []).map(s => ({
          step_no: s.step_no, sense_id: s.sense_id, note_md: s.note_md,
          gloss_ar: s.gloss_ar, gloss_en: s.gloss_en,
        })),
      }));
      const mySenses = senseBy.get(l.id) ?? [];
      const myFuruq = furuqBy.get(l.id) ?? [];
      const myTabir = tabirBy.get(l.id) ?? [];
      const form = matchForm(forms, l.verb_form, l.part_of_speech);

      out[l.id] = {
        id: l.id,
        lemma_ar: l.lemma_text,
        lemma_bare: l.lemma_text_bare,
        pos: l.part_of_speech,
        verb_form: l.verb_form,
        frequency_quran: l.frequency_quran,
        note_md: l.note_md,
        root: (l.root_id || l.root_text)
          ? {
              id: l.root_id, root_text: l.root_text, root_norm: rootNorm,
              meaning_core_ar: l.meaning_core_ar, meaning_core_en: l.meaning_core_en,
            }
          : null,
        form,
        senses: mySenses.map(({ scope_key: _sk, ...s }) => s),
        arcs: myArcs,
        governance: myGov.map(({ row: { root_norm: _rn, verb_ar, ...g }, basis }) => ({
          ...g,
          headword_ar: verb_ar,
          headword_pos: l.part_of_speech,
          match_basis: basis,

          governs_directly: basis === 'form' || l.part_of_speech === 'verb',
        })),
        furuq: myFuruq.map(({ lemma_id: _li, ...f }) => f),
        tabir: myTabir.map(({ primary_lemma_id: _pl, ...t }) => t),
        coverage: {
          senses: mySenses.length > 0,
          arcs: myArcs.length > 0,
          governance: myGov.length > 0,
          furuq: myFuruq.length > 0,
          tabir: myTabir.length > 0,
          form: !!form,
          root_meaning: !!(l.meaning_core_ar || l.meaning_core_en),
        },
      };
    }
    return out;
  }
}

function matchForm(
  forms: Array<{
    roman: string | null; verb_form_key: string | null; derivation_type: string | null;
    kind: string; name_ar: string; name_en: string | null; name_ur: string | null;
    wazn: string | null; example_ar: string | null;
  }>,
  verbForm: string | null,
  pos: string | null,
): ResolvedForm | null {
  if (!verbForm) return null;
  const key = verbForm.trim().toUpperCase();
  const hit = forms.find(f =>
    (f.roman ?? '').toUpperCase() === key || (f.verb_form_key ?? '').toUpperCase() === key);
  if (!hit) return null;
  return {
    roman: hit.roman, name_ar: hit.name_ar, name_en: hit.name_en, name_ur: hit.name_ur,
    wazn: hit.wazn, example_ar: hit.example_ar, kind: hit.kind,
    derivation_type: hit.derivation_type ?? (pos === 'verb' ? null : pos),
  };
}
