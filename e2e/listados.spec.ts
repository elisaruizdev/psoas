import { expect, test, type Page } from '@playwright/test';

async function entrarConSesion(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('token', 'token-de-prueba');
    sessionStorage.setItem('id_physio', '7');
    sessionStorage.setItem('name', 'Ana Ruiz');
  });
}

test('si el listado de pacientes falla, se ve el error', async ({ page }) => {
  await entrarConSesion(page);
  await page.route('http://localhost:3000/patients', async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/patients', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('alert')).toHaveText('No se han podido cargar los pacientes.');
  await expect(page.getByText('Sin pacientes registrados')).toHaveCount(0);
});

test('si el dashboard falla, se ve el error', async ({ page }) => {
  await entrarConSesion(page);
  await page.route('http://localhost:3000/dashboard/stats', async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('alert')).toHaveText('No se han podido cargar las estadísticas.');
  await expect(page.getByText('Sesiones hoy')).toHaveCount(0);
});

test('si el listado de citas falla, se ve el error', async ({ page }) => {
  await entrarConSesion(page);
  await page.route('http://localhost:3000/appointments', async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/sessions', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('alert')).toHaveText('No se han podido cargar las citas.');
  await expect(page.getByText('Sin citas programadas')).toHaveCount(0);
});

test('si el listado de fisios falla, se ve el error', async ({ page }) => {
  await entrarConSesion(page);
  await page.route('http://localhost:3000/physios', async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/physios', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('alert')).toHaveText('No se han podido cargar los fisioterapeutas.');
  await expect(page.getByText('Sin resultados')).toHaveCount(0);
});

test('si falla al abrir la ficha de un paciente, se ve el error', async ({ page }) => {
  await entrarConSesion(page);

  const paciente = {
    id: 'p1',
    name: 'Ana',
    surname: 'Ruiz',
    second_surname: null,
    identifier: '00000000T',
    email: 'ana@psoas.es',
    phone: '600000000',
    status: 'active',
  };

  await page.route('http://localhost:3000/patients**', async (route) => {
    if (route.request().url().includes('/patients/p1')) {
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([paciente]),
    });
  });

  await page.goto('/patients', { waitUntil: 'domcontentloaded' });
  await page.getByRole('row', { name: /Ana Ruiz/ }).click();

  await expect(page.getByRole('alert')).toHaveText('No se ha podido abrir la ficha del paciente.');
});

test('salir de pacientes antes de la respuesta no rompe el dashboard', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (error) => errores.push(error.message));

  await entrarConSesion(page);

  let responder = () => {};
  const espera = new Promise<void>((resolve) => {
    responder = resolve;
  });

  await page.route('http://localhost:3000/patients', async (route) => {
    await espera;
    try {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    } catch {
      // La petición se cancela al destruir el listado.
    }
  });

  await page.route('http://localhost:3000/dashboard/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sessionsToday: { total: 0, completed: 0 },
        sessionsNextWeek: 0,
        activePatients: 0,
        todayAppointments: [],
      }),
    });
  });

  await page.goto('/patients', { waitUntil: 'domcontentloaded' });
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  responder();

  await expect(page.getByRole('heading', { name: 'Sesiones hoy' }).first()).toBeVisible();
  expect(errores).toEqual([]);
});
