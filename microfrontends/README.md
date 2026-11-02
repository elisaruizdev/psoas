# Microfrontends de Psoas

Demo de **microfrontend con Web Components**: un widget hecho con **Lit**, desplegable por su
cuenta, que la app Angular carga en tiempo de ejecución sin compilarlo ni importarlo.

```
microfrontends/
└── resumen-citas/            ← paquete independiente (su package.json, sus tests, su build)
    ├── src/psoas-resumen-citas.ts        el Web Component
    ├── src/psoas-resumen-citas.test.ts   tests (Vitest + happy-dom)
    └── index.html                        demo SIN Angular (HTML plano)
```

## Probarlo en local

```bash
cd microfrontends/resumen-citas
npm install
npm run dev        # http://localhost:4300 → demo en HTML plano, con tema claro y oscuro
```

Con ese servidor levantado, `npm start` en la raíz: el **dashboard** muestra el widget
«Próximas citas de hoy». Si el servidor no está, el dashboard funciona igual sin él.

```bash
npm test           # tests del componente
npm run build      # dist/psoas-resumen-citas.js (un único ES module, ~8 kB gzip)
```

## Cómo encaja

| Pieza | Dónde | Qué hace |
|---|---|---|
| Web Component | `resumen-citas/src/psoas-resumen-citas.ts` | `LitElement` con Shadow DOM. Se registra como `<psoas-resumen-citas>`. |
| Cargador | `src/app/shared/microfrontends/microfrontend-loader.service.ts` | Inserta `<script type="module">`, espera a `customElements.whenDefined()`, cachea por URL, no hace nada en SSR y devuelve `false` si falla. |
| URL del MFE | `src/environments/*.ts` → `microfrontends.resumenCitas` | En local, el servidor de Vite; en producción, vacío (desactivado) o la URL versionada del CDN. |
| Uso en Angular | `dashboard.ts` / `dashboard.html` | `CUSTOM_ELEMENTS_SCHEMA`, `[citas]="..."` (propiedad) y `(cita-seleccionada)="..."` (evento). |
| Tema | `dashboard.scss` → `.dashboard__mfe` | Variables CSS `--psoas-*`: atraviesan el Shadow DOM; las clases no. |
| Tests | Vitest (componente), Karma (cargador y dashboard), Playwright (`e2e/microfrontend.spec.ts`, integración real) | |

## El contrato (lo que se acuerda entre equipos)

```html
<psoas-resumen-citas titulo="Próximas citas de hoy"></psoas-resumen-citas>
```

- **Entrada por atributo** (`titulo`): solo texto.
- **Entrada por propiedad** (`el.citas = [{ id, hora, paciente, estado }]`): datos complejos.
  En Angular, `[citas]="..."` ya asigna la propiedad.
- **Salida por evento** `cita-seleccionada` → `event.detail = { id }`. Lleva `bubbles` y
  `composed: true`; sin `composed`, el evento no saldría del Shadow DOM.
- **Tema** con variables CSS: `--psoas-primario`, `--psoas-texto`, `--psoas-fondo`,
  `--psoas-borde`, `--psoas-radio`.

Si el contrato cambia de forma incompatible, se publica una versión nueva en otra URL
(`/resumen-citas/2.0.0/...`) y cada app migra cuando puede.

## Preguntas de entrevista que esto responde

**¿Por qué Web Components para microfrontends?** Son estándar del navegador: el widget
funciona en Angular, React, Vue o HTML plano (lo demuestra `index.html`). Cada equipo elige
su stack y despliega a su ritmo.

**¿Y Module Federation?** Comparte dependencias en tiempo de ejecución y encaja mejor si
todo es el mismo framework (p. ej. varias apps Angular). Los Web Components aíslan más y
acoplan menos, a cambio de que cada MFE lleve su runtime (aquí Lit pesa unos 6 kB).

**¿Por qué Lit?** Es una capa fina sobre Web Components: propiedades reactivas, plantillas
eficientes y estilos encapsulados, sin virtual DOM y con muy poco peso.

**Shadow DOM: ventajas y pegas.** Los estilos no se filtran ni hacia dentro ni hacia fuera.
La pega es tematizar: por eso se usan variables CSS (o `::part()`).

**¿Qué pasa si el MFE cae?** El cargador devuelve `false` (por error o a los 5 s) y el
dashboard no lo pinta. Hay un E2E que lo comprueba abortando la petición.

**SSR.** La app prerenderiza. En el servidor no hay `customElements`, así que el cargador
no hace nada y el widget aparece solo en el navegador.

**Seguridad.** Cargar JS de otro origen es confiar en él. En producción iría en un CDN propio,
con la CSP (`script-src`) permitiendo ese origen y, si se puede, con Subresource Integrity.
