import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PhysiosService } from '../services/physios.service';
import { Form } from '../../../../shared/ui/form/form';
import { FormConfig } from '../../../../shared/models/form.model';
import { Physio } from '../models/physios.model';

@Component({
  selector: 'app-detail-physio',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, Form],
  templateUrl: './detail-physio.html',
  styleUrl: './detail-physio.scss',
})
export class DetailPhysio implements OnInit {
  physio: Physio;
  physioFormConfig!: FormConfig;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: Physio,
    private dialogRef: MatDialogRef<DetailPhysio>,
    private physiosService: PhysiosService
  ) {
    this.physio = data;
  }

  ngOnInit(): void {
    this.initializeFormConfig();
  }

  private initializeFormConfig(): void {
    this.physioFormConfig = {
      sections: [
        {
          title: 'Datos Personales',
          fields: [
            {
              name: 'identifier',
              label: 'DNI/NIE',
              type: 'text',
              placeholder: '12345678A',
              required: false,
              value: this.physio.identifier || '',
            },
            {
              name: 'birthdate',
              label: 'Fecha de Nacimiento',
              type: 'date',
              placeholder: 'dd/mm/aaaa',
              required: false,
              value: this.formatDateForInput(this.physio.birthdate),
            },
            {
              name: 'gender',
              label: 'Género',
              type: 'select',
              placeholder: 'Seleccione...',
              required: false,
              value: this.physio.gender || '',
              options: [
                { value: 'masculino', label: 'Masculino' },
                { value: 'femenino', label: 'Femenino' },
                { value: 'otro', label: 'Otro' },
              ],
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
              value: this.physio.phone || '',
              validators: [Validators.pattern(/^(\+34|0034|34)?[6789]\d{8}$/)],
            },
          ],
        },
        {
          title: 'Datos Profesionales',
          fields: [
            {
              name: 'license_number',
              label: 'Número de Colegiado',
              type: 'text',
              placeholder: 'Número de colegiado',
              required: false,
              value: this.physio.license_number || '',
            },
            {
              name: 'specialty',
              label: 'Especialidad',
              type: 'text',
              placeholder: 'Ej: Traumatología',
              required: false,
              value: this.physio.specialty || '',
            },
            {
              name: 'schedule',
              label: 'Horario',
              type: 'select',
              placeholder: 'Seleccione horario...',
              required: false,
              value: this.physio.schedule || '',
              options: [
                { value: 'Mañana: 8:00-15:00', label: 'Mañana: 8:00-15:00' },
                { value: 'Tarde: 14:00-21:00', label: 'Tarde: 14:00-21:00' },
              ],
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
              value: this.physio.address || '',
              cssClass: 'form-field--full',
            },
            {
              name: 'city',
              label: 'Ciudad',
              type: 'text',
              placeholder: 'Madrid',
              required: false,
              value: this.physio.city || '',
            },
            {
              name: 'zip',
              label: 'Código Postal',
              type: 'text',
              placeholder: '28001',
              required: false,
              value: this.physio.zip || '',
              validators: [Validators.pattern(/^[0-9]{5}$/)],
            },
            {
              name: 'country',
              label: 'País',
              type: 'text',
              placeholder: 'España',
              required: false,
              value: this.physio.country || '',
            },
          ],
        },
      ],
    };
  }

  onSubmitPhysio(physioData: any): void {
    const formattedData = this.formatPhysioData(physioData);

    this.physiosService.updatePhysio(this.physio.id_physio, formattedData).subscribe({
      next: () => {
        this.showSuccessNotification('Cambios guardados correctamente');
        this.dialogRef.close({ action: 'save' });
      },
      error: (error) => {
        console.error('Error al guardar:', error);
        this.showErrorNotification('Error al guardar los cambios');
      },
    });
  }

  onDelete(): void {
    if (confirm('¿Estás seguro de que deseas eliminar este fisioterapeuta?')) {
      this.physiosService.deletePhysio(this.physio.id_physio).subscribe({
        next: () => {
          this.showSuccessNotification('Fisioterapeuta eliminado correctamente');
          this.dialogRef.close({ action: 'delete' });
        },
        error: (error) => {
          console.error('Error al eliminar:', error);
          this.showErrorNotification('Error al eliminar el fisioterapeuta');
        },
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private formatPhysioData(data: any) {
    return {
      identifier: data.identifier?.toUpperCase().trim() || undefined,
      birthdate: data.birthdate || undefined,
      gender: data.gender || undefined,
      phone: data.phone?.replace(/\s/g, ''),
      license_number: data.license_number?.trim() || undefined,
      specialty: data.specialty?.trim() || undefined,
      schedule: data.schedule?.trim() || undefined,
      address: data.address?.trim() || undefined,
      city: data.city ? this.capitalizeText(data.city) : undefined,
      zip: data.zip?.trim() || undefined,
      country: data.country ? this.capitalizeText(data.country) : undefined,
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

  private formatDateForInput(date: Date | string | null): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending_verification: 'Pendiente de verificación',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      active: 'Activo',
      inactive: 'Inactivo',
    };
    return statusMap[status] || status;
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
