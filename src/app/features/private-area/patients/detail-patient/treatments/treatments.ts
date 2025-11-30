import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TreatmentsService } from '../../services/treatments.service';
import { Form } from '../../../../../shared/ui/form/form';
import { FormConfig } from '../../../../../shared/models/form.model';
import { ButtonUI } from '../../../../../shared/ui/button/button';
import { Treatment } from '../../models/patients.model';

@Component({
  selector: 'app-treatments',
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
  templateUrl: './treatments.html',
  styleUrl: './treatments.scss',
})
export class Treatments implements OnInit {
  @Input() patientId!: string;

  treatments = signal<Treatment[]>([]);
  loading = signal<boolean>(false);
  showForm = signal<boolean>(false);
  selectedTreatment = signal<Treatment | undefined>(undefined);
  editingId = signal<string | null>(null);
  treatmentFormConfig = signal<FormConfig | null>(null);

  constructor(private treatmentsService: TreatmentsService) {}

  ngOnInit(): void {
    this.loadTreatments();
  }

  loadTreatments(): void {
    this.loading.set(true);
    this.treatmentsService.getAllByPatient(this.patientId).subscribe({
      next: (treatments) => {
        this.treatments.set(treatments);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar tratamientos:', error);
        this.loading.set(false);
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
        start_date: this.formatDateForApi(treatment.start_date),
        end_date: treatment.end_date ? this.formatDateForApi(treatment.end_date) : undefined,
        description: treatment.description,
        objectives: treatment.objectives,
        sessions_planned: treatment.sessions_planned,
        status: treatment.status,
      })
      .subscribe({
        next: () => {
          this.editingId.set(null);
          this.loadTreatments();
          this.showSuccessNotification('Tratamiento actualizado correctamente');
        },
        error: (error) => {
          console.error('Error al actualizar tratamiento:', error);
          this.showErrorNotification('Error al actualizar el tratamiento');
        },
      });
  }

  onDelete(treatment: Treatment): void {
    if (confirm('¿Estás seguro de que deseas eliminar este tratamiento?')) {
      this.treatmentsService.delete(treatment.id).subscribe({
        next: () => {
          this.loadTreatments();
          this.showSuccessNotification('Tratamiento eliminado correctamente');
        },
        error: (error) => {
          console.error('Error al eliminar tratamiento:', error);
          this.showErrorNotification('Error al eliminar el tratamiento');
        },
      });
    }
  }

  onSubmitTreatment(treatmentData: any): void {
    const formattedData = {
      patient_id: this.patientId,
      treatment_name: treatmentData.treatment_name,
      start_date: treatmentData.start_date,
      end_date: treatmentData.end_date || undefined,
      description: treatmentData.description,
      objectives: treatmentData.objectives,
      sessions_planned: treatmentData.sessions_planned ? Number(treatmentData.sessions_planned) : undefined,
      status: treatmentData.status,
    };

    this.treatmentsService.create(formattedData).subscribe({
      next: () => {
        this.showSuccessNotification('Tratamiento creado correctamente');
        this.showForm.set(false);
        this.loadTreatments();
      },
      error: (error) => {
        console.error('Error al crear tratamiento:', error);
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
              value: new Date().toISOString().split('T')[0],
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
    const statusMap: { [key: string]: string } = {
      active: 'Activo',
      completed: 'Completado',
      paused: 'Pausado',
    };
    return statusMap[status] || status;
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
    alert(message);
  }

  private showErrorNotification(message: string): void {
    console.error('ERROR:', message);
    alert(message);
  }
}
