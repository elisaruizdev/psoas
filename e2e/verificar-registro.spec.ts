import { expect, test } from '@playwright/test';

test('sin ?token= no llama a verify-email y abre el login sin verified', async ({ page }) => {
  const llamadas: string[] = [];

  await page.route('**/auth/verify-email**', async (route) => {
    llamadas.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
  });

  await page.goto('/verificar-registro', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/login$/);
  expect(llamadas).toHaveLength(0);
});

test('con ?token= llama a verify-email y acaba en el login verificado', async ({ page }) => {
  const llamadas: string[] = [];

  await page.route('**/auth/verify-email**', async (route) => {
    llamadas.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
  });

  await page.goto('/verificar-registro?token=token-correo', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/login\?verified=true/);
  expect(llamadas).toHaveLength(1);
  expect(llamadas[0]).toContain('token=token-correo');
});

test('si verify-email falla, el login queda con verified=false', async ({ page }) => {
  await page.route('**/auth/verify-email**', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: '{}',
    });
  });

  await page.goto('/verificar-registro?token=token-correo', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/login\?verified=false/);
  await expect(page.getByRole('alert')).toHaveText('No se ha podido verificar el email.');
});
