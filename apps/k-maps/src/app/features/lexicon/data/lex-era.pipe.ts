import { Pipe, PipeTransform } from '@angular/core';
import { eraLabelAr } from './lexicon-sources.service';

@Pipe({ name: 'lexEra', standalone: true })
export class LexEraPipe implements PipeTransform {
  transform(period: string | null | undefined): string {
    return eraLabelAr(period);
  }
}
