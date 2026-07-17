import {
  ChangeDetectionStrategy, Component, DestroyRef, HostListener,
  computed, effect, inject, input, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of, catchError } from 'rxjs';
import { AlDictionaryApiService } from '../../../../shared/services/al-dictionary-api.service';

/**
 * Universal book (source) switcher for the root-centric reader. Given the
 * current root, it lists every classical source that actually has an entry
 * for it (via the /al/lex/v2/roots/:root compare endpoint) and, on pick,
 * navigates to /lexicon/root/:root?book=<slug> — keeping the root, swapping
 * the book. Lives in the shared toolbar so every lexicon shell offers the
 * same switcher from one component.
 */
interface BookOption { slug: string; title_ar: string; author: string; sections: number; }

@Component({
  selector: 'km-book-selector',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-selector.component.html',
  styleUrl: './book-selector.component.scss',
})
export class BookSelectorComponent {
  root        = input.required<string>();
  currentBook = input.required<string>();

  private readonly api        = inject(AlDictionaryApiService);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly open    = signal(false);
  readonly options = signal<BookOption[]>([]);
  private lastRoot = '';

  readonly currentTitle = computed(() =>
    this.options().find(o => o.slug === this.currentBook())?.title_ar ?? '…');

  constructor() {
    // Refetch the availability list whenever the root changes.
    effect(() => {
      const r = this.root();
      if (!r || r === this.lastRoot) return;
      this.lastRoot = r;
      this.api.getV2RootCompare(r).pipe(
        catchError(() => of({ root_norm: r, canonical: null, sources: [] as any[] })),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(c => {
        this.options.set((c.sources ?? [])
          .map(s => ({
            slug: (s as any).source_slug ?? s.slug,
            title_ar: s.title_ar,
            author: s.author,
            sections: (s as any).sections ?? 0,
          }))
          .filter(o => !!o.slug));
      });
    });
  }

  toggle() { this.open.update(v => !v); }

  pick(slug: string) {
    this.open.set(false);
    if (slug === this.currentBook()) return;
    this.router.navigate(['/lexicon/root', this.root()], { queryParams: { book: slug } });
  }

  @HostListener('document:keydown.escape')
  onEsc() { this.open.set(false); }
}
