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
}

export const MODULE_MAP: Record<ModuleKey, ModuleConfig> = {
  qr:   { binding: 'QURAN',          publicGet: true  },
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
    publicGetPaths: ['ar/acq', 'ar/text', 'ar/audio', 'ar/vendor-stream', 'ar/sources', 'ar/disciplines', 'ar/curriculum', 'ar/nodes', 'ar/tracks', 'ar/terms', 'ar/lessons', 'ar/daily/themes', 'ar/daily/domains'],
  },
  al:   { binding: 'AR_LINGUISTICS', publicGet: true  },
  cm:   {
    binding: 'CONTENT',
    publicGet: false,
    // Lesson media — the photographs deck slides sit on. An <img> cannot carry
    // a token, and a picture of a lamp holds nothing about anyone.
    publicGetPaths: ['cm/assets'],
  },
  core: { binding: 'CORE',           publicGet: true  },

  st:     { binding: 'STUDIO',       publicGet: false },
  studio: { binding: 'STUDIO',       publicGet: false },
};
