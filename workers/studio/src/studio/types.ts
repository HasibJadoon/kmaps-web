/// The registry and episode rows as the read API loads them (km_studio). Pure data; model.ts builds view-models.

export interface Registry {
  version: string;
  labels: Record<string, string>;
  tokens: Array<{ key: string; kind: string; value: string }>;
  domains: Array<{ key: string; label_key: string; accent_token: string | null; motif: string | null; seq: number }>;
  shows: Array<{ id: string; label_key: string; art_ref: string | null; seq: number }>;
  stages: Array<{ workflow_ref: string; key: string; seq: number; label_key: string; icon_token: string | null; tone_token: string | null; done_rule_json: string; shows_json: string }>;
  checks: Array<{ workflow_ref: string; stage_key: string; key: string; seq: number; label_key: string }>;
  sections: Array<{ view_ref: string; key: string; seq: number; kind: string; label_key: string | null; bind: string | null; when_rule_json: string; platforms: string; layout: string | null }>;
  views: Array<{ id: string; label_key: string }>;
  series: Array<{ id: string; show_ref: string; domain_key: string; label_key: string; subtitle_key: string | null; workflow_ref: string; boundary_kind: string; manager_ref: string | null; cover_ref: string | null; seq: number; status: string }>;
  arcs: Array<{ series_ref: string; key: string; label_key: string; seq: number }>;
  /** Each series' production folder (iCloud or local), its subfolders and which files mean what. */
  layouts?: Array<{ id: string; scope: string; owner_ref: string; root_path: string; episode_pattern: string | null; subfolders_json: string; asset_rules_json: string }>;
}

export interface EpisodeRow {
  id: string; series_ref: string; arc_key: string | null; no: number; kind: string; parent_ref: string | null;
  title_en: string; title_ar: string | null; boundary_ref: string | null; scenes_ref: string | null; slides_ref: string | null;
  folder_path: string | null; status: string; updated_at: string;
}

export interface EpisodeBundle {
  ep: EpisodeRow;
  people: Array<{ person_ref: string; role_key: string; seq: number }>;
  resources: Array<{ group_key: string; seq: number; ref: string | null; url: string | null; label_override: string | null; local_path: string | null }>;
  checks: Array<{ check_key: string; result: string; note: string | null; evidence_ref?: string | null; reported_at: string }>;
  publications: Array<{ id: string; part_key: string; platform_key: string; url: string | null; published_at: string | null; chapters_json: string }>;
  takes: Array<{ id: string; take_no: number; mark_at: string; cut_at: string | null; status: string; markers: number }>;
}
