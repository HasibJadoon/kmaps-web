import { Routes } from '@angular/router';

export const CYBERNETICS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./cybernetics-shell.component').then((m) => m.CyberneticsShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'monitor' },
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
      {
        path: 'ladder',
        loadComponent: () =>
          import('./ladder/cyb-ladder.component').then((m) => m.CybLadderComponent),
        title: 'Quran Ladder — K-MAPS',
      },
    ],
  },
];
