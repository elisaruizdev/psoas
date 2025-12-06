import { Component, OnInit, signal } from '@angular/core';
import { Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Modal } from '../../../../shared/ui/modal/modal';
import { Form } from '../../../../shared/ui/form/form';
import { FormConfig } from '../../../../shared/models/form.model';
import { CreatePatient } from '../models/patients.model';
import { PatientsService } from '../services/patients.service';

@Component({
  selector: 'app-new-patient',
  standalone: true,
  imports: [Modal, Form],
  templateUrl: './new-patient.html',
  styleUrl: './new-patient.scss',
})
export class NewPatient implements OnInit {
  patientFormConfig = signal<FormConfig | null>(null);

  constructor(
    private dialogRef: MatDialogRef<NewPatient>,
    private patientsService: PatientsService
  ) {}

  ngOnInit(): void {
    this.initializeFormConfig();
  }

  private initializeFormConfig(): void {
    this.patientFormConfig.set({
      sections: [
        {
          title: 'Datos Personales',
          fields: [
            {
              name: 'name',
              label: 'Nombre',
              type: 'text',
              placeholder: 'Nombre',
              required: true,
              validators: [Validators.minLength(2)],
            },
            {
              name: 'surname',
              label: 'Primer apellido',
              type: 'text',
              placeholder: 'Primer apellido',
              required: true,
              validators: [Validators.minLength(2)],
            },
            {
              name: 'second_surname',
              label: 'Segundo apellido',
              type: 'text',
              placeholder: 'Segundo apellido',
              required: true,
              validators: [Validators.minLength(2)],
            },
            {
              name: 'identifier',
              label: 'DNI/NIE',
              type: 'text',
              placeholder: '12345678A',
              required: true,
              validators: [Validators.pattern(/^[0-9]{8}[A-Z]$|^[XYZ][0-9]{7}[A-Z]$/)],
            },
            {
              name: 'birthdate',
              label: 'Fecha de Nacimiento',
              type: 'date',
              placeholder: 'dd/mm/aaaa',
              required: true,
            },
            {
              name: 'gender',
              label: 'Género',
              type: 'select',
              placeholder: 'Seleccione...',
              required: false,
              options: [
                { value: 'masculino', label: 'Masculino' },
                { value: 'femenino', label: 'Femenino' },
                { value: 'otro', label: 'Otro' },
              ],
            },
            {
              name: 'health_insurance',
              label: 'Seguro Médico',
              type: 'text',
              placeholder: 'Compañía de seguro',
              required: false,
            },
          ],
        },
        {
          title: 'Datos de Contacto',
          fields: [
            {
              name: 'phone',
              label: 'Teléfono',
              type: 'tel',
              placeholder: '612 345 678',
              required: true,
              validators: [Validators.pattern(/^(\+34|0034|34)?[6789]\d{8}$/)],
            },
            {
              name: 'email',
              label: 'Email',
              type: 'email',
              placeholder: 'paciente@email.com',
              required: true,
              validators: [Validators.email],
            },
            {
              name: 'address',
              label: 'Dirección Completa',
              type: 'text',
              placeholder: 'Calle, número, piso, puerta',
              required: true,
              cssClass: 'form-field--full',
            },
            {
              name: 'city',
              label: 'Ciudad',
              type: 'text',
              placeholder: 'Madrid',
              required: true,
            },
            {
              name: 'zip',
              label: 'Código Postal',
              type: 'text',
              placeholder: '28001',
              required: true,
              validators: [Validators.pattern(/^[0-9]{5}$/)],
            },
            {
              name: 'emergency_contact',
              label: 'Contacto de Emergencia',
              type: 'text',
              placeholder: 'Nombre y teléfono',
              required: false,
              cssClass: 'form-field--full',
            },
          ],
        },
        {
          title: 'Información Médica Inicial',
          subtitle: '(Opcional)',
          fields: [
            {
              name: 'consultation_reason',
              label: 'Motivo de Consulta',
              type: 'textarea',
              placeholder: '¿Por qué acude el paciente?',
              rows: 4,
              required: false,
              cssClass: 'form-field--full',
            },
            {
              name: 'medical_history',
              label: 'Antecedentes Médicos',
              type: 'textarea',
              placeholder: 'Enfermedades previas, cirugías, alergias, medicación actual...',
              rows: 4,
              required: false,
              cssClass: 'form-field--full',
            },
          ],
        },
      ],
    });
  }

  onSubmitPatient(patientData: any): void {
    const formattedData: CreatePatient = this.formatPatientData(patientData);

    this.patientsService.createPatient(formattedData).subscribe({
      next: () => {
        this.showSuccessNotification('Paciente creado correctamente');
        this.dialogRef.close({ action: 'created' });
      },
      error: (error) => {
        console.error('Error al crear paciente:', error);
        if (error.status === 409) {
          this.showErrorNotification(
            error.error.message || 'Ya existe un paciente con ese DNI/NIE'
          );
        } else if (error.status === 400) {
          this.showErrorNotification('Datos inválidos. Revisa el formulario');
        } else {
          this.showErrorNotification('Error al crear el paciente');
        }
      },
    });
  }

  onCancelForm(): void {
    this.dialogRef.close();
  }

  private formatPatientData(data: CreatePatient) {
    return {
      name: this.capitalizeText(data.name),
      surname: this.capitalizeText(data.surname),
      second_surname: data.second_surname ? this.capitalizeText(data.second_surname) : undefined,
      identifier: data.identifier?.toUpperCase().trim(),
      birthdate: data.birthdate,
      gender: data.gender || 'otro',
      phone: data.phone?.replace(/\s/g, ''),
      email: data.email?.toLowerCase().trim(),
      address: data.address?.trim() || undefined,
      city: data.city ? this.capitalizeText(data.city) : undefined,
      zip: data.zip?.trim() || undefined,
      emergency_contact: data.emergency_contact?.trim() || undefined,
      health_insurance: data.health_insurance?.trim() || undefined,
      consultation_reason: data.consultation_reason?.trim() || undefined,
      medical_history: data.medical_history?.trim() || undefined,
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

  private showSuccessNotification(message: string): void {
    alert(message);
  }

  private showErrorNotification(message: string): void {
    console.error('ERROR:', message);
    alert(message);
  }
}
