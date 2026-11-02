---
name: componente-angular
description: Crea un componente Angular nuevo en Psoas siguiendo las convenciones del repo (standalone, zoneless con signals, servicio tipado, spec con dobles, accesibilidad). Úsala cuando pidan una pantalla, un modal, una pestaña o un componente de shared/ui nuevos.
---

# Crear un componente en Psoas

## 1. Antes de escribir

- Busca si ya existe algo reutilizable en `src/app/shared/ui/` (button, table, modal, form,
  card-info, delete-card). Si existe, úsalo en vez de duplicarlo.
- Decide dónde va: `features/<dominio>/<vista>/` si es de negocio, `shared/ui/<nombre>/` si
  es genérico y no conoce el dominio.
- Si necesita datos: el modelo va en `features/<dominio>/models/` y el servicio en `services/`.

## 2. Archivos

Trío `nombre.ts` + `nombre.html` + `nombre.scss` y su `nombre.spec.ts`. Clase sin sufijo
(`NewSession`, no `NewSessionComponent`). Selector `app-…` en features.

```ts
@Component({
  selector: 'app-nombre',
  imports: [/* solo lo que use la plantilla */],
  templateUrl: './nombre.html',
  styleUrl: './nombre.scss',
})
export class Nombre implements OnInit {
  datos = signal<Modelo[]>([]);
  loadError = signal('');
  private readonly notifications = inject(NotificationService);

  constructor(private servicio: XService, private destroyRef: DestroyRef) {}

  ngOnInit(): void {
    this.servicio.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (datos) => this.datos.set(datos),
      error: () => this.loadError.set('No se han podido cargar los datos.'),
    });
  }
}
```

Reglas: estado de plantilla en `signal`/`computed` (la app es zoneless); nada de `any`; nada de
`alert()`; errores de carga en `<p class="alert alert--error" role="alert">`; avisos de acciones
con `NotificationService`.

## 3. Plantilla accesible

- Cada control con `<label for>`; los errores con `id` y `aria-describedby` en el input.
- Botones de verdad (`<button>` o `button-ui`), nunca `div` con `(click)`.
- Iconos decorativos sin texto alternativo; botones solo-icono con `aria-label`.
- Colores y espacios con tokens (`var(--text-secondary)`, `var(--space-md)`).

## 4. Spec

Sigue la skill `tests-componente`. Como mínimo: carga correcta, error de la API, y cada acción
del usuario (crear, guardar, borrar con `confirm`), comprobando lo que se envía y lo que se avisa.

## 5. Verificar

```bash
npm run lint
npm run test:ci          # la cobertura no puede bajar del umbral
npx playwright test --project=chromium --grep @smoke
```

Si es una pantalla nueva con ruta, añade la ruta lazy en el `*.routes.ts` del dominio y pide al
subagente `revisor-accesibilidad` que revise la plantilla.
