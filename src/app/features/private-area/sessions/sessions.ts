import { ChangeDetectionStrategy, Component, DestroyRef, signal, computed, inject, OnInit } from '@angular/core';
import { TableConfig, TableRowClick } from '../../../shared/models/table.model';
import { Table } from '../../../shared/ui/table/table';
import { MatDialog } from '@angular/material/dialog';
import { AppointmentsService } from './services/appointments.service';
import { Appointment, appointmentStatusLabel } from './models/appointment.model';
import { formatDateTime } from '../../../shared/utils/dates';
import { fullName } from '../../../shared/utils/text';
import { ButtonUI } from '../../../shared/ui/button/button';
import { NewSession } from './new-session/new-session';
import { DetailSession } from './detail-session/detail-session';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-sessions',
  imports: [Table, ButtonUI],
  templateUrl: './sessions.html',
  styleUrl: './sessions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sessions implements OnInit {
  private dialog = inject(MatDialog);
  private appointmentsService = inject(AppointmentsService);
  private destroyRef = inject(DestroyRef);

  readonly appointments = signal<Appointment[]>([]);
  readonly loadError = signal('');
  readonly openError = signal('');

  readonly listadoAppointmentsConfig = computed<TableConfig>(() => ({
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

  ngOnInit() {
    this.getAllAppointments();
  }

  getAllAppointments() {
    this.loadError.set('');
    this.appointmentsService.getAllAppointments().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (appointments) => {
        this.appointments.set(appointments);
      },
      error: () => {
        this.loadError.set('No se han podido cargar las citas.');
      },
    });
  }

  private mapAppointmentsToTableData(appointments: Appointment[]) {
    return appointments.map((appointment) => ({
      id: appointment.id,
      appointmentDate: formatDateTime(appointment.appointment_date),
      patientName: fullName(appointment.patient, 'Paciente no disponible'),
      physioName: fullName(appointment.physio, 'Fisioterapeuta no disponible'),
      sessionType: `${appointment.session_number}ª sesión`,
      status: appointmentStatusLabel(appointment.status),
    }));
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
      error: () => {
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
