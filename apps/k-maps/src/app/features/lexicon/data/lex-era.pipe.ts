// Renders a source's machine `period` as a native-Arabic era label, so the
// reader chrome stops printing raw column values («CLASSICAL», «2023»,
// «modern / 19th century») straight from the index.

import { Pipe, PipeTransform } from '@angular/core';
import { eraLabelAr } from './lexicon-sources.service';

@Pipe({ name: 'lexEra', standalone: true })
export class LexEraPipe implements PipeTransform {
  transform(period: string | null | undefined): string {
    return eraLabelAr(period);
  }
}
