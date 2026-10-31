// Qué hace la app cuando la red no se porta bien: errores de conexión,
// respuestas lentas y respuestas cambiadas para un solo test.
import { expect, test } from './fixtures';
import { API } from './support/api-mock';

test.describe('red', () => {
  test('login: mientras espera al servidor, el botón avisa y no deja reenviar', async ({
    page,
    loginPage,
  }) => {
    // Las rutas registradas después tienen prioridad: esta pisa la de la fixture `api`.
    await page.route(`${API}/auth/login`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_500)); // servidor lento
      await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
    });

    await loginPage.abrir();
    await loginPage.entrar('ana@psoas.es', '12345678');

    const cargando = page.getByRole('button', { name: 'Iniciando sesión...' });
    await expect(cargando).toBeVisible();
    await expect(cargando).toBeDisabled();

    await expect(page.getByText('Correo o contraseña incorrectos')).toBeVisible();
    await expect(loginPage.enviar).toBeEnabled();
  });

  test('login: si la conexión falla, muestra un error genérico', async ({ page, loginPage }) => {
    // abort simula un fallo de red (sin respuesta HTTP): HttpClient da status 0.
    await page.route(`${API}/auth/login`, (route) => route.abort('internetdisconnected'));

    await loginPage.abrir();
    await loginPage.entrar('ana@psoas.es', '12345678');

    await expect(page.getByText('Error al iniciar sesión. Inténtalo de nuevo.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('listado: si la API no responde, se ve el error y no una tabla vacía', async ({
    page,
    patientsPage,
  }) => {
    await page.route(`${API}/patients`, (route) => route.abort('connectionrefused'));

    await patientsPage.abrir();

    await expect(page.getByRole('alert')).toHaveText('No se han podido cargar los pacientes.');
    await expect(patientsPage.tabla).toBeHidden();
  });

  test('listado: una respuesta cambiada solo para este test', async ({ page, patientsPage }) => {
    // route.fulfill con `json`: Playwright pone el Content-Type y serializa.
    await page.route(`${API}/patients`, (route) => route.fulfill({ json: [] }));

    await patientsPage.abrir();

    await expect(page.getByText('Sin pacientes registrados')).toBeVisible();
  });

  test('cada petición del área privada lleva el token', async ({ patientsPage, api }) => {
    await patientsPage.abrir();
    await expect(patientsPage.fila('Lucía García López')).toBeVisible();

    // api.peticiones guarda todo lo que la app pidió: se comprueba sin page.route extra.
    expect(api.peticiones.length).toBeGreaterThan(0);
    for (const peticion of api.peticiones) {
      expect(await peticion.headerValue('authorization'), peticion.url()).toBe(
        'Bearer token-de-prueba',
      );
    }
  });
});
