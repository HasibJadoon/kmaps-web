import { Routes } from '@angular/router';

export const LEXICON_ROUTES: Routes = [
  {
    // Landing hub — four sub-cards (Lexicon · K-Maps · Fix Display · Root Synthesis).
    path: '',
    loadComponent: () =>
      import('./hub/lexicon-hub.component').then(m => m.LexiconHubComponent),
    title: 'Lexicon — K-MAPS',
  },
  {
    // Card 1 — the classical-dictionary reader (the previous /lexicon view).
    path: 'library',
    loadComponent: () =>
      import('./lexicon-home.component').then(m => m.LexiconHomeComponent),
    title: 'المعجم',
  },
  {
    // Card 2 — all synthesized roots (build_status = 'done'). Data wired next.
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
    // Card 3 — fix/build source display for Sūra 44 roots not yet synthesized.
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
    // Card 4 — synthesize the root from all sources for Sūra 44, where not done.
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
