import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideTestNotifications } from '../../../../../../testing/providers';
import { aDiagnosis } from '../../../../../../testing/fixtures';
import { DiagnosesService } from '../../services/diagnoses.service';
import { NotificationService } from '../../../../../shared/notifications/notification.service';

import { ClinicalHistory } from './clinical-history';

describe('ClinicalHistory', () => {
  let component: ClinicalHistory;
  let fixture: ComponentFixture<ClinicalHistory>;
  let diagnoses: jasmine.SpyObj<DiagnosesService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    // Doble del servicio: el test controla qué devuelve la "API" sin HTTP.
    diagnoses = jasmine.createSpyObj<DiagnosesService>('DiagnosesService', [
      'getAllByPatient',
      'create',
      'update',
      'delete',
    ]);
    diagnoses.getAllByPatient.and.returnValue(of([aDiagnosis()]));
    const notif = provideTestNotifications();
    notifications = notif.notifications;

    await TestBed.configureTestingModule({
      imports: [ClinicalHistory],
      providers: [{ provide: DiagnosesService, useValue: diagnoses }, ...notif.providers],
    }).compileComponents();

    fixture = TestBed.createComponent(ClinicalHistory);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('patientId', 'p-1');
    fixture.detectChanges();
  });

  it('carga los diagnósticos del paciente y los pinta', () => {
    expect(diagnoses.getAllByPatient).toHaveBeenCalledWith('p-1');
    expect(component.diagnoses().length).toBe(1);
    expect(component.loading()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Lumbalgia');
  });

  it('si la carga falla, deja de cargar y avisa', () => {
    diagnoses.getAllByPatient.and.returnValue(throwError(() => new Error('500')));
    component.loadDiagnoses();
    expect(component.loading()).toBeFalse();
    expect(notifications.error).toHaveBeenCalledWith('No se han podido cargar los diagnósticos');
  });

  it('nuevo diagnóstico: abre el formulario con la fecha de hoy (local, no UTC)', () => {
    // 00:30 en hora local: con toISOString() saldría el día anterior en España.
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 10, 3, 0, 30));
    try {
      component.onNewDiagnosis();
    } finally {
      jasmine.clock().uninstall();
    }
    expect(component.showForm()).toBeTrue();
    const fecha = component.diagnosisFormConfig()!.sections[0].fields[0];
    expect(fecha.value).toBe('2026-11-03');

    component.onCancelForm();
    expect(component.showForm()).toBeFalse();
  });

  it('crear: envía los datos con el id del paciente, avisa y recarga', () => {
    diagnoses.create.and.returnValue(of(aDiagnosis()));
    component.onSubmitDiagnosis({
      diagnosis_date: '2026-11-02',
      diagnosis_type: 'Cervicalgia',
      description: 'Dolor cervical',
      observations: '',
      status: 'active',
    });

    expect(diagnoses.create).toHaveBeenCalledWith({
      patient_id: 'p-1',
      diagnosis_date: '2026-11-02',
      diagnosis_type: 'Cervicalgia',
      description: 'Dolor cervical',
      observations: '',
      status: 'active',
    });
    expect(notifications.success).toHaveBeenCalledWith('Diagnóstico creado correctamente');
    expect(diagnoses.getAllByPatient).toHaveBeenCalledTimes(2);
  });

  it('crear con error: avisa del error', () => {
    diagnoses.create.and.returnValue(throwError(() => new Error('400')));
    component.onSubmitDiagnosis({ status: 'active' });
    expect(notifications.error).toHaveBeenCalledWith('Error al crear el diagnóstico');
  });

  it('editar y guardar: manda la fecha en formato de API y sale de edición', () => {
    diagnoses.update.and.returnValue(of(aDiagnosis()));
    const diagnostico = aDiagnosis({ diagnosis_date: new Date(2026, 9, 1) });

    component.onEdit(diagnostico);
    expect(component.isEditing('d-1')).toBeTrue();

    component.onSaveEdit(diagnostico);
    expect(diagnoses.update).toHaveBeenCalledWith(
      'd-1',
      jasmine.objectContaining({ diagnosis_date: '2026-10-01', diagnosis_type: 'Lumbalgia' }),
    );
    expect(component.isEditing('d-1')).toBeFalse();
    expect(notifications.success).toHaveBeenCalledWith('Diagnóstico actualizado correctamente');
  });

  it('guardar con error: avisa y sigue en edición', () => {
    diagnoses.update.and.returnValue(throwError(() => new Error('500')));
    component.onEdit(aDiagnosis());
    component.onSaveEdit(aDiagnosis());
    expect(notifications.error).toHaveBeenCalledWith('Error al actualizar el diagnóstico');
    expect(component.isEditing('d-1')).toBeTrue();

    component.onCancelEdit();
    expect(component.isEditing('d-1')).toBeFalse();
  });

  it('borrar: pide confirmación y no borra si se cancela', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    component.onDelete(aDiagnosis());
    expect(diagnoses.delete).not.toHaveBeenCalled();
  });

  it('borrar confirmado: borra, avisa y recarga; si falla, avisa del error', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    diagnoses.delete.and.returnValue(of(undefined));
    component.onDelete(aDiagnosis());
    expect(diagnoses.delete).toHaveBeenCalledWith('d-1');
    expect(notifications.success).toHaveBeenCalledWith('Diagnóstico eliminado correctamente');

    diagnoses.delete.and.returnValue(throwError(() => new Error('500')));
    component.onDelete(aDiagnosis());
    expect(notifications.error).toHaveBeenCalledWith('Error al eliminar el diagnóstico');
  });

  it('colores de estado', () => {
    expect(component.getStatusColor('active')).toBe('primary');
    expect(component.getStatusColor('resolved')).toBe('accent');
  });
});
