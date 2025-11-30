import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AppointmentsService } from '../services/appointments.service';
import { Form } from '../../../../shared/ui/form/form';
import { FormConfig } from '../../../../shared/models/form.model';
import { Appointment, UpdateAppointment } from '../models/appointment.model';

@Component({
  selector: 'app-detail-session',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, Form],
  templateUrl: './detail-session.html',
  styleUrl: './detail-session.scss',
})
export class DetailSession implements OnInit {
  appointment: Appointment;
  appointmentFormConfig = signal<FormConfig | null>(null);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: Appointment,
    private dialogRef: MatDialogRef<DetailSession>,
    private appointmentsService: AppointmentsService
  ) {
    this.appointment = data;
  }

  ngOnInit(): void {
    this.initializeFormConfig();
  }

  private initializeFormConfig(): void {
    const appointmentDate = new Date(this.appointment.appointment_date);
    const dateStr = this.formatDateForInput(appointmentDate);
    const timeStr = this.formatTimeForInput(appointmentDate);

    this.appointmentFormConfig.set({
      sections: [
        {
          title: 'Información de la Cita',
          fields: [
            {
              name: 'appointment_date',
              label: 'Fecha',
              type: 'date',
              placeholder: 'dd/mm/aaaa',
              required: true,
              value: dateStr,
            },
            {
              name: 'appointment_time',
              label: 'Hora',
              type: 'select',
              placeholder: 'Seleccione una hora',
              required: true,
              value: timeStr,
              options: [
                { value: '09:00', label: '09:00' },
                { value: '10:00', label: '10:00' },
                { value: '11:00', label: '11:00' },
                { value: '12:00', label: '12:00' },
                { value: '13:00', label: '13:00' },
                { value: '14:00', label: '14:00' },
                { value: '15:00', label: '15:00' },
                { value: '16:00', label: '16:00' },
                { value: '17:00', label: '17:00' },
                { value: '18:00', label: '18:00' },
                { value: '19:00', label: '19:00' },
                { value: '20:00', label: '20:00' },
                { value: '21:00', label: '21:00' },
              ],
            },
            {
              name: 'duration',
              label: 'Duración',
              type: 'select',
              placeholder: 'Seleccione duración',
              required: true,
              value: this.appointment.duration,
              options: [
                { value: 30, label: '30 minutos' },
                { value: 45, label: '45 minutos' },
                { value: 60, label: '60 minutos' },
              ],
            },
          ],
        },
        {
          title: 'Observaciones',
          fields: [
            {
              name: 'notes',
              label: 'Notas',
              type: 'textarea',
              placeholder: 'Observaciones sobre la cita...',
              rows: 4,
              required: false,
              value: this.appointment.notes || '',
              cssClass: 'form-field--full',
            },
          ],
        },
      ],
    });
  }

  onSubmitAppointment(appointmentData: any): void {
    const dateTime = `${appointmentData.appointment_date}T${appointmentData.appointment_time}:00`;

    const formattedData: UpdateAppointment = {
      appointment_date: new Date(dateTime).toISOString(),
      duration: parseInt(appointmentData.duration),
      notes: appointmentData.notes?.trim() || undefined,
    };

    this.appointmentsService.updateAppointment(this.appointment.id, formattedData).subscribe({
      next: () => {
        this.showSuccessNotification('Cita actualizada correctamente');
        this.dialogRef.close({ action: 'updated' });
      },
      error: (error) => {
        console.error('Error al actualizar cita:', error);
        if (error.status === 409) {
          this.showErrorNotification('El fisioterapeuta ya tiene una cita en ese horario');
        } else {
          this.showErrorNotification('Error al actualizar la cita');
        }
      },
    });
  }

  onCancel(): void {
    if (confirm('¿Estás seguro de que deseas cancelar esta cita?')) {
      this.appointmentsService.cancelAppointment(this.appointment.id).subscribe({
        next: () => {
          this.showSuccessNotification('Cita cancelada correctamente');
          this.dialogRef.close({ action: 'cancelled' });
        },
        error: (error) => {
          console.error('Error al cancelar cita:', error);
          this.showErrorNotification('Error al cancelar la cita');
        },
      });
    }
  }

  onDelete(): void {
    if (confirm('¿Estás seguro de que deseas eliminar esta cita?')) {
      this.appointmentsService.deleteAppointment(this.appointment.id).subscribe({
        next: () => {
          this.showSuccessNotification('Cita eliminada correctamente');
          this.dialogRef.close({ action: 'deleted' });
        },
        error: (error) => {
          console.error('Error al eliminar cita:', error);
          this.showErrorNotification('Error al eliminar la cita');
        },
      });
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTimeForInput(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  getPatientName(): string {
    if (!this.appointment.patient) return 'Paciente no disponible';
    const parts = [this.appointment.patient.name, this.appointment.patient.surname];
    if (this.appointment.patient.second_surname) {
      parts.push(this.appointment.patient.second_surname);
    }
    return parts.join(' ');
  }

  getPhysioName(): string {
    if (!this.appointment.physio) return 'Fisioterapeuta no disponible';
    const parts = [this.appointment.physio.name, this.appointment.physio.surname];
    if (this.appointment.physio.second_surname) {
      parts.push(this.appointment.physio.second_surname);
    }
    return parts.join(' ');
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      scheduled: 'Programada',
      confirmed: 'Confirmada',
      completed: 'Completada',
      cancelled: 'Cancelada',
    };
    return statusMap[status] || status;
  }

  formatDateTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private showSuccessNotification(message: string): void {
    alert(message);
  }

  private showErrorNotification(message: string): void {
    console.error('ERROR:', message);
    alert(message);
  }
}
