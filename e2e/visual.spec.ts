// Tests visuales (regresión de píxeles) con toHaveScreenshot.
//
// La primera ejecución no compara: guarda las imágenes de referencia en
// e2e/__screenshots__. Las siguientes comparan contra ellas y, si cambian más del
// umbral (maxDiffPixelRatio en playwright.config.ts), el test falla y el informe
// HTML enseña la imagen esperada, la actual y la diferencia.
//
// Tras un cambio visual intencionado: `npm run e2e:visual:update`.
import { expect, test } from './fixtures';

test.describe('visual', { tag: '@visual' }, () => {
  test('login', async ({ page, loginPage }) => {
    await loginPage.abrir();
    await expect(loginPage.titulo).toBeVisible();

    await expect(page).toHaveScreenshot('login.png', { fullPage: true });
  });

  test('login: email inválido deja el botón deshabilitado', async ({ page, loginPage }) => {
    await loginPage.abrir();
    await loginPage.email.fill('no-es-un-email');
    await loginPage.email.blur();

    // Captura de un componente concreto, no de toda la página.
    await expect(page.locator('form')).toHaveScreenshot('login-form-error.png');
  });

  test('dashboard', async ({ page, api, conSesion }) => {
    void api;
    void conSesion;
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    // "Sesiones hoy" es a la vez título de tarjeta (h3) y de tabla (h2): el modo estricto
    // rechaza un localizador ambiguo, así que se concreta con el nivel del encabezado.
    await expect(page.getByRole('heading', { name: 'Sesiones hoy', level: 2 })).toBeVisible();

    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      // mask tapa con una caja zonas que cambian entre ejecuciones (aquí, por si acaso,
      // el nombre de usuario, que viene de sessionStorage).
      mask: [page.locator('.header-private__user-name')],
    });
  });

  test('listado de pacientes', async ({ page, patientsPage }) => {
    await patientsPage.abrir();
    await expect(patientsPage.fila('Mario Sanz')).toBeVisible();

    await expect(page).toHaveScreenshot('pacientes.png', { fullPage: true });
  });

  test('fila de la tabla con foco de teclado', async ({ patientsPage }) => {
    await patientsPage.abrir();
    await patientsPage.fila('Lucía García López').focus();

    // Comprueba que el anillo de :focus-visible se ve (regresión de accesibilidad visual).
    await expect(patientsPage.tabla).toHaveScreenshot('tabla-foco.png');
  });

  test('detalle de paciente', async ({ page, patientsPage }) => {
    await patientsPage.abrir();
    await patientsPage.fila('Lucía García López').click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByText('Lumbalgia').first()).toBeVisible();

    await expect(dialogo).toHaveScreenshot('detalle-paciente.png');
  });
});
