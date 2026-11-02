---
name: tests-componente
description: Escribe o mejora los tests unitarios de un componente o servicio Angular de Psoas (Karma + Jasmine, zoneless) probando comportamiento y caminos de error, y comprueba que la cobertura no baja. Úsala cuando pidan tests, subir cobertura o al terminar un componente nuevo.
---

# Tests de un componente en Psoas

## Principios

- Se prueba **comportamiento**, no implementación: qué se envía a la API, qué ve el usuario,
  qué se avisa, cuándo se cierra el diálogo. No se prueban métodos privados directamente.
- Cada test, un comportamiento, con nombre en español: `'guardar con error: avisa y no cierra'`.
- Siempre el camino feliz **y** el de error. Los errores son donde más fallos hay.
- Nada de red: los servicios se sustituyen por dobles.

## Plantilla

```ts
describe('Nombre', () => {
  let component: Nombre;
  let fixture: ComponentFixture<Nombre>;
  let service: jasmine.SpyObj<XService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<unknown>>;

  beforeEach(async () => {
    service = jasmine.createSpyObj<XService>('XService', ['getAll', 'update']);
    service.getAll.and.returnValue(of([aPatient()]));          // fixtures de src/testing/fixtures.ts
    const notif = provideTestNotifications();                  // helpers de src/testing/providers.ts
    const dialog = provideTestDialog({ id: 'p-1' });
    notifications = notif.notifications;
    dialogRef = dialog.dialogRef;

    await TestBed.configureTestingModule({
      imports: [Nombre],
      providers: [...dialog.providers, ...notif.providers, { provide: XService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(Nombre);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('si la API falla, muestra el error', () => {
    spyOn(console, 'error');                                   // silencia el log esperado
    service.update.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.onSubmit({ /* FormValue */ });
    expect(notifications.error).toHaveBeenCalledWith('…');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
```

## Trucos de este repo

- Zoneless: tras cambiar estado, `fixture.detectChanges(); await fixture.whenStable();`.
- `confirm()`: `spyOn(window, 'confirm').and.returnValue(true | false)` y prueba los dos.
- `MatDialog` en listados: `jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])` que devuelve
  `{ afterClosed: () => of(resultado) }` para probar si se recarga la lista.
- Fechas: construye fechas locales (`new Date(2026, 10, 4, 9, 30)`) para no depender de la zona horaria.
- Jasmine corre en orden aleatorio: ningún test puede depender de otro.

## Verificar

```bash
npm run test:ci
```

Mira el resumen de cobertura al final. Si sube claramente, sube también el umbral de
`karma.conf.js` (`coverageReporter.check.global`): es un *ratchet*, nunca se baja.
