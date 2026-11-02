import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { provideTestDialog, provideTestNotifications } from '../../../../../testing/providers';
import { aPhysio } from '../../../../../testing/fixtures';
import { PhysiosService } from '../services/physios.service';
import { NotificationService } from '../../../../shared/notifications/notification.service';

import { DetailPhysio } from './detail-physio';

describe('DetailPhysio', () => {
  let component: DetailPhysio;
  let fixture: ComponentFixture<DetailPhysio>;
  let service: jasmine.SpyObj<PhysiosService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<unknown>>;
  let notifications: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    service = jasmine.createSpyObj<PhysiosService>('PhysiosService', ['updatePhysio', 'deletePhysio']);
    const dialog = provideTestDialog(aPhysio({ city: 'Madrid', identifier: 'X1234567L' }));
    dialogRef = dialog.dialogRef;
    const notif = provideTestNotifications();
    notifications = notif.notifications;

    await TestBed.configureTestingModule({
      imports: [DetailPhysio],
      providers: [...dialog.providers, ...notif.providers, { provide: PhysiosService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailPhysio);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('precarga el formulario con los datos del fisio', () => {
    const campos = component.physioFormConfig.sections.flatMap((s) => s.fields);
    expect(campos.find((c) => c.name === 'identifier')?.value).toBe('X1234567L');
    expect(campos.find((c) => c.name === 'phone')?.value).toBe('600333444');
  });

  it('guardar: normaliza DNI, teléfono y textos; vacíos a undefined', () => {
    service.updatePhysio.and.returnValue(of(aPhysio()));
    component.onSubmitPhysio({
      identifier: 'x-1234567-l',
      phone: '600 33 34 44',
      city: 'las palmas',
      country: '',
      license_number: ' COL-9 ',
      specialty: '',
    });

    expect(service.updatePhysio).toHaveBeenCalledWith(
      7,
      jasmine.objectContaining({
        identifier: 'X1234567L',
        phone: '600333444',
        city: 'Las Palmas',
        country: undefined,
        license_number: 'COL-9',
        specialty: undefined,
      }),
    );
    expect(notifications.success).toHaveBeenCalledWith('Cambios guardados correctamente');
    expect(dialogRef.close).toHaveBeenCalledWith({ action: 'save' });
  });

  it('guardar con error: avisa y no cierra', () => {
    spyOn(console, 'error');
    service.updatePhysio.and.returnValue(throwError(() => new Error('500')));
    component.onSubmitPhysio({});
    expect(notifications.error).toHaveBeenCalledWith('Error al guardar los cambios');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('eliminar: confirma, avisa y gestiona el error', () => {
    const confirmar = spyOn(window, 'confirm').and.returnValue(false);
    component.onDelete();
    expect(service.deletePhysio).not.toHaveBeenCalled();

    confirmar.and.returnValue(true);
    service.deletePhysio.and.returnValue(of(undefined));
    component.onDelete();
    expect(dialogRef.close).toHaveBeenCalledWith({ action: 'delete' });

    spyOn(console, 'error');
    service.deletePhysio.and.returnValue(throwError(() => new Error('500')));
    component.onDelete();
    expect(notifications.error).toHaveBeenCalledWith('Error al eliminar el fisioterapeuta');
  });

  it('cancelar cierra sin resultado', () => {
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
