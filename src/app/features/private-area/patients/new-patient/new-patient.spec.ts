import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { provideTestDialog, provideTestNotifications } from '../../../../../testing/providers';
import { aPatient } from '../../../../../testing/fixtures';
import { PatientsService } from '../services/patients.service';
import { NotificationService } from '../../../../shared/notifications/notification.service';
import { FormValue } from '../../../../shared/models/form.model';

import { NewPatient } from './new-patient';

describe('NewPatient', () => {
  let component: NewPatient;
  let fixture: ComponentFixture<NewPatient>;
  let service: jasmine.SpyObj<PatientsService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<unknown>>;
  let notifications: jasmine.SpyObj<NotificationService>;

  const formulario: FormValue = {
    name: 'marta',
    surname: 'pérez',
    second_surname: 'gil',
    identifier: ' 11.223.344-b ',
    birthdate: '1992-03-14',
    gender: '',
    health_insurance: '',
    phone: '+34 611 22 33 44',
    email: ' Marta@Example.com ',
    address: 'Calle Sol 3',
    city: 'san sebastián',
    zip: '41001',
    emergency_contact: '',
    consultation_reason: '',
    medical_history: '',
  };

  beforeEach(async () => {
    service = jasmine.createSpyObj<PatientsService>('PatientsService', ['createPatient']);
    const dialog = provideTestDialog();
    dialogRef = dialog.dialogRef;
    const notif = provideTestNotifications();
    notifications = notif.notifications;

    await TestBed.configureTestingModule({
      imports: [NewPatient],
      providers: [...dialog.providers, ...notif.providers, { provide: PatientsService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(NewPatient);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('el campo DNI/NIE valida la letra de control', () => {
    const dni = component.patientFormConfig()!.sections[0].fields.find((f) => f.name === 'identifier')!;
    const validar = dni.validators![0];
    expect(validar({ value: '12345678Z' } as never)).toBeNull();
    expect(validar({ value: '12345678A' } as never)).toEqual({ dniNie: { reason: 'letter' } });
  });

  it('normaliza los datos antes de enviarlos', () => {
    service.createPatient.and.returnValue(of(aPatient()));
    component.onSubmitPatient(formulario);

    const enviado = service.createPatient.calls.mostRecent().args[0];
    expect(enviado).toEqual(
      jasmine.objectContaining({
        name: 'Marta',
        surname: 'Pérez',
        second_surname: 'Gil',
        identifier: '11223344B',
        phone: '+34611223344',
        email: 'marta@example.com',
        city: 'San Sebastián',
        gender: 'otro', // sin elegir → "otro"
        emergency_contact: undefined,
      }),
    );
    expect(notifications.success).toHaveBeenCalledWith('Paciente creado correctamente');
    expect(dialogRef.close).toHaveBeenCalledWith({ action: 'created' });
  });

  it('409: muestra el mensaje del back (o uno por defecto) y no cierra', () => {
    spyOn(console, 'error');
    service.createPatient.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'DNI repetido' } })),
    );
    component.onSubmitPatient(formulario);
    expect(notifications.error).toHaveBeenCalledWith('DNI repetido');

    service.createPatient.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: {} })));
    component.onSubmitPatient(formulario);
    expect(notifications.error).toHaveBeenCalledWith('Ya existe un paciente con ese DNI/NIE');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('400 y otros errores: mensajes genéricos', () => {
    spyOn(console, 'error');
    service.createPatient.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
    component.onSubmitPatient(formulario);
    expect(notifications.error).toHaveBeenCalledWith('Datos inválidos. Revisa el formulario');

    service.createPatient.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.onSubmitPatient(formulario);
    expect(notifications.error).toHaveBeenCalledWith('Error al crear el paciente');
  });

  it('cancelar cierra el modal sin resultado', () => {
    component.onCancelForm();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
