import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import {
  AlDictionaryApiService, LexV2SourceMeta, ScholarshipSource,
} from '../../../shared/services/al-dictionary-api.service';

export type LexSourceKind = 'mufradat' | 'lane' | 'classical' | 'scholarship';

export const MUFRADAT_SOURCE_SLUG = 'raghib_mufradat';
export const LANE_SOURCE_SLUG     = 'lane_lexicon';

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

export const CLASSICAL_SHELL_SLUGS = new Set<string>(
  [...COMPOSER_BACKED_SLUGS].filter(
    s => s !== LANE_SOURCE_SLUG && s !== MUFRADAT_SOURCE_SLUG));

export interface LexSourceEntry {
  slug: string;
  title_ar: string;

  title_short_ar: string;
  title_en: string | null;
  author: string | null;
  period: string | null;
  bilingual: boolean;
  roots: number;
  author_death_ah: number | null;
  author_death_ce: number | null;
  kind: LexSourceKind;

  hasScholarship: boolean;
}

export interface LexSourceRegistry {
  sources: LexSourceEntry[];
  bySlug: Map<string, LexSourceEntry>;

  resolve: (slug: string | null | undefined, title?: string | null) => string | null;
}

export function eraLabelAr(period: string | null | undefined): string {
  const p = (period ?? '').toLowerCase().trim();
  if (!p) return '';
  if (p.includes('early') && p.includes('classical')) return 'تراثي مبكر';
  if (p.includes('late')  && p.includes('classical')) return 'تراثي متأخر';
  if (p.includes('classical'))    return 'تراثي';
  if (p.includes('contemporary')) return 'معاصر';
  if (p.includes('modern'))       return 'حديث';

  if (/^\d{4}$/.test(p))          return 'حديث';
  return period ?? '';
}

function sourceKey(value: string | null | undefined): string {
  let s = (value ?? '').toLowerCase().trim();
  if (!s) return '';

  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʿʾ'’`]/g, '');
  for (const p of ['saaid_', 'ketabonline_', 'thahabi_', 'qomra_']) {
    if (s.startsWith(p)) { s = s.slice(p.length); break; }
  }
  return s.split(/[^a-z0-9]+/).filter(part => part && part !== 'al').join('');
}

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

    const byKey = new Map<string, string>();
    for (const s of sources) {
      for (const candidate of [s.slug, s.title_en, s.title_short_ar, s.title_ar]) {
        const k = sourceKey(candidate);
        if (k && !byKey.has(k)) byKey.set(k, s.slug);
      }
    }

    const resolve = (slug: string | null | undefined, title?: string | null): string | null => {
      if (slug && bySlug.has(slug)) return slug;
      for (const value of [slug, title]) {
        const k = sourceKey(value);
        if (!k) continue;
        const exact = byKey.get(k);
        if (exact) return exact;

        for (const [candidate, target] of byKey) {
          if (candidate.length >= 6 && (candidate.endsWith(k) || k.endsWith(candidate))) return target;
        }
      }
      return null;
    };

    return { sources, bySlug, resolve };
  }

  private kindOf(slug: string, _roots: number, _scholarshipSlugs: Set<string>): LexSourceKind {
    if (slug === MUFRADAT_SOURCE_SLUG) return 'mufradat';
    if (slug === LANE_SOURCE_SLUG)     return 'lane';
    return COMPOSER_BACKED_SLUGS.has(slug) ? 'classical' : 'scholarship';
  }
}
