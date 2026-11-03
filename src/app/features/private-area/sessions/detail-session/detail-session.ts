import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { AppointmentsService } from '../services/appointments.service';
import { Form } from '../../../../shared/ui/form/form';
import { ButtonUI } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import { FormConfig, FormValue, formText } from '../../../../shared/models/form.model';
import { Appointment, UpdateAppointment, appointmentStatusLabel } from '../models/appointment.model';
import { NotificationService } from '../../../../shared/notifications/notification.service';
import { FullNamePipe } from '../../../../shared/pipes/full-name.pipe';
import { localIsoDate } from '../../../../shared/utils/dates';

@Component({
  selector: 'app-detail-session',
  imports: [CommonModule, MatDialogModule, Form, ButtonUI, Icon, FullNamePipe],
  templateUrl: './detail-session.html',
  styleUrl: './detail-session.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailSession implements OnInit {
  readonly appointment = inject<Appointment>(MAT_DIALOG_DATA);
  private dialogRef = inject<MatDialogRef<DetailSession>>(MatDialogRef);
  private appointmentsService = inject(AppointmentsService);
  private destroyRef = inject(DestroyRef);

  readonly appointmentFormConfig = signal<FormConfig | null>(null);
  readonly statusLabel = appointmentStatusLabel;

  private readonly notifications = inject(NotificationService);
  /** true mientras se guarda: el formulario desactiva el botón de enviar. */
  readonly saving = signal(false);

  ngOnInit(): void {
    this.initializeFormConfig();
  }

  private initializeFormConfig(): void {
    const appointmentDate = new Date(this.appointment.appointment_date);
    const dateStr = localIsoDate(appointmentDate);
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
              icon: 'calendar',
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
              icon: 'list',
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
              icon: 'list',
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

  onSubmitAppointment(appointmentData: FormValue): void {
    const dateTime = `${formText(appointmentData, 'appointment_date')}T${formText(appointmentData, 'appointment_time')}:00`;
    const duration = formText(appointmentData, 'duration');

    const formattedData: UpdateAppointment = {
      appointment_date: new Date(dateTime).toISOString(),
      duration: duration === undefined ? undefined : Number.parseInt(duration, 10),
      notes: formText(appointmentData, 'notes')?.trim() || undefined,
    };

    this.saving.set(true);
    this.appointmentsService.updateAppointment(this.appointment.id, formattedData).pipe(
      finalize(() => this.saving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.showSuccessNotification('Cita actualizada correctamente');
        this.dialogRef.close({ action: 'updated' });
      },
      error: (error) => {
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
      this.appointmentsService.cancelAppointment(this.appointment.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.showSuccessNotification('Cita cancelada correctamente');
          this.dialogRef.close({ action: 'cancelled' });
        },
        error: () => {
          this.showErrorNotification('Error al cancelar la cita');
        },
      });
    }
  }

  onDelete(): void {
    if (confirm('¿Estás seguro de que deseas eliminar esta cita?')) {
      this.appointmentsService.deleteAppointment(this.appointment.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.showSuccessNotification('Cita eliminada correctamente');
          this.dialogRef.close({ action: 'deleted' });
        },
        error: () => {
          this.showErrorNotification('Error al eliminar la cita');
        },
      });
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  private formatTimeForInput(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private showSuccessNotification(message: string): void {
    this.notifications.success(message);
  }

  private showErrorNotification(message: string): void {
    this.notifications.error(message);
  }
}
