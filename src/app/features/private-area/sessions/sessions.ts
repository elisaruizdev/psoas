import { Component, DestroyRef, signal, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { TableConfig, TableRowClick } from '../../../shared/models/table.model';
import { Table } from '../../../shared/ui/table/table';
import { MatDialog } from '@angular/material/dialog';
import { AppointmentsService } from './services/appointments.service';
import { Appointment } from './models/appointment.model';
import { ButtonUI } from '../../../shared/ui/button/button';
import { NewSession } from './new-session/new-session';
import { DetailSession } from './detail-session/detail-session';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-sessions',
  imports: [MatButtonModule, MatDividerModule, MatIconModule, Table, ButtonUI],
  templateUrl: './sessions.html',
  styleUrl: './sessions.scss',
})
export class Sessions {
  appointments = signal<Appointment[]>([]);
  loadError = signal('');
  openError = signal('');

  listadoAppointmentsConfig = computed<TableConfig>(() => ({
    columns: [
      {
        key: 'appointmentDate',
        label: 'Fecha y Hora',
      },
      {
        key: 'patientName',
        label: 'Paciente',
      },
      {
        key: 'physioName',
        label: 'Fisioterapeuta',
      },
      {
        key: 'sessionType',
        label: 'Tipo',
      },
      {
        key: 'status',
        label: 'Estado',
      },
    ],
    data: this.mapAppointmentsToTableData(this.appointments()),
    filterPlaceholder: 'Buscar cita...',
    pageSizeOptions: [5, 10, 20],
    showFilter: true,
    noDataMessage: 'Sin citas programadas',
    clickableRows: true,
    clickableParams: 'view-appointment',
  }));

  constructor(
    private dialog: MatDialog,
    private appointmentsService: AppointmentsService,
    private destroyRef: DestroyRef,
  ) {}

  ngOnInit() {
    this.getAllAppointments();
  }

  getAllAppointments() {
    this.loadError.set('');
    this.appointmentsService.getAllAppointments().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (appointments) => {
        this.appointments.set(appointments);
      },
      error: (error) => {
        console.error('Error al cargar citas:', error);
        this.loadError.set('No se han podido cargar las citas.');
      },
    });
  }

  private mapAppointmentsToTableData(appointments: Appointment[]) {
    return appointments.map((appointment) => ({
      id: appointment.id,
      appointmentDate: this.formatDateTime(appointment.appointment_date),
      patientName: this.getPatientName(appointment),
      physioName: this.getPhysioName(appointment),
      sessionType: `${appointment.session_number}ª sesión`,
      status: this.translateStatus(appointment.status),
    }));
  }

  private formatDateTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private getPatientName(appointment: Appointment): string {
    if (!appointment.patient) return 'Paciente no disponible';
    const parts = [appointment.patient.name, appointment.patient.surname];
    if (appointment.patient.second_surname) {
      parts.push(appointment.patient.second_surname);
    }
    return parts.join(' ');
  }

  private getPhysioName(appointment: Appointment): string {
    if (!appointment.physio) return 'Fisioterapeuta no disponible';
    const parts = [appointment.physio.name, appointment.physio.surname];
    if (appointment.physio.second_surname) {
      parts.push(appointment.physio.second_surname);
    }
    return parts.join(' ');
  }

  private translateStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      scheduled: 'Programada',
      confirmed: 'Confirmada',
      completed: 'Completada',
      cancelled: 'Cancelada',
    };
    return statusMap[status] || status;
  }

  onAppointmentClick(event: TableRowClick): void {
    const id = event.row.id;
    if (typeof id !== 'string') {
      return;
    }
    this.openError.set('');
    this.appointmentsService
      .getAppointmentById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (appointment) => {
        this.openAppointmentDetail(appointment);
      },
      error: (error) => {
        console.error('Error al cargar cita:', error);
        this.openError.set('No se ha podido abrir la ficha de la cita.');
      },
    });
  }

  private openAppointmentDetail(appointment: Appointment): void {
    const dialogRef = this.dialog.open(DetailSession, {
      data: appointment,
      width: '1000px',
      maxWidth: '100vw',
      height: 'auto',
      panelClass: 'fullscreen-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (
        result?.action === 'updated' ||
        result?.action === 'cancelled' ||
        result?.action === 'deleted'
      ) {
        this.getAllAppointments();
      }
    });
  }

  openNewAppointment(): void {
    const dialogRef = this.dialog.open(NewSession, {
      width: '800px',
      maxWidth: '100vw',
      height: 'auto',
      panelClass: 'fullscreen-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action === 'created') {
        this.getAllAppointments();
      }
    });
  }
}
