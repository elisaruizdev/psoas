import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validadores de documentos y teléfonos españoles.
 *
 * Funciones puras (`isValid...`) separadas de los `ValidatorFn` de Angular: las puras se
 * prueban sin TestBed y se pueden reutilizar fuera de un formulario (p. ej. al importar datos).
 */

/** Letra de control del DNI: posición = número % 23. */
const CONTROL_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

/** El NIE sustituye su letra inicial por un dígito para calcular la letra de control. */
const NIE_PREFIX: Record<string, string> = { X: '0', Y: '1', Z: '2' };

const DNI_FORMAT = /^\d{8}[A-Z]$/;
const NIE_FORMAT = /^[XYZ]\d{7}[A-Z]$/;

/** Quita espacios, guiones y puntos, y pasa a mayúsculas: `12.345.678-z` → `12345678Z`. */
export function normalizeDniNie(value: string): string {
  return value.replace(/[\s.-]/g, '').toUpperCase();
}

export type DniNieError = 'format' | 'letter';

/** `null` si el DNI/NIE es válido; si no, el motivo. */
export function checkDniNie(value: string): DniNieError | null {
  const id = normalizeDniNie(value);
  if (!DNI_FORMAT.test(id) && !NIE_FORMAT.test(id)) {
    return 'format';
  }
  const digits = (NIE_PREFIX[id[0]] ?? id[0]) + id.slice(1, 8);
  const expected = CONTROL_LETTERS[Number(digits) % 23];
  return id[8] === expected ? null : 'letter';
}

export function isValidDniNie(value: string): boolean {
  return checkDniNie(value) === null;
}

/**
 * Valida DNI o NIE comprobando la letra de control, no solo el formato.
 * Error: `{ dniNie: { reason: 'format' | 'letter' } }`. El campo vacío lo resuelve `required`.
 */
export function dniNieValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const reason = checkDniNie(String(value));
    return reason ? { dniNie: { reason } } : null;
  };
}

/** Quita espacios, guiones, puntos y paréntesis: `+34 612-34-56-78` → `+34612345678`. */
export function normalizePhone(value: string): string {
  return value.replace(/[\s.()-]/g, '');
}

/** Para campos opcionales al enviar: `undefined` si no hay valor, normalizado si lo hay. */
export function optionalPhone(value: string | undefined): string | undefined {
  return value ? normalizePhone(value) : undefined;
}

/** Móvil o fijo español (empieza por 6, 7, 8 o 9 y tiene 9 cifras), con prefijo +34/0034 opcional. */
const SPANISH_PHONE = /^(?:\+34|0034)?[6789]\d{8}$/;

export function isValidSpanishPhone(value: string): boolean {
  return SPANISH_PHONE.test(normalizePhone(value));
}

/**
 * Valida un teléfono español admitiendo cómo lo escribe la gente (`612 34 56 78`).
 * Error: `{ phone: true }`. Al enviar, guarda el valor con `normalizePhone`.
 */
export function spanishPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return isValidSpanishPhone(String(value)) ? null : { phone: true };
  };
}

/** Mensaje para el usuario según el error del control, o `null` si no es un error de estos validadores. */
export function spanishIdErrorMessage(errors: ValidationErrors): string | null {
  if (errors['dniNie']) {
    return errors['dniNie'].reason === 'letter'
      ? 'La letra del DNI/NIE no corresponde al número'
      : 'DNI (8 cifras y letra) o NIE (X, Y o Z, 7 cifras y letra)';
  }
  if (errors['phone']) {
    return 'Teléfono español de 9 cifras que empiece por 6, 7, 8 o 9';
  }
  return null;
}
