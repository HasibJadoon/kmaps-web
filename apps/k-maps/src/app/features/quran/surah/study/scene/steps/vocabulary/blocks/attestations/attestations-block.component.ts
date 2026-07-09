import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { MorphBlockBase } from '../../morph-block-base.directive';
import { AttestationsData } from '../../morph-block.types';

@Component({
  selector: 'km-mb-attestations',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './attestations-block.component.html',
  styleUrl: './attestations-block.component.scss',
})
export class AttestationsBlock extends MorphBlockBase {
  get d(): AttestationsData { return (this.block.data ?? {}) as AttestationsData; }
}
