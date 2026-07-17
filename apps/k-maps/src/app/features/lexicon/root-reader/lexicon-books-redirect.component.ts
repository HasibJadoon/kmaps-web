import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, catchError } from 'rxjs';
import { AlDictionaryApiService } from '../../../shared/services/al-dictionary-api.service';

/**
 * Back-compat + entry redirect for book URLs. The reader is now root-centric
 * (/lexicon/root/:root?book=<slug>), but the library still links to a book
 * without a root (/lexicon/books/:slug), and old bookmarks may carry ?root.
 *
 *   /lexicon/books/:slug?root=R  →  /lexicon/root/R?book=:slug
 *   /lexicon/books/:slug         →  resolve the book's first root, then above
 */
@Component({
  selector: 'km-lexicon-books-redirect',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class LexiconBooksRedirectComponent {
  constructor() {
    const route  = inject(ActivatedRoute);
    const router = inject(Router);
    const api    = inject(AlDictionaryApiService);

    const slug = route.snapshot.paramMap.get('slug') ?? '';
    const root = route.snapshot.queryParamMap.get('root') ?? '';

    if (!slug) { router.navigate(['/lexicon/books'], { replaceUrl: true }); return; }

    if (root) {
      router.navigate(['/lexicon/root', root], { queryParams: { book: slug }, replaceUrl: true });
      return;
    }

    // No root given — jump to the book's first root so the reader has an entry.
    api.getV2Roots({ source: slug, limit: 1 }).pipe(
      catchError(() => of({ rows: [], total: 0, page: 1, limit: 0, has_more: false })),
    ).subscribe(r => {
      const first = r.rows[0]?.root_norm;
      if (first) {
        router.navigate(['/lexicon/root', first], { queryParams: { book: slug }, replaceUrl: true });
      } else {
        router.navigate(['/lexicon/books'], { replaceUrl: true });
      }
    });
  }
}
