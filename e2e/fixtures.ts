// Fixtures propias de Psoas. Un test pide lo que necesita por parámetro
// ({ api, conSesion, patientsPage }) y Playwright lo prepara antes y lo limpia
// después. Es inyección de dependencias para tests.
import { test as base } from '@playwright/test';
import { ApiMock, entrarConSesion } from './support/api-mock';
import { LoginPage } from './pages/login.page';
import { PatientsPage } from './pages/patients.page';

type Fixtures = {
  /** Backend falso ya instalado, con registro de peticiones. */
  api: ApiMock;
  /** Deja el sessionStorage como tras un login correcto. */
  conSesion: void;
  loginPage: LoginPage;
  /** Listado de pacientes con API falsa y sesión iniciada. */
  patientsPage: PatientsPage;
};

export const test = base.extend<Fixtures>({
  api: async ({ page }, use) => {
    const api = new ApiMock(page);
    await api.instalar();
    await use(api); // aquí corre el test
    // (después de use iría la limpieza; page.route muere con la página)
  },

  conSesion: async ({ page }, use) => {
    await entrarConSesion(page);
    await use();
  },

  loginPage: async ({ page, api }, use) => {
    void api; // depende de la API falsa: el login nunca sale a la red
    await use(new LoginPage(page));
  },

  // Las fixtures se componen: pedir patientsPage arrastra api y conSesion.
  patientsPage: async ({ page, api, conSesion }, use) => {
    void api;
    void conSesion;
    await use(new PatientsPage(page));
  },
});

export { expect } from '@playwright/test';
