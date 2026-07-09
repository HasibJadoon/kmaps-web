import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../../morph-block-base.directive';
import { DevelopmentData } from '../../morph-block.types';

@Component({
  selector: 'km-mb-development',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './development-block.component.html',
  styleUrl: './development-block.component.scss',
})
export class DevelopmentBlock extends MorphBlockBase {
  get d(): DevelopmentData { return (this.block.data ?? {}) as DevelopmentData; }
}
