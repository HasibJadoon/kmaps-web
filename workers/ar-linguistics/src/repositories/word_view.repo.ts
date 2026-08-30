import { query } from '../../../shared/src/db';

export interface VgRow {
  verbAr: string;
  form: string | null;
  transitivity: string;
  harf: string | null;
  meaningEn: string | null;
  meaningAr: string | null;
  qrRef: string | null;
}
export interface AntonymRow {
  ar: string;
  en: string | null;
  kind: string;
}
export interface IdiomRow {
  phraseAr: string;
  en: string | null;
  sourceLabel: string;
}
export interface ExpressionItem {
  id: string;
  ayah: number;
  ar: string | null;
  en: string | null;
  type: string | null;
}

export class WordViewRepo {
  constructor(private db: D1Database) {}

  verbGovernment(root: string) {
    return query<VgRow>(
      this.db,
      `SELECT verb_ar AS verbAr, verb_form AS form, transitivity, harf,
              meaning_en AS meaningEn, meaning_ar AS meaningAr, qr_ref AS qrRef
       FROM ar_ling_root_lemma_tadiya
       WHERE root_norm = ? AND status = 'live'
       ORDER BY sort_order`,
      [root],
    );
  }

  antonyms(root: string) {
    return query<AntonymRow>(
      this.db,
      `SELECT antonym_ar AS ar, antonym_en AS en, relation_kind AS kind
       FROM ar_ling_root_didd
       WHERE root_norm = ? AND status = 'live'
       ORDER BY sort_order`,
      [root],
    );
  }

  expressionsByQuran(surah: number, from: number, to: number) {
    return query<ExpressionItem>(
      this.db,
      `SELECT DISTINCT e.id AS id,
              CAST(substr(j.value, instr(j.value, ':') + 1) AS INTEGER) AS ayah,
              e.expression_ar AS ar,
              e.expression_en AS en,
              e.expression_type_id AS type
       FROM ar_ling_root_lemma_tabir e, json_each(e.qr_refs_json) j
       WHERE substr(j.value, 1, instr(j.value, ':') - 1) = ?
         AND CAST(substr(j.value, instr(j.value, ':') + 1) AS INTEGER) BETWEEN ? AND ?
       ORDER BY ayah, e.id`,
      [String(surah), from, to],
    );
  }

  expressionsByRoot(root: string) {
    return query<IdiomRow>(
      this.db,
      `SELECT e.expression_ar AS phraseAr, e.expression_en AS en,
              'Mir · Verbal Idioms' AS sourceLabel
       FROM ar_ling_root_lemma_tabir e
       JOIN ar_ling_root_lemma l ON l.id = e.primary_lemma_id
       JOIN ar_ling_roots  r ON r.id = l.root_id
       WHERE r.root_text = ?
       LIMIT 12`,
      [root],
    );
  }
}
