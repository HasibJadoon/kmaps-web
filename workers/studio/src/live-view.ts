import type { EpisodeAggregate } from './repositories/episode.repo';
import { classBeats } from './class-beats';

/// What a live room plays from an episode.
///
/// A conversational episode (Do Zāwiya) is run from its brainstorm: ideas are
/// `discussion` sections and every point in them is a card someone holds. The
/// same episode can also carry the class's scene-per-step sections, folded
/// away in the app. Those must not reach the room — their points have no
/// speaker, so each would land in *everyone's* hand as an open card and the
/// cursor would walk through scenes nobody is presenting. So when an episode
/// has any discussion section, the room holds only those; otherwise it holds
/// everything, as before.
export function liveView<T extends EpisodeAggregate | null>(episode: T): T {
  if (!episode) return episode;
  const talk = episode.sections.filter((s) => s.type === 'discussion');
  const sections = talk.length === 0 ? episode.sections : talk;
  // Every point carries its beats (who speaks each one), so the iPads at a
  // Zāwiya Class and the take log count the same steps — see class-beats.
  return {
    ...episode,
    sections: sections.map((s) => ({
      ...s,
      points: s.points.map((p) => ({ ...p, beats: classBeats(p.overlay_json) })),
    })),
  } as T;
}
