import { Component, Input, OnInit, signal, computed, effect } from '@angular/core';
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
import { FormConfig } from '../../../../../shared/models/form.model';
import { ButtonUI } from '../../../../../shared/ui/button/button';
import { forkJoin } from 'rxjs';
import { Session, Treatment, TreatmentWithSessions } from '../../models/patients.model';
import { PhysiosService } from '../../../physios/services/physios.service';


@Component({
  selector: 'app-sessions-history',
  standalone: true,
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
  ],
  templateUrl: './sessions-history.html',
  styleUrl: './sessions-history.scss',
})
export class SessionsHistory implements OnInit {
  @Input() patientId!: string;

  treatmentsWithSessions = signal<TreatmentWithSessions[]>([]);
  allTreatments = signal<Treatment[]>([]);
  allPhysios = signal<any[]>([]);
  loading = signal<boolean>(false);
  showForm = signal<boolean>(false);
  selectedSession = signal<Session | undefined>(undefined);
  editingId = signal<string | null>(null);

  sessionFormConfig = computed<FormConfig | null>(() => {
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
              value: new Date().toISOString().split('T')[0],
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

  constructor(
    private sessionsService: SessionsService,
    private treatmentsService: TreatmentsService,
    private physiosService: PhysiosService
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loading.set(true);

    forkJoin({
      treatments: this.treatmentsService.getAllByPatient(this.patientId),
      sessions: this.sessionsService.getAllByPatient(this.patientId),
      physios: this.physiosService.getAllPhysios(),
    }).subscribe({
      next: ({ treatments, sessions, physios }) => {

        this.allTreatments.set(treatments);
        this.allPhysios.set(physios);

        let selectedTreatments: Treatment[] = [];

        const activeTreatments = treatments.filter((t) => t.status === 'active');

        if (activeTreatments.length > 0) {
          selectedTreatments = activeTreatments;
        } else if (treatments.length > 0) {
          const sortedTreatments = [...treatments].sort(
            (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
          );
          selectedTreatments = [sortedTreatments[0]];
        }

        const grouped = selectedTreatments.map((treatment) => ({
          treatment,
          sessions: sessions
            .filter((s) => s.treatment_id === treatment.id)
            .sort(
              (a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
            ),
        }));

        this.treatmentsWithSessions.set(grouped);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
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
        session_date: this.formatDateForApi(session.session_date),
        duration: session.duration,
        techniques_applied: session.techniques_applied,
        patient_evolution: session.patient_evolution,
        observations: session.observations,
        next_appointment: session.next_appointment
          ? this.formatDateForApi(session.next_appointment)
          : undefined,
      })
      .subscribe({
        next: () => {
          this.editingId.set(null);
          this.loadAllData();
          this.showSuccessNotification('Sesión actualizada correctamente');
        },
        error: (error) => {
          this.showErrorNotification('Error al actualizar la sesión');
        },
      });
  }

  onDelete(session: Session): void {
    if (confirm('¿Estás seguro de que deseas eliminar esta sesión?')) {
      this.sessionsService.delete(session.id).subscribe({
        next: () => {
          this.loadAllData();
          this.showSuccessNotification('Sesión eliminada correctamente');
        },
        error: (error) => {
          this.showErrorNotification('Error al eliminar la sesión');
        },
      });
    }
  }

  onSubmitSession(sessionData: any): void {
    const formattedData = {
      patient_id: this.patientId,
      treatment_id: sessionData.treatment_id || undefined,
      physio_id: sessionData.physio_id,
      session_date: sessionData.session_date,
      duration: Number(sessionData.duration),
      techniques_applied: sessionData.techniques_applied,
      patient_evolution: sessionData.patient_evolution,
      observations: sessionData.observations || undefined,
      next_appointment: sessionData.next_appointment || undefined,
    };

    this.sessionsService.create(formattedData).subscribe({
      next: () => {
        this.showSuccessNotification('Sesión creada correctamente');
        this.showForm.set(false);
        this.loadAllData();
      },
      error: (error) => {
        this.showErrorNotification('Error al crear la sesión');
      },
    });
  }

  onCancelForm(): void {
    this.showForm.set(false);
    this.selectedSession.set(undefined);
  }

  formatDate(date: Date | string): string {
    if (!date) return 'No especificada';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES');
  }

  formatDateForApi(date: Date | string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getPhysioName(session: Session): string {
    if (session.physio) {
      return `${session.physio.name} ${session.physio.surname}`;
    }
    return 'Fisioterapeuta no especificado';
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
    alert(message);
  }

  private showErrorNotification(message: string): void {
    alert(message);
  }
}
