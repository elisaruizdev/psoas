import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: MatSnackBar, useValue: snackBar }],
    });
    service = TestBed.inject(NotificationService);
  });

  it('un éxito se anuncia de forma educada (polite) y dura poco', () => {
    service.success('Guardado');

    expect(snackBar.open).toHaveBeenCalledWith(
      'Guardado',
      'Cerrar',
      jasmine.objectContaining({
        politeness: 'polite',
        duration: NotificationService.SUCCESS_MS,
        panelClass: ['notification', 'notification--success'],
      }),
    );
  });

  it('un error interrumpe al lector de pantalla (assertive) y dura más', () => {
    service.error('Ha fallado');

    expect(snackBar.open).toHaveBeenCalledWith(
      'Ha fallado',
      'Cerrar',
      jasmine.objectContaining({
        politeness: 'assertive',
        duration: NotificationService.ERROR_MS,
        panelClass: ['notification', 'notification--error'],
      }),
    );
  });
});
