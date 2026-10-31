// Auditoría automática de accesibilidad con axe-core (WCAG 2.1 A y AA).
// axe detecta más o menos un tercio de los problemas reales: esto no sustituye
// a recorrer la app con teclado y con un lector de pantalla.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { entrarConSesion, mockApi } from './support/api-mock';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function auditar(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  // Mensaje legible si falla: regla, impacto y selectores afectados.
  const resumen = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n` +
      v.nodes.map((n) => `  ${n.target.join(' ')}\n    ${n.any[0]?.message ?? ''}`).join('\n'),
  );
  expect(resumen, resumen.join('\n\n')).toEqual([]);
}

test.describe('accesibilidad: pantallas públicas', () => {
  const pantallas: [string, string][] = [
    ['/login', 'Bienvenido de nuevo'],
    ['/registro', 'Crear cuenta'],
    ['/recuperar-contraseña', 'contraseña'],
  ];

  for (const [ruta, texto] of pantallas) {
    test(`${ruta} cumple WCAG AA`, async ({ page }) => {
      await mockApi(page);
      await page.goto(ruta, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(texto).first()).toBeVisible();
      await auditar(page);
    });
  }
});

test.describe('accesibilidad: área privada', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await entrarConSesion(page);
  });

  const pantallas: [string, string][] = [
    ['/dashboard', 'Sesiones hoy'],
    ['/patients', 'Lucía García López'],
    ['/sessions', 'Lucía'],
    ['/physios', 'Ana'],
  ];

  for (const [ruta, texto] of pantallas) {
    test(`${ruta} cumple WCAG AA`, async ({ page }) => {
      await page.goto(ruta, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(texto).first()).toBeVisible();
      await auditar(page);
    });
  }

  test('el detalle de paciente se abre con teclado y cumple WCAG AA', async ({ page }) => {
    await page.goto('/patients', { waitUntil: 'domcontentloaded' });

    const fila = page.getByRole('row', { name: 'Abrir detalle: Lucía García López' });
    await fila.focus();
    await page.keyboard.press('Enter');

    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByText('Lumbalgia').first()).toBeVisible();
    await auditar(page);
  });
});
