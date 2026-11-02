// Integración real Angular ↔ microfrontend (Web Component de Lit).
//
// En local el dashboard pide el MFE a http://localhost:4300 (servidor de Vite). Aquí no
// hace falta levantarlo: se intercepta esa URL y se responde con el bundle ya compilado
// (microfrontends/resumen-citas/dist). Así se prueba el contrato de verdad: carga en
// tiempo de ejecución, datos por propiedad y evento de vuelta a Angular.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from './fixtures';

const BUNDLE = join(__dirname, '..', 'microfrontends', 'resumen-citas', 'dist', 'psoas-resumen-citas.js');
const URL_MFE = 'http://localhost:4300/src/psoas-resumen-citas.ts';

test.describe('microfrontend en el dashboard', () => {
  test.skip(!existsSync(BUNDLE), 'Falta el bundle: npm run build en microfrontends/resumen-citas');

  test('Angular carga el Web Component, le pasa las citas y recibe su evento', async ({
    page,
    api,
    conSesion,
  }) => {
    void api;
    void conSesion;
    await page.route(URL_MFE, (route) =>
      route.fulfill({
        body: readFileSync(BUNDLE, 'utf8'),
        contentType: 'text/javascript',
        // Es otro origen (4300 ≠ 4200): un <script type="module"> exige CORS.
        headers: { 'Access-Control-Allow-Origin': '*' },
      }),
    );

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // getByRole atraviesa el Shadow DOM abierto: se busca como lo vería un usuario.
    const widget = page.locator('psoas-resumen-citas');
    await expect(widget.getByRole('heading', { name: 'Próximas citas de hoy' })).toBeVisible();

    const cita = widget.getByRole('button', { name: /Abrir cita de Lucía García López/ });
    await expect(cita).toBeVisible();

    await cita.click();
    await expect(page).toHaveURL(/\/sessions\?cita=a-1$/);
  });

  test('si el microfrontend no responde, el dashboard funciona igual', async ({
    page,
    api,
    conSesion,
  }) => {
    void api;
    void conSesion;
    await page.route(URL_MFE, (route) => route.abort());

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Sesiones hoy', level: 2 })).toBeVisible();
    await expect(page.locator('psoas-resumen-citas')).toHaveCount(0);
  });
});
