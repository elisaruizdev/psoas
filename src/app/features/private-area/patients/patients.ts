import { Component, signal, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { TableConfig } from '../../../shared/models/table.model';
import { Table } from '../../../shared/ui/table/table';
import { ButtonUI } from '../../../shared/ui/button/button';
import { PatientsService } from './services/patients.service';
import { Patient } from './models/patients.model';
import { NewPatient } from './new-patient/new-patient';
import { DetailPatient } from './detail-patient/detail-patient';

@Component({
  selector: 'app-patients',
  imports: [MatButtonModule, MatDividerModule, MatIconModule, Table, ButtonUI],
  templateUrl: './patients.html',
  styleUrl: './patients.scss',
})
export class Patients {
  patients = signal<Patient[]>([]);

  listadoPatientsConfig = computed<TableConfig>(() => ({
    columns: [
      {
        key: 'fullName',
        label: 'Nombre Completo',
      },
      {
        key: 'identifier',
        label: 'DNI/NIE',
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
        key: 'status',
        label: 'Estado',
      },
    ],
    data: this.mapPatientsToTableData(this.patients()),
    filterPlaceholder: 'Buscar paciente...',
    pageSizeOptions: [5, 10, 20],
    showFilter: true,
    noDataMessage: 'Sin pacientes registrados',
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
      identifier: patient.identifier,
      email: patient.email,
      phone: patient.phone,
      status: this.translateStatus(patient.status),
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
    };
    return statusMap[status] || status;
  }

  onPatientClick(event: any): void {
    const { row } = event;
    this.abrirDetallePaciente(row.id);
  }

  private abrirDetallePaciente(patientId: string): void {
    const dialogRef = this.dialog.open(DetailPatient, {
      data: { id: patientId },
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
    const dialogRef = this.dialog.open(NewPatient, {
      width: '800px',
      maxWidth: '100vw',
      height: 'auto',
      panelClass: 'fullscreen-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action === 'created') {
        this.getAllPatients();
      }
    });
  }
}
