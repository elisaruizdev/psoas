import { Component, signal, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { ButtonUI } from '../../../shared/ui/button/button';
import { TableConfig } from '../../../shared/models/table.model';
import { Table } from '../../../shared/ui/table/table';
import { DetailPatient } from './detail-patient/detail-patient';
import { MatDialog } from '@angular/material/dialog';
import { NewPatient } from './new-patient/new-patient';
import { PatientsService } from './services/patients.service';
import { Patient } from './models/patients.model';

@Component({
  selector: 'app-patients',
  imports: [MatButtonModule, MatDividerModule, MatIconModule, ButtonUI, Table],
  templateUrl: './patients.html',
  styleUrl: './patients.scss',
})
export class Patients {
  patients = signal<Patient[]>([]);

  listadoPacientesConfig = computed<TableConfig>(() => ({
    columns: [
      {
        key: 'fullName',
        label: 'Nombre y Apellidos',
      },
      {
        key: 'phone',
        label: 'Teléfono',
      },
      {
        key: 'email',
        label: 'Email',
      },
      {
        key: 'consultationReason',
        label: 'Motivo de Consulta',
      },
      {
        key: 'healthInsurance',
        label: 'Aseguradora',
      },
      {
        key: 'status',
        label: 'Estado',
      },
    ],
    data: this.mapPatientsToTableData(this.patients()),
    filterPlaceholder: 'Buscar paciente...',
    pageSizeOptions: [5, 10, 20],
    showFilter: true,
    noDataMessage: 'Sin resultados',
    clickableRows: true,
    clickableParams: 'view-patient',
  }));

  constructor(private dialog: MatDialog, private patientsService: PatientsService) {}

  ngOnInit() {
    this.getAllPatients();
  }

  getAllPatients() {
    this.patientsService.getAllPatients().subscribe({
      next: (patients) => {
        this.patients.set(patients);
      },
      error: (error) => {
        console.error('Error al cargar pacientes:', error);
      },
    });
  }

  private mapPatientsToTableData(patients: Patient[]) {
    return patients.map((patient) => ({
      id: patient.id,
      fullName: this.getFullName(patient),
      phone: patient.phone,
      consultationReason: patient.consultation_reason || '-',
      email: patient.email,
      status: this.translateStatus(patient.status),
      healthInsurance: patient.health_insurance || 'Sin seguro',
    }));
  }

  private getFullName(patient: Patient): string {
    const parts = [patient.name, patient.surname];
    if (patient.second_surname) {
      parts.push(patient.second_surname);
    }
    return parts.join(' ');
  }

  private translateStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      active: 'Activo',
      inactive: 'Inactivo',
      discharged: 'Alta',
    };
    return statusMap[status] || status;
  }

  onPacienteClick(event: any): void {
    const { row } = event;
    this.abrirDetallePaciente(row);
  }

  private abrirDetallePaciente(paciente: any): void {
    const dialogRef = this.dialog.open(DetailPatient, {
      data: { id: paciente.id },
      width: '1000px',
      maxWidth: '100vw',
      height: 'auto',
      panelClass: 'fullscreen-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action === 'updated' || result?.action === 'delete') {
        this.getAllPatients();
      }
    });
  }

  abrirNuevoPaciente(): void {
    this.dialog.open(NewPatient, {
      width: '1000px',
      maxWidth: '100vw',
    });
  }
}
