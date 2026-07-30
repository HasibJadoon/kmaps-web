// ─── Lexicon source registry ────────────────────────────────────────────────
//
// One cached read of `/lex/v2/sources` (plus the scholarship shelf), shared by
// every lexicon surface. Mirrors the native app's `LexLibraryModel`: the shelf
// is loaded once and every screen below reads books out of it.
//
// This replaces the hardcoded `CLASSICAL_LEXICON_SLUGS` sets that had drifted
// into three copies. What counts as a readable book is a property of the index,
// not of a component — a book seeded on the backend should open without a
// front-end edit, and previously anything unlisted fell through to the
// scholarship shell and rendered a blank page.

import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import {
  AlDictionaryApiService, LexV2SourceMeta, ScholarshipSource,
} from '../../../shared/services/al-dictionary-api.service';

/** Which shell renders a book. */
export type LexSourceKind = 'mufradat' | 'lane' | 'classical' | 'scholarship';

/** Books with a bespoke renderer, because their data is shaped differently:
 *  Mufradat has its own composer; Lane is bilingual, verb-form-keyed XML. */
export const MUFRADAT_SOURCE_SLUG = 'raghib_mufradat';
export const LANE_SOURCE_SLUG     = 'lane_lexicon';

/**
 * Sources the backend has registered a `/lex/v2/read/<slug>` composer for.
 *
 * This cannot be derived from `/lex/v2/sources` — composer registration lives in
 * the worker's SOURCE_CONFIGS and is invisible to the index. A slug missing here
 * answers "Route not found" on `/read/`, while a registered book with no entry
 * for the root answers "entry not found in <book>". Sinai's key terms and the
 * K-Maps five-lens synthesis are indexed but have no composer, so they render
 * through the scholarship shell instead.
 *
 * Adding a slug the backend has registered is all it takes to make that book
 * readable — which is the reason this list is in one place rather than the three
 * copies it had drifted into.
 */
export const COMPOSER_BACKED_SLUGS = new Set<string>([
  MUFRADAT_SOURCE_SLUG,
  LANE_SOURCE_SLUG,
  'ibn_manzur_lisan_arab',
  'jawhari_sihah',
  'khalil_kitab_ayn',
  'maqayis_lugha',
  'ubab_zakhir',
  'zabidi_taj_arus',
  'fayyumi_misbah_munir',
  'ibn_durayd_jamharat_lugha',
  'qamus_muhit',
]);

/**
 * The subset the *classical* shell renders — composer-backed minus the two books
 * that have their own shell. Kept separate because the root dispatcher tests
 * classical before Lane, so folding Lane in here routes it to the wrong reader:
 * it renders, but against a payload shaped for a different composer, which
 * surfaces as a raw `["ك","ت","ب"]` headword and Arabic-only stats on a
 * bilingual book.
 */
export const CLASSICAL_SHELL_SLUGS = new Set<string>(
  [...COMPOSER_BACKED_SLUGS].filter(
    s => s !== LANE_SOURCE_SLUG && s !== MUFRADAT_SOURCE_SLUG));

export interface LexSourceEntry {
  slug: string;
  title_ar: string;
  /** The spine name, seeded editorially in `title_short_ar` — not something a
   *  client can derive by truncating the full title. Falls back to it anyway. */
  title_short_ar: string;
  title_en: string | null;
  author: string | null;
  period: string | null;
  bilingual: boolean;
  roots: number;
  author_death_ah: number | null;
  author_death_ce: number | null;
  kind: LexSourceKind;
  /** True when the scholarship shelf also carries this slug. */
  hasScholarship: boolean;
}

export interface LexSourceRegistry {
  sources: LexSourceEntry[];
  bySlug: Map<string, LexSourceEntry>;
  /**
   * Resolve a book named the way some *other* surface names it — a display-layer
   * slug, or just a title — onto the reader's own slug. Returns null when nothing
   * matches, so a caller can hide the link instead of routing somewhere empty.
   */
  resolve: (slug: string | null | undefined, title?: string | null) => string | null;
}

/**
 * Machine period → era label, in native Arabic rather than the «كلاسيكي»
 * loanword the UI used to print. Matched on substrings because the column holds
 * free-ish text: `classical`, `early_classical`, `late_classical`,
 * `contemporary`, but also `2023` and `modern / 19th century`, which used to
 * reach the shelf as raw machine values.
 */
export function eraLabelAr(period: string | null | undefined): string {
  const p = (period ?? '').toLowerCase().trim();
  if (!p) return '';
  if (p.includes('early') && p.includes('classical')) return 'تراثي مبكر';
  if (p.includes('late')  && p.includes('classical')) return 'تراثي متأخر';
  if (p.includes('classical'))    return 'تراثي';
  if (p.includes('contemporary')) return 'معاصر';
  if (p.includes('modern'))       return 'حديث';
  // A bare year (Sinai's «2023») is a modern reading, not an unlabelled era.
  if (/^\d{4}$/.test(p))          return 'حديث';
  return period ?? '';
}

/**
 * Reduce a slug or a transliterated title to a comparison key.
 *
 * The Qurʾān worker's display layer names books by an origin-prefixed slug
 * (`ketabonline_al_jawhari_al_sihah`) while the lexicon index names the same book
 * `jawhari_sihah`, and three books — al-Qāmūs, al-ʿUbāb, Jamharat — carry no slug
 * at all there, only a title. Dropping the origin prefix, the `al` article, the
 * transliteration diacritics and every separator collapses both spellings, and a
 * title, onto one key: `jawharisihah`, `qamusmuhit`, `jamharatlugha`.
 */
function sourceKey(value: string | null | undefined): string {
  let s = (value ?? '').toLowerCase().trim();
  if (!s) return '';
  // Strip transliteration marks (ā ī ū ḥ ṣ ṭ ẓ ḍ) and the ʿayn/hamza glyphs.
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʿʾ'’`]/g, '');
  for (const p of ['saaid_', 'ketabonline_', 'thahabi_', 'qomra_']) {
    if (s.startsWith(p)) { s = s.slice(p.length); break; }
  }
  return s.split(/[^a-z0-9]+/).filter(part => part && part !== 'al').join('');
}

/** «ت 502 هـ» for Hijri authors, «ت 1876 م» for CE-dated ones, else the era. */
export function deathLabelAr(s: {
  author_death_ah?: number | null;
  author_death_ce?: number | null;
  period?: string | null;
}): string {
  if (s.author_death_ah) return `ت ${s.author_death_ah} هـ`;
  if (s.author_death_ce) return `ت ${s.author_death_ce} م`;
  return eraLabelAr(s.period);
}

@Injectable({ providedIn: 'root' })
export class LexiconSourcesService {
  private readonly api = inject(AlDictionaryApiService);

  /** Loaded once per app session and replayed to every later subscriber. */
  readonly registry$: Observable<LexSourceRegistry> = forkJoin({
    lex: this.api.getV2Sources().pipe(
      catchError(() => of({ sources: [] as LexV2SourceMeta[], total: 0 })),
    ),
    sch: this.api.getScholarshipSources().pipe(
      catchError(() => of({ sources: [] as ScholarshipSource[], total: 0 })),
    ),
  }).pipe(
    map(({ lex, sch }) => this.build(lex.sources ?? [], sch.sources ?? [])),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  private build(lex: LexV2SourceMeta[], sch: ScholarshipSource[]): LexSourceRegistry {
    const scholarshipSlugs = new Set(
      sch.map(s => s.slug).filter((s): s is string => !!s));

    const sources: LexSourceEntry[] = lex.map(s => ({
      slug: s.slug,
      title_ar: s.title_ar,
      title_short_ar: (s as { title_short_ar?: string }).title_short_ar || s.title_ar,
      title_en: s.title_en ?? null,
      author: s.author ?? null,
      period: s.period ?? null,
      bilingual: !!s.bilingual,
      roots: s.roots ?? 0,
      author_death_ah: s.author_death_ah ?? null,
      author_death_ce: s.author_death_ce ?? null,
      hasScholarship: scholarshipSlugs.has(s.slug),
      kind: this.kindOf(s.slug, s.roots ?? 0, scholarshipSlugs),
    }));

    // Scholarship-only shelves (e.g. al-Jallad) never appear on /lex/v2/sources,
    // so they are appended rather than dropped off the library.
    for (const s of sch) {
      if (!s.slug || sources.some(x => x.slug === s.slug)) continue;
      sources.push({
        slug: s.slug,
        title_ar: (s as { title_ar?: string }).title_ar ?? s.slug,
        title_short_ar: (s as { title_ar?: string }).title_ar ?? s.slug,
        title_en: (s as { title_en?: string }).title_en ?? null,
        author: (s as { author?: string }).author ?? null,
        period: (s as { period?: string }).period ?? null,
        bilingual: false,
        roots: 0,
        author_death_ah: null,
        author_death_ce: null,
        hasScholarship: true,
        kind: 'scholarship',
      });
    }

    const bySlug = new Map(sources.map(s => [s.slug, s]));

    // Comparison keys for every real book, from its slug and both its titles, so a
    // title-only reference resolves as well as a slug does.
    const byKey = new Map<string, string>();
    for (const s of sources) {
      for (const candidate of [s.slug, s.title_en, s.title_short_ar, s.title_ar]) {
        const k = sourceKey(candidate);
        if (k && !byKey.has(k)) byKey.set(k, s.slug);
      }
    }

    const resolve = (slug: string | null | undefined, title?: string | null): string | null => {
      if (slug && bySlug.has(slug)) return slug;                 // already ours
      for (const value of [slug, title]) {
        const k = sourceKey(value);
        if (!k) continue;
        const exact = byKey.get(k);
        if (exact) return exact;
        // «Jamharat al-Lugha» is filed under `ibn_durayd_jamharat_lugha`, so the
        // title is a suffix of the slug rather than equal to it.
        for (const [candidate, target] of byKey) {
          if (candidate.length >= 6 && (candidate.endsWith(k) || k.endsWith(candidate))) return target;
        }
      }
      return null;
    };

    return { sources, bySlug, resolve };
  }

  /**
   * Which shell a book opens in. Mufradat and Lane have their own; every other
   * composer-backed book renders through the classical shell; anything without a
   * composer falls to scholarship, which reads `/al/scholarship/…` instead.
   */
  private kindOf(slug: string, _roots: number, _scholarshipSlugs: Set<string>): LexSourceKind {
    if (slug === MUFRADAT_SOURCE_SLUG) return 'mufradat';
    if (slug === LANE_SOURCE_SLUG)     return 'lane';
    return COMPOSER_BACKED_SLUGS.has(slug) ? 'classical' : 'scholarship';
  }
}
