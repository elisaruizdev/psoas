import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('docs/pantallas');
const API = 'http://localhost:3000';

const patient = {
  id: 'p1',
  name: 'Lucía',
  surname: 'García',
  second_surname: 'López',
  phone: '612 445 890',
  email: 'lucia.garcia@psoas.es',
  address: 'Calle Mayor 12',
  city: 'Madrid',
  zip: '28013',
  identifier: '12345678A',
  birthdate: '1992-04-18',
  gender: 'female',
  medical_history: 'Lumbalgia recurrente',
  consultation_reason: 'Dolor lumbar',
  health_insurance: 'Adeslas',
  emergency_contact: 'Marta García 600 111 222',
  status: 'active',
  discharge_reason: null,
  discharge_date: null,
  createdAt: '2026-01-12T09:00:00.000Z',
  updatedAt: '2026-03-02T09:00:00.000Z',
};

const patient2 = {
  ...patient,
  id: 'p2',
  name: 'Carlos',
  surname: 'Navarro',
  second_surname: null,
  email: 'carlos.navarro@psoas.es',
  phone: '655 201 334',
  identifier: '87654321B',
  status: 'inactive',
};

const physio = {
  id_physio: 7,
  name: 'Ana',
  surname: 'Ruiz',
  second_surname: 'Soto',
  phone: '611 220 334',
  email: 'ana.ruiz@psoas.es',
  address: null,
  city: 'Madrid',
  zip: null,
  country: 'España',
  identifier: null,
  license_number: 'FIS-2041',
  birthdate: null,
  gender: null,
  specialty: 'Suelo pélvico',
  hire_date: '2024-02-01',
  schedule: 'L-V 9:00-15:00',
  status: 'active',
  password: '',
  is_verified: true,
  verification_token: null,
  verification_token_expires: null,
  created_at: '2024-02-01T10:00:00.000Z',
  updated_at: '2026-01-01T10:00:00.000Z',
  reset_password_token: null,
  reset_password_token_expires: null,
};

const physioPending = {
  ...physio,
  id_physio: 12,
  name: 'Pablo',
  surname: 'Ibáñez',
  second_surname: null,
  email: 'pablo.ibanez@psoas.es',
  phone: '622 908 441',
  specialty: 'Deportiva',
  status: 'pending_verification',
  is_verified: false,
  created_at: '2026-10-01T10:00:00.000Z',
};

const appointment = {
  id: 'a1',
  patient_id: 'p1',
  physio_id: 7,
  appointment_date: '2026-10-12T09:30:00.000Z',
  duration: 45,
  session_number: 3,
  status: 'confirmed',
  notes: 'Revisión lumbar',
  patient: {
    id: 'p1',
    name: 'Lucía',
    surname: 'García',
    second_surname: 'López',
  },
  physio: {
    id_physio: 7,
    name: 'Ana',
    surname: 'Ruiz',
    second_surname: 'Soto',
  },
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
};

const stats = {
  sessionsToday: { total: 6, completed: 2 },
  sessionsNextWeek: 18,
  activePatients: 42,
  todayAppointments: [appointment],
};

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockApi(page) {
  await page.route(`${API}/**`, async (route) => {
    const url = route.request().url();
    if (url.includes('/dashboard/stats')) return json(route, stats);
    if (url.includes('/patients/p1')) return json(route, patient);
    if (url.includes('/patients')) return json(route, [patient, patient2]);
    if (url.includes('/physios/')) return json(route, physio);
    if (url.includes('/physios')) return json(route, [physio, physioPending]);
    if (url.includes('/appointments')) return json(route, [appointment]);
    if (url.includes('/diagnoses')) return json(route, []);
    if (url.includes('/treatments')) return json(route, []);
    if (url.includes('/sessions')) return json(route, []);
    return json(route, []);
  });
}

async function shot(page, name) {
  await page.screenshot({
    path: path.join(outDir, `${name}.png`),
    fullPage: false,
  });
}

async function waitReady(page, text) {
  await page.getByText(text).first().waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

await mkdir(outDir, { recursive: true });

await page.goto('http://localhost:4200/login', { waitUntil: 'domcontentloaded' });
await waitReady(page, 'Bienvenido de nuevo');
await shot(page, '01-login');

await page.goto('http://localhost:4200/registro', { waitUntil: 'domcontentloaded' });
await waitReady(page, 'Crear nueva cuenta');
await shot(page, '02-registro');

await page.goto('http://localhost:4200/recuperar-contraseña', { waitUntil: 'domcontentloaded' });
await waitReady(page, 'Recuperar contraseña');
await shot(page, '03-recuperar-contrasena');

await page.goto('http://localhost:4200/resetear-contraseña?token=demo', {
  waitUntil: 'domcontentloaded',
});
await waitReady(page, 'Nueva contraseña');
await shot(page, '04-resetear-contrasena');

await page.addInitScript(() => {
  sessionStorage.setItem('token', 'token-de-prueba');
  sessionStorage.setItem('id_physio', '7');
  sessionStorage.setItem('name', 'Ana Ruiz');
});
await mockApi(page);

await page.goto('http://localhost:4200/dashboard', { waitUntil: 'domcontentloaded' });
await waitReady(page, 'Sesiones hoy');
await shot(page, '05-dashboard');

await page.goto('http://localhost:4200/patients', { waitUntil: 'domcontentloaded' });
await waitReady(page, 'Lucía García López');
await shot(page, '06-pacientes');

await page.getByText('Lucía García López').click();
await waitReady(page, '12345678A');
await shot(page, '07-ficha-paciente');
await page.keyboard.press('Escape');

await page.goto('http://localhost:4200/sessions', { waitUntil: 'domcontentloaded' });
await waitReady(page, 'Lucía García López');
await shot(page, '08-sesiones');

await page.goto('http://localhost:4200/physios', { waitUntil: 'domcontentloaded' });
await waitReady(page, 'Pablo Ibáñez');
await shot(page, '09-fisios');

await browser.close();
console.log('capturas en', outDir);
