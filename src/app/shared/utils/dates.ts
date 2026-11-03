/**
 * Fecha en hora local con formato aaaa-mm-dd, el que esperan `<input type="date">` y la API.
 *
 * No usar `toISOString().split('T')[0]`: da la fecha en UTC, y en España entre las 00:00 y
 * la 01:00 (02:00 en verano) devuelve el día anterior.
 */
export function localIsoDate(date: Date | string = new Date()): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Fecha para mostrar: "5/1/2026". Sin fecha, devuelve `fallback`. */
export function formatDate(date: Date | string | null | undefined, fallback = ''): string {
  if (!date) return fallback;
  return new Date(date).toLocaleDateString('es-ES');
}

/** Fecha y hora para mostrar: "05/01/2026, 09:05". */
export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Hora para mostrar: "09:05". */
export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}
