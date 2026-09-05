import { Routes } from '@angular/router';

export const DECK_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/deck-list/deck-list.component').then((m) => m.DeckListComponent),
    title: 'Decks — K-MAPS',
  },
  {
    path: ':slug',
    loadComponent: () =>
      import('./pages/deck-player/deck-player.component').then((m) => m.DeckPlayerComponent),
    title: 'Deck — K-MAPS',
  },
];
