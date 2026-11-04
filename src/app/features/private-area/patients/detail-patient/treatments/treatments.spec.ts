import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideTestNotifications } from '../../../../../../testing/providers';
import { aTreatment } from '../../../../../../testing/fixtures';
import { TreatmentsService } from '../../services/treatments.service';
import { NotificationService } from '../../../../../shared/notifications/notification.service';

import { Treatments } from './treatments';

describe('Treatments', () => {
  let component: Treatments;
  let fixture: ComponentFixture<Treatments>;
  let treatments: jasmine.SpyObj<TreatmentsService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    treatments = jasmine.createSpyObj<TreatmentsService>('TreatmentsService', [
      'getAllByPatient',
      'create',
      'update',
      'delete',
    ]);
    treatments.getAllByPatient.and.returnValue(of([aTreatment()]));
    const notif = provideTestNotifications();
    notifications = notif.notifications;

    await TestBed.configureTestingModule({
      imports: [Treatments],
      providers: [{ provide: TreatmentsService, useValue: treatments }, ...notif.providers],
    }).compileComponents();

    fixture = TestBed.createComponent(Treatments);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('patientId', 'p-1');
    fixture.detectChanges();
  });

  it('carga y pinta los tratamientos del paciente', () => {
    expect(treatments.getAllByPatient).toHaveBeenCalledWith('p-1');
    expect(fixture.nativeElement.textContent).toContain('Rehabilitación lumbar');
  });

  it('si la carga falla, deja de cargar y avisa', () => {
    treatments.getAllByPatient.and.returnValue(throwError(() => new Error('500')));
    component.loadTreatments();
    expect(component.loading()).toBeFalse();
    expect(notifications.error).toHaveBeenCalledWith('No se han podido cargar los tratamientos');
  });

  it('nuevo tratamiento: formulario con estado "active" por defecto', () => {
    component.onNewTreatment();
    fixture.detectChanges();
    const estado = component.treatmentFormConfig()!.sections[0].fields.find((f) => f.name === 'status');
    expect(estado?.value).toBe('active');
    expect(component.showForm()).toBeTrue();

    component.onCancelForm();
    expect(component.showForm()).toBeFalse();
  });

  it('crear: convierte las sesiones planificadas a número y vacíos a undefined', () => {
    treatments.create.and.returnValue(of(aTreatment()));
    component.onSubmitTreatment({
      treatment_name: 'Hombro',
      start_date: '2026-11-02',
      end_date: '',
      description: 'Desc',
      objectives: 'Obj',
      sessions_planned: '8',
      status: 'paused',
    });

    expect(treatments.create).toHaveBeenCalledWith({
      patient_id: 'p-1',
      treatment_name: 'Hombro',
      start_date: '2026-11-02',
      end_date: undefined,
      description: 'Desc',
      objectives: 'Obj',
      sessions_planned: 8,
      status: 'paused',
    });
    expect(notifications.success).toHaveBeenCalledWith('Tratamiento creado correctamente');
  });

  it('crear sin sesiones planificadas y con un estado desconocido', () => {
    treatments.create.and.returnValue(of(aTreatment()));
    component.onSubmitTreatment({ sessions_planned: '', status: 'inventado' });
    const enviado = treatments.create.calls.mostRecent().args[0];
    expect(enviado.sessions_planned).toBeUndefined();
    expect(enviado.status).toBeUndefined();
  });

  it('crear con error: avisa', () => {
    treatments.create.and.returnValue(throwError(() => new Error('400')));
    component.onSubmitTreatment({});
    expect(notifications.error).toHaveBeenCalledWith('Error al crear el tratamiento');
  });

  it('guardar edición: fechas en formato API (también la de fin)', () => {
    treatments.update.and.returnValue(of(aTreatment()));
    const t = aTreatment({ start_date: new Date(2026, 9, 2), end_date: new Date(2026, 11, 20) });
    component.onEdit(t);
    component.onSaveEdit(t);

    expect(treatments.update).toHaveBeenCalledWith(
      't-1',
      jasmine.objectContaining({ start_date: '2026-10-02', end_date: '2026-12-20' }),
    );
    expect(component.isEditing('t-1')).toBeFalse();
  });

  it('guardar edición con error: avisa', () => {
    treatments.update.and.returnValue(throwError(() => new Error('500')));
    component.onSaveEdit(aTreatment());
    expect(notifications.error).toHaveBeenCalledWith('Error al actualizar el tratamiento');
    component.onCancelEdit();
    expect(component.editingId()).toBeNull();
  });

  it('borrar: respeta la confirmación y avisa del resultado', () => {
    const confirmar = spyOn(window, 'confirm').and.returnValue(false);
    component.onDelete(aTreatment());
    expect(treatments.delete).not.toHaveBeenCalled();

    confirmar.and.returnValue(true);
    treatments.delete.and.returnValue(of(undefined));
    component.onDelete(aTreatment());
    expect(notifications.success).toHaveBeenCalledWith('Tratamiento eliminado correctamente');

    treatments.delete.and.returnValue(throwError(() => new Error('500')));
    component.onDelete(aTreatment());
    expect(notifications.error).toHaveBeenCalledWith('Error al eliminar el tratamiento');
  });

  it('colores de estado', () => {
    expect(component.getStatusColor('paused')).toBe('warn');
    expect(component.getStatusColor('otro')).toBe('primary');
  });
});
