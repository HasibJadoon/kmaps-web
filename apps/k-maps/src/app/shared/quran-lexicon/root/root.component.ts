import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { WordsGridComponent } from '../words/words-grid.component';
import { WordGridCard } from '../word-grid.types';

/**
 * Root view — one root and its many words as a lightweight grid.
 * Shared: reached from the Lexicon, the Quran researcher Lexicon, and Surah.
 * Opening a card routes to the Word deep-dive.
 */
@Component({
  selector: 'km-root',
  standalone: true,
  imports: [WordsGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './root.component.html',
  styleUrl: './root.component.scss',
})
export class RootComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly root = signal<string>(this.route.snapshot.paramMap.get('root') ?? '');

  openWord(w: WordGridCard): void {
    // Word deep-dive (heavy) — reuse the morphology word route (no passage needed).
    this.router.navigate(['/quran/surahs', w.surah, 'morphology', 'word', w.ayah, w.word_index]);
  }
}
