import {
  ChangeDetectionStrategy,
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
import { formatTime } from '../../../shared/utils/dates';
import { fullName } from '../../../shared/utils/text';
import { appointmentStatusLabel } from '../sessions/models/appointment.model';

/** Lo que espera el microfrontend <psoas-resumen-citas> en su propiedad `citas`. */
export interface CitaResumenMfe {
  id: string;
  hora: string;
  paciente: string;
  estado: string;
}

/** "Hoy Lunes, 2 de noviembre de 2026" */
function todayLabel(): string {
  const date = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return 'Hoy ' + date.charAt(0).toUpperCase() + date.slice(1);
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, Table, Icon],
  // Permite usar <psoas-resumen-citas>, que no es un componente de Angular sino un
  // Custom Element del navegador. Sin esto Angular daría "unknown element".
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  private dashboardService = inject(DashboardService);
  private destroyRef = inject(DestroyRef);

  readonly currentDate = todayLabel();
  readonly dashboardStats = signal<DashboardStats | null>(null);
  readonly loading = signal<boolean>(true);
  readonly loadError = signal('');
  /** true cuando el microfrontend se ha cargado y registrado. */
  readonly resumenCitasDisponible = signal(false);

  private readonly mfeLoader = inject(MicrofrontendLoader);
  private readonly router = inject(Router);

  /** Datos para el microfrontend: solo lo que necesita, con un contrato propio. */
  readonly citasParaResumen = computed<CitaResumenMfe[]>(() =>
    (this.dashboardStats()?.todayAppointments ?? []).map((appointment) => ({
      id: appointment.id,
      hora: formatTime(appointment.appointment_date),
      paciente: fullName(appointment.patient),
      estado: appointment.status,
    })),
  );

  readonly sesionesHoyConfig = computed<TableConfig>(() => {
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

  readonly pacientesActivos = computed(() => this.dashboardStats()?.activePatients || 0);
  readonly sesionesHoy = computed(() => this.dashboardStats()?.sessionsToday.total || 0);
  readonly sesionesCompletadas = computed(() => this.dashboardStats()?.sessionsToday.completed || 0);
  readonly sesionesSemana = computed(() => this.dashboardStats()?.sessionsNextWeek || 0);

  ngOnInit() {
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
      hora: formatTime(appointment.appointment_date),
      paciente: fullName(appointment.patient),
      fisioterapeuta: fullName(appointment.physio),
      tipo: `${appointment.session_number}ª sesión`,
      estado: appointmentStatusLabel(appointment.status),
    }));
  }
}
