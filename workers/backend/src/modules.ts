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
  /// Canonical content — the Qurʾān text, the lexicons, the worldview registry — is written by a
  /// reviewer (an admin) only. A signed-in learner reads it; they never edit it.
  adminWrites?: boolean;
  /// The learner's own writes inside an admin-written module: a practice round, a reading session.
  /// Patterns against the path after /api/, like privateGetPaths.
  learnerWritePaths?: RegExp[];
}

/** Whether a module path is closed to a reader without a session. */
export function isPrivatePath(mod: ModuleConfig, remainder: string): boolean {
  return (mod.privateGetPaths ?? []).some((re) => re.test(remainder));
}

export function isAdminRole(role: string | undefined | null): boolean {
  return role === 'admin' || role === 'superadmin';
}

/** Whether a write to this module path needs a reviewer (an admin). */
export function needsAdminWrite(mod: ModuleConfig, method: string, remainder: string): boolean {
  if (!mod.adminWrites || ['GET', 'HEAD', 'OPTIONS'].includes(method)) return false;
  return !(mod.learnerWritePaths ?? []).some((re) => re.test(remainder));
}

export const MODULE_MAP: Record<ModuleKey, ModuleConfig> = {
  qr:   {
    binding: 'QURAN',
    publicGet: true,
    // practice skills, rounds, the class path and its sprints, the listen gate, the stage's words
    privateGetPaths: [/^qr\/practice(\/|\?|$)/, /^qr\/drill(\/|\?|$)/, /^qr\/intake-pipeline(\/|\?|$)/],
    adminWrites: true,
    learnerWritePaths: [/^qr\/practice(\/|\?|$)/],
  },
  // the intake's worldview pipeline is a work queue, not reading: signed in only
  wv:   { binding: 'WORLDVIEW',      publicGet: true, privateGetPaths: [/^wv\/intake-pipeline(\/|\?|$)/],
          adminWrites: true },
  // a reading session is the reader's own record of what they read
  worldview: { binding: 'WORLDVIEW', publicGet: true, privateGetPaths: [/^worldview\/intake-pipeline(\/|\?|$)/],
               adminWrites: true, learnerWritePaths: [/^worldview\/reading-session(\/|\?|$)/] },
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
    publicGetPaths: ['ar/corpus-version', 'ar/atlas/home', 'ar/atlas/room', 'ar/map', 'ar/vocab', 'ar/atlas/collection', 'ar/atlas/search', 'ar/scenes', 'ar/path', 'ar/grammar', 'ar/acq', 'ar/text', 'ar/audio', 'ar/vendor-stream', 'ar/sources', 'ar/disciplines', 'ar/curriculum', 'ar/nodes', 'ar/tracks', 'ar/terms', 'ar/lessons', 'ar/daily/themes', 'ar/daily/domains', 'ar/daily/readings'],
  },
  al:   { binding: 'AR_LINGUISTICS', publicGet: true, adminWrites: true },
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
  // who is signed up, and who is in which workspace, is never a public read
  core: { binding: 'CORE',           publicGet: true,
          privateGetPaths: [/^core\/users(\/|\?|$)/, /^core\/workspaces(\/|\?|$)/] },

  st:     {
    binding: 'STUDIO',
    publicGet: false,
    // The stage's renderer: the slide-drawing scripts and styles Studio loads.
    // Code that every class is drawn with; it holds nothing about anyone.
    publicGetPaths: ['st/overlay'],
  },
  studio: { binding: 'STUDIO',       publicGet: false },
};
