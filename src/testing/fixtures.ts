// Datos de ejemplo para los tests unitarios.
// Siguen los modelos de la app, así que si cambia un modelo el compilador avisa aquí.
import { Patient } from '../app/features/private-area/patients/models/patients.model';
import { Physio } from '../app/features/private-area/physios/models/physios.model';
import { Appointment } from '../app/features/private-area/sessions/models/appointment.model';

export function aPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p-1',
    name: 'Lucía',
    surname: 'García',
    second_surname: 'López',
    phone: '600111222',
    email: 'lucia@example.com',
    address: null,
    city: 'Madrid',
    zip: '28001',
    identifier: '12345678A',
    birthdate: '1990-05-10',
    gender: 'female',
    medical_history: null,
    consultation_reason: 'Lumbalgia',
    health_insurance: null,
    emergency_contact: null,
    status: 'active',
    discharge_reason: null,
    discharge_date: null,
    createdAt: '2026-01-10T10:00:00.000Z',
    updatedAt: '2026-01-10T10:00:00.000Z',
    ...overrides,
  };
}

export function aPhysio(overrides: Partial<Physio> = {}): Physio {
  return {
    id_physio: 7,
    name: 'Ana',
    surname: 'Ruiz',
    second_surname: null,
    phone: '600333444',
    email: 'ana@psoas.es',
    address: null,
    city: null,
    zip: null,
    country: null,
    identifier: null,
    license_number: 'COL-123',
    birthdate: null,
    gender: null,
    specialty: 'Deportiva',
    hire_date: null,
    schedule: null,
    status: 'active',
    password: '',
    is_verified: true,
    verification_token: null,
    verification_token_expires: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    reset_password_token: null,
    reset_password_token_expires: null,
    ...overrides,
  };
}

export function anAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'a-1',
    patient_id: 'p-1',
    physio_id: 7,
    appointment_date: '2026-11-04T10:00:00.000Z',
    duration: 45,
    session_number: 1,
    status: 'scheduled',
    notes: null,
    patient: { id: 'p-1', name: 'Lucía', surname: 'García', second_surname: 'López' },
    physio: { id_physio: 7, name: 'Ana', surname: 'Ruiz', second_surname: null },
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}
