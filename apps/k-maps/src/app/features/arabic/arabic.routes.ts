import { Routes } from '@angular/router';

export const ARABIC_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./arabic-shell/arabic-shell.component').then((m) => m.ArabicShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./arabic-home/arabic-home.component').then((m) => m.ArabicHomeComponent),
        title: 'Arabic — K-MAPS',
      },
      {
        path: 'library',
        loadComponent: () =>
          import('./arabic-library/arabic-library.component').then(
            (m) => m.ArabicLibraryComponent,
          ),
        title: 'Library — Arabic',
      },
      {
        path: 'library/:id',
        loadComponent: () =>
          import('./arabic-library-units/arabic-library-units.component').then(
            (m) => m.ArabicLibraryUnitsComponent,
          ),
        title: 'Reader — Arabic',
      },
      {
        path: 'linguistics',
        loadComponent: () =>
          import('./arabic-linguistics/arabic-linguistics.component').then(
            (m) => m.ArabicLinguisticsComponent,
          ),
        title: 'Linguistics — Arabic',
      },
      // ── Curriculum table of contents ────────────────────
      // /arabic/linguistics/nahw | sarf | balagha — one domain's whole TOC,
      // course → modules → the classical subtree down to the masʾala.
      {
        path: 'linguistics/:discipline',
        loadComponent: () =>
          import('./arabic-toc/arabic-toc.component').then((m) => m.ArabicTocComponent),
        title: 'Contents — Arabic',
      },
      // /arabic/topic/:id — one node of that tree, with its sources
      {
        path: 'topic/:id',
        loadComponent: () =>
          import('./arabic-topic/arabic-topic.component').then((m) => m.ArabicTopicComponent),
        title: 'Topic — Arabic',
      },
      // /arabic/sources — every source the three courses lean on, in one place
      {
        path: 'sources',
        loadComponent: () =>
          import('./arabic-sources/arabic-sources.component').then(
            (m) => m.ArabicSourcesComponent,
          ),
        title: 'Sources — Arabic',
      },
      {
        path: 'domains',
        loadComponent: () =>
          import('./arabic-domains/arabic-domains.component').then(
            (m) => m.ArabicDomainsComponent,
          ),
        title: 'Domains — Arabic',
      },
      {
        path: 'review',
        loadComponent: () =>
          import('./arabic-review/arabic-review.component').then(
            (m) => m.ArabicReviewComponent,
          ),
        title: 'Review — Arabic',
      },
      // ── Independent unit study routes ───────────────────
      // /arabic/books/:containerId/chapter/:unitId
      {
        path: 'books/:containerId/chapter/:unitId',
        loadComponent: () =>
          import('./unit-study/arabic-unit-study.component').then((m) => m.ArabicUnitStudyComponent),
        title: 'Chapter — Arabic',
      },
      // /arabic/media/:containerId/episode/:unitId
      {
        path: 'media/:containerId/episode/:unitId',
        loadComponent: () =>
          import('./unit-study/arabic-unit-study.component').then((m) => m.ArabicUnitStudyComponent),
        title: 'Episode — Arabic',
      },
      // /arabic/literature/:containerId/section/:unitId
      {
        path: 'literature/:containerId/section/:unitId',
        loadComponent: () =>
          import('./unit-study/arabic-unit-study.component').then((m) => m.ArabicUnitStudyComponent),
        title: 'Section — Arabic',
      },
      // ── Reaction Studio ─────────────────────────────────
      // Opened automatically when unit.unit_type === 'youtube_video'
      // /arabic/reaction/:unitId
      {
        path: 'reaction/:unitId',
        loadComponent: () =>
          import('../arabic-reaction/reaction-screen.component').then(
            (m) => m.ReactionScreenComponent,
          ),
        title: 'Reaction Studio — Arabic',
      },
    ],
  },
];
