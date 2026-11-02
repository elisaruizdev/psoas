import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import {
  provideTestDialog,
  provideTestHttp,
  provideTestNotifications,
} from '../../../../../testing/providers';
import { aPatient } from '../../../../../testing/fixtures';
import { PatientsService } from '../services/patients.service';
import { NotificationService } from '../../../../shared/notifications/notification.service';

import { DetailPatient } from './detail-patient';

describe('DetailPatient', () => {
  let component: DetailPatient;
  let fixture: ComponentFixture<DetailPatient>;
  let service: jasmine.SpyObj<PatientsService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<unknown>>;
  let notifications: jasmine.SpyObj<NotificationService>;

  async function crear(): Promise<void> {
    fixture = TestBed.createComponent(DetailPatient);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    service = jasmine.createSpyObj<PatientsService>('PatientsService', [
      'getPatientById',
      'updatePatient',
      'deletePatient',
    ]);
    service.getPatientById.and.returnValue(of(aPatient()));
    const dialog = provideTestDialog({ id: 'p-1' });
    dialogRef = dialog.dialogRef;
    const notif = provideTestNotifications();
    notifications = notif.notifications;

    await TestBed.configureTestingModule({
      imports: [DetailPatient],
      providers: [
        ...dialog.providers,
        ...notif.providers,
        // Las pestañas hijas (historia, tratamientos, sesiones) usan HttpClient de prueba.
        ...provideTestHttp(),
        { provide: PatientsService, useValue: service },
      ],
    }).compileComponents();
  });

  it('carga la ficha del paciente y monta el formulario de contacto', async () => {
    await crear();
    expect(service.getPatientById).toHaveBeenCalledWith('p-1');
    expect(component.loading()).toBeFalse();
    expect(component.getFullName()).toBe('Lucía García López');

    const telefono = component.patientFormConfig()!.sections[0].fields[0];
    expect(telefono.value).toBe('600111222');
  });

  it('si la ficha no carga, muestra el error', async () => {
    service.getPatientById.and.returnValue(throwError(() => new Error('404')));
    await crear();
    expect(component.loadError()).toBe('No se ha podido abrir la ficha del paciente.');
    expect(component.getFullName()).toBe('');
  });

  it('guardar: manda los datos normalizados, avisa y cierra con "updated"', async () => {
    await crear();
    service.updatePatient.and.returnValue(of(aPatient()));

    component.onSubmitPatient({
      phone: '611 22 33 44',
      email: ' Lucia@Example.com ',
      city: 'sevilla',
      zip: '',
      address: '',
      emergency_contact: '',
      health_insurance: '',
    });

    expect(service.updatePatient).toHaveBeenCalledWith(
      'p-1',
      jasmine.objectContaining({
        phone: '611223344',
        email: 'lucia@example.com',
        city: 'Sevilla',
        zip: undefined,
      }),
    );
    expect(notifications.success).toHaveBeenCalledWith('Paciente actualizado correctamente');
    expect(dialogRef.close).toHaveBeenCalledWith({ action: 'updated' });
  });

  it('guardar con error: avisa y no cierra', async () => {
    await crear();
    service.updatePatient.and.returnValue(throwError(() => new Error('500')));
    component.onSubmitPatient({});
    expect(notifications.error).toHaveBeenCalledWith('Error al actualizar el paciente');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('eliminar: confirma, cierra con el id y gestiona el error', async () => {
    await crear();
    const confirmar = spyOn(window, 'confirm').and.returnValue(false);
    component.onDelete();
    expect(service.deletePatient).not.toHaveBeenCalled();

    confirmar.and.returnValue(true);
    service.deletePatient.and.returnValue(of(undefined));
    component.onDelete();
    expect(dialogRef.close).toHaveBeenCalledWith({ action: 'delete', id: 'p-1' });

    service.deletePatient.and.returnValue(throwError(() => new Error('500')));
    component.onDelete();
    expect(notifications.error).toHaveBeenCalledWith('Error al eliminar el paciente');
  });

  it('pestañas, cierre y fechas', async () => {
    await crear();
    component.onTabChange('sessions');
    expect(component.activeTab()).toBe('sessions');
    component.onClose();
    expect(dialogRef.close).toHaveBeenCalledWith();
    expect(component.formatDate(null)).toBe('No especificado');
    expect(component.formatDate(new Date(2026, 0, 5))).toBe('5/1/2026');
  });
});
