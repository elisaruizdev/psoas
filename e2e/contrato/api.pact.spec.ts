// Contract testing dirigido por el consumidor (Pact).
//
// Psoas (consumidor) declara qué peticiones hace y qué necesita de cada respuesta.
// Pact levanta un servidor mock en localhost:3000 (donde la build de desarrollo busca
// el API) y la app real, en el navegador, habla con él. Si la app pide algo distinto
// de lo declarado, el test falla. Si todo cuadra, Pact escribe el contrato en
// pacts/psoas-web-psoas-api.json.
//
// La otra mitad ocurre en el backend: verifica ese archivo contra su API real
// (verificación del proveedor). Así, si el back cambia un campo que el front usa,
// falla el pipeline del back antes de desplegar, sin levantar los dos a la vez.
import path from 'node:path';
import { MatchersV3, PactV4 } from '@pact-foundation/pact';
import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { API, entrarConSesion } from '../support/api-mock';

// Los matchers describen la FORMA, no el valor exacto: "un string", "un entero",
// "un array con elementos como este". El ejemplo es lo que devuelve el mock.
const { eachLike, integer, regex, string } = MatchersV3;

const pact = new PactV4({
  consumer: 'psoas-web',
  provider: 'psoas-api',
  port: 3000,
  cors: true, // la app corre en :4200 y llama a :3000: el mock responde a los preflight
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: 'warn',
});

// Un solo servidor mock en el puerto 3000: los tests de este archivo van de uno en uno.
test.describe.configure({ mode: 'serial' });

test.describe('contrato con psoas-api', { tag: '@contrato' }, () => {
  test('POST /auth/login devuelve el token y los datos de la fisio', async ({ page }) => {
    // Lo que no es parte de este contrato se intercepta en el navegador como siempre.
    await page.route(`${API}/dashboard/**`, (route) =>
      route.fulfill({
        json: {
          sessionsToday: { total: 0, completed: 0 },
          sessionsNextWeek: 0,
          activePatients: 0,
          todayAppointments: [],
        },
      }),
    );

    await pact
      .addInteraction()
      .given('existe la fisio ana@psoas.es con la contraseña 12345678')
      .uponReceiving('un login con credenciales correctas')
      .withRequest('POST', '/auth/login', (req) => {
        req.headers({ 'Content-Type': 'application/json' });
        req.jsonBody({ email: 'ana@psoas.es', password: '12345678' });
      })
      .willRespondWith(200, (res) => {
        res.headers({ 'Content-Type': regex('application/json.*', 'application/json') });
        // Solo lo que el front usa: el contrato no obliga al back a nada más.
        res.jsonBody({
          access_token: string('eyJhbGciOiJIUzI1NiJ9.demo'),
          user: { id_physio: integer(7), name: string('Ana Ruiz') },
        });
      })
      .executeTest(async () => {
        const login = new LoginPage(page);
        await login.abrir();
        await login.entrar('ana@psoas.es', '12345678');

        await expect(page).toHaveURL(/\/dashboard$/);
        expect(await page.evaluate(() => sessionStorage.getItem('id_physio'))).toBe('7');
      });
  });

  test('GET /patients con token devuelve la lista de pacientes', async ({ page }) => {
    await entrarConSesion(page);

    await pact
      .addInteraction()
      .given('hay pacientes registrados')
      .uponReceiving('la petición del listado de pacientes con un token válido')
      .withRequest('GET', '/patients', (req) => {
        req.headers({ Authorization: regex('^Bearer .+$', 'Bearer token-de-prueba') });
      })
      .willRespondWith(200, (res) => {
        res.headers({ 'Content-Type': regex('application/json.*', 'application/json') });
        res.jsonBody(
          eachLike({
            id: string('p-1'),
            name: string('Lucía'),
            surname: string('García'),
            identifier: string('12345678A'),
            email: string('lucia@example.com'),
            phone: string('600111222'),
            status: regex('^(active|inactive)$', 'active'),
          }),
        );
      })
      .executeTest(async () => {
        await page.goto('/patients', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('row', { name: 'Abrir detalle: Lucía García' })).toBeVisible();
      });
  });
});
