/**
 * Fecha en hora local con formato aaaa-mm-dd, el que esperan `<input type="date">` y la API.
 *
 * No usar `toISOString().split('T')[0]`: da la fecha en UTC, y en España entre las 00:00 y
 * la 01:00 (02:00 en verano) devuelve el día anterior.
 */
export function localIsoDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
