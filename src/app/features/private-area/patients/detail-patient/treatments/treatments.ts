import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, signal, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TreatmentsService } from '../../services/treatments.service';
import { Form } from '../../../../../shared/ui/form/form';
import { FormConfig, FormValue, formChoice, formText } from '../../../../../shared/models/form.model';
import { ButtonUI } from '../../../../../shared/ui/button/button';
import { Treatment, treatmentStatusLabel } from '../../models/patients.model';
import { NotificationService } from '../../../../../shared/notifications/notification.service';
import { DisplayDatePipe } from '../../../../../shared/pipes/display-date.pipe';
import { localIsoDate } from '../../../../../shared/utils/dates';

@Component({
  selector: 'app-treatments',
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
  ],
  templateUrl: './treatments.html',
  styleUrl: './treatments.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Treatments implements OnInit {
  private treatmentsService = inject(TreatmentsService);
  private destroyRef = inject(DestroyRef);

  readonly statusLabel = treatmentStatusLabel;

  readonly patientId = input.required<string>();

  readonly treatments = signal<Treatment[]>([]);
  readonly loading = signal<boolean>(false);
  readonly showForm = signal<boolean>(false);
  readonly selectedTreatment = signal<Treatment | undefined>(undefined);
  readonly editingId = signal<string | null>(null);
  readonly treatmentFormConfig = signal<FormConfig | null>(null);

  private readonly notifications = inject(NotificationService);
  /** true mientras se guarda: el formulario desactiva el botón de enviar. */
  readonly saving = signal(false);

  ngOnInit(): void {
    this.loadTreatments();
  }

  loadTreatments(): void {
    this.loading.set(true);
    this.treatmentsService.getAllByPatient(this.patientId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (treatments) => {
        this.treatments.set(treatments);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.showErrorNotification('No se han podido cargar los tratamientos');
      },
    });
  }

  onNewTreatment(): void {
    this.selectedTreatment.set(undefined);
    this.editingId.set(null);
    this.initializeTreatmentForm();
    this.showForm.set(true);
  }

  onEdit(treatment: Treatment): void {
    this.editingId.set(treatment.id);
  }

  onCancelEdit(): void {
    this.editingId.set(null);
  }

  onSaveEdit(treatment: Treatment): void {
    this.treatmentsService
      .update(treatment.id, {
        treatment_name: treatment.treatment_name,
        start_date: localIsoDate(treatment.start_date),
        end_date: treatment.end_date ? localIsoDate(treatment.end_date) : undefined,
        description: treatment.description,
        objectives: treatment.objectives,
        sessions_planned: treatment.sessions_planned,
        status: treatment.status,
      })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.editingId.set(null);
          this.loadTreatments();
          this.showSuccessNotification('Tratamiento actualizado correctamente');
        },
        error: () => {
          this.showErrorNotification('Error al actualizar el tratamiento');
        },
      });
  }

  onDelete(treatment: Treatment): void {
    if (confirm('¿Estás seguro de que deseas eliminar este tratamiento?')) {
      this.treatmentsService.delete(treatment.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.loadTreatments();
          this.showSuccessNotification('Tratamiento eliminado correctamente');
        },
        error: () => {
          this.showErrorNotification('Error al eliminar el tratamiento');
        },
      });
    }
  }

  onSubmitTreatment(treatmentData: FormValue): void {
    const sessionsPlanned = treatmentData['sessions_planned'];
    const formattedData = {
      patient_id: this.patientId(),
      treatment_name: formText(treatmentData, 'treatment_name') ?? '',
      start_date: formText(treatmentData, 'start_date') ?? '',
      end_date: formText(treatmentData, 'end_date') || undefined,
      description: formText(treatmentData, 'description') ?? '',
      objectives: formText(treatmentData, 'objectives') ?? '',
      sessions_planned: sessionsPlanned ? Number(sessionsPlanned) : undefined,
      status: formChoice(treatmentData, 'status', ['active', 'completed', 'paused'] as const),
    };

    this.saving.set(true);
    this.treatmentsService.create(formattedData).pipe(
      finalize(() => this.saving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.showSuccessNotification('Tratamiento creado correctamente');
        this.showForm.set(false);
        this.loadTreatments();
      },
      error: () => {
        this.showErrorNotification('Error al crear el tratamiento');
      },
    });
  }

  onCancelForm(): void {
    this.showForm.set(false);
    this.selectedTreatment.set(undefined);
  }

  private initializeTreatmentForm(): void {
    this.treatmentFormConfig.set({
      sections: [
        {
          title: 'Información del Tratamiento',
          fields: [
            {
              name: 'treatment_name',
              label: 'Nombre del tratamiento',
              type: 'text',
              placeholder: 'Ej: Rehabilitación de hombro',
              required: true,
              value: '',
              cssClass: 'form-field--full',
            },
            {
              name: 'start_date',
              label: 'Fecha de inicio',
              type: 'date',
              required: true,
              value: localIsoDate(),
            },
            {
              name: 'end_date',
              label: 'Fecha de fin (opcional)',
              type: 'date',
              required: false,
              value: '',
            },
            {
              name: 'description',
              label: 'Descripción',
              type: 'textarea',
              placeholder: 'Descripción detallada del tratamiento',
              required: true,
              value: '',
              cssClass: 'form-field--full',
            },
            {
              name: 'objectives',
              label: 'Objetivos',
              type: 'textarea',
              placeholder: 'Objetivos del tratamiento',
              required: true,
              value: '',
              cssClass: 'form-field--full',
            },
            {
              name: 'sessions_planned',
              label: 'Sesiones planificadas (opcional)',
              type: 'number',
              placeholder: 'Número de sesiones',
              required: false,
              value: '',
            },
            {
              name: 'status',
              label: 'Estado',
              type: 'select',
              required: true,
              value: 'active',
              options: [
                { value: 'active', label: 'Activo' },
                { value: 'completed', label: 'Completado' },
                { value: 'paused', label: 'Pausado' },
              ],
            },
          ],
        },
      ],
    });
  }



  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    const colorMap: { [key: string]: 'primary' | 'accent' | 'warn' } = {
      active: 'primary',
      completed: 'accent',
      paused: 'warn',
    };
    return colorMap[status] || 'primary';
  }

  isEditing(treatmentId: string): boolean {
    return this.editingId() === treatmentId;
  }

  private showSuccessNotification(message: string): void {
    this.notifications.success(message);
  }

  private showErrorNotification(message: string): void {
    this.notifications.error(message);
  }
}
