import { appointmentStatusLabel } from './sessions/models/appointment.model';
import { physioStatusLabel } from './physios/models/physios.model';

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
});
