import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { StudyKeyValueRow } from '../ar-quran-study.facade';

@Component({
  selector: 'app-study-grammar-concepts-tab',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './study-grammar-concepts-tab.component.html',
})
export class StudyGrammarConceptsTabComponent {
  @Input() rows: StudyKeyValueRow[] = [];
}
