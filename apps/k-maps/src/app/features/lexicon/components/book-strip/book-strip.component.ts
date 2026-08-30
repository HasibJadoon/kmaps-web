import {
  ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of, catchError } from 'rxjs';
import { AlDictionaryApiService } from '../../../../shared/services/al-dictionary-api.service';
import {
  COMPOSER_BACKED_SLUGS, LexiconSourcesService, deathLabelAr,
} from '../../data/lexicon-sources.service';

interface BookMeta {
  short: string;
  ah: number | null;
  ce: number | null;
  period: string | null;

  openable: boolean;
}

interface StripBook {
  slug: string;

  label: string;
  fullTitle: string;
  byline: string;

  sections: number;
  bilingual: boolean;
  openable: boolean;

  sortYear: number;
}

function ahToCe(ah: number): number { return Math.round(ah * 0.970224 + 621.57); }

@Component({
  selector: 'km-book-strip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './book-strip.component.html',
  styleUrl: './book-strip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookStripComponent {
  readonly root        = input.required<string>();
  readonly currentBook = input.required<string>();

  private readonly api        = inject(AlDictionaryApiService);
  private readonly sourcesSvc = inject(LexiconSourcesService);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly books   = signal<StripBook[]>([]);
  readonly loading = signal(false);

  private readonly registry = signal<ReadonlyMap<string, BookMeta>>(new Map());

  private lastRoot = '';

  readonly hasBooks = computed(() => this.books().length > 0);

  constructor() {
    this.sourcesSvc.registry$.pipe(takeUntilDestroyed()).subscribe(reg => {
      this.registry.set(new Map(reg.sources.map(s => [s.slug, {
        short: s.title_short_ar, ah: s.author_death_ah, ce: s.author_death_ce, period: s.period,

        openable: COMPOSER_BACKED_SLUGS.has(s.slug) || s.hasScholarship,
      }])));

      if (this.lastRoot) this.load(this.lastRoot);
    });

    effect(() => {
      const r = this.root();
      if (!r || r === this.lastRoot) return;
      this.lastRoot = r;
      this.load(r);
    });
  }

  private load(root: string) {
    this.loading.set(true);
    this.api.getV2RootCompare(root).pipe(
      catchError(() => of({ root_norm: root, canonical: null, sources: [] as never[] })),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(c => {
      const reg = this.registry();

      const regLoaded = reg.size > 0;

      const books = (c.sources ?? [])
        .map(s => {
          const slug = (s as { source_slug?: string; slug?: string }).source_slug
            ?? (s as { slug?: string }).slug ?? '';
          const meta = reg.get(slug);
          const ah = meta?.ah ?? (s as { author_death_ah?: number | null }).author_death_ah ?? null;
          const ce = meta?.ce ?? (s as { author_death_ce?: number | null }).author_death_ce ?? null;
          return {
            slug,
            label: meta?.short || s.title_ar || slug,
            fullTitle: s.title_ar || slug,
            byline: [s.author, deathLabelAr({
              author_death_ah: ah, author_death_ce: ce, period: meta?.period ?? s.period,
            })].filter(Boolean).join(' · '),

            sections: (s as { sections?: number }).sections
              || (s as { blocks?: number }).blocks || 0,
            bilingual: !!(s as { bilingual?: boolean }).bilingual,
            openable: regLoaded ? (meta?.openable ?? false) : true,

            sortYear: ah != null ? ahToCe(ah) : (ce ?? Number.MAX_SAFE_INTEGER),
          };
        })

        .filter(b => !!b.slug && b.sections > 0 && b.openable)
        .sort((a, b) => a.sortYear - b.sortYear);

      this.books.set(books);
      this.loading.set(false);
    });
  }

  pick(slug: string) {
    if (slug === this.currentBook()) return;
    this.router.navigate(['/lexicon/root', this.root()], { queryParams: { book: slug } });
  }
}
