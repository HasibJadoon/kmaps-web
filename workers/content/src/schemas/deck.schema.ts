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
  /**
   * A motion graphic that replaces the slide's body (contract §3b): `kind`
   * names the renderer, the rest is that graphic's data. A client that does
   * not know the kind renders the slide's layout as usual.
   */
  graphic: DeckGraphic | null;
  /** The sources the slide rests on, each a link that opens the original with the cited words marked
   *  (com.kmaps.app://tafsir/…, irab/…, lexicon/…, quran/…). */
  sources: Array<{ label: string; url: string }>;
}

export interface DeckGraphic {
  kind: string;
  [key: string]: unknown;
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

/**
 * A folder in the deck library. Roots come from `cm_collections` rather than
 * from the decks themselves, so a folder can exist — and be shown — before
 * anything has been filed into it.
 */
export interface DeckFolder {
  collection_id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  deck_count: number;
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
  /** The deck's pace from its data; null plays at the contract's §6 timing. */
  motion: { speed: number } | null;
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
  /**
   * The folder the deck belongs in. The list needs it to group decks, and the
   * deck already declares it in its contract, so the clients group by what the
   * deck says rather than by inferring a folder from `domain`.
   */
  collection: DeckCollection | null;
}
