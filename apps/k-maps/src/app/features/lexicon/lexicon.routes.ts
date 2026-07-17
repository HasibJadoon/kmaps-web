import { Routes } from '@angular/router';

export const LEXICON_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./lexicon-home.component').then(m => m.LexiconHomeComponent),
    title: 'المعجم',
  },
  {
    path: 'books',
    loadComponent: () =>
      import('./books/lexicon-books.component').then(m => m.LexiconBooksComponent),
    title: 'المعجم — الكتب',
  },
  {
    // Back-compat: old book-in-path URL → root-centric URL.
    // /lexicon/books/:slug?root=R  →  /lexicon/root/R?book=:slug
    path: 'books/:slug',
    loadComponent: () =>
      import('./root-reader/lexicon-books-redirect.component')
        .then(m => m.LexiconBooksRedirectComponent),
    title: 'المعجم — قراءة',
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./search/lexicon-search.component').then(m => m.LexiconSearchComponent),
    title: 'المعجم — البحث',
  },
  {
    // K-MAPS cross-source synthesis for a root (placeholder shell for now).
    path: 'synthesis/:root',
    loadComponent: () =>
      import('./synthesis/lexicon-synthesis.component').then(m => m.LexiconSynthesisComponent),
    title: 'المعجم — الخلاصة',
  },
  {
    // Root-centric reader. Root is the URL path; the book is passed via
    // ?book=<slug> and switched from the toolbar's book selector. With no
    // ?book this falls back to the morphology root view (root → words grid).
    path: 'root/:root',
    loadComponent: () =>
      import('./root-reader/lexicon-root-reader.component')
        .then(m => m.LexiconRootReaderComponent),
    title: 'Root — K-MAPS',
  },
];
