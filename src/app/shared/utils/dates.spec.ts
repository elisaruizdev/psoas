import { localIsoDate } from './dates';

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
});
