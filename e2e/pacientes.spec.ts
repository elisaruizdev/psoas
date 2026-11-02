// Flujo completo de pacientes con fixtures, Page Object y comprobaciones de red.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import type { DatosPaciente } from './pages/patients.page';
import type { CreatePatient } from '../src/app/features/private-area/patients/models/patients.model';

const nueva: DatosPaciente = {
  nombre: 'marta',
  primerApellido: 'pérez',
  segundoApellido: 'gil',
  dni: '11223344b', // letra de control correcta (11223344 % 23 → B); el front la pasa a mayúscula
  nacimiento: '1992-03-14',
  genero: 'femenino',
  telefono: '611 22 33 44', // se escribe con espacios y se envía sin ellos
  correo: 'Marta@Example.com',
  direccion: 'Calle Sol 3',
  ciudad: 'sevilla',
  codigoPostal: '41001',
};

/**
 * La app ya no usa alert(): avisa con un MatSnackBar. Por si alguien vuelve a meter un
 * alert/confirm nativo, se registra un manejador que los recoge (si no, Playwright los
 * descarta en silencio) y el test comprueba que no ha saltado ninguno.
 */
function capturarDialogosNativos(page: Page): string[] {
  const mensajes: string[] = [];
  page.on('dialog', async (dialogo) => {
    mensajes.push(dialogo.message());
    await dialogo.dismiss();
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
    const nativos = capturarDialogosNativos(page);

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
      expect.soft(body.identifier).toBe('11223344B');
      expect.soft(body.phone).toBe('611223344');
      expect.soft(body.email).toBe('marta@example.com');
      expect.soft(body.city).toBe('Sevilla');
    });

    await test.step('avisa del alta, cierra el modal y vuelve a pedir el listado', async () => {
      await expect(patientsPage.aviso).toContainText('Paciente creado correctamente');
      await expect(patientsPage.modalAlta).toBeHidden();
      expect(nativos).toEqual([]);
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
    api.responder('POST', '/patients', 409, { message: 'Ya existe un paciente con DNI 11223344B' });

    await patientsPage.abrir();
    await patientsPage.botonNuevo.click();
    await patientsPage.rellenarAlta(nueva);

    const nativos = capturarDialogosNativos(page);
    await patientsPage.botonCrear.click();

    // El aviso se ve por encima del modal y el modal sigue abierto para corregir.
    await expect(patientsPage.aviso).toContainText('Ya existe un paciente con DNI 11223344B');
    await expect(patientsPage.modalAlta).toBeVisible();
    expect(nativos).toEqual([]);
  });

  test('un DNI con la letra equivocada no deja crear el paciente', async ({ patientsPage }) => {
    await patientsPage.abrir();
    await patientsPage.botonNuevo.click();
    await patientsPage.rellenarAlta({ ...nueva, dni: '11223344C' });

    await expect(patientsPage.modalAlta.getByText('La letra del DNI/NIE no corresponde al número')).toBeVisible();
    await expect(patientsPage.botonCrear).toBeDisabled();
  });
});
