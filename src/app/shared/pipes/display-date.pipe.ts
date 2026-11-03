import { Pipe, PipeTransform } from '@angular/core';
import { formatDate } from '../utils/dates';

/** `{{ treatment.end_date | displayDate: 'No especificada' }}` → "5/1/2026" o el texto alternativo. */
@Pipe({ name: 'displayDate' })
export class DisplayDatePipe implements PipeTransform {
  transform(date: Date | string | null | undefined, fallback = ''): string {
    return formatDate(date, fallback);
  }
}
