import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';

import { DeckService } from '../../data/deck.service';
import type { DeckSummary } from '../../domain/deck.models';

@Component({
  selector: 'km-deck-list',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './deck-list.component.html',
  styleUrl: './deck-list.component.scss',
})
export class DeckListComponent {
  private readonly decks = inject(DeckService);

  private readonly loaded = toSignal(
    this.decks.list().pipe(
      map((decks) => ({ decks, error: null as string | null })),
      catchError(() => of({ decks: [] as DeckSummary[], error: 'Could not load decks.' })),
    ),
    { initialValue: { decks: [] as DeckSummary[], error: null as string | null } },
  );

  protected readonly decksList = computed(() => this.loaded().decks);
  protected readonly error = computed(() => this.loaded().error);

  /** The card wears the deck's own gold, so the list previews the deck. */
  protected accent(deck: DeckSummary): string {
    return deck.theme.gold ?? 'var(--km-gold)';
  }

  protected surface(deck: DeckSummary): string {
    return deck.theme.surface ?? 'var(--km-surface)';
  }
}
