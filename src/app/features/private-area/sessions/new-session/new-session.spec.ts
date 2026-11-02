import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { provideTestDialog, provideTestNotifications } from '../../../../../testing/providers';
import { anAppointment, aPatient, aPhysio } from '../../../../../testing/fixtures';
import { AppointmentsService } from '../services/appointments.service';
import { PatientsService } from '../../patients/services/patients.service';
import { PhysiosService } from '../../physios/services/physios.service';
import { NotificationService } from '../../../../shared/notifications/notification.service';

import { NewSession } from './new-session';

describe('NewSession', () => {
  let component: NewSession;
  let fixture: ComponentFixture<NewSession>;
  let appointments: jasmine.SpyObj<AppointmentsService>;
  let patients: jasmine.SpyObj<PatientsService>;
  let physios: jasmine.SpyObj<PhysiosService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<unknown>>;
  let notifications: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    appointments = jasmine.createSpyObj<AppointmentsService>('AppointmentsService', ['createAppointment']);
    patients = jasmine.createSpyObj<PatientsService>('PatientsService', ['getAllPatients']);
    physios = jasmine.createSpyObj<PhysiosService>('PhysiosService', ['getAllPhysios']);
    patients.getAllPatients.and.returnValue(of([aPatient()]));
    physios.getAllPhysios.and.returnValue(
      of([aPhysio(), aPhysio({ id_physio: 8, name: 'Pendiente', status: 'pending_verification' })]),
    );
    const dialog = provideTestDialog();
    dialogRef = dialog.dialogRef;
    const notif = provideTestNotifications();
    notifications = notif.notifications;

    await TestBed.configureTestingModule({
      imports: [NewSession],
      providers: [
        ...dialog.providers,
        ...notif.providers,
        { provide: AppointmentsService, useValue: appointments },
        { provide: PatientsService, useValue: patients },
        { provide: PhysiosService, useValue: physios },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewSession);
    component = fixture.componentInstance;
  });

  it('solo ofrece fisios activos en el selector', () => {
    fixture.detectChanges();
    const fisio = component.appointmentFormConfig()!.sections[0].fields.find((c) => c.name === 'physio_id')!;
    expect(fisio.options!.map((o) => o.value)).toEqual([7]);
  });

  it('si no cargan los pacientes o los fisios, avisa del error', () => {
    spyOn(console, 'error');
    patients.getAllPatients.and.returnValue(throwError(() => new Error('500')));
    fixture.detectChanges();
    expect(notifications.error).toHaveBeenCalledWith('Error al cargar los pacientes');
  });

  it('si fallan los fisios, avisa del error', () => {
    spyOn(console, 'error');
    physios.getAllPhysios.and.returnValue(throwError(() => new Error('500')));
    fixture.detectChanges();
    expect(notifications.error).toHaveBeenCalledWith('Error al cargar los fisioterapeutas');
  });

  it('crear: convierte ids y duración a número, y cierra con "created"', () => {
    fixture.detectChanges();
    appointments.createAppointment.and.returnValue(of(anAppointment()));

    component.onSubmitAppointment({
      patient_id: 'p-1',
      physio_id: '7',
      appointment_date: '2026-11-04',
      appointment_time: '10:00',
      duration: '45',
      notes: ' Primera visita ',
    });

    expect(appointments.createAppointment).toHaveBeenCalledWith({
      patient_id: 'p-1',
      physio_id: 7,
      appointment_date: new Date('2026-11-04T10:00:00').toISOString(),
      duration: 45,
      notes: 'Primera visita',
    });
    expect(dialogRef.close).toHaveBeenCalledWith({ action: 'created' });
  });

  it('crear con conflicto (409) u otro error: mensajes distintos', () => {
    spyOn(console, 'error');
    fixture.detectChanges();
    const datos = { appointment_date: '2026-11-04', appointment_time: '10:00' };

    appointments.createAppointment.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    component.onSubmitAppointment(datos);
    expect(notifications.error).toHaveBeenCalledWith('El fisioterapeuta ya tiene una cita en ese horario');

    appointments.createAppointment.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.onSubmitAppointment(datos);
    expect(notifications.error).toHaveBeenCalledWith('Error al crear la cita');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('cancelar cierra el diálogo', () => {
    fixture.detectChanges();
    component.onCancelForm();
    expect(dialogRef.close).toHaveBeenCalled();
  });
});
