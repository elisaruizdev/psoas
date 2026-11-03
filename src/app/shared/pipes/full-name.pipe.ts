import { Pipe, PipeTransform } from '@angular/core';
import { PersonName, fullName } from '../utils/text';

/** `{{ appointment.patient | fullName: 'Paciente no disponible' }}` → "Lucía García López". */
@Pipe({ name: 'fullName' })
export class FullNamePipe implements PipeTransform {
  transform(person: PersonName | null | undefined, fallback = ''): string {
    return fullName(person, fallback);
  }
}
