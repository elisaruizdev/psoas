// Flujo completo de pacientes con fixtures, Page Object y comprobaciones de red.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import type { DatosPaciente } from './pages/patients.page';
import type { CreatePatient } from '../src/app/features/private-area/patients/models/patients.model';

const nueva: DatosPaciente = {
  nombre: 'marta',
  primerApellido: 'pérez',
  segundoApellido: 'gil',
  dni: '11223344C', // el validador exige la letra en mayúscula
  nacimiento: '1992-03-14',
  genero: 'femenino',
  telefono: '611223344', // el validador no admite espacios
  correo: 'Marta@Example.com',
  direccion: 'Calle Sol 3',
  ciudad: 'sevilla',
  codigoPostal: '41001',
};

/**
 * La app avisa con alert() nativo. Sin manejador, Playwright los descarta solo;
 * con page.on('dialog') se leen y se aceptan. El manejador se registra ANTES de la
 * acción: un alert bloquea la página hasta que alguien lo cierra.
 */
function capturarAlertas(page: Page): string[] {
  const mensajes: string[] = [];
  page.on('dialog', async (dialogo) => {
    mensajes.push(dialogo.message());
    await dialogo.accept();
  });
  return mensajes;
}

test.describe('pacientes', { tag: '@smoke' }, () => {
  test('el listado muestra los pacientes de la API', async ({ patientsPage }) => {
    await patientsPage.abrir();

    await expect(patientsPage.filasDeDatos()).toHaveCount(2);
    await expect(patientsPage.fila('Lucía García López')).toBeVisible();
  });

  test('la tabla expone la estructura correcta a los lectores de pantalla', async ({ patientsPage }) => {
    await patientsPage.abrir();
    await expect(patientsPage.fila('Mario Sanz')).toBeVisible();

    // Snapshot del árbol de accesibilidad: roles y nombres, no píxeles ni clases CSS.
    await expect(patientsPage.tabla).toMatchAriaSnapshot(`
      - table:
        - rowgroup:
          - row "Nombre Completo DNI/NIE Correo Teléfono Estado":
            - columnheader "Nombre Completo"
            - columnheader "DNI/NIE"
            - columnheader "Correo"
            - columnheader "Teléfono"
            - columnheader "Estado"
        - rowgroup:
          - row /Lucía García López/
          - row /Mario Sanz/
    `);
  });
});

test.describe('alta de paciente', () => {
  test('envía los datos normalizados y recarga el listado', async ({ page, patientsPage, api }) => {
    const alertas = capturarAlertas(page);

    await test.step('abrir el modal de alta', async () => {
      await patientsPage.abrir();
      await patientsPage.botonNuevo.click();
      await expect(patientsPage.modalAlta).toBeVisible();
      await expect(patientsPage.botonCrear).toBeDisabled();
    });

    await test.step('rellenar el formulario', async () => {
      await patientsPage.rellenarAlta(nueva);
      await expect(patientsPage.botonCrear).toBeEnabled();
    });

    const body = await test.step('enviar y capturar la petición', async () => {
      // Se empieza a esperar ANTES del clic: si no, la petición podría escaparse.
      const peticion = page.waitForRequest(
        (r) => r.method() === 'POST' && r.url().endsWith('/patients'),
      );
      await patientsPage.botonCrear.click();
      return (await peticion).postDataJSON() as CreatePatient;
    });

    await test.step('el front normaliza lo que escribe el usuario', async () => {
      // expect.soft: si una falla, el test sigue y al final informa de todas.
      expect.soft(body.name).toBe('Marta');
      expect.soft(body.surname).toBe('Pérez');
      expect.soft(body.identifier).toBe('11223344C');
      expect.soft(body.phone).toBe('611223344');
      expect.soft(body.email).toBe('marta@example.com');
      expect.soft(body.city).toBe('Sevilla');
    });

    await test.step('avisa del alta, cierra el modal y vuelve a pedir el listado', async () => {
      await expect.poll(() => alertas).toEqual(['Paciente creado correctamente']);
      await expect(patientsPage.modalAlta).toBeHidden();
      // expect.poll repite la función hasta que cumple (o se acaba el tiempo).
      await expect.poll(() => api.llamadasA('GET', '/patients').length).toBe(2);
    });
  });

  test('si el DNI ya existe (409) avisa con el mensaje del back y no cierra', async ({
    page,
    patientsPage,
    api,
  }) => {
    // Simulación de error del back solo para este endpoint; el resto sigue igual.
    api.responder('POST', '/patients', 409, { message: 'Ya existe un paciente con DNI 11223344C' });

    await patientsPage.abrir();
    await patientsPage.botonNuevo.click();
    await patientsPage.rellenarAlta(nueva);

    const alertas = capturarAlertas(page);
    await patientsPage.botonCrear.click();

    await expect.poll(() => alertas).toEqual(['Ya existe un paciente con DNI 11223344C']);
    await expect(patientsPage.modalAlta).toBeVisible();
  });
});
