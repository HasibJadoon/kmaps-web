import { queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// A teaching grammar item (ar_grammar): one topic taught in full — its explanation, rule and
// examples — bound to the syllabus node (al_nahw_ref) and AL's morphology it rests on.

export interface GrammarItem {
  id: string;
  title: string;
  title_ar: string | null;
  al_nahw_ref: string | null;
  al_morph_ref: string | null;
  grammar_type: string | null;
  level: string | null;
  explanation_md: string | null;
  examples_json: string | null;
  rule_summary: string | null;
  qr_scope_ref: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface GrammarCreate {
  title: string;
  title_ar?: string | null;
  al_nahw_ref?: string | null;
  grammar_type?: string | null;
  level?: string | null;
  explanation_md?: string | null;
  rule_summary?: string | null;
}

const COLS = `id, title, title_ar, al_nahw_ref, al_morph_ref, grammar_type, level, explanation_md,
              examples_json, rule_summary, qr_scope_ref, meta_json, created_at, updated_at`;
const LIST = `id, title, title_ar, al_nahw_ref, al_morph_ref, grammar_type, level, rule_summary, created_at, updated_at`;

export class GrammarRepo {
  constructor(private db: D1Database) {}

  list(type: string | null, opts: PaginateOptions = {}) {
    const where = type ? 'WHERE grammar_type = ?' : '';
    return paginate<GrammarItem>(
      this.db,
      `SELECT ${LIST} FROM ar_grammar ${where} ORDER BY grammar_type, id`,
      `SELECT COUNT(*) AS count FROM ar_grammar ${where}`,
      type ? [type] : [],
      opts,
    );
  }

  byNahwRef(ref: string, opts: PaginateOptions = {}) {
    return paginate<GrammarItem>(
      this.db,
      `SELECT ${LIST} FROM ar_grammar WHERE al_nahw_ref = ? ORDER BY id`,
      `SELECT COUNT(*) AS count FROM ar_grammar WHERE al_nahw_ref = ?`,
      [ref],
      opts,
    );
  }

  findById(id: string): Promise<GrammarItem | null> {
    return queryOne<GrammarItem>(this.db, `SELECT ${COLS} FROM ar_grammar WHERE id = ?`, [id]);
  }

  async create(input: GrammarCreate): Promise<GrammarItem> {
    const id = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_grammar (id, title, title_ar, al_nahw_ref, grammar_type, level, explanation_md, rule_summary, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.title, input.title_ar ?? null, input.al_nahw_ref ?? null, input.grammar_type ?? null, input.level ?? null,
       input.explanation_md ?? null, input.rule_summary ?? null, now, now],
    );
    return (await this.findById(id))!;
  }
}
