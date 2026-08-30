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

    owner_ref?: string | null;
    status?: 'draft' | 'live' | 'retired';
    sort_order?: number;
  };
  units?: UnitDoc[];

  items?: ItemDoc[];
}

export interface UnitDoc {
  slug: string;
  title: string;
  title_ar?: string;
  subtitle?: string;
  node_type?: string;
  parent?: string;
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

  unlocks_from?: string[];
  items?: ItemDoc[];

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
  response?: unknown;
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
