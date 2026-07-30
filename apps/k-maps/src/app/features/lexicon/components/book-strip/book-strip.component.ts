// ─── Book strip ─────────────────────────────────────────────────────────────
//
// Every book that treats the current root, as one row of chips across the top of
// the reader — the desktop counterpart of the native app's `bookStrip`. Picking
// one swaps the book and keeps the root, which is the complement of the root
// stepper (walks roots, keeps the book).
//
// Ordered oldest author first, so reading left to right is reading the tradition
// forward: al-Khalīl, then those who answer him, with Lane last.

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
  /** Whether any shell can actually render this book — see `isOpenable`. */
  openable: boolean;
}

interface StripBook {
  slug: string;
  /** Spine name — the editorial short title, not a truncated full one. */
  label: string;
  fullTitle: string;
  byline: string;
  /** Sections, or blocks where a book has no section rows. */
  sections: number;
  bilingual: boolean;
  openable: boolean;
  /** Author death normalised to CE, purely for ordering. */
  sortYear: number;
}

/** AH → CE, for putting Hijri and Gregorian death dates on one axis. A naive
 *  numeric sort reads Lane (1876 CE) as older than Ibn Manẓūr (711 AH). */
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

  /** Short titles + death dates, which the compare payload doesn't carry. */
  private readonly registry = signal<ReadonlyMap<string, BookMeta>>(new Map());

  private lastRoot = '';

  readonly hasBooks = computed(() => this.books().length > 0);

  constructor() {
    this.sourcesSvc.registry$.pipe(takeUntilDestroyed()).subscribe(reg => {
      this.registry.set(new Map(reg.sources.map(s => [s.slug, {
        short: s.title_short_ar, ah: s.author_death_ah, ce: s.author_death_ce, period: s.period,
        // A book renders only if some shell can read it: a `/read/` composer, or
        // the scholarship endpoint. The K-Maps five-lens synthesis is indexed for
        // roots but has neither, so it used to sit on the strip and open blank.
        openable: COMPOSER_BACKED_SLUGS.has(s.slug) || s.hasScholarship,
      }])));
      // The registry may land after the root did.
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
      // Until the registry lands — or if it failed to load — nothing is known
      // about openability, and showing every book beats showing none.
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
            // Ibn Durayd's بين has no section rows but seven blocks, and the
            // worker builds an article from those, so an entry counts as present
            // on either. Showing only `sections` left such books with a bare chip.
            sections: (s as { sections?: number }).sections
              || (s as { blocks?: number }).blocks || 0,
            bilingual: !!(s as { bilingual?: boolean }).bilingual,
            openable: regLoaded ? (meta?.openable ?? false) : true,
            // Undated authors sort last rather than to year zero.
            sortYear: ah != null ? ahToCe(ah) : (ce ?? Number.MAX_SAFE_INTEGER),
          };
        })
        // Only books that actually hold this root *and* that a reader can open.
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
