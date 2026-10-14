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
      {
        path: 'domains',
        loadComponent: () =>
          import('./arabic-domains/arabic-domains.component').then(
            (m) => m.ArabicDomainsComponent,
          ),
        title: 'Domains — Arabic',
      },
      {
        path: 'read',
        loadComponent: () =>
          import('./arabic-read/arabic-read.component').then((m) => m.ArabicReadComponent),
        title: 'Read — Arabic',
      },
      {
        // The shape is in the path because it is what decides the reading, and
        // a link should carry it rather than re-derive it.
        path: 'read/:workId/:shape/:seq',
        loadComponent: () =>
          import('./arabic-reader/arabic-reader.component').then((m) => m.ArabicReaderComponent),
        title: 'Reader — Arabic',
      },
      {
        path: 'series',
        loadComponent: () =>
          import('./arabic-series/arabic-series.component').then((m) => m.ArabicSeriesComponent),
        title: 'Series — Arabic',
      },
      {
        path: 'timeline',
        loadComponent: () =>
          import('./arabic-timeline/arabic-timeline.component').then(
            (m) => m.ArabicTimelineComponent,
          ),
        title: 'Timeline — Arabic',
      },
      {
        path: 'roots-3d',
        loadComponent: () =>
          import('./arabic-constellation/arabic-constellation.component').then(
            (m) => m.ArabicConstellationComponent,
          ),
        title: 'Roots in 3D — Arabic',
      },
      {
        path: 'listening',
        loadComponent: () =>
          import('./arabic-listening/arabic-listening.component').then(
            (m) => m.ArabicListeningComponent,
          ),
      },
      {
        path: 'intake',
        loadComponent: () =>
          import('./arabic-intake/arabic-intake.component').then((m) => m.ArabicIntakeComponent),
        title: 'Intake — Arabic',
      },
      {
        path: 'path',
        loadComponent: () =>
          import('./arabic-path/arabic-path.component').then((m) => m.ArabicPathComponent),
        title: 'Your way — Arabic',
      },
      {
        path: 'review',
        loadComponent: () =>
          import('./arabic-review/arabic-review.component').then(
            (m) => m.ArabicReviewComponent,
          ),
        title: 'Review — Arabic',
      },

      {
        path: 'books/:containerId/chapter/:unitId',
        loadComponent: () =>
          import('./unit-study/arabic-unit-study.component').then((m) => m.ArabicUnitStudyComponent),
        title: 'Chapter — Arabic',
      },

      {
        path: 'media/:containerId/episode/:unitId',
        loadComponent: () =>
          import('./unit-study/arabic-unit-study.component').then((m) => m.ArabicUnitStudyComponent),
        title: 'Episode — Arabic',
      },

      {
        path: 'literature/:containerId/section/:unitId',
        loadComponent: () =>
          import('./unit-study/arabic-unit-study.component').then((m) => m.ArabicUnitStudyComponent),
        title: 'Section — Arabic',
      },

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
