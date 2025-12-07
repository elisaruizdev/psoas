import { Component, signal, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { TableConfig } from '../../../shared/models/table.model';
import { Table } from '../../../shared/ui/table/table';
import { MatDialog } from '@angular/material/dialog';
import { PhysiosService } from './services/physios.service';
import { Physio } from './models/physios.model';
import { DetailPhysio } from './detail-physio/detail-physio';
import { ButtonUI } from '../../../shared/ui/button/button';


@Component({
  selector: 'app-physios',
  imports: [MatButtonModule, MatDividerModule, MatIconModule, Table, ButtonUI],
  templateUrl: './physios.html',
  styleUrl: './physios.scss',
})
export class Physios {
  physios = signal<Physio[]>([]);
  showPendingRequests = signal<boolean>(false);

  pendingPhysios = computed(() =>
    this.physios().filter((p) => p.status === 'pending_verification')
  );

  hasPendingPhysios = computed(() => this.pendingPhysios().length > 0);

  listadoPhysiosConfig = computed<TableConfig>(() => ({
    columns: [
      {
        key: 'fullName',
        label: 'Nombre Completo',
      },
      {
        key: 'email',
        label: 'Email',
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

  constructor(private dialog: MatDialog, private physiosService: PhysiosService) {}

  ngOnInit() {
    this.getAllPhysios();
  }

  getAllPhysios() {
    this.physiosService.getAllPhysios().subscribe({
      next: (physios) => {
        this.physios.set(physios);
      },
      error: (error) => {
        console.error('Error al cargar fisioterapeutas:', error);
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

  onPhysioClick(event: any): void {
    const { row } = event;
    this.physiosService.getPhysioById(row.id).subscribe({
      next: (physio) => {
        this.abrirDetallePhysio(physio);
      },
      error: (error) => {
        console.error('Error al cargar fisioterapeuta:', error);
        alert('Error al cargar la información del fisioterapeuta');
      },
    });
  }

  private abrirDetallePhysio(physioID: Physio): void {
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
      this.physiosService.approvePhysio(id).subscribe({
        next: () => {
          alert('Fisioterapeuta aprobado. Se ha enviado el email de verificación.');
          this.getAllPhysios();
        },
        error: (error) => {
          console.error('Error al aprobar:', error);
          alert('Error al aprobar la solicitud');
        },
      });
    }
  }

  rejectPhysio(id: number): void {
    if (confirm('¿Estás seguro de rechazar esta solicitud?')) {
      this.physiosService.rejectPhysio(id).subscribe({
        next: () => {
          alert('Solicitud rechazada correctamente');
          this.getAllPhysios();
        },
        error: (error) => {
          console.error('Error al rechazar:', error);
          alert('Error al rechazar la solicitud');
        },
      });
    }
  }
}
