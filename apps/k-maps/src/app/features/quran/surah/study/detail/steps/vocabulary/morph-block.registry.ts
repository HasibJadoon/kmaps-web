// Closed layer registry — the layer vocabulary is fixed, so this map is a known set.
// `block.type` selects the component exactly as `block.icon` selects the glyph.
// Heavy SVG/ceremonial layers are lazy `() => import()`; the rest are eager.
import { Type } from '@angular/core';
import { MorphBlockBody } from './morph-block.types';

import { RootDnaBlock } from './blocks/root-dna/root-dna-block.component';
import { SarfBlock } from './blocks/sarf/sarf-block.component';
import { DerivationsBlock } from './blocks/derivations/derivations-block.component';
import { IrabBlock } from './blocks/irab/irab-block.component';
import { LexiconBlock } from './blocks/lexicon/lexicon-block.component';
import { BalaghaBlock } from './blocks/balagha/balagha-block.component';
import { MetaphorBlock } from './blocks/metaphor/metaphor-block.component';
import { KindredBlock } from './blocks/kindred/kindred-block.component';
import { TranslatorsBlock } from './blocks/translators/translators-block.component';
import { OccurrencesBlock } from './blocks/occurrences/occurrences-block.component';
import { DevelopmentBlock } from './blocks/development/development-block.component';
import { TafsirBlock } from './blocks/tafsir/tafsir-block.component';
import { AttestationsBlock } from './blocks/attestations/attestations-block.component';

export type RegistryEntry =
  | { cmp: Type<MorphBlockBody> }
  | { load: () => Promise<Type<MorphBlockBody>> };

export const MORPH_BLOCK_REGISTRY: Record<string, RegistryEntry> = {
  root_dna:     { cmp: RootDnaBlock },
  sarf:         { cmp: SarfBlock },
  derivations:  { cmp: DerivationsBlock },
  irab:         { cmp: IrabBlock },
  lexicon:      { cmp: LexiconBlock },
  balagha:      { cmp: BalaghaBlock },
  metaphor:     { cmp: MetaphorBlock },
  kindred:      { cmp: KindredBlock },
  translators:  { cmp: TranslatorsBlock },
  occurrences:  { cmp: OccurrencesBlock },
  development:  { cmp: DevelopmentBlock },
  tafsir:       { cmp: TafsirBlock },
  attestations: { cmp: AttestationsBlock },
  // heavy → lazy-loaded on demand
  synthesis:     { load: () => import('./blocks/synthesis/synthesis-block.component').then(m => m.SynthesisBlock) },
  constellation: { load: () => import('./blocks/constellation/constellation-block.component').then(m => m.ConstellationBlock) },
  usage_map:     { load: () => import('./blocks/usage-map/usage-map-block.component').then(m => m.UsageMapBlock) },
  master_story:  { load: () => import('./blocks/master-story/master-story-block.component').then(m => m.MasterStoryBlock) },
};
