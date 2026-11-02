import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { provideTestRouter } from '../../../../testing/providers';
import { anAppointment } from '../../../../testing/fixtures';

import { Sessions } from './sessions';
import { AppointmentsService } from './services/appointments.service';
import { DetailSession } from './detail-session/detail-session';
import { NewSession } from './new-session/new-session';

describe('Sessions', () => {
  let component: Sessions;
  let fixture: ComponentFixture<Sessions>;
  let service: jasmine.SpyObj<AppointmentsService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  function dialogClosingWith(result: unknown): MatDialogRef<unknown> {
    return { afterClosed: () => of(result) } as MatDialogRef<unknown>;
  }

  beforeEach(async () => {
    service = jasmine.createSpyObj<AppointmentsService>('AppointmentsService', [
      'getAllAppointments',
      'getAppointmentById',
    ]);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    service.getAllAppointments.and.returnValue(
      of([
        anAppointment(),
        anAppointment({
          id: 'a-2',
          status: 'cancelled',
          session_number: 3,
          patient: undefined,
          physio: { id_physio: 8, name: 'Luis', surname: 'Gil', second_surname: 'Mora' },
        }),
      ]),
    );

    await TestBed.configureTestingModule({
      imports: [Sessions],
      providers: [
        ...provideTestRouter(),
        { provide: AppointmentsService, useValue: service },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Sessions);
    component = fixture.componentInstance;
  });

  it('carga las citas y las prepara para la tabla', () => {
    fixture.detectChanges();
    const filas = component.listadoAppointmentsConfig().data;

    expect(filas.length).toBe(2);
    expect(filas[0]).toEqual(
      jasmine.objectContaining({
        patientName: 'Lucía García López',
        physioName: 'Ana Ruiz',
        sessionType: '1ª sesión',
        status: 'Programada',
      }),
    );
    expect(filas[1]).toEqual(
      jasmine.objectContaining({
        patientName: 'Paciente no disponible',
        physioName: 'Luis Gil Mora',
        status: 'Cancelada',
      }),
    );
  });

  it('si la API falla, muestra el error', () => {
    service.getAllAppointments.and.returnValue(throwError(() => new Error('500')));
    fixture.detectChanges();

    expect(component.loadError()).toBe('No se han podido cargar las citas.');
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'No se han podido cargar las citas.',
    );
  });

  it('al pulsar una cita abre su detalle y recarga si se modificó', () => {
    fixture.detectChanges();
    service.getAppointmentById.and.returnValue(of(anAppointment()));
    dialog.open.and.returnValue(dialogClosingWith({ action: 'cancelled' }));

    component.onAppointmentClick({ row: { id: 'a-1' } });

    expect(dialog.open).toHaveBeenCalledWith(
      DetailSession,
      jasmine.objectContaining({ data: anAppointment() }),
    );
    expect(service.getAllAppointments).toHaveBeenCalledTimes(2);
  });

  it('no abre nada si el id de la fila no es válido; y avisa si la cita no carga', () => {
    fixture.detectChanges();
    component.onAppointmentClick({ row: { id: 99 } });
    expect(service.getAppointmentById).not.toHaveBeenCalled();

    service.getAppointmentById.and.returnValue(throwError(() => new Error('404')));
    component.onAppointmentClick({ row: { id: 'a-1' } });
    expect(component.openError()).toBe('No se ha podido abrir la ficha de la cita.');
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('nueva cita: recarga solo si se creó', () => {
    fixture.detectChanges();
    dialog.open.and.returnValue(dialogClosingWith(undefined));
    component.openNewAppointment();
    expect(dialog.open).toHaveBeenCalledWith(NewSession, jasmine.any(Object));
    expect(service.getAllAppointments).toHaveBeenCalledTimes(1);

    dialog.open.and.returnValue(dialogClosingWith({ action: 'created' }));
    component.openNewAppointment();
    expect(service.getAllAppointments).toHaveBeenCalledTimes(2);
  });
});
