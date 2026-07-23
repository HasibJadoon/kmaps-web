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
      {
        path: 'map',
        loadComponent: () =>
          import('./map/cyb-map.component').then((m) => m.CybMapComponent),
        title: 'Quran Map — K-MAPS',
      },
      {
        path: 'ladder',
        loadComponent: () =>
          import('./ladder/cyb-ladder.component').then((m) => m.CybLadderComponent),
        title: 'Quran Ladder — K-MAPS',
      },
    ],
  },
];
