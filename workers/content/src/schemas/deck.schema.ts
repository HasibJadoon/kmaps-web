// The deck contract, contract_version 5. See docs/deck-contract.md.
//
// These types are the wire shape both clients decode, so they are the closest
// thing the system has to a shared interface: the Angular models in
// apps/k-maps/src/app/features/deck/domain/deck.models.ts and the Swift structs
// in KMAPS/DeckFeature/Sources/DeckFeature/Domain/DeckModels.swift mirror them
// field for field. Change one, change all three.

/** The eleven layouts, closed set. Anything else falls back to `examples`. */
export const DECK_LAYOUTS = [
  'title', 'definition', 'split', 'transform', 'examples', 'table',
  'shahid', 'proof', 'bayt', 'rule', 'climax',
] as const;

export type DeckLayout = (typeof DECK_LAYOUTS)[number];

export const DECK_FALLBACK_LAYOUT: DeckLayout = 'examples';

export function asDeckLayout(value: unknown): DeckLayout {
  return DECK_LAYOUTS.includes(value as DeckLayout) ? (value as DeckLayout) : DECK_FALLBACK_LAYOUT;
}

/** Slide accents tint the first line; null is the common case. */
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
  /** The slide's Arabic lines, in order. */
  lines_ar: string[];
  /** Glosses, index-parallel with lines_ar. May be shorter; never longer. */
  lines_en: string[];
  /** Presenter notes. Inline **strong** / *em* only. */
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

/** What the list endpoint returns — enough to draw a card, no slide bodies. */
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
