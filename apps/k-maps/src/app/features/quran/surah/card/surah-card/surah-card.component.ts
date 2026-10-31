import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { SurahActionsComponent } from '../surah-actions/surah-actions.component';
import { QuranSurahListItemDto } from '../../../../../shared/models/quran/quran.models';

import { PressableDirective } from '../../../../../shared/directives/pressable.directive';
@Component({
  selector: 'km-surah-card',
  standalone: true,
  imports: [PressableDirective, TitleCasePipe, SurahActionsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-card.component.html',
  styleUrl: './surah-card.component.scss',
})
export class SurahCardComponent {
  @Input({ required: true }) surah!: QuranSurahListItemDto;
  @Output() open = new EventEmitter<number>();
}
