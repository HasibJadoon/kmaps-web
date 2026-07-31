// ─── SenseRepo — the 360° sense layer ────────────────────────────────────────
//
// `ar_ling_root_sense` and its arcs are the one part of the root's meaning that
// is modelled as a graph rather than a list: a sense is a node, an arc is a
// path from one sense to a terminal sense, and every claim along the way is
// attested to a named source.
//
// SCOPE. `ar_ling_sense_arc.scope_level` is CHECK-constrained to ('root','lemma')
// — a word-scoped sense is unrepresentable on purpose. A word owns no sense; its
// meaning is the context it sits in, and `km_quran.qr_word_sense_link` is the
// join that points an occurrence at one of these. So this repo serves root and
// lemma, and nothing here has a word variant.
//
// `scope_key` is the AL lemma id at lemma scope and the root text at root scope.
// Some lemma ids embed the Arabic root (`LEM:LEX:شكك`), so a "looks Arabic"
// test misreads them as strings — always resolve the id.
//
// READ-ONLY. Reads only ar_ling_* in DB_AL.

import { query } from '../../../shared/src/db';

export interface RootSense {
  id: string;
  root_norm: string;
  sense_key: string | null;
  gloss_ar: string | null;
  gloss_en: string | null;
  gloss_ur: string | null;
  is_core: number | null;
  status: string | null;
}

export interface SenseArc {
  id: string;
  scope_level: string;
  scope_key: string;
  root_norm: string;
  arc_key: string;
  terminal_sense_id: string;
  arc_ar: string | null;
  arc_en: string | null;
  arc_ur: string | null;
  is_primary: number;
  is_synthesis: number;
  confidence: number | null;
  status: string;
}

export interface SenseArcStep {
  id: string;
  arc_id: string;
  step_no: number;
  sense_id: string;
  note_md: string | null;
  /** Joined so a step renders without a second lookup per row. */
  gloss_ar: string | null;
  gloss_en: string | null;
}

export interface SenseAttestation {
  id: string;
  target_type: string;
  target_id: string;
  source_slug: string;
  quote_ar: string | null;
  quote_en: string | null;
  locator: string | null;
  agreement: string;
  confidence: number | null;
}

export class SenseRepo {
  constructor(private db: D1Database) {}

  senses(rootNorm: string): Promise<RootSense[]> {
    return query<RootSense>(
      this.db,
      `SELECT id, root_norm, sense_key, gloss_ar, gloss_en, gloss_ur, is_core, status
       FROM ar_ling_root_sense
       WHERE root_norm = ?
       ORDER BY is_core DESC, sense_key`,
      [rootNorm],
    );
  }

  arcs(rootNorm: string): Promise<SenseArc[]> {
    return query<SenseArc>(
      this.db,
      `SELECT id, scope_level, scope_key, root_norm, arc_key, terminal_sense_id,
              arc_ar, arc_en, arc_ur, is_primary, is_synthesis, confidence, status
       FROM ar_ling_sense_arc
       WHERE root_norm = ?
       ORDER BY is_primary DESC, scope_level, arc_key`,
      [rootNorm],
    );
  }

  /** Every step of every arc for the root, with the step's own sense glossed. */
  steps(rootNorm: string): Promise<SenseArcStep[]> {
    return query<SenseArcStep>(
      this.db,
      `SELECT st.id, st.arc_id, st.step_no, st.sense_id, st.note_md,
              s.gloss_ar, s.gloss_en
       FROM ar_ling_sense_arc_step st
       JOIN ar_ling_sense_arc a ON a.id = st.arc_id
       LEFT JOIN ar_ling_root_sense s ON s.id = st.sense_id
       WHERE a.root_norm = ?
       ORDER BY st.arc_id, st.step_no`,
      [rootNorm],
    );
  }

  /**
   * Attestations for everything this root owns — its senses, its arcs and the
   * steps of those arcs. `target_type` says which, so one query serves all three
   * rather than the client asking per row.
   */
  attestations(rootNorm: string): Promise<SenseAttestation[]> {
    return query<SenseAttestation>(
      this.db,
      `SELECT id, target_type, target_id, source_slug, quote_ar, quote_en,
              locator, agreement, confidence
       FROM ar_ling_sense_attestation
       WHERE (target_type = 'sense' AND target_id IN
                (SELECT id FROM ar_ling_root_sense WHERE root_norm = ?))
          OR (target_type = 'arc' AND target_id IN
                (SELECT id FROM ar_ling_sense_arc WHERE root_norm = ?))
          OR (target_type = 'arc_step' AND target_id IN
                (SELECT st.id FROM ar_ling_sense_arc_step st
                 JOIN ar_ling_sense_arc a ON a.id = st.arc_id
                 WHERE a.root_norm = ?))
       ORDER BY source_slug, locator`,
      [rootNorm, rootNorm, rootNorm],
    );
  }
}
