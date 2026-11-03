import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, signal, computed, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SessionsService } from '../../services/sessions.service';
import { TreatmentsService } from '../../services/treatments.service';
import { Form } from '../../../../../shared/ui/form/form';
import { FormConfig, FormValue, formText } from '../../../../../shared/models/form.model';
import { ButtonUI } from '../../../../../shared/ui/button/button';
import { forkJoin, finalize } from 'rxjs';
import { Session, Treatment, TreatmentWithSessions } from '../../models/patients.model';
import { PhysiosService } from '../../../physios/services/physios.service';
import { Physio } from '../../../physios/models/physios.model';
import { NotificationService } from '../../../../../shared/notifications/notification.service';
import { DisplayDatePipe } from '../../../../../shared/pipes/display-date.pipe';
import { FullNamePipe } from '../../../../../shared/pipes/full-name.pipe';
import { groupSessionsByTreatment } from './group-sessions';
import { localIsoDate } from '../../../../../shared/utils/dates';


@Component({
  selector: 'app-sessions-history',
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    Form,
    ButtonUI,
    DisplayDatePipe,
    FullNamePipe,
  ],
  templateUrl: './sessions-history.html',
  styleUrl: './sessions-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionsHistory implements OnInit {
  private sessionsService = inject(SessionsService);
  private treatmentsService = inject(TreatmentsService);
  private physiosService = inject(PhysiosService);
  private destroyRef = inject(DestroyRef);

  readonly patientId = input.required<string>();

  readonly treatmentsWithSessions = signal<TreatmentWithSessions[]>([]);
  readonly allTreatments = signal<Treatment[]>([]);
  readonly allPhysios = signal<Physio[]>([]);
  readonly loading = signal<boolean>(false);
  readonly showForm = signal<boolean>(false);
  readonly selectedSession = signal<Session | undefined>(undefined);
  readonly editingId = signal<string | null>(null);

  readonly sessionFormConfig = computed<FormConfig | null>(() => {
    if (!this.showForm()) return null;

    const treatments = this.allTreatments();
    const physios = this.allPhysios();

    if (physios.length === 0) {
      return null;
    }

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
                    label: `${p.name} ${p.surname}`,
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
  });

  private readonly notifications = inject(NotificationService);
  /** true mientras se guarda: el formulario desactiva el botón de enviar. */
  readonly saving = signal(false);

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loading.set(true);

    forkJoin({
      treatments: this.treatmentsService.getAllByPatient(this.patientId()),
      sessions: this.sessionsService.getAllByPatient(this.patientId()),
      physios: this.physiosService.getAllPhysios(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ treatments, sessions, physios }) => {

        this.allTreatments.set(treatments);
        this.allPhysios.set(physios);

        this.treatmentsWithSessions.set(groupSessionsByTreatment(treatments, sessions));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.showErrorNotification('No se han podido cargar las sesiones');
      },
    });
  }

  onNewSession(): void {
    this.selectedSession.set(undefined);
    this.editingId.set(null);
    this.showForm.set(true);
  }

  onEdit(session: Session): void {
    this.editingId.set(session.id);
  }

  onCancelEdit(): void {
    this.editingId.set(null);
  }

  onSaveEdit(session: Session): void {
    this.sessionsService
      .update(session.id, {
        treatment_id: session.treatment_id,
        physio_id: session.physio_id,
        session_date: localIsoDate(session.session_date),
        duration: session.duration,
        techniques_applied: session.techniques_applied,
        patient_evolution: session.patient_evolution,
        observations: session.observations,
        next_appointment: session.next_appointment
          ? localIsoDate(session.next_appointment)
          : undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.editingId.set(null);
          this.loadAllData();
          this.showSuccessNotification('Sesión actualizada correctamente');
        },
        error: () => {
          this.showErrorNotification('Error al actualizar la sesión');
        },
      });
  }

  onDelete(session: Session): void {
    if (confirm('¿Estás seguro de que deseas eliminar esta sesión?')) {
      this.sessionsService.delete(session.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.loadAllData();
          this.showSuccessNotification('Sesión eliminada correctamente');
        },
        error: () => {
          this.showErrorNotification('Error al eliminar la sesión');
        },
      });
    }
  }

  onSubmitSession(sessionData: FormValue): void {
    const formattedData = {
      patient_id: this.patientId(),
      treatment_id: formText(sessionData, 'treatment_id') || undefined,
      physio_id: Number(sessionData['physio_id']),
      session_date: formText(sessionData, 'session_date') ?? '',
      duration: Number(sessionData['duration']),
      techniques_applied: formText(sessionData, 'techniques_applied') ?? '',
      patient_evolution: formText(sessionData, 'patient_evolution') ?? '',
      observations: formText(sessionData, 'observations') || undefined,
      next_appointment: formText(sessionData, 'next_appointment') || undefined,
    };

    this.saving.set(true);
    this.sessionsService.create(formattedData).pipe(
      finalize(() => this.saving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.showSuccessNotification('Sesión creada correctamente');
        this.showForm.set(false);
        this.loadAllData();
      },
      error: () => {
        this.showErrorNotification('Error al crear la sesión');
      },
    });
  }

  onCancelForm(): void {
    this.showForm.set(false);
    this.selectedSession.set(undefined);
  }




  getSessionsCount(treatment: Treatment): string {
    const sessions =
      this.treatmentsWithSessions().find((t) => t.treatment.id === treatment.id)?.sessions.length ||
      0;
    const planned = treatment.sessions_planned || '∞';
    return `${sessions} de ${planned} sesiones`;
  }

  isEditing(sessionId: string): boolean {
    return this.editingId() === sessionId;
  }

  private showSuccessNotification(message: string): void {
    this.notifications.success(message);
  }

  private showErrorNotification(message: string): void {
    this.notifications.error(message);
  }
}
