import { expect, test } from '@playwright/test';

const API = 'http://localhost:3000';

const statsVacias = {
  sessionsToday: { total: 0, completed: 0 },
  sessionsNextWeek: 0,
  activePatients: 0,
  todayAppointments: [],
};

test.describe('login', () => {
  test('con token, /login redirige al dashboard', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('token', 'token-de-prueba');
      sessionStorage.setItem('id_physio', '7');
      sessionStorage.setItem('name', 'Ana Ruiz');
    });

    await page.route(`${API}/dashboard/stats`, async (route) => {
      expect(route.request().headers()['authorization']).toBe('Bearer token-de-prueba');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(statsVacias),
      });
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('el formulario exige email válido y contraseña de al menos 8 caracteres', async ({
    page,
  }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    const enviar = page.getByRole('button', { name: 'Iniciar sesión' });
    await expect(enviar).toBeDisabled();

    await page.locator('#email').fill('no-es-un-email');
    await page.locator('#password').fill('12345678');
    await expect(enviar).toBeDisabled();

    await page.locator('#email').fill('ana@psoas.es');
    await page.locator('#password').fill('corta');
    await expect(enviar).toBeDisabled();

    await page.locator('#password').fill('12345678');
    await expect(enviar).toBeEnabled();
  });

  test('con el POST /auth/login mockeado guarda el token y abre /dashboard', async ({ page }) => {
    await page.route(`${API}/auth/login`, async (route) => {
      expect(route.request().postDataJSON()).toEqual({
        email: 'ana@psoas.es',
        password: '12345678',
      });
      expect(route.request().headers()['authorization']).toBeUndefined();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'token-de-prueba',
          user: { id_physio: 7, name: 'Ana Ruiz' },
        }),
      });
    });

    await page.route(`${API}/dashboard/stats`, async (route) => {
      expect(route.request().headers()['authorization']).toBe('Bearer token-de-prueba');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(statsVacias),
      });
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('#email').fill('ana@psoas.es');
    await page.locator('#password').fill('12345678');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Sesiones hoy' }).first()).toBeVisible();

    const sesion = await page.evaluate(() => ({
      token: sessionStorage.getItem('token'),
      idPhysio: sessionStorage.getItem('id_physio'),
      name: sessionStorage.getItem('name'),
    }));
    expect(sesion).toEqual({
      token: 'token-de-prueba',
      idPhysio: '7',
      name: 'Ana Ruiz',
    });
  });
});
