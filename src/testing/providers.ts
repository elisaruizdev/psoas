import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

type TestProviders = (Provider | EnvironmentProviders)[];

/**
 * HttpClient de pruebas: ninguna petición sale de verdad.
 * Se inspeccionan y se responden con `HttpTestingController`.
 */
export function provideTestHttp(): TestProviders {
  return [provideHttpClient(), provideHttpClientTesting()];
}

/**
 * Router para `routerLink`, `ActivatedRoute` y `Router`.
 * La ruta comodín acepta cualquier navegación (p. ej. a `/login`) sin cargar pantallas.
 */
export function provideTestRouter(): TestProviders {
  return [provideRouter([{ path: '**', children: [] }])];
}

/**
 * Lo que necesita un componente que se abre con `MatDialog.open()`:
 * los datos que recibe y una referencia al diálogo con `close` espiado.
 */
export function provideTestDialog<T>(data?: T): {
  providers: TestProviders;
  dialogRef: jasmine.SpyObj<MatDialogRef<unknown>>;
} {
  const dialogRef = jasmine.createSpyObj<MatDialogRef<unknown>>('MatDialogRef', ['close']);
  return {
    dialogRef,
    providers: [
      { provide: MatDialogRef, useValue: dialogRef },
      { provide: MAT_DIALOG_DATA, useValue: data ?? {} },
    ],
  };
}
