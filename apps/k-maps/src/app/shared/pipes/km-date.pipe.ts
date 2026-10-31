import { Pipe, PipeTransform } from '@angular/core';
import { KmDateStyle, formatKmDate } from '../utils/km-date';

/** `{{ row.created_at | kmDate }}` → "3 Oct 2026"; `| kmDate:'short'` → "3 Oct". */
@Pipe({ name: 'kmDate', standalone: true })
export class KmDatePipe implements PipeTransform {
  transform(value: string | number | Date | null | undefined, style: KmDateStyle = 'long'): string {
    return formatKmDate(value, style);
  }
}
