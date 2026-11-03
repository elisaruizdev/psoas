export interface Appointment {
  id: string;
  patient_id: string;
  physio_id: number;
  appointment_date: Date | string;
  duration: number;
  session_number: number;
  status: string;
  notes: string | null;
  patient?: {
    id: string;
    name: string;
    surname: string;
    second_surname: string | null;
  };
  physio?: {
    id_physio: number;
    name: string;
    surname: string;
    second_surname: string | null;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateAppointment {
  patient_id: string;
  physio_id: number;
  appointment_date: string;
  duration?: number;
  notes?: string;
}

export interface UpdateAppointment {
  appointment_date?: string;
  duration?: number;
  status?: string;
  notes?: string;
}
const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

/** Estado de la cita para mostrar ("confirmed" → "Confirmada"); si no se conoce, tal cual. */
export function appointmentStatusLabel(status: string): string {
  return APPOINTMENT_STATUS_LABELS[status] ?? status;
}
