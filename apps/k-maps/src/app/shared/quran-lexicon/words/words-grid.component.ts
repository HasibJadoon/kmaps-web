import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges,
  inject, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { WordGridService } from '../word-grid.service';
import { WordGridCard, WordGridScope } from '../word-grid.types';

/**
 * Shared, lightweight words grid — one component for every scope
 * (Root, Surah, Passage/Morphology, Lexicon). Cards use the passage-card
 * (unit-card) styling and carry only light data; the heavy morph detail is
 * loaded by the Word deep-dive when a card is opened.
 *
 * Reusable: set [scope] + its params, listen to (open) for the selected word.
 */
@Component({
  selector: 'km-words-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './words-grid.component.html',
  styleUrl: './words-grid.component.scss',
})
export class WordsGridComponent implements OnChanges {
  private readonly svc = inject(WordGridService);

  @Input({ required: true }) scope!: WordGridScope;
  @Input() root?: string;
  @Input() surahId?: number;
  @Input() ayahFrom?: number;
  @Input() ayahTo?: number;

  /** Emits the chosen card so the host can route to the Word deep-dive. */
  @Output() open = new EventEmitter<WordGridCard>();

  readonly words = signal<WordGridCard[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnChanges(_c: SimpleChanges): void {
    if (!this.scope) return;
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.svc.fetch({
      scope: this.scope,
      root: this.root,
      surahId: this.surahId,
      ayahFrom: this.ayahFrom,
      ayahTo: this.ayahTo,
    }).subscribe({
      next: (res) => { this.words.set(res.words ?? []); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load words'); this.loading.set(false); },
    });
  }

  trackId = (_: number, w: WordGridCard) => w.id;
}
