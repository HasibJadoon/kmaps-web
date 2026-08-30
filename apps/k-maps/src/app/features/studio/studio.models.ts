export type EpisodeFormat =
  | 'podcast' | 'tutorial' | 'talking_head' | 'conversation' | 'solo';

export type SectionType =
  | 'intro' | 'main_point' | 'discussion' | 'conclusion' | 'custom';

export type ParticipantRole = 'host' | 'speaker' | 'guest' | 'viewer';

export type EpisodeStatus = 'draft' | 'live' | 'done';

export interface TemplateStructurePoint {
  text?: string;
  speaker_role?: string | null;
}

export interface TemplateStructureSection {
  type?: string;
  heading: string;
  points?: TemplateStructurePoint[];
}

export interface TemplateStructureParticipant {
  role?: string;
  display_name?: string;
}

export interface TemplateStructure {
  participants?: TemplateStructureParticipant[];
  sections?: TemplateStructureSection[];
}

export interface StudioTemplate {
  id: string;
  name: string;
  description: string | null;
  format: EpisodeFormat;
  is_builtin: boolean;
  structure: TemplateStructure;
  created_at: string;
  updated_at: string;
}

export interface EpisodeSummary {
  id: string;
  core_user_ref: string;
  title: string;
  format: EpisodeFormat;
  template_ref: string | null;
  status: EpisodeStatus;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  episode_ref: string;
  display_name: string;
  color: string;
  role: ParticipantRole;
  seq: number;

  core_user_ref: string | null;
}

export interface TalkingPoint {
  id: string;
  section_ref: string;
  episode_ref: string;
  text: string;
  speaker_ref: string | null;

  bridge: string | null;
  est_seconds: number | null;
  seq: number;

  subs_json?: string[] | string | null;
}

export interface Section {
  id: string;
  episode_ref: string;
  type: SectionType;
  heading: string;
  seq: number;
  points: TalkingPoint[];
}

export interface EpisodeAggregate extends EpisodeSummary {
  participants: Participant[];
  sections: Section[];
}

export const EPISODE_FORMATS: ReadonlyArray<{ id: EpisodeFormat; label: string }> = [
  { id: 'podcast',      label: 'Podcast' },
  { id: 'conversation', label: 'Conversation' },
  { id: 'tutorial',     label: 'Tutorial' },
  { id: 'talking_head', label: 'Talking head' },
  { id: 'solo',         label: 'Solo' },
];

export function formatLabel(format: string): string {
  return EPISODE_FORMATS.find((f) => f.id === format)?.label ?? format;
}

export interface SessionInfo {
  session_id: string;
  room_code: string;
  episode_id: string;
  episode_title?: string;
  status: 'live' | 'ended';
  host: boolean;
}

export interface LiveCursor {
  section: number;
  point: number;
}

export interface RosterEntry {
  role: 'host' | 'viewer';

  participantId: string | null;
  name: string | null;
  color: string | null;
}

export interface SessionRecap {
  session_id: string;
  room_code: string;
  status: 'live' | 'ended';
  started_at: string | null;
  ended_at: string | null;
  episode: EpisodeAggregate | null;
}
