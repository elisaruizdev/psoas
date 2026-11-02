import { ChangeDetectionStrategy, Component, DestroyRef, signal, computed, inject, OnInit } from '@angular/core';
import { TableConfig, TableRowClick } from '../../../shared/models/table.model';
import { Table } from '../../../shared/ui/table/table';
import { MatDialog } from '@angular/material/dialog';
import { PhysiosService } from './services/physios.service';
import { Physio } from './models/physios.model';
import { DetailPhysio } from './detail-physio/detail-physio';
import { ButtonUI } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationService } from '../../../shared/notifications/notification.service';


@Component({
  selector: 'app-physios',
  imports: [Table, ButtonUI, Icon],
  templateUrl: './physios.html',
  styleUrl: './physios.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Physios implements OnInit {
  private dialog = inject(MatDialog);
  private physiosService = inject(PhysiosService);
  private destroyRef = inject(DestroyRef);

  readonly physios = signal<Physio[]>([]);
  readonly showPendingRequests = signal<boolean>(false);
  readonly loadError = signal('');
  readonly openError = signal('');

  readonly pendingPhysios = computed(() =>
    this.physios().filter((p) => p.status === 'pending_verification')
  );

  readonly hasPendingPhysios = computed(() => this.pendingPhysios().length > 0);

  readonly listadoPhysiosConfig = computed<TableConfig>(() => ({
    columns: [
      {
        key: 'fullName',
        label: 'Nombre Completo',
      },
      {
        key: 'email',
        label: 'Correo',
      },
      {
        key: 'phone',
        label: 'Teléfono',
      },
      {
        key: 'specialty',
        label: 'Especialidad',
      },
      {
        key: 'status',
        label: 'Estado',
      },
      {
        key: 'registrationDate',
        label: 'Fecha de Registro',
      },
    ],
    data: this.mapPhysiosToTableData(this.physios()),
    filterPlaceholder: 'Buscar fisioterapeuta...',
    pageSizeOptions: [5, 10, 20],
    showFilter: true,
    noDataMessage: 'Sin resultados',
    clickableRows: true,
    clickableParams: 'view-physio',
  }));

  private readonly notifications = inject(NotificationService);

  ngOnInit() {
    this.getAllPhysios();
  }

  getAllPhysios() {
    this.loadError.set('');
    this.physiosService.getAllPhysios().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (physios) => {
        this.physios.set(physios);
      },
      error: () => {
        this.loadError.set('No se han podido cargar los fisioterapeutas.');
      },
    });
  }

  private mapPhysiosToTableData(physios: Physio[]) {
    return physios.map((physio) => ({
      id: physio.id_physio,
      fullName: this.getFullName(physio),
      email: physio.email,
      phone: physio.phone,
      specialty: physio.specialty || 'Sin especificar',
      status: this.translateStatus(physio.status),
      registrationDate: this.formatDate(physio.created_at),
    }));
  }

  private getFullName(physio: Physio): string {
    const parts = [physio.name, physio.surname];
    if (physio.second_surname) {
      parts.push(physio.second_surname);
    }
    return parts.join(' ');
  }

  private translateStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending_verification: 'Pendiente de verificación',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      active: 'Activo',
      inactive: 'Inactivo',
    };
    return statusMap[status] || status;
  }

  private formatDate(date: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES');
  }

  onPhysioClick(event: TableRowClick): void {
    const id = event.row.id;
    if (typeof id !== 'number') {
      return;
    }
    this.openError.set('');
    this.physiosService.getPhysioById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (physio) => {
        this.openPhysioDetail(physio);
      },
      error: () => {
        this.openError.set('No se ha podido abrir la ficha del fisioterapeuta.');
      },
    });
  }

  private openPhysioDetail(physioID: Physio): void {
    this.dialog.open(DetailPhysio, {
      data: physioID,
      width: '1000px',
      maxWidth: '100vw',
      height: 'auto',
      panelClass: 'fullscreen-dialog',
    });
  }

  togglePendingRequests(): void {
    this.showPendingRequests.update((value) => !value);
  }

  approvePhysio(id: number): void {
    if (confirm('¿Estás seguro de aprobar esta solicitud?')) {
      this.openError.set('');
      this.physiosService.approvePhysio(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.notifications.success('Fisioterapeuta aprobado. Se ha enviado el email de verificación.');
          this.getAllPhysios();
        },
        error: () => {
          this.openError.set('No se ha podido aprobar la solicitud.');
        },
      });
    }
  }

  rejectPhysio(id: number): void {
    if (confirm('¿Estás seguro de rechazar esta solicitud?')) {
      this.openError.set('');
      this.physiosService.rejectPhysio(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.notifications.success('Solicitud rechazada correctamente');
          this.getAllPhysios();
        },
        error: () => {
          this.openError.set('No se ha podido rechazar la solicitud.');
        },
      });
    }
  }
}
