import type { Locator, Page } from '@playwright/test';

/**
 * Page Object del login: los tests hablan de "rellenar el login", no de selectores.
 * Si cambia el HTML, solo se toca este archivo.
 */
export class LoginPage {
  readonly titulo: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly enviar: Locator;

  constructor(private readonly page: Page) {
    // Localizadores por rol y etiqueta, como los encontraría una persona o un lector de pantalla.
    this.titulo = page.getByRole('heading', { name: 'Bienvenido de nuevo' });
    this.email = page.getByLabel('Correo', { exact: true });
    this.password = page.getByLabel('Contraseña', { exact: true });
    this.enviar = page.getByRole('button', { name: 'Iniciar sesión' });
  }

  async abrir(): Promise<void> {
    await this.page.goto('/login', { waitUntil: 'domcontentloaded' });
  }

  async entrar(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.enviar.click();
  }
}
