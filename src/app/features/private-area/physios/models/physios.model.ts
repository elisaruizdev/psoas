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
  password: string;
  is_verified: boolean;
  verification_token: string | null;
  verification_token_expires: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  reset_password_token: string | null;
  reset_password_token_expires: Date | string | null;
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
