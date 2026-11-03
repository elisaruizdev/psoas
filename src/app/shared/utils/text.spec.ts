import { capitalizeWords, fullName } from './text';

describe('fullName', () => {
  it('une nombre y apellidos', () => {
    expect(fullName({ name: 'Lucía', surname: 'García', second_surname: 'López' })).toBe(
      'Lucía García López',
    );
  });

  it('sin segundo apellido no deja espacios de más', () => {
    expect(fullName({ name: 'Ana', surname: 'Ruiz', second_surname: null })).toBe('Ana Ruiz');
    expect(fullName({ name: 'Ana', surname: 'Ruiz' })).toBe('Ana Ruiz');
  });

  it('sin persona devuelve el texto alternativo (vacío si no se indica)', () => {
    expect(fullName(null, 'Paciente no disponible')).toBe('Paciente no disponible');
    expect(fullName(undefined)).toBe('');
  });
});

describe('capitalizeWords', () => {
  it('pone en mayúscula la primera letra de cada palabra', () => {
    expect(capitalizeWords('san sebastián')).toBe('San Sebastián');
    expect(capitalizeWords('MADRID')).toBe('Madrid');
  });

  it('con texto vacío devuelve vacío', () => {
    expect(capitalizeWords('')).toBe('');
  });
});
