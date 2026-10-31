// Corre solo en los proyectos mobile-chrome (Pixel 7) y mobile-safari (iPhone 14).
// No es solo un viewport pequeño: emula pantalla táctil, user agent móvil y densidad
// de píxeles (devices[...] en playwright.config.ts).
import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

async function sinScrollHorizontal(page: Page) {
  const sobra = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(sobra).toBeLessThanOrEqual(1);
}

test.describe('móvil', { tag: '@mobile' }, () => {
  test('el navegador se presenta como un móvil táctil', async ({ page, isMobile, hasTouch }) => {
    // isMobile y hasTouch son fixtures integradas que vienen del dispositivo emulado.
    expect(isMobile).toBeTruthy();
    expect(hasTouch).toBeTruthy();
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBeTruthy();
  });

  // Etiquetas acumuladas: @mobile (del describe) + @visual (del test).
  test('login cabe en la pantalla y se puede usar', { tag: '@visual' }, async ({ page, loginPage }) => {
    await loginPage.abrir();
    await expect(loginPage.titulo).toBeVisible();
    await sinScrollHorizontal(page);

    await expect(page).toHaveScreenshot('login-movil.png', { fullPage: true });
  });

  test('un toque en la fila abre el detalle del paciente', async ({ page, patientsPage }) => {
    await patientsPage.abrir();
    // tap() lanza eventos táctiles reales, no un click de ratón.
    await patientsPage.fila('Lucía García López').tap();

    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('el área privada no se desborda', async ({ page, patientsPage }) => {
    await patientsPage.abrir();
    await expect(patientsPage.fila('Mario Sanz')).toBeVisible();
    await sinScrollHorizontal(page);
  });
});
