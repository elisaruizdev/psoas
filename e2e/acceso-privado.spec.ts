import { expect, test } from '@playwright/test';

test('sin token, /patients redirige a /login', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.clear());

  await page.goto('/patients', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();

  const token = await page.evaluate(() => sessionStorage.getItem('token'));
  expect(token).toBeNull();
});

test('con token, /patients sigue en el área privada', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('token', 'token-de-prueba');
    sessionStorage.setItem('id_physio', '7');
    sessionStorage.setItem('name', 'Ana Ruiz');
  });

  await page.route('http://localhost:3000/patients', async (route) => {
    expect(route.request().headers()['authorization']).toBe('Bearer token-de-prueba');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  await page.goto('/patients', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/patients$/);
  await expect(page.getByRole('link', { name: 'Pacientes' })).toBeVisible();
  await expect(
    page.getByText('Administra la información de tus pacientes y su tratamiento'),
  ).toBeVisible();
});

test('si el API responde 401, cierra la sesión y vuelve a /login', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('token', 'token-caducado');
    sessionStorage.setItem('id_physio', '7');
    sessionStorage.setItem('name', 'Ana Ruiz');
  });

  await page.route('http://localhost:3000/patients', async (route) => {
    await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/patients', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();

  const sesion = await page.evaluate(() => ({
    token: sessionStorage.getItem('token'),
    idPhysio: sessionStorage.getItem('id_physio'),
    name: sessionStorage.getItem('name'),
  }));
  expect(sesion).toEqual({ token: null, idPhysio: null, name: null });
});
