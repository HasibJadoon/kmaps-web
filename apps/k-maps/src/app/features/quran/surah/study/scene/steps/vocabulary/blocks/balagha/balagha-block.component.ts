import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../../morph-block-base.directive';
import { BalaghaData } from '../../morph-block.types';

@Component({
  selector: 'km-mb-balagha',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './balagha-block.component.html',
  styleUrl: './balagha-block.component.scss',
})
export class BalaghaBlock extends MorphBlockBase {
  get d(): BalaghaData { return (this.block.data ?? {}) as BalaghaData; }
}
