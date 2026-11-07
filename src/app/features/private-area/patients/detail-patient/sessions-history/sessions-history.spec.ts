import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideTestNotifications } from '../../../../../../testing/providers';
import { aPhysio, aSession, aTreatment } from '../../../../../../testing/fixtures';
import { SessionsService } from '../../services/sessions.service';
import { TreatmentsService } from '../../services/treatments.service';
import { PhysiosService } from '../../../physios/services/physios.service';
import { NotificationService } from '../../../../../shared/notifications/notification.service';

import { SessionsHistory } from './sessions-history';

describe('SessionsHistory', () => {
  let component: SessionsHistory;
  let fixture: ComponentFixture<SessionsHistory>;
  let sessions: jasmine.SpyObj<SessionsService>;
  let treatments: jasmine.SpyObj<TreatmentsService>;
  let physios: jasmine.SpyObj<PhysiosService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  const antigua = aSession({ id: 's-old', session_date: '2026-10-01T00:00:00.000Z' });
  const reciente = aSession({ id: 's-new', session_date: '2026-10-20T00:00:00.000Z' });
  const deOtroTratamiento = aSession({ id: 's-x', treatment_id: 't-2' });

  async function crear(): Promise<void> {
    fixture = TestBed.createComponent(SessionsHistory);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('patientId', 'p-1');
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    sessions = jasmine.createSpyObj<SessionsService>('SessionsService', [
      'getAllByPatient',
      'create',
      'update',
      'delete',
    ]);
    treatments = jasmine.createSpyObj<TreatmentsService>('TreatmentsService', ['getAllByPatient']);
    physios = jasmine.createSpyObj<PhysiosService>('PhysiosService', ['getAllPhysios']);
    sessions.getAllByPatient.and.returnValue(of([antigua, reciente, deOtroTratamiento]));
    treatments.getAllByPatient.and.returnValue(of([aTreatment()]));
    physios.getAllPhysios.and.returnValue(of([aPhysio()]));
    const notif = provideTestNotifications();
    notifications = notif.notifications;

    await TestBed.configureTestingModule({
      imports: [SessionsHistory],
      providers: [
        { provide: SessionsService, useValue: sessions },
        { provide: TreatmentsService, useValue: treatments },
        { provide: PhysiosService, useValue: physios },
        ...notif.providers,
      ],
    }).compileComponents();
  });

  it('agrupa las sesiones bajo su tratamiento activo, de la más reciente a la más antigua', async () => {
    await crear();
    const grupos = component.treatmentsWithSessions();
    expect(grupos.length).toBe(1);
    expect(grupos[0].sessions.map((s) => s.id)).toEqual(['s-new', 's-old']);
  });

  it('cada tratamiento muestra cuántas sesiones lleva de las planificadas', async () => {
    await crear();
    expect(fixture.nativeElement.textContent).toContain('2 de 10 sesiones');
  });

  it('sin tratamientos activos, muestra solo el último que empezó', async () => {
    treatments.getAllByPatient.and.returnValue(
      of([
        aTreatment({ id: 't-1', status: 'completed', start_date: '2026-01-01' }),
        aTreatment({ id: 't-2', status: 'paused', start_date: '2026-06-01' }),
      ]),
    );
    await crear();
    const grupos = component.treatmentsWithSessions();
    expect(grupos.map((g) => g.treatment.id)).toEqual(['t-2']);
    expect(grupos[0].sessions.map((s) => s.id)).toEqual(['s-x']);
  });

  it('sin tratamientos, no hay grupos; y si la carga falla, deja de cargar y avisa', async () => {
    treatments.getAllByPatient.and.returnValue(of([]));
    await crear();
    expect(component.treatmentsWithSessions()).toEqual([]);

    physios.getAllPhysios.and.returnValue(throwError(() => new Error('500')));
    component.loadAllData();
    expect(component.loading()).toBeFalse();
    expect(notifications.error).toHaveBeenCalledWith('No se han podido cargar las sesiones');
  });

  it('el formulario de nueva sesión ofrece tratamientos y fisios del centro', async () => {
    await crear();
    expect(component.sessionFormConfig()).toBeNull();

    component.onNewSession();
    const campos = component.sessionFormConfig()!.sections[0].fields;
    const fisio = campos.find((c) => c.name === 'physio_id')!;
    expect(fisio.options!.map((o) => o.label)).toContain('Ana Ruiz');
    const tratamiento = campos.find((c) => c.name === 'treatment_id')!;
    expect(tratamiento.options!.map((o) => o.label)).toContain('Rehabilitación lumbar');

    component.onCancelForm();
    expect(component.showForm()).toBeFalse();
  });

  it('sin fisios no se puede montar el formulario', async () => {
    physios.getAllPhysios.and.returnValue(of([]));
    await crear();
    component.onNewSession();
    expect(component.sessionFormConfig()).toBeNull();
  });

  it('crear sesión: la envía para este paciente, cierra el formulario y avisa', async () => {
    await crear();
    sessions.create.and.returnValue(of(aSession()));
    component.onNewSession();
    component.onSubmitSession({ physio_id: '7', duration: '45' });

    expect(sessions.create).toHaveBeenCalledWith(
      jasmine.objectContaining({ patient_id: 'p-1', physio_id: 7, duration: 45 }),
    );
    expect(component.showForm()).toBeFalse();
    expect(component.saving()).toBeFalse();
    expect(notifications.success).toHaveBeenCalledWith('Sesión creada correctamente');

    sessions.create.and.returnValue(throwError(() => new Error('400')));
    component.onSubmitSession({});
    expect(notifications.error).toHaveBeenCalledWith('Error al crear la sesión');
  });

  it('editar y guardar sesión, con y sin próxima cita', async () => {
    await crear();
    sessions.update.and.returnValue(of(aSession()));
    const s = aSession({ session_date: new Date(2026, 9, 5), next_appointment: new Date(2026, 9, 12) });

    component.onEdit(s);
    expect(component.isEditing('s-1')).toBeTrue();
    component.onSaveEdit(s);
    expect(sessions.update).toHaveBeenCalledWith(
      's-1',
      jasmine.objectContaining({ session_date: '2026-10-05', next_appointment: '2026-10-12' }),
    );
    expect(component.isEditing('s-1')).toBeFalse();
    expect(notifications.success).toHaveBeenCalledWith('Sesión actualizada correctamente');

    sessions.update.and.returnValue(throwError(() => new Error('500')));
    component.onSaveEdit(aSession());
    expect(notifications.error).toHaveBeenCalledWith('Error al actualizar la sesión');
    component.onCancelEdit();
    expect(component.editingId()).toBeNull();
  });

  async function editarTecnicas(texto: string): Promise<HTMLTextAreaElement> {
    component.onEdit(reciente);
    fixture.detectChanges();
    await fixture.whenStable();
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('#tecnicas-s-new');
    textarea.value = texto;
    textarea.dispatchEvent(new Event('input'));
    return textarea;
  }

  it('al editar, cada caja de texto tiene su etiqueta asociada', async () => {
    await crear();
    await editarTecnicas('Punción seca');
    const host: HTMLElement = fixture.nativeElement;

    for (const id of ['tecnicas-s-new', 'evolucion-s-new', 'observaciones-s-new']) {
      expect(host.querySelector(`textarea#${id}`)).withContext(id).not.toBeNull();
      expect(host.querySelector(`label[for="${id}"]`)).withContext(id).not.toBeNull();
    }
  });

  it('cancelar la edición descarta lo escrito y deja la sesión como estaba', async () => {
    await crear();
    const original = reciente.techniques_applied;
    await editarTecnicas('Punción seca');

    component.onCancelEdit();
    fixture.detectChanges();

    expect(reciente.techniques_applied).toBe(original);
    expect(fixture.nativeElement.textContent).not.toContain('Punción seca');
  });

  it('guardar envía lo escrito sin tocar la sesión hasta que recarga', async () => {
    await crear();
    sessions.update.and.returnValue(of(aSession()));
    const original = reciente.techniques_applied;
    await editarTecnicas('Punción seca');

    component.onSaveEdit(reciente);

    expect(sessions.update).toHaveBeenCalledWith(
      's-new',
      jasmine.objectContaining({ techniques_applied: 'Punción seca' }),
    );
    expect(reciente.techniques_applied).toBe(original);
  });

  it('borrar sesión respeta la confirmación', async () => {
    await crear();
    const confirmar = spyOn(window, 'confirm').and.returnValue(false);
    component.onDelete(aSession());
    expect(sessions.delete).not.toHaveBeenCalled();

    confirmar.and.returnValue(true);
    sessions.delete.and.returnValue(of(undefined));
    component.onDelete(aSession());
    expect(notifications.success).toHaveBeenCalledWith('Sesión eliminada correctamente');

    sessions.delete.and.returnValue(throwError(() => new Error('500')));
    component.onDelete(aSession());
    expect(notifications.error).toHaveBeenCalledWith('Error al eliminar la sesión');
  });
});
