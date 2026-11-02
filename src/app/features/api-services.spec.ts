// Contrato HTTP de los servicios de la API: qué método, qué URL y qué cuerpo usa cada llamada.
//
// Es un test "por tablas": cada fila es una llamada. Añadir un endpoint nuevo es añadir una
// fila, y si alguien cambia una URL por error el test dice exactamente cuál.
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { provideTestHttp } from '../../testing/providers';
import { AuthService } from './auth/services/auth.service';
import { DashboardService } from './private-area/dashboard/services/dashboard.service';
import { DiagnosesService } from './private-area/patients/services/diagnoses.service';
import { SessionsService } from './private-area/patients/services/sessions.service';
import { TreatmentsService } from './private-area/patients/services/treatments.service';
import { PhysiosService } from './private-area/physios/services/physios.service';
import { AppointmentsService } from './private-area/sessions/services/appointments.service';
import { AssistantService } from './private-area/assistant/services/assistant.service';

const api = environment.baseUrl;

interface Llamada {
  nombre: string;
  ejecutar: () => Observable<unknown>;
  metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  cuerpo?: unknown;
}

describe('servicios de la API (contrato HTTP)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestHttp()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const auth = () => TestBed.inject(AuthService);
  const dashboard = () => TestBed.inject(DashboardService);
  const diagnoses = () => TestBed.inject(DiagnosesService);
  const sessions = () => TestBed.inject(SessionsService);
  const treatments = () => TestBed.inject(TreatmentsService);
  const physios = () => TestBed.inject(PhysiosService);
  const appointments = () => TestBed.inject(AppointmentsService);
  const assistant = () => TestBed.inject(AssistantService);
  const ia = environment.aiUrl;

  const registro = {
    name: 'Ana',
    surname: 'Ruiz',
    phone: '612345678',
    email: 'ana@psoas.es',
    password: 'segura123',
  };

  const llamadas: Llamada[] = [
    // --- Auth
    { nombre: 'auth.verifyEmail', ejecutar: () => auth().verifyEmail('tk'), metodo: 'GET', url: `${api}/auth/verify-email?token=tk` },
    { nombre: 'auth.registerForm', ejecutar: () => auth().registerForm(registro), metodo: 'POST', url: `${api}/auth/register`, cuerpo: registro },
    { nombre: 'auth.login', ejecutar: () => auth().login({ email: 'a@b.es', password: 'x' }), metodo: 'POST', url: `${api}/auth/login`, cuerpo: { email: 'a@b.es', password: 'x' } },
    { nombre: 'auth.forgotPassword', ejecutar: () => auth().forgotPassword({ email: 'a@b.es' }), metodo: 'POST', url: `${api}/auth/forgot-password`, cuerpo: { email: 'a@b.es' } },
    { nombre: 'auth.resetPassword', ejecutar: () => auth().resetPassword({ token: 't', password: 'p' }), metodo: 'POST', url: `${api}/auth/reset-password`, cuerpo: { token: 't', password: 'p' } },
    // --- Dashboard
    { nombre: 'dashboard.getDashboardStats', ejecutar: () => dashboard().getDashboardStats(), metodo: 'GET', url: `${api}/dashboard/stats` },
    // --- Fisioterapeutas
    { nombre: 'physios.getAllPhysios', ejecutar: () => physios().getAllPhysios(), metodo: 'GET', url: `${api}/physios` },
    { nombre: 'physios.getPhysioById', ejecutar: () => physios().getPhysioById(7), metodo: 'GET', url: `${api}/physios/7` },
    { nombre: 'physios.updatePhysio', ejecutar: () => physios().updatePhysio(7, { city: 'Madrid' }), metodo: 'PATCH', url: `${api}/physios/7`, cuerpo: { city: 'Madrid' } },
    { nombre: 'physios.approvePhysio', ejecutar: () => physios().approvePhysio(7), metodo: 'PATCH', url: `${api}/physios/7/approve`, cuerpo: {} },
    { nombre: 'physios.rejectPhysio', ejecutar: () => physios().rejectPhysio(7), metodo: 'PATCH', url: `${api}/physios/7/reject`, cuerpo: {} },
    { nombre: 'physios.deletePhysio', ejecutar: () => physios().deletePhysio(7), metodo: 'DELETE', url: `${api}/physios/7` },
    // --- Citas
    { nombre: 'appointments.getAllAppointments', ejecutar: () => appointments().getAllAppointments(), metodo: 'GET', url: `${api}/appointments` },
    { nombre: 'appointments.getAppointmentById', ejecutar: () => appointments().getAppointmentById('a-1'), metodo: 'GET', url: `${api}/appointments/a-1` },
    { nombre: 'appointments.updateAppointment', ejecutar: () => appointments().updateAppointment('a-1', { notes: 'ok' }), metodo: 'PATCH', url: `${api}/appointments/a-1`, cuerpo: { notes: 'ok' } },
    { nombre: 'appointments.cancelAppointment', ejecutar: () => appointments().cancelAppointment('a-1'), metodo: 'PATCH', url: `${api}/appointments/a-1/cancel`, cuerpo: {} },
    { nombre: 'appointments.deleteAppointment', ejecutar: () => appointments().deleteAppointment('a-1'), metodo: 'DELETE', url: `${api}/appointments/a-1` },
    // --- Asistente de IA (otro servicio, otra URL base)
    { nombre: 'assistant.health', ejecutar: () => assistant().health(), metodo: 'GET', url: `${ia}/salud` },
    { nombre: 'assistant.ask', ejecutar: () => assistant().ask('¿Cómo va Ana?'), metodo: 'POST', url: `${ia}/asistente`, cuerpo: { mensaje: '¿Cómo va Ana?' } },
  ];

  // Diagnósticos, sesiones y tratamientos comparten la misma forma de API REST.
  const crud = [
    { recurso: 'diagnoses', servicio: diagnoses },
    { recurso: 'sessions', servicio: sessions },
    { recurso: 'treatments', servicio: treatments },
  ] as const;
  crud.forEach(({ recurso, servicio }) => {
    llamadas.push(
      { nombre: `${recurso}.getAllByPatient`, ejecutar: () => servicio().getAllByPatient('p-1'), metodo: 'GET', url: `${api}/${recurso}/patient/p-1` },
      { nombre: `${recurso}.getOne`, ejecutar: () => servicio().getOne('x-1'), metodo: 'GET', url: `${api}/${recurso}/x-1` },
      { nombre: `${recurso}.update`, ejecutar: () => servicio().update('x-1', {}), metodo: 'PATCH', url: `${api}/${recurso}/x-1`, cuerpo: {} },
      { nombre: `${recurso}.delete`, ejecutar: () => servicio().delete('x-1'), metodo: 'DELETE', url: `${api}/${recurso}/x-1` },
    );
  });

  llamadas.forEach(({ nombre, ejecutar, metodo, url, cuerpo }) => {
    it(`${nombre} → ${metodo} ${url.replace(api, '')}`, () => {
      let respuesta: unknown;
      ejecutar().subscribe((valor) => (respuesta = valor));

      const req = http.expectOne(url);
      expect(req.request.method).toBe(metodo);
      if (cuerpo !== undefined) {
        expect(req.request.body).toEqual(cuerpo);
      }
      req.flush({ ok: true });
      expect(respuesta).toEqual({ ok: true });
    });
  });

  it('los create de diagnósticos, sesiones, tratamientos y citas hacen POST con el cuerpo', () => {
    const cuerpo = { patient_id: 'p-1' };
    // `as never`: solo importa que el cuerpo viaje tal cual, no su forma.
    diagnoses().create(cuerpo as never).subscribe();
    sessions().create(cuerpo as never).subscribe();
    treatments().create(cuerpo as never).subscribe();
    appointments().createAppointment(cuerpo as never).subscribe();

    for (const recurso of ['diagnoses', 'sessions', 'treatments', 'appointments']) {
      const req = http.expectOne(`${api}/${recurso}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(cuerpo);
      req.flush({});
    }
  });
});
