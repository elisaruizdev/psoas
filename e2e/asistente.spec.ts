// Pantalla del asistente de IA. El servicio Python (localhost:8000) se simula con page.route,
// igual que el backend en api-mock.ts: el test no depende de ningún LLM ni de la red.
import AxeBuilder from '@axe-core/playwright';
import type { Page, Route } from '@playwright/test';
import { expect, test } from './fixtures';

const IA = 'http://localhost:8000';

const respuestaClinica = {
  respuesta: 'Lucía García López ha bajado el dolor de 7/10 a 3/10 [1].',
  ruta: 'clinico',
  aprobado: true,
  intentos: 1,
  traza: ['enrutador: clinico', 'clinico: 2 fragmentos, citas [1]', 'revisor: aprobado'],
  tokens: 812,
};

async function simularIA(page: Page, responder: (route: Route) => Promise<void>): Promise<string[]> {
  const preguntas: string[] = [];
  await page.route(`${IA}/salud`, (route) =>
    route.fulfill({ json: { estado: 'ok', proveedor: 'gemini', origen_datos: 'api' } }),
  );
  await page.route(`${IA}/asistente`, async (route) => {
    preguntas.push(route.request().postDataJSON().mensaje);
    await responder(route);
  });
  return preguntas;
}

test.describe('asistente de IA', () => {
  test('pregunta, respuesta revisada y traza de los agentes', async ({ page, api, conSesion }) => {
    void api;
    void conSesion;
    const preguntas = await simularIA(page, (route) => route.fulfill({ json: respuestaClinica }));

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: 'Asistente' }).click();
    await expect(page.getByText('Modelo: gemini')).toBeVisible();

    // Solo con teclado: escribir y Enter.
    const campo = page.getByLabel('Tu pregunta');
    await campo.fill('¿Cómo va el dolor de Lucía?');
    await campo.press('Enter');

    const chat = page.getByRole('log', { name: 'Conversación con el asistente' });
    await expect(chat.getByText('ha bajado el dolor de 7/10 a 3/10')).toBeVisible();
    await expect(chat.getByText('Revisada')).toBeVisible();
    expect(preguntas).toEqual(['¿Cómo va el dolor de Lucía?']);

    // Tras responder, el foco vuelve al campo para seguir preguntando sin ratón.
    await expect(campo).toBeFocused();

    await chat.getByText('Cómo se ha respondido').click();
    await expect(chat.getByText('revisor: aprobado')).toBeVisible();
  });

  test('una sugerencia envía su pregunta', async ({ page, api, conSesion }) => {
    void api;
    void conSesion;
    const preguntas = await simularIA(page, (route) => route.fulfill({ json: respuestaClinica }));

    await page.goto('/assistant', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Modelo: gemini')).toBeVisible(); // Angular ya ha hidratado
    await page.getByRole('button', { name: '¿Me recomiendas ibuprofeno para el dolor?' }).click();

    await expect.poll(() => preguntas).toEqual(['¿Me recomiendas ibuprofeno para el dolor?']);
  });

  test('si el modelo no está disponible lo explica y conserva la pregunta', async ({ page, api, conSesion }) => {
    void api;
    void conSesion;
    await simularIA(page, (route) => route.fulfill({ status: 503, json: { detail: 'saturado' } }));

    await page.goto('/assistant', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Modelo: gemini')).toBeVisible(); // Angular ya ha hidratado
    await page.getByLabel('Tu pregunta').fill('¿Cómo va Ana?');
    await page.getByRole('button', { name: 'Preguntar' }).click();

    await expect(page.getByRole('alert')).toContainText('no está disponible ahora mismo');
    await expect(page.getByLabel('Tu pregunta')).toHaveValue('¿Cómo va Ana?');
  });

  test('sin violaciones de accesibilidad (axe) con una respuesta pintada', async ({ page, api, conSesion }) => {
    void api;
    void conSesion;
    await simularIA(page, (route) => route.fulfill({ json: respuestaClinica }));
    await page.goto('/assistant', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Modelo: gemini')).toBeVisible(); // Angular ya ha hidratado
    await page.getByLabel('Tu pregunta').fill('¿Cómo va Lucía?');
    await page.getByLabel('Tu pregunta').press('Enter');
    await expect(page.getByText('Revisada')).toBeVisible();

    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
