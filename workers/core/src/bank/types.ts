// ─── The document a pack is fed from ──────────────────────────────────────────
//
// One shape for all three apps. A Duolingo lesson, a Kahoot round and a
// dinner-table deck differ in which fields they fill, not in their grammar —
// which is the whole bet of this design, and the reason there is one importer
// rather than three.
//
// JSON on the wire. YAML is the convenience of the file on disk; it is parsed
// to this before it reaches the worker, so the worker carries no YAML parser
// and the stored document is queryable with json_extract.

export interface PackDoc {
  pack: {
    slug: string;
    app: 'path' | 'quiz' | 'table';
    title: string;
    title_ar?: string;
    description_md?: string;
    language?: string;
    audience?: 'family' | 'friends' | 'couples' | 'kids' | 'work' | 'mixed';
    cefr_from?: string;
    cefr_to?: string;
    visibility?: 'private' | 'workspace' | 'public';
    workspace_ref?: string;
    /** Omit for the published bank. Set to make it one person's private deck. */
    owner_ref?: string | null;
    status?: 'draft' | 'live' | 'retired';
    sort_order?: number;
  };
  units?: UnitDoc[];
  /** Items that belong to the pack but to no unit yet — a bank you draw from
   *  rather than walk through. The Quiz app lives here. */
  items?: ItemDoc[];
}

export interface UnitDoc {
  slug: string;
  title: string;
  title_ar?: string;
  subtitle?: string;
  node_type?: string;
  parent?: string;                 // another unit's slug
  unit_index?: number;
  item_count?: number;
  item_order?: 'fixed' | 'shuffle' | 'weighted';
  pass_threshold?: number;
  hearts?: number;
  xp_award?: number;
  estimated_mins?: number;
  module?: string;
  resource_ref?: string;
  step_key?: string;
  qr_scope_ref?: string;
  skill_focus?: string;
  level?: string;
  status?: 'draft' | 'live' | 'retired';
  /** Explicit unlock edges. Omit for the linear default: a unit with no inbound
   *  edge is gated on its previous sibling. Edges are for the exceptions. */
  unlocks_from?: string[];
  items?: ItemDoc[];
  /** Cards to put in the learner's SRS when this unit is first passed. */
  enrols?: EnrolDoc[];
}

export interface ItemDoc {
  slug: string;
  interaction?: string;
  scoring?: 'match_correct' | 'map_response' | 'nearest' | 'none';
  prompt_en?: string;
  prompt_ar?: string;
  prompt_ur?: string;
  stimulus_md?: string;
  media_r2_key?: string;
  response?: unknown;              // → response_json
  seconds?: number;
  points_style?: 'standard' | 'double' | 'none';
  speed_bonus?: boolean;
  explanation_en?: string;
  explanation_ar?: string;
  explanation_ur?: string;
  difficulty?: number;
  renderer?: string;
  module?: string;
  resource_type?: string;
  resource_ref?: string;
  surah?: number;
  ayah_from?: number;
  ayah_to?: number;
  passage_ref?: string;
  step_key?: string;
  concept_ref?: string;
  root_norm?: string;
  lemma_ref?: string;
  tags?: string;
  status?: 'draft' | 'live' | 'retired';
  options?: OptionDoc[];
  /** Which unit(s) this item belongs to, when written at pack level. */
  units?: string[];
  seq?: number;
}

export interface OptionDoc {
  en?: string;
  ar?: string;
  ur?: string;
  correct?: boolean;
  role?: string;
  pair_key?: string;
  credit?: number;
  distractor_kind?: string;
  why_wrong_en?: string;
  why_wrong_ar?: string;
  why_wrong_ur?: string;
  media_r2_key?: string;
}

export interface EnrolDoc {
  resource_type: string;
  resource_ref: string;
  note_type?: string;
  card_template?: string;
  module?: string;
}

export interface ImportCounts {
  units_created: number;
  units_updated: number;
  items_created: number;
  items_updated: number;
  items_unchanged: number;
  items_retired: number;
}

export interface ImportResult extends ImportCounts {
  import_id: string;
  pack_ref: string | null;
  dry_run: boolean;
  errors: string[];
}
