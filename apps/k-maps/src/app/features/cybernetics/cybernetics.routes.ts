import { Routes } from '@angular/router';

export const CYBERNETICS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./cybernetics-shell.component').then((m) => m.CyberneticsShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/cyb-dashboard.component').then((m) => m.CybDashboardComponent),
        title: 'Cybernetics — K-MAPS',
      },
      {
        path: 'monitor',
        loadComponent: () =>
          import('./monitor/cyb-monitor.component').then((m) => m.CybMonitorComponent),
        title: 'Control Monitor — K-MAPS',
      },

      ...['map', 'map/:surahId', 'map/:surahId/:passageNo',
          'map/:surahId/:passageNo/:stream',
          'map/:surahId/:passageNo/:stream/:root'].map((path) => ({
        path,
        loadComponent: () =>
          import('./map/cyb-map.component').then((m) => m.CybMapComponent),
        title: 'Quran Map — K-MAPS',
      })),

      {
        path: 'ds/:root',
        loadComponent: () =>
          import('./ds/cyb-ds-page.component').then((m) => m.CybDsPageComponent),
        title: 'Root — K-MAPS',
      },

      ...['ladder', 'ladder/:surahId', 'ladder/:surahId/:passageNo',
          'ladder/:surahId/:passageNo/:stream',
          'ladder/:surahId/:passageNo/:stream/:root'].map((path) => ({
        path,
        loadComponent: () =>
          import('./ladder/cyb-ladder.component').then((m) => m.CybLadderComponent),
        title: 'Quran Ladder — K-MAPS',
      })),
    ],
  },
];
