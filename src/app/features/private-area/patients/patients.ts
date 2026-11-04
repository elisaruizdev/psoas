import { ChangeDetectionStrategy, Component, DestroyRef, signal, computed, inject, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TableConfig, TableRowClick } from '../../../shared/models/table.model';
import { Table } from '../../../shared/ui/table/table';
import { ButtonUI } from '../../../shared/ui/button/button';
import { PatientsService } from './services/patients.service';
import { Patient, patientStatusLabel } from './models/patients.model';
import { NewPatient } from './new-patient/new-patient';
import { DetailPatient } from './detail-patient/detail-patient';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fullName } from '../../../shared/utils/text';

@Component({
  selector: 'app-patients',
  imports: [Table, ButtonUI],
  templateUrl: './patients.html',
  styleUrl: './patients.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Patients implements OnInit {
  private dialog = inject(MatDialog);
  private patientsService = inject(PatientsService);
  private destroyRef = inject(DestroyRef);

  readonly patients = signal<Patient[]>([]);
  readonly loadError = signal('');

  readonly listadoPatientsConfig = computed<TableConfig>(() => ({
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
        label: 'Correo',
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

  ngOnInit() {
    this.getAllPatients();
  }

  getAllPatients() {
    this.loadError.set('');
    this.patientsService.getAllPatients().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (patients) => {
        this.patients.set(patients);
      },
      error: () => {
        this.loadError.set('No se han podido cargar los pacientes.');
      },
    });
  }

  private mapPatientsToTableData(patients: Patient[]) {
    return patients.map((patient) => ({
      id: patient.id,
      fullName: fullName(patient),
      identifier: patient.identifier,
      email: patient.email,
      phone: patient.phone,
      status: patientStatusLabel(patient.status),
    }));
  }

  onPatientClick(event: TableRowClick): void {
    this.openPatientDetail(String(event.row.id));
  }

  private openPatientDetail(patientId: string): void {
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

  openNewPatient(): void {
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
