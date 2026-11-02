import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { Validators } from '@angular/forms';
import { PatientsService } from '../services/patients.service';
import { Patient, TabId } from '../models/patients.model';
import { Form } from '../../../../shared/ui/form/form';
import { ButtonUI } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import { FormConfig, FormValue, formText } from '../../../../shared/models/form.model';
import { MenuDetailPatientComponent } from './menu-detail-patient/menu-detail-patient';
import { ClinicalHistory } from './clinical-history/clinical-history';
import { Treatments } from './treatments/treatments';
import { SessionsHistory } from './sessions-history/sessions-history';
import {
  optionalPhone,
  spanishPhoneValidator,
} from '../../../../shared/validators/spanish-id.validators';
import { NotificationService } from '../../../../shared/notifications/notification.service';

@Component({
  selector: 'app-detail-patient',
  imports: [
    CommonModule,
    MatDialogModule,
    Form,
    ButtonUI,
    Icon,
    MenuDetailPatientComponent,
    ClinicalHistory,
    Treatments,
    SessionsHistory
  ],
  templateUrl: './detail-patient.html',
  styleUrl: './detail-patient.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailPatient implements OnInit {
  readonly data = inject<{ id: string }>(MAT_DIALOG_DATA);
  private dialogRef = inject<MatDialogRef<DetailPatient>>(MatDialogRef);
  private patientsService = inject(PatientsService);
  private destroyRef = inject(DestroyRef);

  readonly patient = signal<Patient | null>(null);
  readonly patientFormConfig = signal<FormConfig | null>(null);
  readonly activeTab = signal<TabId>('clinical');
  readonly loading = signal<boolean>(true);
  readonly loadError = signal('');

  private readonly notifications = inject(NotificationService);
  /** true mientras se guarda: el formulario desactiva el botón de enviar. */
  readonly saving = signal(false);

  ngOnInit(): void {
    this.loadPatientData();
  }

  private loadPatientData(): void {
    this.loading.set(true);
    this.patientsService.getPatientById(this.data.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (patient) => {
        this.patient.set(patient);
        this.initializeFormConfig();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se ha podido abrir la ficha del paciente.');
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
              validators: [spanishPhoneValidator()],
            },
            {
              name: 'email',
              label: 'Correo',
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
              icon: 'home',
              label: 'Dirección Completa',
              type: 'text',
              placeholder: 'Calle, número, piso, puerta',
              required: false,
              value: patient.address || '',
              cssClass: 'form-field--full',
            },
            {
              name: 'city',
              icon: 'home',
              label: 'Ciudad',
              type: 'text',
              placeholder: 'Madrid',
              required: false,
              value: patient.city || '',
            },
            {
              name: 'zip',
              icon: 'home',
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
              icon: 'phone',
              label: 'Contacto de Emergencia',
              type: 'text',
              placeholder: 'Nombre y teléfono',
              required: false,
              value: patient.emergency_contact || '',
              cssClass: 'form-field--full',
            },
            {
              name: 'health_insurance',
              icon: 'list',
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

  onSubmitPatient(patientData: FormValue): void {
    const patient = this.patient();
    if (!patient) return;

    const formattedData = this.formatPatientData(patientData);

    this.saving.set(true);
    this.patientsService.updatePatient(patient.id, formattedData).pipe(
      finalize(() => this.saving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.showSuccessNotification('Paciente actualizado correctamente');
        this.dialogRef.close({ action: 'updated' });
      },
      error: () => {
        this.showErrorNotification('Error al actualizar el paciente');
      },
    });
  }

  onDelete(): void {
    const patient = this.patient();
    if (!patient) return;

    if (confirm('¿Estás seguro de que deseas eliminar este paciente?')) {
      this.patientsService.deletePatient(patient.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.showSuccessNotification('Paciente eliminado correctamente');   
          this.dialogRef.close({ action: 'delete', id: patient.id });
        },
        error: () => {
          this.showErrorNotification('Error al eliminar el paciente');
        },
      });
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onTabChange(tab: TabId): void {
    this.activeTab.set(tab);
  }

  private formatPatientData(data: FormValue) {
    const city = formText(data, 'city');
    return {
      phone: optionalPhone(formText(data, 'phone')),
      email: formText(data, 'email')?.toLowerCase().trim(),
      address: formText(data, 'address')?.trim() || undefined,
      city: city ? this.capitalizeText(city) : undefined,
      zip: formText(data, 'zip')?.trim() || undefined,
      emergency_contact: formText(data, 'emergency_contact')?.trim() || undefined,
      health_insurance: formText(data, 'health_insurance')?.trim() || undefined,
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
    this.notifications.success(message);
  }

  private showErrorNotification(message: string): void {
    this.notifications.error(message);
  }
}
