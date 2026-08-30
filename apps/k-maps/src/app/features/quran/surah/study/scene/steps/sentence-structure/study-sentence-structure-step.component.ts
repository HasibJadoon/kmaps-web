import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { StudyLessonResponse } from '../../../../../../../shared/services/quran/quran-surah.service';
import { SentenceStructureMiroComponent } from './sentence-structure-miro.component';

@Component({
  selector:        'km-study-sentence-structure-step',
  standalone:      true,
  imports:         [SentenceStructureMiroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (lesson.sentenceStructure?.sentences?.length) {
      <km-sentence-structure-miro
        [data]="lesson.sentenceStructure!"
        (openLexicon)="onOpenLexicon($event)" />
    } @else {
      <div class="ssm-empty"><p>No sentence-structure data for this passage yet.</p></div>
    }
  `,
})
export class StudySentenceStructureStepComponent {
  @Input({ required: true }) lesson!: StudyLessonResponse;

  onOpenLexicon(_e: { root: string; word: string }): void {

  }
}
