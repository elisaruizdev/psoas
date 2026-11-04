import { appointmentStatusLabel } from './sessions/models/appointment.model';
import { physioStatusLabel } from './physios/models/physios.model';
import {
  diagnosisStatusLabel,
  patientStatusLabel,
  treatmentStatusLabel,
} from './patients/models/patients.model';

describe('etiquetas de estado', () => {
  it('citas: traduce los estados conocidos y deja tal cual los demás', () => {
    expect(appointmentStatusLabel('scheduled')).toBe('Programada');
    expect(appointmentStatusLabel('confirmed')).toBe('Confirmada');
    expect(appointmentStatusLabel('completed')).toBe('Completada');
    expect(appointmentStatusLabel('cancelled')).toBe('Cancelada');
    expect(appointmentStatusLabel('raro')).toBe('raro');
  });

  it('fisios: traduce los estados conocidos y deja tal cual los demás', () => {
    expect(physioStatusLabel('pending_verification')).toBe('Pendiente de verificación');
    expect(physioStatusLabel('approved')).toBe('Aprobado');
    expect(physioStatusLabel('rejected')).toBe('Rechazado');
    expect(physioStatusLabel('active')).toBe('Activo');
    expect(physioStatusLabel('inactive')).toBe('Inactivo');
    expect(physioStatusLabel('raro')).toBe('raro');
  });

  it('pacientes: traduce los estados conocidos y deja tal cual los demás', () => {
    expect(patientStatusLabel('active')).toBe('Activo');
    expect(patientStatusLabel('inactive')).toBe('Inactivo');
    expect(patientStatusLabel('raro')).toBe('raro');
  });

  it('diagnósticos: traduce los estados conocidos y deja tal cual los demás', () => {
    expect(diagnosisStatusLabel('active')).toBe('Activo');
    expect(diagnosisStatusLabel('resolved')).toBe('Resuelto');
    expect(diagnosisStatusLabel('raro')).toBe('raro');
  });

  it('tratamientos: traduce los estados conocidos y deja tal cual los demás', () => {
    expect(treatmentStatusLabel('active')).toBe('Activo');
    expect(treatmentStatusLabel('completed')).toBe('Completado');
    expect(treatmentStatusLabel('paused')).toBe('Pausado');
    expect(treatmentStatusLabel('raro')).toBe('raro');
  });
});
