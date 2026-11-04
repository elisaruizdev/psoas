import { FormConfig, FormValue, formText } from '../../../../../shared/models/form.model';
import { localIsoDate } from '../../../../../shared/utils/dates';
import { fullName } from '../../../../../shared/utils/text';
import { Physio } from '../../../physios/models/physios.model';
import { CreateSession, Session, Treatment, UpdateSession } from '../../models/patients.model';

/** Formulario de nueva sesión: tratamiento opcional, fisio obligatorio y hoy como fecha. */
export function sessionFormConfig(treatments: Treatment[], physios: Physio[]): FormConfig {
  return {
    sections: [
      {
        title: 'Información de la sesión',
        fields: [
          {
            name: 'treatment_id',
            label: 'Tratamiento (opcional)',
            type: 'select',
            required: false,
            value: '',
            options: [
              { value: '', label: 'Sin tratamiento asociado' },
              ...treatments.map((t) => ({
                value: t.id,
                label: t.treatment_name,
              })),
            ],
          },
          {
            name: 'physio_id',
            label: 'Fisioterapeuta',
            type: 'select',
            required: true,
            value: '',
            options: [
              { value: '', label: 'Selecciona un fisioterapeuta' },
              ...physios
                .filter((p) => p && p.id_physio)
                .map((p) => ({
                  value: String(p.id_physio),
                  label: fullName(p),
                })),
            ],
          },
          {
            name: 'session_date',
            label: 'Fecha de la sesión',
            type: 'date',
            required: true,
            value: localIsoDate(),
          },
          {
            name: 'duration',
            label: 'Duración (minutos)',
            type: 'number',
            placeholder: 'Ej: 45',
            required: true,
            value: '45',
          },
          {
            name: 'techniques_applied',
            label: 'Técnicas aplicadas',
            type: 'textarea',
            placeholder: 'Describe las técnicas utilizadas en la sesión',
            required: true,
            value: '',
            cssClass: 'form-field--full',
          },
          {
            name: 'patient_evolution',
            label: 'Evolución del paciente',
            type: 'textarea',
            placeholder: 'Describe la evolución y respuesta del paciente',
            required: true,
            value: '',
            cssClass: 'form-field--full',
          },
          {
            name: 'observations',
            label: 'Observaciones (opcional)',
            type: 'textarea',
            placeholder: 'Observaciones adicionales',
            required: false,
            value: '',
            cssClass: 'form-field--full',
          },
          {
            name: 'next_appointment',
            label: 'Próxima cita (opcional)',
            type: 'date',
            required: false,
            value: '',
          },
        ],
      },
    ],
  };
}

/** Del formulario a la API: números como números y los opcionales vacíos como `undefined`. */
export function toCreateSession(patientId: string, value: FormValue): CreateSession {
  return {
    patient_id: patientId,
    treatment_id: formText(value, 'treatment_id') || undefined,
    physio_id: Number(value['physio_id']),
    session_date: formText(value, 'session_date') ?? '',
    duration: Number(value['duration']),
    techniques_applied: formText(value, 'techniques_applied') ?? '',
    patient_evolution: formText(value, 'patient_evolution') ?? '',
    observations: formText(value, 'observations') || undefined,
    next_appointment: formText(value, 'next_appointment') || undefined,
  };
}

/** Sesión editada a la API: las fechas, como fecha local (YYYY-MM-DD). */
export function toUpdateSession(session: Session): UpdateSession {
  return {
    treatment_id: session.treatment_id,
    physio_id: session.physio_id,
    session_date: localIsoDate(session.session_date),
    duration: session.duration,
    techniques_applied: session.techniques_applied,
    patient_evolution: session.patient_evolution,
    observations: session.observations,
    next_appointment: session.next_appointment ? localIsoDate(session.next_appointment) : undefined,
  };
}
