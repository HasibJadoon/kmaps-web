import { query, queryOne } from '../../../shared/src/db';

export interface PositionRow {
  id: string;
  concept_ref: string | null;
  concept_label: string | null;
  concept_label_ar: string | null;
  tradition_id: string | null;
  tradition: string | null;
  tradition_ar: string | null;
  tradition_type: string | null;
  position_title: string;
  position_text: string;
  position_type: string;
  surah: number | null;
  ayah_from: number | null;
  ayah_to: number | null;
  qr_scope_ref: string | null;
  source_count: number;
}

const SELECT = `
  SELECT p.id, p.concept_ref, p.tradition_id,
         c.label_en AS concept_label, c.label_ar AS concept_label_ar,
         t.title AS tradition, t.title_ar AS tradition_ar, t.tradition_type,
         p.position_title, p.position_text, p.position_type,
         p.surah, p.ayah_from, p.ayah_to, p.qr_scope_ref,
         (SELECT COUNT(*) FROM wv_value_position_source s WHERE s.position_id = p.id)
           AS source_count
    FROM wv_value_positions p
    LEFT JOIN core_concept  c ON c.id = p.concept_ref
    LEFT JOIN wv_traditions t ON t.id = p.tradition_id
   WHERE p.status = 'live'`;

export class PositionRepo {
  constructor(private db: D1Database) {}

  async forPassage(surah: number, from: number, to: number): Promise<PositionRow[]> {
    return query<PositionRow>(
      this.db,
      `${SELECT} AND p.surah = ?
          AND (p.ayah_from IS NULL OR (p.ayah_from <= ? AND p.ayah_to >= ?))
        ORDER BY c.label_en, t.title`,
      [surah, to, from],
    ).catch(() => []);
  }

  async forConcept(conceptRef: string): Promise<PositionRow[]> {
    return query<PositionRow>(
      this.db,
      `${SELECT} AND p.concept_ref = ? ORDER BY t.tradition_type, t.title`,
      [conceptRef],
    ).catch(() => []);
  }

  async conceptsForPassage(surah: number, from: number, to: number) {
    return query<{ id: string; label_en: string; label_ar: string | null;
                   domain: string; held_by: number }>(
      this.db,
      `SELECT c.id, c.label_en, c.label_ar, c.domain,
              (SELECT COUNT(DISTINCT p.tradition_id) FROM wv_value_positions p
                WHERE p.concept_ref = c.id AND p.status = 'live') AS held_by
         FROM core_concept c
        WHERE c.id IN (SELECT p.concept_ref FROM wv_value_positions p
                        WHERE p.surah = ?
                          AND (p.ayah_from IS NULL OR (p.ayah_from <= ? AND p.ayah_to >= ?)))
           OR c.label_en IN (SELECT v.title FROM wv_ayah_coverage v
                              WHERE v.node_type = 'concept' AND v.surah = ?
                                AND (v.ayah_from IS NULL OR (v.ayah_from <= ? AND v.ayah_to >= ?)))
           -- A passage nobody has read yet binds no concepts, and an empty list
           -- is the one state where this screen has to work: it is a reader
           -- opening a fresh passage. The fifteen axes are exactly the concepts
           -- every worldview has a position on whether or not anyone has
           -- written it down, which is what makes them the axes — so they are
           -- the right thing to offer when there is nothing else.
           OR c.origin = 'axis'
        ORDER BY held_by DESC, (c.origin = 'axis'), c.label_en`,
      [surah, to, from, surah, to, from],
    ).catch(() => []);
  }

  async sources(positionId: string) {
    return query(
      this.db,
      `SELECT id, source_kind, source_id, source_unit_id, locator, qr_scope_ref, excerpt
         FROM wv_value_position_source WHERE position_id = ? ORDER BY created_at`,
      [positionId],
    ).catch(() => []);
  }

  async create(input: {
    conceptRef: string; traditionId: string; title: string; text: string;
    positionType?: string; surah?: number | null;
    ayahFrom?: number | null; ayahTo?: number | null;
  }): Promise<PositionRow | null> {
    const id = `wvvp-${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    const scope = input.surah != null && input.ayahFrom != null
      ? `${input.surah}:${input.ayahFrom}${input.ayahTo && input.ayahTo !== input.ayahFrom ? `-${input.ayahTo}` : ''}`
      : null;

    await this.db.prepare(
      `INSERT INTO wv_value_positions
         (id, moral_axis_id, tradition_id, concept_ref, position_title, position_text,
          position_type, qr_scope_ref, surah, ayah_from, ayah_to)
       VALUES (?, (SELECT id FROM wv_moral_axes WHERE concept_ref = ?
                    UNION ALL SELECT id FROM wv_moral_axes WHERE slug='revelation' LIMIT 1),
               ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, input.conceptRef, input.traditionId, input.conceptRef,
           input.title, input.text, input.positionType ?? 'interpretive',
           scope, input.surah ?? null, input.ayahFrom ?? null, input.ayahTo ?? null).run();

    if (scope) {
      await this.db.prepare(
        `INSERT INTO wv_value_position_source
           (id, position_id, source_kind, qr_scope_ref, note_md)
         VALUES (?, ?, 'quran', ?, 'The passage the position is read from.')`,
      ).bind(`wvvps-${id}`, id, scope).run().catch(() => undefined);
    }

    return queryOne<PositionRow>(this.db, `${SELECT} AND p.id = ?`, [id]);
  }
}
