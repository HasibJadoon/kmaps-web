/// What one episode screen is built from. The route gathers it once; each screen takes only what it needs.

import type { Checklist, SeriesPlan } from '../checklist';

export type Reading =
  | { kind: 'qr'; surah: number; surah_name: string | null; from: number; to: number;
      ayahs: Array<{ ayah: number; text: string; en: string | null }>; translation: string | null }
  | { kind: 'wv'; title: string | null; passages: Array<{ id: string; cite: string | null; text: string; en: string | null }> };

export interface Participant { id: string; display_name: string; color: string | null; role: string | null; seq: number }
export interface Section { heading: string | null; type?: string | null; points: Array<{ text: string | null; speaker_ref: string | null }> }

export interface EpisodeCtx {
  id: string;
  title: string;
  session_no: number | null;
  series_title: string | null;
  meta: Record<string, unknown>;
  plan: SeriesPlan;
  checklist: Checklist;
  /// Every checklist of the series, for what has been produced so far.
  siblings: Checklist[];
  /// Every episode of the series with its number and planner state, for the episode tiles.
  series_order: Array<{ id: string; session_no: number | null; state: Checklist['state'] | null; source_ref?: string | null;
    round?: number | null; cluster?: number | null; angle?: string | null; toc?: string | null }>;
  /// The series row's meta: the curriculum's labels (rounds, clusters, angles), the guides and the depth lists.
  series_meta?: Record<string, unknown>;
  participants: Participant[];
  sections: Section[];
  slides: { title: string; deck: string } | null;
  /// The selected text; loaded only for the screens that show it (never for the hub).
  reading: Reading | null;
  now: Date;
}
