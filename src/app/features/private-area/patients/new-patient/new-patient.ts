import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Modal } from '../../../../shared/ui/modal/modal';
import { Form } from '../../../../shared/ui/form/form';
import { FormConfig, FormValue, formText } from '../../../../shared/models/form.model';
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
    private patientsService: PatientsService,
    private destroyRef: DestroyRef,
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
              icon: 'user',
              label: 'Nombre',
              type: 'text',
              placeholder: 'Nombre',
              required: true,
              validators: [Validators.minLength(2)],
            },
            {
              name: 'surname',
              icon: 'user',
              label: 'Primer apellido',
              type: 'text',
              placeholder: 'Primer apellido',
              required: true,
              validators: [Validators.minLength(2)],
            },
            {
              name: 'second_surname',
              icon: 'user',
              label: 'Segundo apellido',
              type: 'text',
              placeholder: 'Segundo apellido',
              required: true,
              validators: [Validators.minLength(2)],
            },
            {
              name: 'identifier',
              icon: 'user',
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
              icon: 'user',
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
              icon: 'list',
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
              label: 'Correo',
              type: 'email',
              placeholder: 'paciente@email.com',
              required: true,
              validators: [Validators.email],
            },
            {
              name: 'address',
              icon: 'home',
              label: 'Dirección Completa',
              type: 'text',
              placeholder: 'Calle, número, piso, puerta',
              required: true,
              cssClass: 'form-field--full',
            },
            {
              name: 'city',
              icon: 'home',
              label: 'Ciudad',
              type: 'text',
              placeholder: 'Madrid',
              required: true,
            },
            {
              name: 'zip',
              icon: 'home',
              label: 'Código Postal',
              type: 'text',
              placeholder: '28001',
              required: true,
              validators: [Validators.pattern(/^[0-9]{5}$/)],
            },
            {
              name: 'emergency_contact',
              icon: 'phone',
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
              icon: 'list',
              label: 'Motivo de Consulta',
              type: 'textarea',
              placeholder: '¿Por qué acude el paciente?',
              rows: 4,
              required: false,
              cssClass: 'form-field--full',
            },
            {
              name: 'medical_history',
              icon: 'list',
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

  onSubmitPatient(patientData: FormValue): void {
    const formattedData: CreatePatient = this.formatPatientData(patientData);

    this.patientsService.createPatient(formattedData).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

  private formatPatientData(data: FormValue): CreatePatient {
    const secondSurname = formText(data, 'second_surname');
    const city = formText(data, 'city');
    return {
      name: this.capitalizeText(formText(data, 'name') ?? ''),
      surname: this.capitalizeText(formText(data, 'surname') ?? ''),
      second_surname: secondSurname ? this.capitalizeText(secondSurname) : undefined,
      identifier: (formText(data, 'identifier') ?? '').toUpperCase().trim(),
      birthdate: formText(data, 'birthdate') ?? '',
      gender: formText(data, 'gender') || 'otro',
      phone: (formText(data, 'phone') ?? '').replace(/\s/g, ''),
      email: (formText(data, 'email') ?? '').toLowerCase().trim(),
      address: formText(data, 'address')?.trim() || undefined,
      city: city ? this.capitalizeText(city) : undefined,
      zip: formText(data, 'zip')?.trim() || undefined,
      emergency_contact: formText(data, 'emergency_contact')?.trim() || undefined,
      health_insurance: formText(data, 'health_insurance')?.trim() || undefined,
      consultation_reason: formText(data, 'consultation_reason')?.trim() || undefined,
      medical_history: formText(data, 'medical_history')?.trim() || undefined,
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
