import { Routes } from '@angular/router';

export const LEXICON_ROUTES: Routes = [
  {

    path: '',
    loadComponent: () =>
      import('./hub/lexicon-hub.component').then(m => m.LexiconHubComponent),
    title: 'Lexicon — K-MAPS',
  },
  {

    path: 'library',
    loadComponent: () =>
      import('./lexicon-home.component').then(m => m.LexiconHomeComponent),
    title: 'المعجم',
  },
  {

    path: 'kmaps',
    loadComponent: () =>
      import('./hub/lexicon-workflow-placeholder.component')
        .then(m => m.LexiconWorkflowPlaceholderComponent),
    data: {
      eyebrow: 'Synthesis',
      title: 'K-Maps — Synthesized Roots',
      note: 'Every root whose cross-source synthesis is complete will list here.',
    },
    title: 'K-Maps — Synthesized Roots',
  },
  {

    path: 'workflow/display',
    loadComponent: () =>
      import('./hub/lexicon-workflow-placeholder.component')
        .then(m => m.LexiconWorkflowPlaceholderComponent),
    data: {
      eyebrow: 'Workflow · Sūra 44',
      title: 'Fix Display',
      note: 'Verse by verse: clean and build the source display for roots not yet synthesized.',
    },
    title: 'Fix Display — Sūra 44',
  },
  {

    path: 'workflow/synthesis',
    loadComponent: () =>
      import('./hub/lexicon-workflow-placeholder.component')
        .then(m => m.LexiconWorkflowPlaceholderComponent),
    data: {
      eyebrow: 'Workflow · Sūra 44',
      title: 'Root Synthesis',
      note: 'Verse by verse: weave all sources into a synthesized root, only where not already done.',
    },
    title: 'Root Synthesis — Sūra 44',
  },
  {
    path: 'books',
    loadComponent: () =>
      import('./books/lexicon-books.component').then(m => m.LexiconBooksComponent),
    title: 'المعجم — الكتب',
  },
  {

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

    path: 'synthesis/:root',
    loadComponent: () =>
      import('./synthesis/lexicon-synthesis.component').then(m => m.LexiconSynthesisComponent),
    title: 'المعجم — الخلاصة',
  },
  {

    path: 'root/:root',
    loadComponent: () =>
      import('./root-reader/lexicon-root-reader.component')
        .then(m => m.LexiconRootReaderComponent),
    title: 'Root — K-MAPS',
  },
];
