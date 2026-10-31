import { Pipe, PipeTransform } from '@angular/core';
import { toArabicDigits } from '../utils/arabic-digits';

/** `{{ ayah.ayah | arDigits }}` → ٢٨٦. */
@Pipe({ name: 'arDigits', standalone: true })
export class ArabicDigitsPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    return toArabicDigits(value);
  }
}
