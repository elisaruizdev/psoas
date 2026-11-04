import { aPhysio, aSession, aTreatment } from '../../../../../../testing/fixtures';
import { localIsoDate } from '../../../../../shared/utils/dates';
import { sessionFormConfig, toCreateSession, toUpdateSession } from './session-form';

describe('sessionFormConfig', () => {
  const campo = (nombre: string) =>
    sessionFormConfig([aTreatment()], [aPhysio()]).sections[0].fields.find((c) => c.name === nombre)!;

  it('ofrece los tratamientos del paciente, con la opción de no asociar ninguno', () => {
    expect(campo('treatment_id').options!.map((o) => o.label)).toEqual([
      'Sin tratamiento asociado',
      'Rehabilitación lumbar',
    ]);
  });

  it('ofrece los fisios con su nombre completo y descarta los que no tienen id', () => {
    const fisios = sessionFormConfig([], [aPhysio(), aPhysio({ id_physio: 0, name: 'Sin id' })]);
    const opciones = fisios.sections[0].fields.find((c) => c.name === 'physio_id')!.options!;
    expect(opciones.map((o) => o.label)).toEqual(['Selecciona un fisioterapeuta', 'Ana Ruiz']);
  });

  it('propone hoy como fecha y 45 minutos de duración', () => {
    expect(campo('session_date').value).toBe(localIsoDate());
    expect(campo('duration').value).toBe('45');
  });
});

describe('toCreateSession', () => {
  it('convierte los números y deja los opcionales vacíos en undefined', () => {
    expect(
      toCreateSession('p-1', {
        treatment_id: '',
        physio_id: '7',
        session_date: '2026-11-02',
        duration: '45',
        techniques_applied: 'Masaje',
        patient_evolution: 'Mejor',
        observations: '',
        next_appointment: '',
      }),
    ).toEqual({
      patient_id: 'p-1',
      treatment_id: undefined,
      physio_id: 7,
      session_date: '2026-11-02',
      duration: 45,
      techniques_applied: 'Masaje',
      patient_evolution: 'Mejor',
      observations: undefined,
      next_appointment: undefined,
    });
  });

  it('si faltan los textos obligatorios, los manda vacíos', () => {
    const sesion = toCreateSession('p-1', {});
    expect(sesion.session_date).toBe('');
    expect(sesion.techniques_applied).toBe('');
    expect(sesion.patient_evolution).toBe('');
  });
});

describe('toUpdateSession', () => {
  it('manda las fechas como fecha local', () => {
    const sesion = aSession({
      session_date: new Date(2026, 9, 5),
      next_appointment: new Date(2026, 9, 12),
    });
    expect(toUpdateSession(sesion)).toEqual(
      jasmine.objectContaining({ session_date: '2026-10-05', next_appointment: '2026-10-12' }),
    );
  });

  it('sin próxima cita, no la manda', () => {
    expect(toUpdateSession(aSession({ next_appointment: undefined })).next_appointment).toBeUndefined();
  });
});
