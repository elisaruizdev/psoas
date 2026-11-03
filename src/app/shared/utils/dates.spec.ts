import { formatDate, formatDateTime, formatTime, localIsoDate } from './dates';

describe('localIsoDate', () => {
  afterEach(() => jasmine.clock().uninstall());

  it('de madrugada devuelve el día local, no el de UTC', () => {
    // 00:30 hora local: en España, en UTC todavía es el día anterior.
    expect(localIsoDate(new Date(2026, 10, 3, 0, 30))).toBe('2026-11-03');
  });

  it('rellena mes y día con ceros', () => {
    expect(localIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('sin argumento usa la fecha de hoy', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 10, 3, 0, 30));

    expect(localIsoDate()).toBe('2026-11-03');
  });

  it('acepta la fecha como texto de la API', () => {
    expect(localIsoDate('2026-01-05T10:00:00')).toBe('2026-01-05');
  });
});

describe('formatDate', () => {
  it('pinta la fecha en formato español', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('5/1/2026');
    expect(formatDate('2026-01-05T10:00:00')).toBe('5/1/2026');
  });

  it('sin fecha devuelve el texto alternativo (vacío si no se indica)', () => {
    expect(formatDate(null, 'No especificada')).toBe('No especificada');
    expect(formatDate('', '-')).toBe('-');
    expect(formatDate(undefined)).toBe('');
  });
});

describe('formatDateTime y formatTime', () => {
  const cita = new Date(2026, 0, 5, 9, 5);

  it('fecha y hora con ceros a la izquierda', () => {
    expect(formatDateTime(cita)).toBe('05/01/2026, 09:05');
  });

  it('solo la hora', () => {
    expect(formatTime(cita)).toBe('09:05');
  });
});
