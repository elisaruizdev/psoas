import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DiagnosesService } from '../../services/diagnoses.service';
import { Form } from '../../../../../shared/ui/form/form';
import { FormConfig } from '../../../../../shared/models/form.model';
import { Diagnosis } from '../../models/patients.model';
import { ButtonUI } from '../../../../../shared/ui/button/button';

@Component({
  selector: 'app-clinical-history',
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
    ButtonUI
  ],
  templateUrl: './clinical-history.html',
  styleUrl: './clinical-history.scss',
})
export class ClinicalHistory implements OnInit {
  @Input() patientId!: string;

  diagnoses = signal<Diagnosis[]>([]);
  loading = signal<boolean>(false);
  showForm = signal<boolean>(false);
  selectedDiagnosis = signal<Diagnosis | undefined>(undefined);
  editingId = signal<string | null>(null);
  diagnosisFormConfig = signal<FormConfig | null>(null);

  constructor(private diagnosesService: DiagnosesService) {}

  ngOnInit(): void {
    this.loadDiagnoses();
  }

  loadDiagnoses(): void {
    this.loading.set(true);
    this.diagnosesService.getAllByPatient(this.patientId).subscribe({
      next: (diagnoses) => {
        this.diagnoses.set(diagnoses);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar diagnósticos:', error);
        this.loading.set(false);
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
        diagnosis_date: this.formatDateForApi(diagnosis.diagnosis_date),
        diagnosis_type: diagnosis.diagnosis_type,
        description: diagnosis.description,
        observations: diagnosis.observations,
        status: diagnosis.status,
      })
      .subscribe({
        next: () => {
          this.editingId.set(null);
          this.loadDiagnoses();
          this.showSuccessNotification('Diagnóstico actualizado correctamente');
        },
        error: (error) => {
          console.error('Error al actualizar diagnóstico:', error);
          this.showErrorNotification('Error al actualizar el diagnóstico');
        },
      });
  }

  onDelete(diagnosis: Diagnosis): void {
    if (confirm('¿Estás seguro de que deseas eliminar este diagnóstico?')) {
      this.diagnosesService.delete(diagnosis.id).subscribe({
        next: () => {
          this.loadDiagnoses();
          this.showSuccessNotification('Diagnóstico eliminado correctamente');
        },
        error: (error) => {
          console.error('Error al eliminar diagnóstico:', error);
          this.showErrorNotification('Error al eliminar el diagnóstico');
        },
      });
    }
  }

  onSubmitDiagnosis(diagnosisData: any): void {
    const formattedData = {
      patient_id: this.patientId,
      diagnosis_date: diagnosisData.diagnosis_date,
      diagnosis_type: diagnosisData.diagnosis_type,
      description: diagnosisData.description,
      observations: diagnosisData.observations || '',
      status: diagnosisData.status,
    };

    this.diagnosesService.create(formattedData).subscribe({
      next: () => {
        this.showSuccessNotification('Diagnóstico creado correctamente');
        this.showForm.set(false);
        this.loadDiagnoses();
      },
      error: (error) => {
        console.error('Error al crear diagnóstico:', error);
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
              value: new Date().toISOString().split('T')[0],
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

  getStatusLabel(status: string): string {
    return status === 'active' ? 'Activo' : 'Resuelto';
  }

  getStatusColor(status: string): 'primary' | 'accent' {
    return status === 'active' ? 'primary' : 'accent';
  }

  isEditing(diagnosisId: string): boolean {
    return this.editingId() === diagnosisId;
  }

  private showSuccessNotification(message: string): void {
    alert(message);
  }

  private showErrorNotification(message: string): void {
    console.error('ERROR:', message);
    alert(message);
  }
}
