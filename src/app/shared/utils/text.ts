/** Lo mínimo para componer el nombre de un paciente o un fisio. */
export interface PersonName {
  name: string;
  surname: string;
  second_surname?: string | null;
}

/** "Lucía García López"; sin segundo apellido, "Ana Ruiz". Sin persona, devuelve `fallback`. */
export function fullName(person: PersonName | null | undefined, fallback = ''): string {
  if (!person) return fallback;
  return [person.name, person.surname, person.second_surname].filter(Boolean).join(' ');
}

/** "san sebastián" → "San Sebastián". */
export function capitalizeWords(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
