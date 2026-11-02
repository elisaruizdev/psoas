import { FormControl } from '@angular/forms';
import {
  checkDniNie,
  dniNieValidator,
  isValidDniNie,
  isValidSpanishPhone,
  normalizeDniNie,
  normalizePhone,
  optionalPhone,
  spanishIdErrorMessage,
  spanishPhoneValidator,
} from './spanish-id.validators';

describe('validadores de DNI/NIE y teléfono', () => {
  describe('DNI/NIE', () => {
    // Tabla de casos: cada fila es un ejemplo, se lee como una especificación.
    const validos = ['12345678Z', '00000000T', '11223344B', 'X1234567L', 'Y1234567X', 'Z1234567R'];
    validos.forEach((id) => {
      it(`acepta ${id}`, () => expect(isValidDniNie(id)).toBeTrue());
    });

    it('normaliza minúsculas, espacios, puntos y guiones antes de validar', () => {
      expect(normalizeDniNie(' 12.345.678-z ')).toBe('12345678Z');
      expect(isValidDniNie('12.345.678-z')).toBeTrue();
      expect(isValidDniNie('x1234567l')).toBeTrue();
    });

    it('distingue un formato incorrecto de una letra que no corresponde', () => {
      expect(checkDniNie('1234567Z')).toBe('format'); // 7 cifras
      expect(checkDniNie('A1234567L')).toBe('format'); // NIE solo empieza por X, Y o Z
      expect(checkDniNie('123456789')).toBe('format'); // sin letra
      expect(checkDniNie('12345678A')).toBe('letter'); // 12345678 % 23 = 14 → Z
      expect(checkDniNie('X1234567A')).toBe('letter');
    });

    it('como ValidatorFn deja el campo vacío a `required`', () => {
      const validar = dniNieValidator();
      expect(validar(new FormControl(''))).toBeNull();
      expect(validar(new FormControl(null))).toBeNull();
    });

    it('como ValidatorFn devuelve el motivo del error', () => {
      const validar = dniNieValidator();
      expect(validar(new FormControl('12345678Z'))).toBeNull();
      expect(validar(new FormControl('12345678A'))).toEqual({ dniNie: { reason: 'letter' } });
      expect(validar(new FormControl('abc'))).toEqual({ dniNie: { reason: 'format' } });
    });
  });

  describe('teléfono', () => {
    const validos = ['612345678', '612 34 56 78', '+34 612 345 678', '0034612345678', '912-345-678', '(91) 234 56 78'];
    validos.forEach((tel) => {
      it(`acepta "${tel}"`, () => expect(isValidSpanishPhone(tel)).toBeTrue());
    });

    const invalidos = ['512345678', '61234567', '6123456789', '+33612345678', 'teléfono'];
    invalidos.forEach((tel) => {
      it(`rechaza "${tel}"`, () => expect(isValidSpanishPhone(tel)).toBeFalse());
    });

    it('normaliza quitando separadores', () => {
      expect(normalizePhone('+34 612-34.56 78')).toBe('+34612345678');
    });

    it('en un campo opcional, vacío pasa a undefined', () => {
      expect(optionalPhone(undefined)).toBeUndefined();
      expect(optionalPhone('')).toBeUndefined();
      expect(optionalPhone('612 345 678')).toBe('612345678');
    });

    it('como ValidatorFn', () => {
      const validar = spanishPhoneValidator();
      expect(validar(new FormControl(''))).toBeNull();
      expect(validar(new FormControl('612 345 678'))).toBeNull();
      expect(validar(new FormControl('123'))).toEqual({ phone: true });
    });
  });

  describe('mensajes de error', () => {
    it('explica qué falla en cada caso', () => {
      expect(spanishIdErrorMessage({ dniNie: { reason: 'letter' } })).toContain('letra');
      expect(spanishIdErrorMessage({ dniNie: { reason: 'format' } })).toContain('8 cifras');
      expect(spanishIdErrorMessage({ phone: true })).toContain('9 cifras');
      expect(spanishIdErrorMessage({ required: true })).toBeNull();
    });
  });
});
