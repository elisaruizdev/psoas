import type { Locator, Page } from '@playwright/test';

export interface DatosPaciente {
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  dni: string;
  nacimiento: string; // aaaa-mm-dd, como lo espera <input type="date">
  genero: 'masculino' | 'femenino' | 'otro';
  telefono: string;
  correo: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
}

/** Page Object del listado de pacientes y del modal de alta. */
export class PatientsPage {
  readonly tabla: Locator;
  readonly botonNuevo: Locator;
  readonly modalAlta: Locator;
  readonly botonCrear: Locator;

  constructor(private readonly page: Page) {
    this.tabla = page.getByRole('table');
    this.botonNuevo = page.getByRole('button', { name: 'Nuevo paciente' });
    this.modalAlta = page.getByRole('dialog');
    this.botonCrear = this.modalAlta.getByRole('button', { name: 'Crear Paciente' });
  }

  async abrir(): Promise<void> {
    await this.page.goto('/patients', { waitUntil: 'domcontentloaded' });
  }

  /** Fila clicable de un paciente, por su nombre completo (su nombre accesible). */
  fila(nombreCompleto: string): Locator {
    return this.page.getByRole('row', { name: `Abrir detalle: ${nombreCompleto}` });
  }

  /** Filas de datos (sin la cabecera). */
  filasDeDatos(): Locator {
    return this.tabla.getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  async rellenarAlta(datos: DatosPaciente): Promise<void> {
    const modal = this.modalAlta;
    await modal.getByLabel('Nombre').fill(datos.nombre);
    await modal.getByLabel('Primer apellido').fill(datos.primerApellido);
    await modal.getByLabel('Segundo apellido').fill(datos.segundoApellido);
    await modal.getByLabel('DNI/NIE').fill(datos.dni);
    await modal.getByLabel('Fecha de Nacimiento').fill(datos.nacimiento);
    await modal.getByLabel('Género').selectOption(datos.genero);
    await modal.getByLabel('Teléfono').fill(datos.telefono);
    await modal.getByLabel('Correo').fill(datos.correo);
    await modal.getByLabel('Dirección Completa').fill(datos.direccion);
    await modal.getByLabel('Ciudad').fill(datos.ciudad);
    await modal.getByLabel('Código Postal').fill(datos.codigoPostal);
  }
}
