// Datos de ejemplo para los tests unitarios.
// Siguen los modelos de la app, así que si cambia un modelo el compilador avisa aquí.
import {
  Diagnosis,
  Patient,
  Session,
  Treatment,
} from '../app/features/private-area/patients/models/patients.model';
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
    identifier: '12345678Z',
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
    is_verified: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
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

export function aDiagnosis(overrides: Partial<Diagnosis> = {}): Diagnosis {
  return {
    id: 'd-1',
    patient_id: 'p-1',
    diagnosis_date: '2026-10-01T00:00:00.000Z',
    diagnosis_type: 'Lumbalgia',
    description: 'Dolor lumbar mecánico',
    observations: 'Empeora al estar sentada',
    status: 'active',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

export function aTreatment(overrides: Partial<Treatment> = {}): Treatment {
  return {
    id: 't-1',
    patient_id: 'p-1',
    treatment_name: 'Rehabilitación lumbar',
    start_date: '2026-10-02T00:00:00.000Z',
    description: 'Ejercicio terapéutico y terapia manual',
    objectives: 'Reducir el dolor',
    sessions_planned: 10,
    status: 'active',
    createdAt: '2026-10-02T00:00:00.000Z',
    updatedAt: '2026-10-02T00:00:00.000Z',
    ...overrides,
  };
}

export function aSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 's-1',
    patient_id: 'p-1',
    treatment_id: 't-1',
    physio_id: 7,
    session_date: '2026-10-05T00:00:00.000Z',
    duration: 45,
    techniques_applied: 'Movilización lumbar',
    patient_evolution: 'Mejora el rango de movimiento',
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    physio: { name: 'Ana', surname: 'Ruiz' },
    ...overrides,
  };
}
