import { Routes } from '@angular/router';

export const LINGUISTICS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./hub/linguistics-hub.component').then(m => m.LinguisticsHubComponent),
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./search/linguistics-search.component').then(m => m.LinguisticsSearchComponent),
  },
  {
    path: 'book/:slug',
    loadComponent: () =>
      import('./book-reader/linguistics-book-reader.component').then(m => m.LinguisticsBookReaderComponent),
  },
];
