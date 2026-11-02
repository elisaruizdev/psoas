import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Table } from '../../../shared/ui/table/table';
import { Icon } from '../../../shared/ui/icon/icon';
import { TableConfig } from '../../../shared/models/table.model';
import { DashboardService } from './services/dashboard.service';
import { DashboardStats, TodayAppointment } from './models/dashboard.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MicrofrontendLoader } from '../../../shared/microfrontends/microfrontend-loader.service';
import { environment } from '../../../../environments/environment';

/** Lo que espera el microfrontend <psoas-resumen-citas> en su propiedad `citas`. */
export interface CitaResumenMfe {
  id: string;
  hora: string;
  paciente: string;
  estado: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, Table, Icon],
  // Permite usar <psoas-resumen-citas>, que no es un componente de Angular sino un
  // Custom Element del navegador. Sin esto Angular daría "unknown element".
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  currentDate: string = '';
  dashboardStats = signal<DashboardStats | null>(null);
  loading = signal<boolean>(true);
  loadError = signal('');
  /** true cuando el microfrontend se ha cargado y registrado. */
  resumenCitasDisponible = signal(false);

  private readonly mfeLoader = inject(MicrofrontendLoader);
  private readonly router = inject(Router);

  /** Datos para el microfrontend: solo lo que necesita, con un contrato propio. */
  citasParaResumen = computed<CitaResumenMfe[]>(() =>
    (this.dashboardStats()?.todayAppointments ?? []).map((appointment) => ({
      id: appointment.id,
      hora: this.formatTime(appointment.appointment_date),
      paciente: this.getPatientName(appointment),
      estado: appointment.status,
    })),
  );

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
    this.loadResumenCitas();
  }

  private loadResumenCitas() {
    this.mfeLoader
      .load(environment.microfrontends.resumenCitas, 'psoas-resumen-citas')
      .then((ok) => this.resumenCitasDisponible.set(ok));
  }

  /** Evento de salida del microfrontend: un CustomEvent con { id } en `detail`. */
  onCitaSeleccionada(event: Event) {
    const detail = (event as CustomEvent<{ id?: string }>).detail;
    if (detail?.id) {
      this.router.navigate(['/sessions'], { queryParams: { cita: detail.id } });
    }
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
      error: () => {
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
