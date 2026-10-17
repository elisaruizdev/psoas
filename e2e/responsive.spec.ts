import { expect, test, type Page } from '@playwright/test';

const API = 'http://localhost:3000';

async function entrarConSesion(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('token', 'token-de-prueba');
    sessionStorage.setItem('id_physio', '7');
    sessionStorage.setItem('name', 'Ana Ruiz');
  });
}

async function mockClinica(page: Page) {
  await page.route(`${API}/**`, async (route) => {
    const url = route.request().url();
    if (url.includes('/dashboard/stats')) {
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
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
}

async function sinDesborde(page: Page) {
  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(desborde).toBeLessThanOrEqual(1);
}

const anchos = [
  { nombre: 'móvil', width: 390, height: 844 },
  { nombre: 'escritorio', width: 1280, height: 800 },
];

for (const ancho of anchos) {
  test.describe(`responsive ${ancho.nombre}`, () => {
    test.use({ viewport: { width: ancho.width, height: ancho.height } });

    test('el login cabe en la pantalla', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();
      await sinDesborde(page);
    });

    test('el área privada cabe en la pantalla', async ({ page }) => {
      await entrarConSesion(page);
      await mockClinica(page);

      for (const ruta of ['/dashboard', '/patients', '/sessions', '/physios']) {
        await page.goto(ruta, { waitUntil: 'domcontentloaded' });
        await sinDesborde(page);
      }
    });
  });
}
