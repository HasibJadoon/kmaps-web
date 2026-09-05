// The deck contract, v5. Mirrors workers/content/src/schemas/deck.schema.ts and
// KMAPS/DeckFeature/.../Domain/DeckModels.swift. See docs/deck-contract.md.

export const DECK_LAYOUTS = [
  'title', 'definition', 'split', 'transform', 'examples', 'table',
  'shahid', 'proof', 'bayt', 'rule', 'climax',
] as const;

export type DeckLayout = (typeof DECK_LAYOUTS)[number];

/** A layout this build doesn't know must still render, not blank the screen. */
export const DECK_FALLBACK_LAYOUT: DeckLayout = 'examples';

export function asDeckLayout(value: unknown): DeckLayout {
  return DECK_LAYOUTS.includes(value as DeckLayout) ? (value as DeckLayout) : DECK_FALLBACK_LAYOUT;
}

export type DeckAccent = 'warn' | 'gold' | null;

export interface DeckTheme {
  bg?: string; surface?: string; panel?: string;
  ink?: string; ink_soft?: string; muted?: string;
  rubric?: string; gold?: string; gold_bright?: string;
  lapis?: string; verdigris?: string; rule?: string;
  /** The parchment verse card and the ink written on it. */
  paper?: string; paper_ink?: string;
}

export interface DeckVerseRef {
  ref: string;
  kind: string;
  surah: number | null;
  ayah_from: number | null;
  ayah_to: number | null;
  relation: string | null;
  label_ar: string | null;
}

/** A photograph behind the frame. `url` may be gateway-relative (/api/...). */
export interface DeckImage {
  url: string;
  alt: string | null;
}

export interface DeckSlide {
  n: number;
  block_id: string;
  layout: DeckLayout;
  accent: DeckAccent;
  kicker: string | null;
  source: string | null;
  lines_ar: string[];
  lines_en: string[];
  notes_en: string[];
  verse_refs: DeckVerseRef[];
  image: DeckImage | null;
}

export interface DeckCollectionNode {
  collection_id: string;
  title: string;
  title_ar: string | null;
}

export interface DeckCollection extends DeckCollectionNode {
  path: DeckCollectionNode[];
  terms: string[];
}

export interface Deck {
  doc_id: string;
  slug: string;
  contract_version: number | null;
  title: string;
  title_ar: string | null;
  language: string;
  direction: 'rtl' | 'ltr';
  domain: string | null;
  subdomain: string | null;
  slide_count: number;
  duration_min: number | null;
  videos: string[];
  theme: DeckTheme;
  slides: DeckSlide[];
  collection: DeckCollection | null;
  xref_gateway: Record<string, unknown> | null;
}

export interface DeckSummary {
  doc_id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  language: string;
  direction: 'rtl' | 'ltr';
  domain: string | null;
  subdomain: string | null;
  slide_count: number;
  duration_min: number | null;
  theme: DeckTheme;
  updated_at: string | null;
}

/** Language modes, in cycle order. `l` steps through them (contract §5). */
export const DECK_LANG_MODES = ['both', 'ar', 'en'] as const;
export type DeckLangMode = (typeof DECK_LANG_MODES)[number];
export const DECK_LANG_LABEL: Record<DeckLangMode, string> = {
  both: 'AR + EN',
  ar: 'AR only',
  en: 'EN led',
};
