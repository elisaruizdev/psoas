import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { provideTestHttp, provideTestRouter } from '../../../../testing/providers';
import { aPatient } from '../../../../testing/fixtures';

import { Patients } from './patients';
import { PatientsService } from './services/patients.service';
import { DetailPatient } from './detail-patient/detail-patient';

describe('Patients', () => {
  let fixture: ComponentFixture<Patients>;
  let component: Patients;
  let service: jasmine.SpyObj<PatientsService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  function dialogClosingWith(result: unknown): MatDialogRef<unknown> {
    return { afterClosed: () => of(result) } as MatDialogRef<unknown>;
  }

  beforeEach(async () => {
    // Dobles de prueba: el componente no sabe que no son los de verdad.
    service = jasmine.createSpyObj<PatientsService>('PatientsService', ['getAllPatients']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    service.getAllPatients.and.returnValue(
      of([aPatient(), aPatient({ id: 'p-2', name: 'Mario', surname: 'Sanz', second_surname: null, status: 'inactive' })]),
    );

    await TestBed.configureTestingModule({
      imports: [Patients],
      providers: [
        ...provideTestHttp(),
        ...provideTestRouter(),
        { provide: PatientsService, useValue: service },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Patients);
    component = fixture.componentInstance;
  });

  it('carga los pacientes al iniciar y los pasa a la tabla', () => {
    fixture.detectChanges();

    expect(service.getAllPatients).toHaveBeenCalledTimes(1);
    const rows = component.listadoPatientsConfig().data;
    expect(rows.length).toBe(2);
  });

  it('une nombre y apellidos y traduce el estado', () => {
    fixture.detectChanges();

    const [lucia, mario] = component.listadoPatientsConfig().data;
    expect(lucia['fullName']).toBe('Lucía García López');
    expect(lucia['status']).toBe('Activo');
    expect(mario['fullName']).toBe('Mario Sanz');
    expect(mario['status']).toBe('Inactivo');
  });

  it('si la API falla, muestra el error en un role="alert" y no pinta la tabla', () => {
    spyOn(console, 'error');
    service.getAllPatients.and.returnValue(throwError(() => new Error('500')));

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'No se han podido cargar los pacientes.',
    );
    expect(element.querySelector('f-table')).toBeNull();
  });

  it('al pulsar una fila abre el detalle con el id del paciente', () => {
    dialog.open.and.returnValue(dialogClosingWith(undefined));
    fixture.detectChanges();

    component.onPatientClick({ row: { id: 'p-2' } });

    expect(dialog.open).toHaveBeenCalledWith(DetailPatient, jasmine.objectContaining({ data: { id: 'p-2' } }));
  });

  it('recarga la lista si el detalle se cierra tras editar', () => {
    dialog.open.and.returnValue(dialogClosingWith({ action: 'updated' }));
    fixture.detectChanges();

    component.onPatientClick({ row: { id: 'p-1' } });

    expect(service.getAllPatients).toHaveBeenCalledTimes(2);
  });

  it('no recarga si el detalle se cierra sin cambios', () => {
    dialog.open.and.returnValue(dialogClosingWith(undefined));
    fixture.detectChanges();

    component.onPatientClick({ row: { id: 'p-1' } });

    expect(service.getAllPatients).toHaveBeenCalledTimes(1);
  });
});
