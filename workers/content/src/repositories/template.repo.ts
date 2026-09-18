import { query, queryOne } from '../../../shared/src/db';

export interface CmTemplateCategory {
  category_key: string;
  label_en: string;
  label_ar: string | null;
  glyph: string;
  blurb: string | null;
  sort_order: number;
  template_count?: number;
}

export interface CmTemplateSummary {
  template_key: string;
  category_key: string;
  title_en: string;
  title_ar: string | null;
  subtitle: string | null;
  summary: string | null;
  glyph: string;
  version: number;
  status: string;
  sample_count?: number;
}

export interface CmTemplateSampleSummary {
  sample_id: string;
  template_key: string;
  title_en: string;
  title_ar: string | null;
  subtitle: string | null;
  source_slug: string | null;
}

/// A shaped document as the screen draws it, alongside the authored JSON it was
/// shaped from. `display` is already sections-and-blocks; `raw` is the contract.
export interface CmTemplateDocument {
  display: unknown;
  raw: unknown;
}

const parse = (s: string | null): unknown => {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
};

const CAT = `c.category_key, c.label_en, c.label_ar, c.glyph, c.blurb, c.sort_order`;
const TPL = `t.template_key, t.category_key, t.title_en, t.title_ar, t.subtitle,
             t.summary, t.glyph, t.version, t.status`;
const SMP = `s.sample_id, s.template_key, s.title_en, s.title_ar, s.subtitle, s.source_slug`;

export class CmTemplateRepo {
  constructor(private db: D1Database) {}

  categories(): Promise<CmTemplateCategory[]> {
    return query<CmTemplateCategory>(this.db, `
      SELECT ${CAT},
             (SELECT COUNT(*) FROM cm_template t
               WHERE t.category_key = c.category_key AND t.status = 'active') AS template_count
        FROM cm_template_category c
       ORDER BY c.sort_order, c.label_en`);
  }

  templates(categoryKey: string | null): Promise<CmTemplateSummary[]> {
    const where = categoryKey ? `AND t.category_key = ?` : '';
    const params = categoryKey ? [categoryKey] : [];
    return query<CmTemplateSummary>(this.db, `
      SELECT ${TPL},
             (SELECT COUNT(*) FROM cm_template_sample s
               WHERE s.template_key = t.template_key) AS sample_count
        FROM cm_template t
       WHERE t.status = 'active' ${where}
       ORDER BY t.sort_order, t.title_en`, params);
  }

  async template(key: string): Promise<(CmTemplateSummary & CmTemplateDocument & {
    samples: CmTemplateSampleSummary[];
  }) | null> {
    const row = await queryOne<CmTemplateSummary & { spec_json: string; display_json: string | null }>(
      this.db,
      `SELECT ${TPL}, t.spec_json, t.display_json FROM cm_template t WHERE t.template_key = ?`,
      [key],
    );
    if (!row) return null;

    const { spec_json, display_json, ...summary } = row;
    return {
      ...summary,
      display: parse(display_json),
      raw: parse(spec_json),
      samples: await query<CmTemplateSampleSummary>(this.db, `
        SELECT ${SMP} FROM cm_template_sample s
         WHERE s.template_key = ?
         ORDER BY s.sort_order, s.title_en`, [key]),
    };
  }

  async sample(key: string, sampleId: string):
    Promise<(CmTemplateSampleSummary & CmTemplateDocument) | null> {
    const row = await queryOne<CmTemplateSampleSummary & {
      payload_json: string; display_json: string | null;
    }>(this.db, `
      SELECT ${SMP}, s.payload_json, s.display_json
        FROM cm_template_sample s
       WHERE s.template_key = ? AND s.sample_id = ?`, [key, sampleId]);
    if (!row) return null;

    const { payload_json, display_json, ...summary } = row;
    return { ...summary, display: parse(display_json), raw: parse(payload_json) };
  }
}
