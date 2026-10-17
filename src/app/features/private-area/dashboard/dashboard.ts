import { Component, DestroyRef, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Table } from '../../../shared/ui/table/table';
import { TableConfig } from '../../../shared/models/table.model';
import { DashboardService } from './services/dashboard.service';
import { DashboardStats, TodayAppointment } from './models/dashboard.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, Table],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  currentDate: string = '';
  dashboardStats = signal<DashboardStats | null>(null);
  loading = signal<boolean>(true);
  loadError = signal('');

  sesionesHoyConfig = computed<TableConfig>(() => {
    const stats = this.dashboardStats();
    return {
      columns: [
        {
          key: 'hora',
          label: 'Hora',
          sortable: false,
        },
        {
          key: 'paciente',
          label: 'Paciente',
        },
        {
          key: 'fisioterapeuta',
          label: 'Fisioterapeuta',
        },
        {
          key: 'tipo',
          label: 'Tipo',
        },
        {
          key: 'estado',
          label: 'Estado',
        },
      ],
      data: this.mapAppointmentsToTableData(stats?.todayAppointments || []),
      filterPlaceholder: 'Buscar por paciente, fisioterapeuta...',
      pageSizeOptions: [5, 10, 20],
      showFilter: true,
      noDataMessage: 'No hay sesiones programadas para hoy',
    };
  });

  pacientesActivos = computed(() => this.dashboardStats()?.activePatients || 0);
  sesionesHoy = computed(() => this.dashboardStats()?.sessionsToday.total || 0);
  sesionesCompletadas = computed(() => this.dashboardStats()?.sessionsToday.completed || 0);
  sesionesSemana = computed(() => this.dashboardStats()?.sessionsNextWeek || 0);

  constructor(private dashboardService: DashboardService, private destroyRef: DestroyRef) {}

  ngOnInit() {
    this.setCurrentDate();
    this.loadDashboardStats();
  }

  private setCurrentDate() {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    this.currentDate = today.toLocaleDateString('es-ES', options);
    this.currentDate =
      'Hoy ' + this.currentDate.charAt(0).toUpperCase() + this.currentDate.slice(1);
  }

  private loadDashboardStats() {
    this.loading.set(true);
    this.loadError.set('');
    this.dashboardService.getDashboardStats().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (stats) => {
        this.dashboardStats.set(stats);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar estadísticas:', error);
        this.loadError.set('No se han podido cargar las estadísticas.');
        this.loading.set(false);
      },
    });
  }

  private mapAppointmentsToTableData(appointments: TodayAppointment[]) {
    return appointments.map((appointment) => ({
      id: appointment.id,
      hora: this.formatTime(appointment.appointment_date),
      paciente: this.getPatientName(appointment),
      fisioterapeuta: this.getPhysioName(appointment),
      tipo: `${appointment.session_number}ª sesión`,
      estado: this.translateStatus(appointment.status),
    }));
  }

  private formatTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  private getPatientName(appointment: TodayAppointment): string {
    const parts = [appointment.patient.name, appointment.patient.surname];
    if (appointment.patient.second_surname) {
      parts.push(appointment.patient.second_surname);
    }
    return parts.join(' ');
  }

  private getPhysioName(appointment: TodayAppointment): string {
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
}
