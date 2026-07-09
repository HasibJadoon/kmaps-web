import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { ExpressionStudyCard } from '../ar-quran-study.facade';

@Component({
  selector: 'app-study-expressions-tab',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './study-expressions-tab.component.html',
})
export class StudyExpressionsTabComponent {
  @Input() cards: ExpressionStudyCard[] = [];
  @Input() referenceBadge = '';
}
