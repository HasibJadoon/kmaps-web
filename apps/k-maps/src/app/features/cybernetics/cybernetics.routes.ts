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
      // The map's drill is URL-addressable, so browser back/forward and deep
      // links work at every level:
      //   /map                                    → the 114 surahs
      //   /map/:surahId                           → that surah's study passages
      //   /map/:surahId/:passageNo                → the 6 stream-systems
      //   /map/:surahId/:passageNo/:stream        → the stream's pieces (roots)
      //   /map/:surahId/:passageNo/:stream/:root  → that root's dashboard
      ...['map', 'map/:surahId', 'map/:surahId/:passageNo',
          'map/:surahId/:passageNo/:stream',
          'map/:surahId/:passageNo/:stream/:root'].map((path) => ({
        path,
        loadComponent: () =>
          import('./map/cyb-map.component').then((m) => m.CybMapComponent),
        title: 'Quran Map — K-MAPS',
      })),
      // The ladder walks the same recursion as the map, so it takes the same
      // route shape — a path in one view opens the same path in the other.
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
