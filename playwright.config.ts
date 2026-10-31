import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env['CI'];
// Si se pasa WEB_URL, se prueba un servidor ya levantado (el contenedor Docker)
// y Playwright no arranca la app.
const WEB_URL = process.env['WEB_URL'];

export default defineConfig({
  testDir: './e2e',
  // Los tests de un mismo archivo pueden ir en paralelo entre sí.
  fullyParallel: true,
  // Un solo worker en local: `ng serve` se atasca si varios navegadores piden a la
  // vez los chunks lazy. En CI se sirve la build estática y aguanta más.
  workers: CI ? 2 : 1,
  // En CI un `test.only` olvidado haría pasar el pipeline ejecutando un solo test.
  forbidOnly: CI,
  // Reintentos solo en CI. Un test que pasa al reintentar sale como "flaky" en el informe.
  retries: CI ? 2 : 0,
  // En CI cada shard (trozo de la suite) deja un informe "blob"; un job final los une
  // en un único informe HTML con `playwright merge-reports`.
  reporter: CI
    ? [['blob'], ['github'], ['list']]
    : [['list'], ['html', { open: 'never' }]],

  // Dónde se guardan las capturas de referencia de toHaveScreenshot.
  // {platform}: Windows, Linux y macOS renderizan las fuentes distinto, así que cada
  // sistema tiene sus propias imágenes base.
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}-{platform}{ext}',

  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      // Hasta un 1 % de píxeles distintos se tolera (antialiasing).
      maxDiffPixelRatio: 0.01,
      // Congela animaciones y transiciones CSS antes de capturar.
      animations: 'disabled',
      caret: 'hide',
    },
  },

  use: {
    baseURL: 'http://localhost:4200',
    // Emulación: idioma y zona horaria fijos, para que fechas y formatos no
    // dependan de la máquina que ejecuta los tests.
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    // Material para depurar un fallo: traza completa (DOM, red, consola) al reintentar,
    // captura y vídeo solo si el test falla.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Cada proyecto es la misma suite con otra configuración (navegador, dispositivo).
  // Con `grep` se elige qué tests corre cada uno, usando las etiquetas (@smoke, @mobile...).
  // La carpeta e2e/docker solo la ejecuta el proyecto `docker`.
  testIgnore: WEB_URL ? [] : ['docker/**'],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      grepInvert: /@mobile|@docker|@contrato/,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      grep: /@smoke/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      grep: /@smoke/,
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      grep: /@mobile/,
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
      grep: /@mobile/,
    },
    {
      // Pact levanta su servidor mock en el puerto 3000: proyecto aparte, sin paralelismo.
      name: 'contrato',
      use: { ...devices['Desktop Chrome'] },
      grep: /@contrato/,
      fullyParallel: false,
    },
    {
      name: 'docker',
      use: { ...devices['Desktop Chrome'] },
      grep: /@docker/,
    },
  ],

  // Playwright arranca la app antes de los tests y la apaga al terminar.
  webServer: WEB_URL ? undefined : {
    command: CI ? 'npx serve dist/psoas/browser -s -l 4200' : 'npx ng serve --port 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: !CI,
    timeout: 180_000,
  },
});
