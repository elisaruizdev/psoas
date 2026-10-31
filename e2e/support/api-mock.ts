// API falsa para los tests E2E: intercepta todo lo que va a localhost:3000.
// Los datos son fijos y la fecha del navegador también (FECHA_FIJA): así cada
// captura sale idéntica en cualquier máquina y en cualquier día.
import type { Page, Request, Route } from '@playwright/test';
import type { DashboardStats } from '../../src/app/features/private-area/dashboard/models/dashboard.model';
import type {
  Diagnosis,
  Patient,
  Session,
  Treatment,
} from '../../src/app/features/private-area/patients/models/patients.model';
import type { Physio } from '../../src/app/features/private-area/physios/models/physios.model';
import type { Appointment } from '../../src/app/features/private-area/sessions/models/appointment.model';

export const API = 'http://localhost:3000';
export const FECHA_FIJA = new Date('2026-11-04T09:00:00');

const creado = '2026-01-10T10:00:00.000Z';

export const pacientes: Patient[] = [
  {
    id: 'p-1', name: 'Lucía', surname: 'García', second_surname: 'López', phone: '600111222',
    email: 'lucia@example.com', address: 'Calle Mayor 1', city: 'Madrid', zip: '28001',
    identifier: '12345678A', birthdate: '1990-05-10', gender: 'female', medical_history: null,
    consultation_reason: 'Lumbalgia', health_insurance: 'Sanitas', emergency_contact: null,
    status: 'active', discharge_reason: null, discharge_date: null, createdAt: creado, updatedAt: creado,
  },
  {
    id: 'p-2', name: 'Mario', surname: 'Sanz', second_surname: null, phone: '600333444',
    email: 'mario@example.com', address: null, city: 'Toledo', zip: '45001',
    identifier: '87654321B', birthdate: '1985-02-20', gender: 'male', medical_history: null,
    consultation_reason: 'Esguince de tobillo', health_insurance: null, emergency_contact: null,
    status: 'inactive', discharge_reason: null, discharge_date: null, createdAt: creado, updatedAt: creado,
  },
];

const fisio = { id_physio: 7, name: 'Ana', surname: 'Ruiz', second_surname: null };

export const fisios: Physio[] = [
  {
    ...fisio, phone: '600555666', email: 'ana@psoas.es', address: null, city: null, zip: null,
    country: null, identifier: null, license_number: 'COL-123', birthdate: null, gender: null,
    specialty: 'Deportiva', hire_date: null, schedule: null, status: 'active', password: '',
    is_verified: true, verification_token: null, verification_token_expires: null,
    created_at: creado, updated_at: creado, reset_password_token: null, reset_password_token_expires: null,
  },
];

export const citas: Appointment[] = [
  {
    id: 'a-1', patient_id: 'p-1', physio_id: 7, appointment_date: '2026-11-04T10:00:00.000Z',
    duration: 45, session_number: 3, status: 'scheduled', notes: null,
    patient: { id: 'p-1', name: 'Lucía', surname: 'García', second_surname: 'López' },
    physio: fisio, createdAt: creado, updatedAt: creado,
  },
];

export const estadisticas: DashboardStats = {
  sessionsToday: { total: 1, completed: 0 },
  sessionsNextWeek: 4,
  activePatients: 1,
  todayAppointments: citas.map((cita) => ({
    id: cita.id,
    appointment_date: cita.appointment_date,
    duration: cita.duration,
    session_number: cita.session_number,
    status: cita.status,
    notes: cita.notes,
    patient: cita.patient!,
    physio: cita.physio!,
  })),
};

const diagnosticos: Diagnosis[] = [
  {
    id: 'd-1', patient_id: 'p-1', diagnosis_date: '2026-01-12', diagnosis_type: 'Lumbalgia mecánica',
    description: 'Dolor lumbar bajo sin irradiación', status: 'active', createdAt: creado, updatedAt: creado,
  },
];

const tratamientos: Treatment[] = [
  {
    id: 't-1', patient_id: 'p-1', treatment_name: 'Fortalecimiento de core', start_date: '2026-01-15',
    description: 'Ejercicio terapéutico', objectives: 'Reducir dolor y mejorar estabilidad',
    sessions_planned: 10, status: 'active', createdAt: creado, updatedAt: creado,
  },
];

const sesiones: Session[] = [];

/** Respuesta por defecto de cada GET. Lo que no está aquí devuelve []. */
function respuestaGet(pathname: string): unknown {
  const rutas: [RegExp, unknown][] = [
    [/^\/dashboard\/stats$/, estadisticas],
    [/^\/patients$/, pacientes],
    [/^\/patients\/p-1$/, pacientes[0]],
    [/^\/physios$/, fisios],
    [/^\/appointments$/, citas],
    [/^\/diagnoses\/patient\/p-1$/, diagnosticos],
    [/^\/treatments\/patient\/p-1$/, tratamientos],
    [/^\/sessions\/patient\/p-1$/, sesiones],
  ];
  return rutas.find(([patron]) => patron.test(pathname))?.[1] ?? [];
}

type Respuesta = { status: number; body?: unknown };

/**
 * Backend falso con estado: registra cada petición y deja forzar respuestas
 * concretas (`responder`) para probar errores sin tocar el resto de la API.
 */
export class ApiMock {
  /** Todas las peticiones que la app ha hecho a la API, en orden. */
  readonly peticiones: Request[] = [];
  private forzadas = new Map<string, Respuesta>();

  constructor(private readonly page: Page) {}

  async instalar(): Promise<void> {
    // Reloj fijo: Date.now() y new Date() devuelven siempre FECHA_FIJA.
    await this.page.clock.setFixedTime(FECHA_FIJA);
    await this.page.route(`${API}/**`, (route) => this.responderA(route));
  }

  /** Fuerza la respuesta de un endpoint, p. ej. responder('POST', '/patients', 409, {...}). */
  responder(metodo: string, ruta: string, status: number, body?: unknown): void {
    this.forzadas.set(`${metodo} ${ruta}`, { status, body });
  }

  /** Peticiones que coinciden con un método y una ruta. */
  llamadasA(metodo: string, ruta: string): Request[] {
    return this.peticiones.filter(
      (r) => r.method() === metodo && new URL(r.url()).pathname === ruta,
    );
  }

  private async responderA(route: Route): Promise<void> {
    const request = route.request();
    this.peticiones.push(request);
    const { pathname } = new URL(request.url());
    const metodo = request.method();

    const forzada = this.forzadas.get(`${metodo} ${pathname}`);
    const { status, body } = forzada ?? this.porDefecto(metodo, pathname, request);

    await route.fulfill({
      status,
      contentType: 'application/json',
      body: body === undefined ? '' : JSON.stringify(body),
    });
  }

  private porDefecto(metodo: string, pathname: string, request: Request): Respuesta {
    if (metodo === 'GET') {
      return { status: 200, body: respuestaGet(pathname) };
    }
    if (metodo === 'POST') {
      // Como un backend REST: 201 con el recurso creado y un id nuevo.
      return { status: 201, body: { id: 'nuevo-1', ...request.postDataJSON() } };
    }
    if (metodo === 'DELETE') {
      return { status: 204 };
    }
    return { status: 200, body: request.postDataJSON() ?? {} };
  }
}

/** Atajo para los specs que no usan las fixtures. */
export async function mockApi(page: Page): Promise<ApiMock> {
  const api = new ApiMock(page);
  await api.instalar();
  return api;
}

/** Simula una sesión iniciada, igual que la deja el login. */
export async function entrarConSesion(page: Page): Promise<void> {
  await page.addInitScript(() => {
    sessionStorage.setItem('token', 'token-de-prueba');
    sessionStorage.setItem('id_physio', '7');
    sessionStorage.setItem('name', 'Ana Ruiz');
  });
}
