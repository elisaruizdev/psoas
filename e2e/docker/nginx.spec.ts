// Tests contra la imagen Docker real (nginx sirviendo la build de producción).
// Se ejecutan con:  WEB_URL=http://localhost:8080 npx playwright test --project=docker
//
// Usan dos fixtures distintas:
//  - request: cliente HTTP sin navegador (testing de API): cabeceras, códigos, caché.
//  - page: navegador real, para comprobar que la CSP no rompe la app.
import { expect, test } from '@playwright/test';

const WEB_URL = process.env['WEB_URL'];

test.describe('imagen Docker (nginx)', { tag: '@docker' }, () => {
  test.skip(!WEB_URL, 'Define WEB_URL con la URL del contenedor, p. ej. http://localhost:8080');

  test('index.html lleva las cabeceras de seguridad y no se cachea', async ({ request }) => {
    const respuesta = await request.get(`${WEB_URL}/`);
    expect(respuesta.status()).toBe(200);

    const h = respuesta.headers();
    expect(h['content-security-policy']).toContain("default-src 'self'");
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(h['cache-control']).toBe('no-cache');
    // server_tokens off: "nginx" a secas, sin versión que buscar en una lista de CVE.
    expect(h['server']).toBe('nginx');
  });

  test('las rutas del SPA devuelven index.html (deep links)', async ({ request }) => {
    const respuesta = await request.get(`${WEB_URL}/patients`);
    expect(respuesta.status()).toBe(200);
    expect(await respuesta.text()).toContain('<app-root');
    expect(respuesta.headers()['content-security-policy']).toBeTruthy();
  });

  test('los JS con hash se cachean un año y también llevan las cabeceras', async ({ request }) => {
    const html = await (await request.get(`${WEB_URL}/`)).text();
    const script = html.match(/src="(main-[A-Z0-9]+\.js)"/)?.[1];
    expect(script, 'index.html debería cargar main-<hash>.js').toBeTruthy();

    const respuesta = await request.get(`${WEB_URL}/${script}`);
    expect(respuesta.status()).toBe(200);
    expect(respuesta.headers()['cache-control']).toContain('immutable');
    // Si el include faltara en este location, nginx no heredaría las del server.
    expect(respuesta.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('un asset que no existe da 404, no el index.html', async ({ request }) => {
    const respuesta = await request.get(`${WEB_URL}/no-existe-123.js`);
    expect(respuesta.status()).toBe(404);
  });

  test('con la CSP activa la app carga sin violaciones y con estilos', async ({ page }) => {
    const violaciones: string[] = [];
    // Escuchar la consola del navegador: ahí avisa Chrome de lo que bloquea la CSP.
    page.on('console', (mensaje) => {
      if (mensaje.text().includes('Content Security Policy')) violaciones.push(mensaje.text());
    });

    await page.goto(`${WEB_URL}/login`);
    await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();

    expect(violaciones).toEqual([]);
    // Si el onload del CSS se bloqueara, la hoja quedaría en media="print".
    const hojasSinActivar = await page.locator('link[rel="stylesheet"][media="print"]').count();
    expect(hojasSinActivar).toBe(0);
  });
});
