import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';

interface LexiconHubCard {
  id: string;
  glyph: string;
  title: string;
  titleAr: string;
  tag: string;
  subtitle: string;
  accent: string;
  route: string;
}

const LEXICON_HUB_CARDS: LexiconHubCard[] = [
  {
    id: 'lexicon',
    glyph: 'م',
    title: 'Lexicon',
    titleAr: 'المعجم',
    tag: 'DICTIONARIES',
    subtitle: '12 classical lexicons',
    accent: '#c8a04a',
    route: '/lexicon/library',
  },
  {
    id: 'kmaps',
    glyph: '◈',
    title: 'K-Maps',
    titleAr: 'الخلاصة',
    tag: 'SYNTHESIS',
    subtitle: 'All synthesized roots',
    accent: '#97a87a',
    route: '/lexicon/kmaps',
  },
  {
    id: 'workflow-display',
    glyph: '⚒',
    title: 'Fix Display',
    titleAr: 'ضبط العرض',
    tag: 'WORKFLOW',
    subtitle: 'Sūra 44 · verse by verse',
    accent: '#d68a4a',
    route: '/lexicon/workflow/display',
  },
  {
    id: 'workflow-synthesis',
    glyph: '⚗',
    title: 'Root Synthesis',
    titleAr: 'توليف الجذر',
    tag: 'WORKFLOW',
    subtitle: 'Sūra 44 · verse by verse',
    accent: '#b58a5a',
    route: '/lexicon/workflow/synthesis',
  },
];

@Component({
  selector: 'km-lexicon-hub',
  standalone: true,
  imports: [RouterLink, BackButtonComponent],
  templateUrl: './lexicon-hub.component.html',
  styleUrl: './lexicon-hub.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconHubComponent {
  readonly cards = LEXICON_HUB_CARDS;
}
