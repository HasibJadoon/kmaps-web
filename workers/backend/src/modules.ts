import type { BackendEnv } from './env';

export type ModuleKey =
  | 'qr' | 'wv' | 'worldview' | 'ar' | 'al' | 'cm' | 'core'
  | 'st' | 'studio';

export interface ModuleConfig {
  binding:   keyof Pick<BackendEnv, 'QURAN' | 'WORLDVIEW' | 'ARABIC' | 'AR_LINGUISTICS' | 'CONTENT' | 'STUDIO' | 'CORE'>;
  publicGet: boolean;
}

export const MODULE_MAP: Record<ModuleKey, ModuleConfig> = {
  qr:   { binding: 'QURAN',          publicGet: true  },
  wv:   { binding: 'WORLDVIEW',      publicGet: true  },
  worldview: { binding: 'WORLDVIEW', publicGet: true  },
  ar:   { binding: 'ARABIC',         publicGet: false },
  al:   { binding: 'AR_LINGUISTICS', publicGet: true  },
  cm:   { binding: 'CONTENT',        publicGet: false },
  core: { binding: 'CORE',           publicGet: true  },

  st:     { binding: 'STUDIO',       publicGet: false },
  studio: { binding: 'STUDIO',       publicGet: false },
};
