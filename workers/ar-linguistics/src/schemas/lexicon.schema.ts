export interface ArLingLexiconEntry {
  id: string;
  lemma_id: string;
  entry_text: string;
  definition_ar: string | null;
  definition_en: string;
  definition_source: string | null;
  usage_register: string;
  root_id: string | null;
  source_id: string | null;
  source_slug: string | null;
  source_chunk_id: string | null;
  entry_kind: string | null;
  heading_norm: string | null;
  source_entry_seq: number | null;
  page_no: number | null;
  volume_no: number | null;
  tokens_approx: number | null;
  title_ar: string | null;
  title_en: string | null;
  display_heading_ar: string | null;
  display_heading_en: string | null;
  heading_key: string | null;
  lemma_text: string | null;
  root_text: string | null;
  transliteration: string | null;
  pos_tag: string | null;
  gloss_ar: string | null;
  gloss_en: string | null;
  summary_ar: string | null;
  summary_en: string | null;
  source_url: string | null;
  is_embedded: number;
  qdrant_id: string | null;
  embed_model: string | null;
  meta_json: string | null;
  semantic_field: string | null;
  related_lemmas: string | null;
  sense_json: string | null;
  morphology_json: string | null;
  examples_json: string | null;
  citations_json: string | null;
  ui_json: string | null;
  ai_json: string | null;
  cleaner_json: string | null;
  status: string;
  quality_score: number | null;
  ai_fill_state: string;
  ai_model: string | null;
  ai_filled_at: string | null;
  reviewed_at: string | null;
  sort_key: string | null;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArLingLexiconEntryCreate {
  lemma_id: string;
  entry_text: string;
  definition_en: string;
  definition_ar?: string;
  definition_source?: string;
  usage_register?: string;
  note_md?: string;
}

export interface ArLingLexiconEntryPatch {
  entry_text?: string;
  definition_ar?: string;
  definition_en?: string;
  definition_source?: string;
  usage_register?: string;
  note_md?: string;
}

export function validateArLingLexiconEntryCreate(
  body: unknown,
): { data: ArLingLexiconEntryCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.lemma_id !== 'string' || !b.lemma_id.trim())
    return { error: 'lemma_id is required' };
  if (typeof b.entry_text !== 'string' || !b.entry_text.trim())
    return { error: 'entry_text is required' };
  if (typeof b.definition_en !== 'string' || !b.definition_en.trim())
    return { error: 'definition_en is required' };
  return {
    data: {
      lemma_id: b.lemma_id.trim(),
      entry_text: b.entry_text.trim(),
      definition_en: b.definition_en.trim(),
      definition_ar: typeof b.definition_ar === 'string' ? b.definition_ar : undefined,
      definition_source:
        typeof b.definition_source === 'string' ? b.definition_source : undefined,
      usage_register: typeof b.usage_register === 'string' ? b.usage_register : undefined,
      note_md: typeof b.note_md === 'string' ? b.note_md : undefined,
    },
  };
}

export interface ArLingSense {
  id: string;
  lexicon_entry_id: string;
  sense_number: number;
  gloss_ar: string | null;
  gloss_en: string;
  context_note: string | null;
  qr_ref: string | null;
  note_md: string | null;
}

export interface ArLingSenseCreate {
  lexicon_entry_id: string;
  sense_number: number;
  gloss_en: string;
  gloss_ar?: string;
  context_note?: string;
  qr_ref?: string;
  note_md?: string;
}

export interface ArLingSensePatch {
  sense_number?: number;
  gloss_ar?: string;
  gloss_en?: string;
  context_note?: string;
  qr_ref?: string;
  note_md?: string;
}

export function validateArLingSenseCreate(
  body: unknown,
): { data: ArLingSenseCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.lexicon_entry_id !== 'string' || !b.lexicon_entry_id.trim())
    return { error: 'lexicon_entry_id is required' };
  if (typeof b.sense_number !== 'number')
    return { error: 'sense_number is required and must be a number' };
  if (typeof b.gloss_en !== 'string' || !b.gloss_en.trim())
    return { error: 'gloss_en is required' };
  return {
    data: {
      lexicon_entry_id: b.lexicon_entry_id.trim(),
      sense_number: b.sense_number,
      gloss_en: b.gloss_en.trim(),
      gloss_ar: typeof b.gloss_ar === 'string' ? b.gloss_ar : undefined,
      context_note: typeof b.context_note === 'string' ? b.context_note : undefined,
      qr_ref: typeof b.qr_ref === 'string' ? b.qr_ref : undefined,
      note_md: typeof b.note_md === 'string' ? b.note_md : undefined,
    },
  };
}

export interface ArLingSenseRelation {
  id: string;
  from_sense_id: string;
  to_sense_id: string;
  relation_type: string;
  nuance_note: string | null;
}

export interface ArLingSenseRelationCreate {
  from_sense_id: string;
  to_sense_id: string;
  relation_type: string;
  nuance_note?: string;
}

export function validateArLingSenseRelationCreate(
  body: unknown,
): { data: ArLingSenseRelationCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.from_sense_id !== 'string' || !b.from_sense_id.trim())
    return { error: 'from_sense_id is required' };
  if (typeof b.to_sense_id !== 'string' || !b.to_sense_id.trim())
    return { error: 'to_sense_id is required' };
  if (typeof b.relation_type !== 'string' || !b.relation_type.trim())
    return { error: 'relation_type is required' };
  return {
    data: {
      from_sense_id: b.from_sense_id.trim(),
      to_sense_id: b.to_sense_id.trim(),
      relation_type: b.relation_type.trim(),
      nuance_note: typeof b.nuance_note === 'string' ? b.nuance_note : undefined,
    },
  };
}

export interface ArLingSemanticField {
  id: string;
  field_name_ar: string;
  field_name_en: string;
  parent_field_id: string | null;
  description_md: string | null;
}

export interface ArLingSemanticFieldCreate {
  field_name_ar: string;
  field_name_en: string;
  parent_field_id?: string;
  description_md?: string;
}

export interface ArLingSemanticFieldPatch {
  field_name_ar?: string;
  field_name_en?: string;
  parent_field_id?: string;
  description_md?: string;
}

export function validateArLingSemanticFieldCreate(
  body: unknown,
): { data: ArLingSemanticFieldCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.field_name_ar !== 'string' || !b.field_name_ar.trim())
    return { error: 'field_name_ar is required' };
  if (typeof b.field_name_en !== 'string' || !b.field_name_en.trim())
    return { error: 'field_name_en is required' };
  return {
    data: {
      field_name_ar: b.field_name_ar.trim(),
      field_name_en: b.field_name_en.trim(),
      parent_field_id:
        typeof b.parent_field_id === 'string' ? b.parent_field_id : undefined,
      description_md: typeof b.description_md === 'string' ? b.description_md : undefined,
    },
  };
}

export interface ArLingNearSynonymSet {
  id: string;
  set_name: string;
  description_md: string;
  created_at: string;
}

export interface ArLingNearSynonymSetCreate {
  set_name: string;
  description_md: string;
}

export interface ArLingNearSynonymSetPatch {
  set_name?: string;
  description_md?: string;
}

export function validateArLingNearSynonymSetCreate(
  body: unknown,
): { data: ArLingNearSynonymSetCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.set_name !== 'string' || !b.set_name.trim())
    return { error: 'set_name is required' };
  if (typeof b.description_md !== 'string' || !b.description_md.trim())
    return { error: 'description_md is required' };
  return {
    data: {
      set_name: b.set_name.trim(),
      description_md: b.description_md,
    },
  };
}

export interface ArLingNearSynonymMember {
  id: string;
  set_id: string;
  lemma_id: string;
  nuance_note: string;
}

export interface ArLingNearSynonymMemberCreate {
  set_id: string;
  lemma_id: string;
  nuance_note: string;
}

export function validateArLingNearSynonymMemberCreate(
  body: unknown,
): { data: ArLingNearSynonymMemberCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.set_id !== 'string' || !b.set_id.trim())
    return { error: 'set_id is required' };
  if (typeof b.lemma_id !== 'string' || !b.lemma_id.trim())
    return { error: 'lemma_id is required' };
  if (typeof b.nuance_note !== 'string' || !b.nuance_note.trim())
    return { error: 'nuance_note is required' };
  return {
    data: {
      set_id: b.set_id.trim(),
      lemma_id: b.lemma_id.trim(),
      nuance_note: b.nuance_note.trim(),
    },
  };
}

export interface ArLingLexiconEvidence {
  id: string;
  lexicon_entry_id: string;
  sense_id: string | null;
  evidence_type: string;

  text_ar: string;
  text_en: string | null;
  qr_ref: string | null;
  source_ref: string | null;
  note_md: string | null;
  created_at: string;
}

export interface ArLingLexiconEvidenceCreate {
  lexicon_entry_id: string;
  text_ar: string;
  evidence_type?: string;
  sense_id?: string;
  text_en?: string;
  qr_ref?: string;
  source_ref?: string;
  note_md?: string;
}

export function validateArLingLexiconEvidenceCreate(
  body: unknown,
): { data: ArLingLexiconEvidenceCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.lexicon_entry_id !== 'string' || !b.lexicon_entry_id.trim())
    return { error: 'lexicon_entry_id is required' };
  if (typeof b.text_ar !== 'string' || !b.text_ar.trim())
    return { error: 'text_ar is required' };
  return {
    data: {
      lexicon_entry_id: b.lexicon_entry_id.trim(),
      text_ar: b.text_ar.trim(),
      evidence_type: typeof b.evidence_type === 'string' ? b.evidence_type : undefined,
      sense_id: typeof b.sense_id === 'string' ? b.sense_id : undefined,
      text_en: typeof b.text_en === 'string' ? b.text_en : undefined,
      qr_ref: typeof b.qr_ref === 'string' ? b.qr_ref : undefined,
      source_ref: typeof b.source_ref === 'string' ? b.source_ref : undefined,
      note_md: typeof b.note_md === 'string' ? b.note_md : undefined,
    },
  };
}

export interface ArLingLexiconMorphology {
  id: string;
  lexicon_entry_id: string;
  morphology_id: string;
  inflected_form: string | null;
}

export interface ArLingLexiconMorphologyCreate {
  lexicon_entry_id: string;
  morphology_id: string;
  inflected_form?: string;
}

export function validateArLingLexiconMorphologyCreate(
  body: unknown,
): { data: ArLingLexiconMorphologyCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.lexicon_entry_id !== 'string' || !b.lexicon_entry_id.trim())
    return { error: 'lexicon_entry_id is required' };
  if (typeof b.morphology_id !== 'string' || !b.morphology_id.trim())
    return { error: 'morphology_id is required' };
  return {
    data: {
      lexicon_entry_id: b.lexicon_entry_id.trim(),
      morphology_id: b.morphology_id.trim(),
      inflected_form: typeof b.inflected_form === 'string' ? b.inflected_form : undefined,
    },
  };
}

export interface LexiconEntry {
  id: string;
  lemma_id: string;
  headword_ar: string;
  pos: string | null;
  register: string | null;
}

export interface LexiconSense {
  id: string;
  entry_id: string;
  sense_number: number;
  definition_ar: string | null;
  definition_en: string | null;
  domain: string | null;
  example_ar: string | null;
}

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateArLingLexiconEntryPatch(body: unknown): SchemaValidationResult<ArLingLexiconEntryPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('entry_text' in b) {
    if (typeof b.entry_text !== 'string') return { error: 'entry_text must be a string' };
    data.entry_text = b.entry_text;
  }
  if ('definition_ar' in b) {
    if (typeof b.definition_ar !== 'string') return { error: 'definition_ar must be a string' };
    data.definition_ar = b.definition_ar;
  }
  if ('definition_en' in b) {
    if (typeof b.definition_en !== 'string') return { error: 'definition_en must be a string' };
    data.definition_en = b.definition_en;
  }
  if ('definition_source' in b) {
    if (typeof b.definition_source !== 'string') return { error: 'definition_source must be a string' };
    data.definition_source = b.definition_source;
  }
  if ('usage_register' in b) {
    if (typeof b.usage_register !== 'string') return { error: 'usage_register must be a string' };
    data.usage_register = b.usage_register;
  }
  if ('note_md' in b) {
    if (typeof b.note_md !== 'string') return { error: 'note_md must be a string' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ArLingLexiconEntryPatch };
}

export function validateArLingSensePatch(body: unknown): SchemaValidationResult<ArLingSensePatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('sense_number' in b) {
    if (typeof b.sense_number !== 'number' || !Number.isFinite(b.sense_number)) return { error: 'sense_number must be a number' };
    data.sense_number = b.sense_number;
  }
  if ('gloss_ar' in b) {
    if (typeof b.gloss_ar !== 'string') return { error: 'gloss_ar must be a string' };
    data.gloss_ar = b.gloss_ar;
  }
  if ('gloss_en' in b) {
    if (typeof b.gloss_en !== 'string') return { error: 'gloss_en must be a string' };
    data.gloss_en = b.gloss_en;
  }
  if ('context_note' in b) {
    if (typeof b.context_note !== 'string') return { error: 'context_note must be a string' };
    data.context_note = b.context_note;
  }
  if ('qr_ref' in b) {
    if (typeof b.qr_ref !== 'string') return { error: 'qr_ref must be a string' };
    data.qr_ref = b.qr_ref;
  }
  if ('note_md' in b) {
    if (typeof b.note_md !== 'string') return { error: 'note_md must be a string' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ArLingSensePatch };
}

export function validateArLingSemanticFieldPatch(body: unknown): SchemaValidationResult<ArLingSemanticFieldPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('field_name_ar' in b) {
    if (typeof b.field_name_ar !== 'string') return { error: 'field_name_ar must be a string' };
    data.field_name_ar = b.field_name_ar;
  }
  if ('field_name_en' in b) {
    if (typeof b.field_name_en !== 'string') return { error: 'field_name_en must be a string' };
    data.field_name_en = b.field_name_en;
  }
  if ('parent_field_id' in b) {
    if (typeof b.parent_field_id !== 'string') return { error: 'parent_field_id must be a string' };
    data.parent_field_id = b.parent_field_id;
  }
  if ('description_md' in b) {
    if (typeof b.description_md !== 'string') return { error: 'description_md must be a string' };
    data.description_md = b.description_md;
  }

  return { data: data as unknown as ArLingSemanticFieldPatch };
}

export function validateArLingNearSynonymSetPatch(body: unknown): SchemaValidationResult<ArLingNearSynonymSetPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('set_name' in b) {
    if (typeof b.set_name !== 'string') return { error: 'set_name must be a string' };
    data.set_name = b.set_name;
  }
  if ('description_md' in b) {
    if (typeof b.description_md !== 'string') return { error: 'description_md must be a string' };
    data.description_md = b.description_md;
  }

  return { data: data as unknown as ArLingNearSynonymSetPatch };
}
