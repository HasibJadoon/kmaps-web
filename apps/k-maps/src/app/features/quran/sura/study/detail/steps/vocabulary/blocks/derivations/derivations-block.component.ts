import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../../morph-block-base.directive';
import { DerivationsData } from '../../morph-block.types';

@Component({
  selector: 'km-mb-derivations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './derivations-block.component.html',
  styleUrl: './derivations-block.component.scss',
})
export class DerivationsBlock extends MorphBlockBase {
  get d(): DerivationsData { return (this.block.data ?? {}) as DerivationsData; }
}
