import { DisplayDatePipe } from './display-date.pipe';
import { FullNamePipe } from './full-name.pipe';

// Los pipes solo delegan en shared/utils (probadas aparte): aquí basta con ver que conectan.
describe('pipes de presentación', () => {
  it('displayDate formatea o usa el texto alternativo', () => {
    const pipe = new DisplayDatePipe();
    expect(pipe.transform(new Date(2026, 0, 5))).toBe('5/1/2026');
    expect(pipe.transform(null, 'No especificada')).toBe('No especificada');
  });

  it('fullName compone el nombre o usa el texto alternativo', () => {
    const pipe = new FullNamePipe();
    expect(pipe.transform({ name: 'Ana', surname: 'Ruiz', second_surname: null })).toBe('Ana Ruiz');
    expect(pipe.transform(undefined, 'Fisioterapeuta no disponible')).toBe(
      'Fisioterapeuta no disponible',
    );
  });
});
