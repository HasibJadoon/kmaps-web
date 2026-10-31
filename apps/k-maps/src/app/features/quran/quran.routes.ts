import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guard';

export const QURAN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./quran-research/quran-landing/quran-landing.component').then((m) => m.QuranLandingComponent),
    title: 'Quran — K-MAPS',
  },
  { path: 'al-quran/:surahId', redirectTo: 'al-quran', pathMatch: 'full' },
  {
    path: 'surahs',
    loadComponent: () =>
      import('./surah/index/surah-index.component').then((m) => m.SurahIndexComponent),
    title: 'Surahs — K-MAPS',
  },
  {
    path: 'surahs/:surahId/study/:passageNo/word/:ayah/:wordIndex',
    loadComponent: () =>
      import('./surah/study/scene/steps/vocabulary/morph-word-page/morph-word-page.component').then((m) => m.MorphWordPageComponent),
    title: 'Word — K-MAPS',
  },
  {

    path: 'surahs/:surahId/morphology/word/:ayah/:wordIndex',
    loadComponent: () =>
      import('./surah/study/scene/steps/vocabulary/morph-word-page/morph-word-page.component').then((m) => m.MorphWordPageComponent),
    title: 'Word — K-MAPS',
  },
  {
    path: 'surahs/:surahId/study/:passageNo',
    loadComponent: () =>
      import('./surah/study/scene/study-scene.component').then((m) => m.StudySceneComponent),
    title: 'Study — K-MAPS',
  },
  {
    path: 'surahs/:surahId/study',
    loadComponent: () =>
      import('./surah/study/overview/study-overview.component').then((m) => m.StudyOverviewComponent),
    title: 'Study — K-MAPS',
  },
  {
    path: 'surahs/:surahId/notes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./surah/notes/surah-notes.component').then((m) => m.SurahNotesComponent),
    title: 'Notes — K-MAPS',
  },
  {
    path: 'surahs/:surahId/linguistics',
    loadComponent: () =>
      import('./surah/linguistics/surah-linguistics.component').then((m) => m.SurahLinguisticsComponent),
    title: 'Linguistics — K-MAPS',
  },
  { path: 'surahs/:surahId/arabic', redirectTo: 'surahs/:surahId/linguistics', pathMatch: 'full' },
  { path: 'surahs/:surahId/vocabulary', redirectTo: 'surahs/:surahId/linguistics', pathMatch: 'full' },
  {
    path: 'surahs/:surahId/near-synonyms',
    loadComponent: () =>
      import('./surah/near-synonyms/surah-near-synonyms.component').then((m) => m.SurahNearSynonymsComponent),
    title: 'Near Synonyms — K-MAPS',
  },
  {
    path: 'surahs/:surahId/morphology',
    loadComponent: () =>
      import('./surah/morphology/surah-morphology.component').then((m) => m.SurahMorphologyComponent),
    title: 'Morphology — K-MAPS',
  },
  {
    path: 'surahs/:surahId/review',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./surah/review/surah-review.component').then((m) => m.SurahReviewComponent),
    title: 'Review — K-MAPS',
  },
  {
    path: 'surahs/:surahId/surah-structures',
    loadComponent: () =>
      import('./surah/surah-structures/surah-structures.component').then((m) => m.SurahStructuresComponent),
    title: 'Surah Structures — K-MAPS',
  },
  {
    path: 'surahs/:surahId/srs',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./surah/review/srs/surah-srs.component').then((m) => m.SurahSrsComponent),
    title: 'SRS — K-MAPS',
  },
  {
    path: 'surahs/:surahId/worldview/nodes',
    loadComponent: () =>
      import('./surah/worldview/nodes/worldview-nodes.component').then((m) => m.WorldviewNodesComponent),
    title: 'Worldview Nodes — K-MAPS',
  },
  {
    path: 'surahs/:surahId/worldview/sources',
    loadComponent: () =>
      import('./surah/worldview/sources/worldview-sources.component').then((m) => m.WorldviewSourcesComponent),
    title: 'Sources — K-MAPS',
  },
  {
    path: 'surahs/:surahId/worldview/podcasts',
    loadComponent: () =>
      import('./surah/worldview/podcasts/worldview-podcasts.component').then((m) => m.WorldviewPodcastsComponent),
    title: 'Podcasts — K-MAPS',
  },
  {
    path: 'surahs/:surahId/worldview/documents',
    loadComponent: () =>
      import('./surah/worldview/documents/worldview-documents.component').then((m) => m.WorldviewDocumentsComponent),
    title: 'Documents — K-MAPS',
  },
  {
    path: 'surahs/:surahId/worldview/notes',
    loadComponent: () =>
      import('./surah/worldview/notes/worldview-notes.component').then((m) => m.WorldviewNotesComponent),
    title: 'Worldview Notes — K-MAPS',
  },
  {
    path: 'surahs/:surahId/worldview/links',
    loadComponent: () =>
      import('./surah/worldview/links/worldview-links.component').then((m) => m.WorldviewLinksComponent),
    title: 'Links — K-MAPS',
  },
  {
    path: 'surahs/:surahId/worldview',
    loadComponent: () =>
      import('./surah/worldview/hub/worldview-hub.component').then((m) => m.WorldviewHubComponent),
    title: 'Worldview — K-MAPS',
  },
  {
    path: 'surahs/:surahId/passage/:passageIndex',
    loadComponent: () =>
      import('./surah/reader/passage/surah-passage.component').then((m) => m.SurahPassageComponent),
    title: 'Passage — K-MAPS',
  },
  {
    path: 'surahs/:surahId',
    loadComponent: () =>
      import('./surah/reader/surah-reader.component').then((m) => m.SurahReaderComponent),
    title: 'Quran — K-MAPS',
  },
  { path: 'browser', redirectTo: 'lexicon', pathMatch: 'full' },
  {
    path: 'lessons/:lessonId/study',
    loadComponent: () =>
      import('./surah/lessons/study/lesson-study.component').then((m) => m.LessonStudyComponent),
    title: 'Study — K-MAPS',
  },
  {
    path: 'lessons/:lessonId/edit',
    loadComponent: () =>
      import('./surah/lessons/edit/lesson-edit.component').then((m) => m.LessonEditComponent),
    title: 'Edit Lesson — K-MAPS',
  },
  {
    path: '',
    loadComponent: () =>
      import('./quran-research/quran-researcher-shell/quran-researcher-shell.component').then(
        (m) => m.QuranResearcherShellComponent,
      ),
    children: [
      {
        path: 'al-quran',
        loadComponent: () =>
          import('./quran-research/al-quran/al-quran.component').then((m) => m.AlQuranComponent),
        title: 'Al-Quran — K-MAPS',
      },
      {
        path: 'lexicon',
        loadComponent: () =>
          import('./quran-research/researcher/lexicon/lexicon-page.component').then((m) => m.LexiconPageComponent),
        title: 'Lexicon — K-MAPS',
      },
      {
        path: 'tafseer',
        loadComponent: () =>
          import('./quran-research/researcher/tafseer/tafseer-page.component').then((m) => m.TafseerPageComponent),
        title: 'Tafseer — K-MAPS',
      },
      {
        path: 'uloom',
        loadComponent: () =>
          import('./quran-research/researcher/uloom/uloom-page.component').then((m) => m.UloomPageComponent),
        title: 'Sciences — K-MAPS',
      },
      {
        path: 'notes',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./quran-research/researcher/notes/notes-page.component').then((m) => m.NotesPageComponent),
        title: 'Notes — K-MAPS',
      },
      { path: 'iraab', redirectTo: 'uloom', pathMatch: 'full' },
    ],
  },

  { path: 'sura/:surahId/study/:passageNo', redirectTo: 'surahs/:surahId/study/:passageNo', pathMatch: 'full' },
  { path: 'sura/:surahId/study', redirectTo: 'surahs/:surahId/study', pathMatch: 'full' },
  { path: 'sura/:surahId/notes', redirectTo: 'surahs/:surahId/notes', pathMatch: 'full' },
  { path: 'sura/:surahId/linguistics', redirectTo: 'surahs/:surahId/linguistics', pathMatch: 'full' },
  { path: 'sura/:surahId/arabic', redirectTo: 'surahs/:surahId/linguistics', pathMatch: 'full' },
  { path: 'sura/:surahId/vocabulary', redirectTo: 'surahs/:surahId/linguistics', pathMatch: 'full' },
  { path: 'sura/:surahId/near-synonyms', redirectTo: 'surahs/:surahId/near-synonyms', pathMatch: 'full' },
  { path: 'sura/:surahId/morphology', redirectTo: 'surahs/:surahId/morphology', pathMatch: 'full' },
  { path: 'sura/:surahId/review', redirectTo: 'surahs/:surahId/review', pathMatch: 'full' },
  { path: 'sura/:surahId/srs', redirectTo: 'surahs/:surahId/srs', pathMatch: 'full' },
  { path: 'sura/:surahId/worldview/nodes', redirectTo: 'surahs/:surahId/worldview/nodes', pathMatch: 'full' },
  { path: 'sura/:surahId/worldview/sources', redirectTo: 'surahs/:surahId/worldview/sources', pathMatch: 'full' },
  { path: 'sura/:surahId/worldview/podcasts', redirectTo: 'surahs/:surahId/worldview/podcasts', pathMatch: 'full' },
  { path: 'sura/:surahId/worldview/documents', redirectTo: 'surahs/:surahId/worldview/documents', pathMatch: 'full' },
  { path: 'sura/:surahId/worldview/notes', redirectTo: 'surahs/:surahId/worldview/notes', pathMatch: 'full' },
  { path: 'sura/:surahId/worldview/links', redirectTo: 'surahs/:surahId/worldview/links', pathMatch: 'full' },
  { path: 'sura/:surahId/worldview', redirectTo: 'surahs/:surahId/worldview', pathMatch: 'full' },
  { path: 'sura/:surahId/passage/:passageIndex', redirectTo: 'surahs/:surahId/passage/:passageIndex', pathMatch: 'full' },
  { path: 'sura/:surahId', redirectTo: 'surahs/:surahId', pathMatch: 'full' },
  { path: 'surah/:surahId/study/:passageNo', redirectTo: 'surahs/:surahId/study/:passageNo', pathMatch: 'full' },
  { path: 'surah/:surahId/study', redirectTo: 'surahs/:surahId/study', pathMatch: 'full' },
  { path: 'surah/:surahId/notes', redirectTo: 'surahs/:surahId/notes', pathMatch: 'full' },
  { path: 'surah/:surahId/linguistics', redirectTo: 'surahs/:surahId/linguistics', pathMatch: 'full' },
  { path: 'surah/:surahId/arabic', redirectTo: 'surahs/:surahId/linguistics', pathMatch: 'full' },
  { path: 'surah/:surahId/vocabulary', redirectTo: 'surahs/:surahId/linguistics', pathMatch: 'full' },
  { path: 'surah/:surahId/near-synonyms', redirectTo: 'surahs/:surahId/near-synonyms', pathMatch: 'full' },
  { path: 'surah/:surahId/morphology', redirectTo: 'surahs/:surahId/morphology', pathMatch: 'full' },
  { path: 'surah/:surahId/review', redirectTo: 'surahs/:surahId/review', pathMatch: 'full' },
  { path: 'surah/:surahId/srs', redirectTo: 'surahs/:surahId/srs', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/nodes', redirectTo: 'surahs/:surahId/worldview/nodes', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/sources', redirectTo: 'surahs/:surahId/worldview/sources', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/podcasts', redirectTo: 'surahs/:surahId/worldview/podcasts', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/documents', redirectTo: 'surahs/:surahId/worldview/documents', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/notes', redirectTo: 'surahs/:surahId/worldview/notes', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/links', redirectTo: 'surahs/:surahId/worldview/links', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview', redirectTo: 'surahs/:surahId/worldview', pathMatch: 'full' },
  { path: 'surah/:surahId/passage/:passageIndex', redirectTo: 'surahs/:surahId/passage/:passageIndex', pathMatch: 'full' },
  { path: 'surah/:surahId', redirectTo: 'surahs/:surahId', pathMatch: 'full' },
  { path: ':surahId/passage/:passageIndex', redirectTo: 'surahs/:surahId/passage/:passageIndex', pathMatch: 'full' },
  { path: ':surahId', redirectTo: 'surahs/:surahId', pathMatch: 'full' },
];
