import type { BackendEnv } from './env';

export type ModuleKey =
  | 'qr' | 'wv' | 'worldview' | 'ar' | 'al' | 'cm' | 'core'
  | 'st' | 'studio';

export interface ModuleConfig {
  binding:   keyof Pick<BackendEnv, 'QURAN' | 'WORLDVIEW' | 'ARABIC' | 'AR_LINGUISTICS' | 'CONTENT' | 'STUDIO' | 'CORE'>;
  publicGet: boolean;
  /// Paths inside a gated module that are readable without a session. Only for
  /// registries — reference data that names books and topics and holds nothing
  /// about anyone. Everything else on the module stays behind the token.
  publicGetPaths?: string[];
  /// Paths that are never readable without a session, whatever the module's public reads say:
  /// every drill is a user's. A drill is dealt to someone, graded for someone and filed to their
  /// review, so the routes that deal them answer only to a signed-in reader. Patterns, matched
  /// against the path after /api/ (no leading slash).
  privateGetPaths?: RegExp[];
}

/** Whether a module path is closed to a reader without a session. */
export function isPrivatePath(mod: ModuleConfig, remainder: string): boolean {
  return (mod.privateGetPaths ?? []).some((re) => re.test(remainder));
}

export const MODULE_MAP: Record<ModuleKey, ModuleConfig> = {
  qr:   {
    binding: 'QURAN',
    publicGet: true,
    // practice skills, rounds, the class path and its sprints, the listen gate, the stage's words
    privateGetPaths: [/^qr\/practice(\/|\?|$)/, /^qr\/drill(\/|\?|$)/],
  },
  wv:   { binding: 'WORLDVIEW',      publicGet: true  },
  worldview: { binding: 'WORLDVIEW', publicGet: true  },
  ar:   {
    binding: 'ARABIC',
    publicGet: false,
    // The bibliography of the classical books and the syllabus read out of
    // them: a table of contents, not a study record. The learner's own side of
    // this module — containers, exercises, SRS, vocabulary, progress — is
    // untouched and still requires a token.
    // 'ar/daily/themes' and not 'ar/daily': the themes are the same content for
    // everyone and readable unsigned, while ar/daily/today and ar/daily/progress
    // are that reader's own and must stay behind the token.
    // 'ar/vendor-stream' is public only in the sense that no token reaches it —
    // a player cannot send one. It refuses everything without a signature the
    // arabic worker minted for that one key, behind the token, an hour ago.
    // Its sibling 'ar/vendor-audio', which mints them, is deliberately not here.
    // 'ar/corpus-version' is the cache-version beacon: two timestamps, nothing
    // about anyone; the app reads it before it has a session.
    // Drills are the reader's own: practice rounds, a scene's drill, a unit's check, placement.
    privateGetPaths: [/^ar\/practice(\/|\?|$)/, /^ar\/drill(\/|\?|$)/, /^ar\/scenes\/[^/?]+\/[^/?]+\/practice(\/|\?|$)/,
                      /^ar\/path\/(placement|unit\/[^/?]+\/check)(\/|\?|$)/],
    publicGetPaths: ['ar/corpus-version', 'ar/atlas/home', 'ar/atlas/room', 'ar/atlas/collection', 'ar/atlas/search', 'ar/scenes', 'ar/path', 'ar/grammar', 'ar/acq', 'ar/text', 'ar/audio', 'ar/vendor-stream', 'ar/sources', 'ar/disciplines', 'ar/curriculum', 'ar/nodes', 'ar/tracks', 'ar/terms', 'ar/lessons', 'ar/daily/themes', 'ar/daily/domains'],
  },
  al:   { binding: 'AR_LINGUISTICS', publicGet: true  },
  cm:   {
    binding: 'CONTENT',
    publicGet: false,
    // Lesson media — the photographs deck slides sit on. An <img> cannot carry
    // a token, and a picture of a lamp holds nothing about anyone.
    // The template registry — the shape a document is authored in, and the
    // worked entries that show it filled in. A table of contents for
    // authors; it names books and fields and holds nothing about anyone.
    publicGetPaths: ['cm/assets', 'cm/templates'],
  },
  core: { binding: 'CORE',           publicGet: true  },

  st:     { binding: 'STUDIO',       publicGet: false },
  studio: { binding: 'STUDIO',       publicGet: false },
};
