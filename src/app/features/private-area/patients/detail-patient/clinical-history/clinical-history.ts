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
import { DiagnosesService } from '../../services/diagnoses.service';
import { Form } from '../../../../../shared/ui/form/form';
import { FormConfig, FormValue, formChoice, formText } from '../../../../../shared/models/form.model';
import { Diagnosis, diagnosisStatusLabel } from '../../models/patients.model';
import { ButtonUI } from '../../../../../shared/ui/button/button';
import { NotificationService } from '../../../../../shared/notifications/notification.service';
import { DisplayDatePipe } from '../../../../../shared/pipes/display-date.pipe';
import { localIsoDate } from '../../../../../shared/utils/dates';

@Component({
  selector: 'app-clinical-history',
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
    DisplayDatePipe
  ],
  templateUrl: './clinical-history.html',
  styleUrl: './clinical-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClinicalHistory implements OnInit {
  private diagnosesService = inject(DiagnosesService);
  private destroyRef = inject(DestroyRef);

  readonly statusLabel = diagnosisStatusLabel;

  readonly patientId = input.required<string>();

  readonly diagnoses = signal<Diagnosis[]>([]);
  readonly loading = signal<boolean>(false);
  readonly showForm = signal<boolean>(false);
  readonly selectedDiagnosis = signal<Diagnosis | undefined>(undefined);
  readonly editingId = signal<string | null>(null);
  readonly diagnosisFormConfig = signal<FormConfig | null>(null);

  private readonly notifications = inject(NotificationService);
  /** true mientras se guarda: el formulario desactiva el botón de enviar. */
  readonly saving = signal(false);

  ngOnInit(): void {
    this.loadDiagnoses();
  }

  loadDiagnoses(): void {
    this.loading.set(true);
    this.diagnosesService.getAllByPatient(this.patientId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (diagnoses) => {
        this.diagnoses.set(diagnoses);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.showErrorNotification('No se han podido cargar los diagnósticos');
      },
    });
  }

  onNewDiagnosis(): void {
    this.selectedDiagnosis.set(undefined);
    this.editingId.set(null);
    this.initializeDiagnosisForm();
    this.showForm.set(true);
  }

  onEdit(diagnosis: Diagnosis): void {
    this.editingId.set(diagnosis.id);
  }

  onCancelEdit(): void {
    this.editingId.set(null);
  }

  onSaveEdit(diagnosis: Diagnosis): void {
    this.diagnosesService
      .update(diagnosis.id, {
        diagnosis_date: localIsoDate(diagnosis.diagnosis_date),
        diagnosis_type: diagnosis.diagnosis_type,
        description: diagnosis.description,
        observations: diagnosis.observations,
        status: diagnosis.status,
      })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.editingId.set(null);
          this.loadDiagnoses();
          this.showSuccessNotification('Diagnóstico actualizado correctamente');
        },
        error: () => {
          this.showErrorNotification('Error al actualizar el diagnóstico');
        },
      });
  }

  onDelete(diagnosis: Diagnosis): void {
    if (confirm('¿Estás seguro de que deseas eliminar este diagnóstico?')) {
      this.diagnosesService.delete(diagnosis.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.loadDiagnoses();
          this.showSuccessNotification('Diagnóstico eliminado correctamente');
        },
        error: () => {
          this.showErrorNotification('Error al eliminar el diagnóstico');
        },
      });
    }
  }

  onSubmitDiagnosis(diagnosisData: FormValue): void {
    const formattedData = {
      patient_id: this.patientId(),
      diagnosis_date: formText(diagnosisData, 'diagnosis_date') ?? '',
      diagnosis_type: formText(diagnosisData, 'diagnosis_type') ?? '',
      description: formText(diagnosisData, 'description') ?? '',
      observations: formText(diagnosisData, 'observations') || '',
      status: formChoice(diagnosisData, 'status', ['active', 'resolved'] as const),
    };

    this.saving.set(true);
    this.diagnosesService.create(formattedData).pipe(
      finalize(() => this.saving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.showSuccessNotification('Diagnóstico creado correctamente');
        this.showForm.set(false);
        this.loadDiagnoses();
      },
      error: () => {
        this.showErrorNotification('Error al crear el diagnóstico');
      },
    });
  }

  onCancelForm(): void {
    this.showForm.set(false);
    this.selectedDiagnosis.set(undefined);
  }

  private initializeDiagnosisForm(): void {
    this.diagnosisFormConfig.set({
      sections: [
        {
          title: 'Información del Diagnóstico',
          fields: [
            {
              name: 'diagnosis_date',
              label: 'Fecha del diagnóstico',
              type: 'date',
              required: true,
              value: localIsoDate(),
            },
            {
              name: 'diagnosis_type',
              label: 'Tipo de diagnóstico',
              type: 'text',
              placeholder: 'Ej: Lumbalgia, Tendinitis...',
              required: true,
              value: '',
            },
            {
              name: 'description',
              label: 'Descripción',
              type: 'textarea',
              placeholder: 'Descripción detallada del diagnóstico',
              required: true,
              value: '',
              cssClass: 'form-field--full',
            },
            {
              name: 'observations',
              label: 'Observaciones',
              type: 'textarea',
              placeholder: 'Observaciones adicionales (opcional)',
              required: false,
              value: '',
              cssClass: 'form-field--full',
            },
            {
              name: 'status',
              label: 'Estado',
              type: 'select',
              required: true,
              value: 'active',
              options: [
                { value: 'active', label: 'Activo' },
                { value: 'resolved', label: 'Resuelto' },
              ],
            },
          ],
        },
      ],
    });
  }



  getStatusColor(status: string): 'primary' | 'accent' {
    return status === 'active' ? 'primary' : 'accent';
  }

  isEditing(diagnosisId: string): boolean {
    return this.editingId() === diagnosisId;
  }

  private showSuccessNotification(message: string): void {
    this.notifications.success(message);
  }

  private showErrorNotification(message: string): void {
    this.notifications.error(message);
  }
}
