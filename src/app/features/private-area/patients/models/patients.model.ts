interface TabItem {
  label: string;
  id: 'clinical' | 'treatments' | 'sessions';
  icon: string;
}

export interface Patient {
  id: string;
  name: string;
  surname: string;
  second_surname: string | null;
  phone: string;
  email: string;
  address: string | null;
  city: string | null;
  zip: string | null;
  identifier: string;
  birthdate: Date | string;
  gender: string;
  medical_history: string | null;
  consultation_reason: string | null;
  health_insurance: string | null;
  emergency_contact: string | null;
  status: string;
  discharge_reason: string | null;
  discharge_date: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreatePatient {
  name: string;
  surname: string;
  second_surname?: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  zip?: string;
  identifier: string;
  birthdate: string;
  gender: string;
  medical_history?: string;
  consultation_reason?: string;
  health_insurance?: string;
  emergency_contact?: string;
}

export type TabId = 'clinical' | 'treatments' | 'sessions';

export interface PatientTab {
  label: string;
  id: TabId;
  icon: string;
}

export interface Diagnosis {
  id: string;
  patient_id: string;
  diagnosis_date: Date | string;
  diagnosis_type: string;
  description: string;
  observations?: string;
  status: 'active' | 'resolved';
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateDiagnosis {
  patient_id: string;
  diagnosis_date: string;
  diagnosis_type: string;
  description: string;
  observations?: string;
  status?: 'active' | 'resolved';
}

export interface UpdateDiagnosis {
  diagnosis_date?: string;
  diagnosis_type?: string;
  description?: string;
  observations?: string;
  status?: 'active' | 'resolved';
}

export interface Treatment {
  id: string;
  patient_id: string;
  treatment_name: string;
  start_date: Date | string;
  end_date?: Date | string;
  description: string;
  objectives: string;
  sessions_planned?: number;
  status: 'active' | 'completed' | 'paused';
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateTreatment {
  patient_id: string;
  treatment_name: string;
  start_date: string;
  end_date?: string;
  description: string;
  objectives: string;
  sessions_planned?: number;
  status?: 'active' | 'completed' | 'paused';
}

export interface UpdateTreatment {
  treatment_name?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  objectives?: string;
  sessions_planned?: number;
  status?: 'active' | 'completed' | 'paused';
}

export interface Session {
  id: string;
  patient_id: string;
  treatment_id?: string;
  physio_id: number;
  session_date: Date | string;
  duration: number;
  techniques_applied: string;
  patient_evolution: string;
  observations?: string;
  next_appointment?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  physio?: any; 
  treatment?: any; 
}

export interface CreateSession {
  patient_id: string;
  treatment_id?: string;
  physio_id: number;
  session_date: string;
  duration: number;
  techniques_applied: string;
  patient_evolution: string;
  observations?: string;
  next_appointment?: string;
}

export interface UpdateSession {
  treatment_id?: string;
  physio_id?: number;
  session_date?: string;
  duration?: number;
  techniques_applied?: string;
  patient_evolution?: string;
  observations?: string;
  next_appointment?: string;
}

export interface TreatmentWithSessions {
  treatment: Treatment;
  sessions: Session[];
}