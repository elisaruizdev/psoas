import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { provideTestNotifications } from '../../../../testing/providers';
import { aPhysio } from '../../../../testing/fixtures';
import { NotificationService } from '../../../shared/notifications/notification.service';

import { Physios } from './physios';
import { PhysiosService } from './services/physios.service';
import { DetailPhysio } from './detail-physio/detail-physio';

describe('Physios', () => {
  let component: Physios;
  let fixture: ComponentFixture<Physios>;
  let service: jasmine.SpyObj<PhysiosService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let notifications: jasmine.SpyObj<NotificationService>;

  const pendiente = aPhysio({
    id_physio: 9,
    name: 'Marta',
    surname: 'Sanz',
    second_surname: 'Gil',
    status: 'pending_verification',
    specialty: null,
  });

  beforeEach(async () => {
    service = jasmine.createSpyObj<PhysiosService>('PhysiosService', [
      'getAllPhysios',
      'getPhysioById',
      'approvePhysio',
      'rejectPhysio',
    ]);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    service.getAllPhysios.and.returnValue(of([aPhysio(), pendiente]));
    const notif = provideTestNotifications();
    notifications = notif.notifications;

    await TestBed.configureTestingModule({
      imports: [Physios],
      providers: [
        { provide: PhysiosService, useValue: service },
        { provide: MatDialog, useValue: dialog },
        ...notif.providers,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Physios);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('lista los fisios y separa las solicitudes pendientes', () => {
    expect(component.physios().length).toBe(2);
    expect(component.pendingPhysios()).toEqual([pendiente]);
    expect(component.hasPendingPhysios()).toBeTrue();

    const filas = component.listadoPhysiosConfig().data;
    expect(filas[1]).toEqual(
      jasmine.objectContaining({
        fullName: 'Marta Sanz Gil',
        specialty: 'Sin especificar',
        status: 'Pendiente de verificación',
      }),
    );
  });

  it('muestra u oculta las solicitudes pendientes', () => {
    component.togglePendingRequests();
    expect(component.showPendingRequests()).toBeTrue();
    component.togglePendingRequests();
    expect(component.showPendingRequests()).toBeFalse();
  });

  it('si la API falla, muestra el error de carga', () => {
    service.getAllPhysios.and.returnValue(throwError(() => new Error('500')));
    component.getAllPhysios();
    expect(component.loadError()).toBe('No se han podido cargar los fisioterapeutas.');
  });

  it('al pulsar una fila abre el detalle; si falla, muestra el error', () => {
    service.getPhysioById.and.returnValue(of(aPhysio()));
    component.onPhysioClick({ row: { id: 7 } });
    expect(dialog.open).toHaveBeenCalledWith(DetailPhysio, jasmine.objectContaining({ data: aPhysio() }));

    component.onPhysioClick({ row: { id: 'no-es-un-numero' } });
    expect(service.getPhysioById).toHaveBeenCalledTimes(1);

    service.getPhysioById.and.returnValue(throwError(() => new Error('404')));
    component.onPhysioClick({ row: { id: 7 } });
    expect(component.openError()).not.toBe('');
  });

  it('aprobar: avisa con un snackbar (no con alert) y recarga', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    service.approvePhysio.and.returnValue(of(pendiente));

    component.approvePhysio(9);

    expect(service.approvePhysio).toHaveBeenCalledWith(9);
    expect(notifications.success).toHaveBeenCalledWith(
      'Fisioterapeuta aprobado. Se ha enviado el email de verificación.',
    );
    expect(service.getAllPhysios).toHaveBeenCalledTimes(2);
  });

  it('aprobar con error: lo muestra en la página', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    service.approvePhysio.and.returnValue(throwError(() => new Error('500')));
    component.approvePhysio(9);
    expect(component.openError()).toBe('No se ha podido aprobar la solicitud.');
  });

  it('rechazar: respeta la confirmación, avisa y gestiona el error', () => {
    const confirmar = spyOn(window, 'confirm').and.returnValue(false);
    component.rejectPhysio(9);
    expect(service.rejectPhysio).not.toHaveBeenCalled();

    confirmar.and.returnValue(true);
    service.rejectPhysio.and.returnValue(of(pendiente));
    component.rejectPhysio(9);
    expect(notifications.success).toHaveBeenCalledWith('Solicitud rechazada correctamente');

    service.rejectPhysio.and.returnValue(throwError(() => new Error('500')));
    component.rejectPhysio(9);
    expect(component.openError()).toBe('No se ha podido rechazar la solicitud.');
  });
});
