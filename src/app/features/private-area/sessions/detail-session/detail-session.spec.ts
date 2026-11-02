import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { provideTestDialog, provideTestNotifications } from '../../../../../testing/providers';
import { anAppointment } from '../../../../../testing/fixtures';
import { AppointmentsService } from '../services/appointments.service';
import { NotificationService } from '../../../../shared/notifications/notification.service';

import { DetailSession } from './detail-session';

describe('DetailSession', () => {
  let component: DetailSession;
  let fixture: ComponentFixture<DetailSession>;
  let service: jasmine.SpyObj<AppointmentsService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<unknown>>;
  let notifications: jasmine.SpyObj<NotificationService>;

  // Fecha local (no UTC) para que el test no dependa de la zona horaria de la máquina.
  const cita = anAppointment({ appointment_date: new Date(2026, 10, 4, 9, 30), notes: 'Traer informe' });

  beforeEach(async () => {
    service = jasmine.createSpyObj<AppointmentsService>('AppointmentsService', [
      'updateAppointment',
      'cancelAppointment',
      'deleteAppointment',
    ]);
    const dialog = provideTestDialog(cita);
    dialogRef = dialog.dialogRef;
    const notif = provideTestNotifications();
    notifications = notif.notifications;

    await TestBed.configureTestingModule({
      imports: [DetailSession],
      providers: [
        ...dialog.providers,
        ...notif.providers,
        { provide: AppointmentsService, useValue: service },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailSession);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('rellena el formulario con la fecha, la hora y las notas de la cita', () => {
    const campos = component.appointmentFormConfig()!.sections.flatMap((s) => s.fields);
    const valor = (nombre: string) => campos.find((c) => c.name === nombre)?.value;

    expect(valor('appointment_date')).toBe('2026-11-04');
    expect(valor('appointment_time')).toBe('09:30');
    expect(valor('notes')).toBe('Traer informe');
  });

  it('guardar: une fecha y hora en ISO, convierte la duración y cierra con "updated"', () => {
    service.updateAppointment.and.returnValue(of(cita));

    component.onSubmitAppointment({
      appointment_date: '2026-11-05',
      appointment_time: '10:00',
      duration: '60',
      notes: '  ',
    });

    expect(service.updateAppointment).toHaveBeenCalledWith('a-1', {
      appointment_date: new Date('2026-11-05T10:00:00').toISOString(),
      duration: 60,
      notes: undefined,
    });
    expect(notifications.success).toHaveBeenCalledWith('Cita actualizada correctamente');
    expect(dialogRef.close).toHaveBeenCalledWith({ action: 'updated' });
  });

  it('guardar con conflicto de horario (409): mensaje específico y no cierra', () => {
    service.updateAppointment.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409 })),
    );
    component.onSubmitAppointment({ appointment_date: '2026-11-05', appointment_time: '10:00' });

    expect(notifications.error).toHaveBeenCalledWith(
      'El fisioterapeuta ya tiene una cita en ese horario',
    );
    expect(dialogRef.close).not.toHaveBeenCalled();

    service.updateAppointment.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    component.onSubmitAppointment({ appointment_date: '2026-11-05', appointment_time: '10:00' });
    expect(notifications.error).toHaveBeenCalledWith('Error al actualizar la cita');
  });

  it('cancelar la cita: confirma, avisa y cierra con "cancelled"', () => {
    const confirmar = spyOn(window, 'confirm').and.returnValue(false);
    component.onCancel();
    expect(service.cancelAppointment).not.toHaveBeenCalled();

    confirmar.and.returnValue(true);
    service.cancelAppointment.and.returnValue(of(cita));
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalledWith({ action: 'cancelled' });

    service.cancelAppointment.and.returnValue(throwError(() => new Error('500')));
    component.onCancel();
    expect(notifications.error).toHaveBeenCalledWith('Error al cancelar la cita');
  });

  it('eliminar la cita: confirma, avisa y cierra con "deleted"', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    service.deleteAppointment.and.returnValue(of(undefined));
    component.onDelete();
    expect(notifications.success).toHaveBeenCalledWith('Cita eliminada correctamente');
    expect(dialogRef.close).toHaveBeenCalledWith({ action: 'deleted' });

    service.deleteAppointment.and.returnValue(throwError(() => new Error('500')));
    component.onDelete();
    expect(notifications.error).toHaveBeenCalledWith('Error al eliminar la cita');
  });

  it('cerrar sin cambios', () => {
    component.onClose();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });

  it('nombres y estado para la cabecera', () => {
    expect(component.getPatientName()).toBe('Lucía García López');
    expect(component.getPhysioName()).toBe('Ana Ruiz');
    expect(component.getStatusLabel('confirmed')).toBe('Confirmada');
    expect(component.getStatusLabel('raro')).toBe('raro');

    component.appointment = anAppointment({ patient: undefined, physio: undefined });
    expect(component.getPatientName()).toBe('Paciente no disponible');
    expect(component.getPhysioName()).toBe('Fisioterapeuta no disponible');
  });
});
