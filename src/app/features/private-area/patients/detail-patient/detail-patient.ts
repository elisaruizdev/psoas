import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PatientsService } from '../services/patients.service';
import { Patient } from '../models/patients.model';
import { Form } from '../../../../shared/ui/form/form';
import { FormConfig } from '../../../../shared/models/form.model';
import { MenuDetailPatientComponent } from './menu-detail-patient/menu-detail-patient';
import { ClinicalHistory } from './clinical-history/clinical-history';
import { Treatments } from './treatments/treatments';
import { SessionsHistory } from './sessions-history/sessions-history';

@Component({
  selector: 'app-detail-patient',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    Form,
    MenuDetailPatientComponent,
    ClinicalHistory,
    Treatments,
    SessionsHistory
  ],
  templateUrl: './detail-patient.html',
  styleUrl: './detail-patient.scss',
})
export class DetailPatient implements OnInit {
  patient = signal<Patient | null>(null);
  patientFormConfig = signal<FormConfig | null>(null);
  activeTab: 'clinical' | 'treatments' | 'sessions' = 'clinical';
  loading = signal<boolean>(true);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: string },
    private dialogRef: MatDialogRef<DetailPatient>,
    private patientsService: PatientsService
  ) {}

  ngOnInit(): void {
    this.loadPatientData();
  }

  private loadPatientData(): void {
    this.loading.set(true);
    this.patientsService.getPatientById(this.data.id).subscribe({
      next: (patient) => {
        this.patient.set(patient);
        this.initializeFormConfig();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar paciente:', error);
        this.loading.set(false);
        this.showErrorNotification('Error al cargar los datos del paciente');
      },
    });
  }

  private initializeFormConfig(): void {
    const patient = this.patient();
    if (!patient) return;

    this.patientFormConfig.set({
      sections: [
        {
          title: 'Datos de Contacto',
          fields: [
            {
              name: 'phone',
              label: 'Teléfono',
              type: 'tel',
              placeholder: '612 345 678',
              required: true,
              value: patient.phone || '',
              validators: [Validators.pattern(/^(\+34|0034|34)?[6789]\d{8}$/)],
            },
            {
              name: 'email',
              label: 'Email',
              type: 'email',
              placeholder: 'paciente@email.com',
              required: true,
              value: patient.email || '',
              validators: [Validators.email],
            },
          ],
        },
        {
          title: 'Ubicación',
          fields: [
            {
              name: 'address',
              label: 'Dirección Completa',
              type: 'text',
              placeholder: 'Calle, número, piso, puerta',
              required: false,
              value: patient.address || '',
              cssClass: 'form-field--full',
            },
            {
              name: 'city',
              label: 'Ciudad',
              type: 'text',
              placeholder: 'Madrid',
              required: false,
              value: patient.city || '',
            },
            {
              name: 'zip',
              label: 'Código Postal',
              type: 'text',
              placeholder: '28001',
              required: false,
              value: patient.zip || '',
              validators: [Validators.pattern(/^[0-9]{5}$/)],
            },
          ],
        },
        {
          title: 'Información Médica',
          fields: [
            {
              name: 'emergency_contact',
              label: 'Contacto de Emergencia',
              type: 'text',
              placeholder: 'Nombre y teléfono',
              required: false,
              value: patient.emergency_contact || '',
              cssClass: 'form-field--full',
            },
            {
              name: 'health_insurance',
              label: 'Seguro Médico',
              type: 'text',
              placeholder: 'Compañía de seguro',
              required: false,
              value: patient.health_insurance || '',
            },
          ],
        },
      ],
    });
  }

  onSubmitPatient(patientData: any): void {
    const patient = this.patient();
    if (!patient) return;

    const formattedData = this.formatPatientData(patientData);

    this.patientsService.updatePatient(patient.id, formattedData).subscribe({
      next: () => {
        this.showSuccessNotification('Paciente actualizado correctamente');
        this.dialogRef.close({ action: 'updated' });
      },
      error: (error) => {
        console.error('Error al actualizar:', error);
        this.showErrorNotification('Error al actualizar el paciente');
      },
    });
  }

  onDelete(): void {
    const patient = this.patient();
    if (!patient) return;

    if (confirm('¿Estás seguro de que deseas eliminar este paciente?')) {
      this.dialogRef.close({ action: 'delete', id: patient.id });
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onTabChange(tab: 'clinical' | 'treatments' | 'sessions'): void {
    this.activeTab = tab;
  }

  private formatPatientData(data: any) {
    return {
      phone: data.phone?.replace(/\s/g, ''),
      email: data.email?.toLowerCase().trim(),
      address: data.address?.trim() || undefined,
      city: data.city ? this.capitalizeText(data.city) : undefined,
      zip: data.zip?.trim() || undefined,
      emergency_contact: data.emergency_contact?.trim() || undefined,
      health_insurance: data.health_insurance?.trim() || undefined,
    };
  }

  private capitalizeText(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getFullName(): string {
    const patient = this.patient();
    if (!patient) return '';

    const parts = [patient.name, patient.surname];
    if (patient.second_surname) {
      parts.push(patient.second_surname);
    }
    return parts.join(' ');
  }

  formatDate(date: Date | string | null): string {
    if (!date) return 'No especificado';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES');
  }

  private showSuccessNotification(message: string): void {
    alert(message);
  }

  private showErrorNotification(message: string): void {
    console.error('ERROR:', message);
    alert(message);
  }
}
