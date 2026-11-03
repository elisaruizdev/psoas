export interface Physio {
  id_physio: number;
  name: string;
  surname: string;
  second_surname: string | null;
  phone: string;
  email: string;
  address: string | null;
  city: string | null;
  zip: string | null;
  country: string | null;
  identifier: string | null;
  license_number: string | null;
  birthdate: Date | string | null;
  gender: string | null;
  specialty: string | null;
  hire_date: Date | string | null;
  schedule: string | null;
  status: string;
  is_verified: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  // La API no devuelve la contraseña ni los tokens (psoas-backend #10), y el front no debe
  // contar con ellos: no los añadas aquí.
}

const PHYSIO_STATUS_LABELS: Record<string, string> = {
  pending_verification: 'Pendiente de verificación',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  active: 'Activo',
  inactive: 'Inactivo',
};

/** Estado del fisio para mostrar ("approved" → "Aprobado"); si no se conoce, tal cual. */
export function physioStatusLabel(status: string): string {
  return PHYSIO_STATUS_LABELS[status] ?? status;
}
