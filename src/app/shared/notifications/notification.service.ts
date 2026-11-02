import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * Avisos no bloqueantes para el usuario (sustituyen a `alert()`).
 *
 * Por qué MatSnackBar y no un componente propio:
 * - Se pinta en el contenedor de overlays del CDK, igual que los diálogos. Si se pintara
 *   dentro de `app-root`, el diálogo abierto lo marcaría `aria-hidden` y el lector de
 *   pantalla no lo anunciaría (justo cuando falla un alta dentro del modal).
 * - Anuncia el texto con una región `aria-live` (`politeness`): `polite` para éxitos,
 *   `assertive` para errores.
 * - No bloquea el hilo ni la página como `alert()`, y no rompe los tests E2E.
 *
 * Los componentes dependen de este servicio y no de MatSnackBar: si mañana se cambia la
 * librería de avisos, solo cambia este archivo (y en los tests se espía este servicio).
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  static readonly SUCCESS_MS = 4000;
  static readonly ERROR_MS = 7000;

  success(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: NotificationService.SUCCESS_MS,
      politeness: 'polite',
      panelClass: ['notification', 'notification--success'],
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: NotificationService.ERROR_MS,
      politeness: 'assertive',
      panelClass: ['notification', 'notification--error'],
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }
}
