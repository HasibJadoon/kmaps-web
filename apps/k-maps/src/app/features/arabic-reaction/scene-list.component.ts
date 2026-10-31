import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Scene } from './reaction.models';

import { PressableDirective } from '../../shared/directives/pressable.directive';
@Component({
  selector: 'km-scene-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PressableDirective, CommonModule],
  templateUrl: './scene-list.component.html',
})
export class SceneListComponent {
  @Input({ required: true }) scenes: Scene[] = [];
  @Input() activeSceneId: string | null = null;
  @Output() sceneSelect = new EventEmitter<Scene>();

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
