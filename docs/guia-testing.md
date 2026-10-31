# Guía de testing de Psoas

Todo lo que se aplica en el repo, explicado para poder contarlo en una entrevista. Cada apartado dice **qué es**, **dónde está en Psoas** y **cómo explicarlo**. Las frases en cursiva son respuestas cortas para practicar en voz alta (también en inglés).

Estado a 31 de octubre de 2026: 76 tests unitarios y de componente, 66 E2E en cinco navegadores o dispositivos, 2 contratos Pact y 5 tests de la imagen Docker.

---

## 0. El mapa: qué se prueba y con qué

| Capa | Pregunta que responde | Herramienta | Dónde |
| --- | --- | --- | --- |
| Unitario | ¿Esta función, servicio o guard hace lo que debe? | Karma + Jasmine | `src/**/*.spec.ts` |
| Componente | ¿Este componente pinta y reacciona bien a inputs y eventos? | TestBed, harnesses | `src/app/**/*.spec.ts` |
| Integración (front) | ¿Router + componente + HTTP funcionan juntos? | Playwright con API falsa | `e2e/*.spec.ts` |
| E2E | ¿Un usuario puede completar el flujo? | Playwright | `e2e/pacientes.spec.ts`, `e2e/login.spec.ts` |
| Visual | ¿Ha cambiado algo en píxeles sin querer? | `toHaveScreenshot` | `e2e/visual.spec.ts` |
| Accesibilidad | ¿Se puede usar con teclado y lector de pantalla? ¿Cumple WCAG? | axe-core, aria snapshots | `e2e/accesibilidad.spec.ts` |
| Contrato | ¿Front y back están de acuerdo en la forma de los datos? | Pact | `e2e/contrato/` |
| Infraestructura | ¿La imagen Docker sirve bien y con cabeceras seguras? | Playwright `request` | `e2e/docker/` |

**Pirámide de tests.** Muchos tests unitarios (rápidos y baratos), menos de integración y pocos E2E (lentos y más frágiles). *"Unit tests tell me a piece works; E2E tests tell me the pieces work together for a user. I keep most logic covered by fast unit tests and use E2E for critical user journeys."*

**Testing trophy** (Kent C. Dodds): pone el peso en los tests de integración porque dan más confianza por euro invertido. En Psoas los E2E con API falsa son en realidad tests de integración del front, y por eso son rápidos y estables.

---

## 1. Tests unitarios y de componente (Karma + Jasmine)

### 1.1 Las herramientas

| Herramienta | Qué hace | Equivalente |
| --- | --- | --- |
| **Karma** | *Runner*: abre un navegador real, carga los tests y recoge resultados | Jest/Vitest también son runners (en Node con jsdom) |
| **Jasmine** | *Framework*: `describe`, `it`, `expect`, `beforeEach`, espías | Todo en uno |
| **Mocha** | Solo estructura (`describe`/`it`) | La parte estructural de Jasmine |
| **Chai** | Solo aserciones: `expect(x).to.equal(1)` | `expect(x).toBe(1)` |
| **Sinon** | Espías, stubs, mocks y relojes falsos | `jasmine.createSpyObj`, `spyOn`, `jasmine.clock()` |

*"Jasmine is basically Mocha + Chai + Sinon in one package. Karma is just the runner that executes them in a real browser."*

Angular está pasando de Karma a **Vitest** (o Jest) con el nuevo builder. Saber decirlo demuestra que sigues el ecosistema. La migración cambia el runner; la mayoría de los tests de TestBed se quedan igual.

### 1.2 Cómo arrancan los tests: `src/test.ts`

- `angular.json` → `test.options.main: "src/test.ts"`, `karmaConfig: "karma.conf.js"`.
- `test.ts` inicializa TestBed **en modo zoneless** con `provideZonelessChangeDetection()`.

**Hallazgo real:** antes de esto, los tests **no se ejecutaban nunca**. `angular.json` apuntaba a `tsconfig.spec.ts` (no existe; es `.json`), y al arreglarlo fallaban 31 de 32 con `NG0908: In this configuration Angular requires Zone.js`. La app es zoneless y TestBed no. Es una buena historia de entrevista: *"I found the unit test setup was broken, so the suite had never run. Fixing it surfaced 24 tests with missing providers."*

### 1.3 TestBed, paso a paso (`src/app/features/private-area/patients/patients.spec.ts`)

```ts
await TestBed.configureTestingModule({
  imports: [Patients],                      // componente standalone: se importa
  providers: [{ provide: PatientsService, useValue: service }],
}).compileComponents();
fixture = TestBed.createComponent(Patients); // crea el componente y su DOM
component = fixture.componentInstance;       // la clase
fixture.nativeElement;                       // el HTML renderizado
fixture.detectChanges();                     // ngOnInit + pintar la plantilla
```

- **`fixture.detectChanges()`**: en tests la detección de cambios no es automática. Se llama cuando quieres que la plantilla refleje el estado.
- **`fixture.componentRef.setInput('config', …)`**: pone un input como lo haría el padre. Funciona con `@Input` y con `input()` (`table.spec.ts`).
- **`TestBed.inject(X)`**: obtiene un servicio del inyector del test.

### 1.4 Dobles de prueba (test doubles)

| Tipo | Qué es | En Psoas |
| --- | --- | --- |
| **Dummy** | Algo que se pasa y no se usa | Los `{}` de `ActivatedRouteSnapshot` en `guards.spec.ts` |
| **Stub** | Devuelve respuestas fijas | `MAT_DIALOG_DATA` en `src/testing/providers.ts` |
| **Spy** | Registra cómo se le llamó | `spyOn(router, 'navigate')` |
| **Mock** | Spy con expectativas de cómo debe usarse | `jasmine.createSpyObj<PatientsService>(...)` + `toHaveBeenCalledOnceWith` |
| **Fake** | Implementación funcional simplificada | `ApiMock` de Playwright (un backend de juguete) |

API de Jasmine que aparece en el repo:

- `jasmine.createSpyObj<T>('Nombre', ['metodo'])`: objeto con métodos espía, tipado.
- `spy.and.returnValue(of(x))`, `.and.resolveTo(true)`, `.and.callFake(fn)`.
- `expect(spy).toHaveBeenCalledOnceWith(args)`, `.not.toHaveBeenCalled()`, `toHaveBeenCalledTimes(2)`.
- `jasmine.objectContaining({...})`: compara solo algunas propiedades.
- `spyOn(console, 'error')`: silencia y vigila logs esperados.

### 1.5 Observables en tests (`login.spec.ts`)

- `of(valor)`: respuesta inmediata y correcta.
- `throwError(() => new HttpErrorResponse({ status: 401 }))`: error.
- **`Subject`**: el test decide **cuándo** responde el servidor. Así se comprueba el estado intermedio ("Iniciando sesión..." con el botón deshabilitado) y después se emite con `respuesta$.next(ok)`.

### 1.6 HTTP: `HttpTestingController` (`patients.service.spec.ts`)

```ts
providers: [provideHttpClient(), provideHttpClientTesting()]
service.getAllPatients().subscribe(...);
const req = http.expectOne(`${apiUrl}`);   // exactamente una petición a esa URL
expect(req.request.method).toBe('GET');
req.flush(pacientes);                        // responde
afterEach(() => http.verify());              // ninguna petición sin atender ni inesperada
```

- Errores: `req.flush({}, { status: 500, statusText: 'Server Error' })`.
- **Orden de providers:** `provideHttpClient(withInterceptors([...]))` va antes que `provideHttpClientTesting()`.

### 1.7 Interceptor (`auth.interceptor.spec.ts`)

Se registra el interceptor real y se comprueba la petición que sale:

- Con sesión añade `Authorization: Bearer …`; sin sesión, no.
- En `/auth/` no la añade aunque haya sesión.
- 401 fuera de `/auth/` → borra la sesión y navega a `/login`, y el error **sigue** llegando al componente.
- 401 del login no cierra sesión (es "contraseña incorrecta").

### 1.8 Guards funcionales (`guards.spec.ts`)

Los guards son funciones que usan `inject()`, así que se ejecutan dentro de un contexto de inyección:

```ts
TestBed.runInInjectionContext(() => authGuard(route, state));
```

Devuelven `true` o un `UrlTree`; se serializa con `router.serializeUrl()` para comparar la URL.

### 1.9 Patrón *host component* (`button.spec.ts`)

Para probar un componente como lo usa la app, se crea un componente de prueba que lo usa en su plantilla, con signals para cambiar los inputs. Comprueba bindings, `booleanAttribute` (`<button-ui fullWidth>`) y outputs.

### 1.10 Component harnesses de Angular Material (`table.spec.ts`)

Un **harness** es un *Page Object oficial* de un componente de Material: preguntas por filas, celdas u orden sin depender de su HTML ni de sus clases internas.

```ts
const loader = TestbedHarnessEnvironment.loader(fixture);
const tabla = await loader.getHarness(MatTableHarness);
const orden = await loader.getHarness(MatSortHarness);
```

Si Material cambia su DOM en una versión nueva, el harness se actualiza con él y tu test no se rompe.

### 1.11 Eventos del DOM

- Escribir: `input.value = 'x'; input.dispatchEvent(new Event('input'))`.
- Enviar: `form.dispatchEvent(new Event('submit'))`.
- Teclado: `new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })` y `event.defaultPrevented`.

### 1.12 TDD: rojo, verde, refactor (ejemplo real: tabla accesible por teclado)

1. **Rojo**: se escribieron primero los tests de `table.spec.ts › accesibilidad con teclado`. Fallaron 4 (tabindex, Enter, Espacio, aria-label).
2. **Verde**: el mínimo en `table.html` y `table.ts`: `[attr.tabindex]`, `(keydown.enter)`, `(keydown.space)` con `preventDefault`, `[attr.aria-label]`.
3. **Refactor**: migración de la tabla a `input()`/`output()`/`computed()` con los tests como red de seguridad.

*"I wrote the failing keyboard tests first, then the minimal template changes to make them pass, then refactored the component to signals with the tests protecting me."*

### 1.13 Tiempo y zoneless

- `fakeAsync` + `tick()` **necesitan Zone.js**. En una app zoneless se usa:
  - un `Subject` para controlar cuándo llega un valor (como en `login.spec.ts`),
  - `jasmine.clock().install()` / `.tick(ms)` para `setTimeout`/`debounce`,
  - `await fixture.whenStable()` para esperar trabajo asíncrono.

### 1.14 Orden aleatorio, cobertura y umbral

- `karma.conf.js` → `jasmine.random: true`. Si un test depende de otro, falla de forma intermitente y lo detectas.
- `npm run test:ci` → `--code-coverage`: informe HTML en `coverage/psoas/index.html` y `lcov` para herramientas como SonarQube.
- **Umbral (ratchet)**: `coverageReporter.check.global` falla la ejecución si la cobertura baja de 45 % de líneas. Se sube cuando se añaden tests, nunca se baja. Cobertura actual: 46 % de líneas y 23 % de ramas. Las pantallas grandes (detalle de paciente, sesiones) solo tienen el test "should create".
- La cobertura dice qué líneas **se ejecutaron**, no qué se **comprobó**. *"Coverage is a smell detector, not a quality metric."*

### 1.15 Helpers compartidos (`src/testing/`)

- `providers.ts`: `provideTestHttp()`, `provideTestRouter()` (con ruta comodín para que `navigate(['/login'])` no rompa) y `provideTestDialog(data)`.
- `fixtures.ts`: `aPatient()`, `aPhysio()`, `anAppointment()` con `overrides`: patrón *object mother/builder*.
- Están excluidos de la build en `tsconfig.app.json`.

---

## 2. Playwright

### 2.1 Qué es y frente a qué compite

Automatiza Chromium, Firefox y WebKit con una sola API. Habla con el navegador por su protocolo (CDP o el propio de Playwright), no por WebDriver.

| | Playwright | Selenium | WebdriverIO | Cypress |
| --- | --- | --- | --- | --- |
| Protocolo | CDP / propio | WebDriver (HTTP) | WebDriver o BiDi | Dentro del navegador |
| Navegadores | Chromium, Firefox, WebKit | Todos con driver | Todos con driver | Chromium, Firefox (WebKit experimental) |
| Esperas | Automáticas | Manuales (explícitas) | Automáticas | Automáticas |
| Varias pestañas y orígenes | Sí | Sí | Sí | Limitado |
| Lenguajes | TS/JS, Python, Java, .NET | Muchos | JS/TS | JS/TS |

*"Selenium talks WebDriver over HTTP to a driver; Playwright drives the browser directly, auto-waits for elements and isolates each test in a fresh browser context, so tests are faster and less flaky."*

### 2.2 Modelo: browser → context → page

- **Browser**: el proceso del navegador.
- **BrowserContext**: un perfil aislado (cookies, storage), como una ventana de incógnito. **Cada test tiene el suyo**, así que no se contaminan.
- **Page**: una pestaña.

### 2.3 La configuración (`playwright.config.ts`, comentada en el archivo)

| Opción | Para qué |
| --- | --- |
| `testDir`, `testIgnore` | Dónde están los tests; `e2e/docker` solo con `WEB_URL` |
| `fullyParallel`, `workers` | Paralelismo; 1 worker en local porque `ng serve` se atasca |
| `forbidOnly` | En CI, un `test.only` olvidado hace fallar el pipeline |
| `retries` | Reintentos solo en CI; un test que pasa al reintentar sale como **flaky** |
| `reporter` | `list` y `html` en local; `blob` + `github` en CI |
| `use.baseURL` | `page.goto('/login')` en vez de la URL entera |
| `use.locale`, `timezoneId` | Emulación de idioma y zona horaria: fechas iguales en cualquier máquina |
| `use.trace`, `screenshot`, `video` | Material de depuración solo cuando hace falta |
| `expect.toHaveScreenshot` | Umbral y opciones de las capturas |
| `snapshotPathTemplate` | Dónde van las capturas de referencia (con `{platform}`) |
| `projects` | La misma suite en varias configuraciones |
| `webServer` | Arranca la app antes de los tests (`ng serve` o la build con `serve`) |

### 2.4 Localizadores (locators)

Por orden de preferencia, igual que en Testing Library:

1. `getByRole('button', { name: 'Iniciar sesión' })`: como lo encuentra un lector de pantalla.
2. `getByLabel('Correo', { exact: true })`: campos de formulario por su `<label>`.
3. `getByText`, `getByPlaceholder`, `getByAltText`, `getByTitle`.
4. `getByTestId`: cuando no hay nada semántico.
5. CSS o XPath (`page.locator('#email')`): último recurso.

Detalles que aparecen en el repo:

- **Modo estricto**: si un localizador encuentra varios elementos y haces una acción o aserción, falla. En `visual.spec.ts`, "Sesiones hoy" era a la vez `h3` y `h2`; se resolvió con `level: 2`.
- Encadenar: `modal.getByRole('button', ...)`. Filtrar: `.filter({ has: page.getByRole('cell') })`. Alternativas: `.or()`. Posición: `.first()`, `.nth(1)`.
- Un locator es **perezoso**: no busca nada hasta que actúas o compruebas.

**Bonus de accesibilidad:** si un test encuentra un elemento por su rol y nombre, ya está comprobando que es accesible. Que la fila de la tabla tenga nombre (`Abrir detalle: Lucía…`) permite `getByRole('row', { name })`.

### 2.5 Auto-waiting y aserciones web-first

- Antes de `click()`, Playwright espera a que el elemento esté visible, habilitado, estable y reciba eventos. En `pacientes.spec.ts` se vio cuando falló: "element is not enabled", porque un validador rechazaba el DNI.
- `await expect(locator).toBeVisible()` **reintenta** hasta que se cumple o vence el timeout (5 s). No hacen falta `sleep`.
- `expect.poll(() => valor)`: reintenta una función cualquiera (`pacientes.spec.ts`: esperar a que se pida dos veces `/patients`).
- `expect.soft(...)`: no corta el test; al final informa de todos los fallos (normalización del alta).
- `expect(...).toPass()`: reintenta un bloque entero de aserciones.
- **Lo que NO hay que hacer**: `page.waitForTimeout(2000)`. Hace los tests lentos y frágiles.

### 2.6 Acciones e interacción

`fill`, `click`, `tap` (táctil, `movil.spec.ts`), `focus`, `press`/`keyboard.press('Enter')`, `selectOption`, `blur`, `hover`, `check`, `setInputFiles`, `dragTo`.

### 2.7 Red: interceptar, simular y comprobar

| Técnica | Dónde | Para qué |
| --- | --- | --- |
| `page.route(url, handler)` | `e2e/support/api-mock.ts` | API falsa con datos fijos |
| `route.fulfill({ status, json })` | `red.spec.ts` | Respuesta inventada |
| `route.abort('internetdisconnected')` | `red.spec.ts` | Fallo de red (sin respuesta HTTP) |
| Retraso dentro del handler | `red.spec.ts` | Servidor lento: estado de carga |
| Rutas LIFO | `red.spec.ts` | Una ruta registrada después pisa a la de la fixture |
| `page.waitForRequest(pred)` | `pacientes.spec.ts` | Capturar la petición y comprobar el cuerpo del POST |
| `request.postDataJSON()`, `headerValue()` | `pacientes.spec.ts`, `red.spec.ts` | Inspeccionar lo que envió la app |
| Registro de peticiones | `ApiMock.peticiones` | Comprobar que todas llevan el token |

No se usan, pero conviene conocerlas:

- `route.continue()` deja pasar la petición, modificando cabeceras si quieres.
- `route.fetch()` hace la petición real y modifica la respuesta.
- `page.routeFromHAR()` reproduce un archivo HAR grabado de tráfico real.
- `context.setOffline(true)` emula estar sin conexión.

Importante: **esperar antes de actuar**. `waitForRequest` se lanza antes del `click`; si no, la petición puede escaparse.

### 2.8 Reloj y emulación

- `page.clock.setFixedTime(FECHA_FIJA)` en `ApiMock.instalar()`: `new Date()` devuelve siempre el miércoles 4 de noviembre de 2026. Sin esto, el dashboard ("Hoy …") cambiaría cada día y rompería las capturas. También existe `clock.install()` + `fastForward()` para probar timeouts o caducidad de sesión.
- `locale: 'es-ES'` y `timezoneId: 'Europe/Madrid'`: la cita de las 10:00Z se pinta a las 11:00.
- `devices['Pixel 7']`, `devices['iPhone 14']`: viewport, `isMobile`, `hasTouch`, user agent y `deviceScaleFactor`. `movil.spec.ts` lo comprueba con `matchMedia('(pointer: coarse)')`.
- También se emulan `colorScheme: 'dark'`, `geolocation` + `permissions` y `reducedMotion`.

### 2.9 Sesión: `addInitScript` y `storageState`

Psoas guarda el token en `sessionStorage`. `page.addInitScript` lo escribe **antes** de que cargue la app (`entrarConSesion`).

La técnica habitual en otras apps es un **proyecto `setup`** que hace login una vez y guarda `storageState` (cookies + `localStorage` + IndexedDB) en un archivo, que el resto de proyectos reutiliza con `dependencies: ['setup']`. **`storageState` no guarda `sessionStorage`**, por eso aquí no aplica. *"Saber por qué no lo usas también es una respuesta."*

### 2.10 Diálogos nativos y consola

- Playwright **cierra solo** los `alert/confirm/prompt` si nadie escucha. Para comprobarlos: `page.on('dialog', d => { mensajes.push(d.message()); d.accept(); })` **antes** de la acción (`pacientes.spec.ts`). Si en cambio se espera con `waitForEvent('dialog')` mientras el alert bloquea la página, el `click` se queda colgado (pasó en este repo).
- `page.on('console', msg => …)`: leer la consola del navegador. `e2e/docker/nginx.spec.ts` lo usa para detectar violaciones de CSP.

### 2.11 Fixtures (`e2e/fixtures.ts`)

Las fixtures son la **inyección de dependencias de Playwright**: el test pide por parámetro lo que necesita, Playwright lo prepara antes y lo limpia después de `use()`.

- Integradas: `page`, `context`, `browser`, `request`, `browserName`, `isMobile`, `hasTouch`.
- Propias: `api` (backend falso), `conSesion`, `loginPage`, `patientsPage`.
- **Composición**: pedir `patientsPage` arrastra `api` y `conSesion`.
- Se pueden marcar `{ auto: true }` (siempre activas) o `{ scope: 'worker' }` (una por worker, p. ej. una base de datos).

Frente a `beforeEach`: las fixtures son reutilizables entre archivos, se componen, solo se crean si se piden y tienen tipos.

### 2.12 Page Object Model (`e2e/pages/`)

Clase que encapsula una pantalla: los localizadores y las acciones ("rellenar el alta"). Los tests hablan del negocio y, si cambia el HTML, se toca un solo archivo. En Psoas los Page Objects se entregan como fixtures.

### 2.13 Organización

- `test.describe(...)`, `test.step('...', async () => …)`: los pasos aparecen en el informe y en la traza.
- **Tags**: `{ tag: '@smoke' }` en `describe` o en `test` (se acumulan). Se filtra con `--grep @smoke` / `--grep-invert @visual` y con `grep` por proyecto.
- `test.describe.configure({ mode: 'serial' })`: en orden y en el mismo worker (Pact usa un único puerto).
- `test.skip(condición, motivo)` (`docker/nginx.spec.ts`), `test.fixme`, `test.slow()`, `test.only` (prohibido en CI).
- Bucles para generar tests parametrizados (`accesibilidad.spec.ts`: un test por pantalla).

### 2.14 Tests visuales (`e2e/visual.spec.ts`)

- `await expect(page).toHaveScreenshot('login.png', { fullPage: true })` o sobre un locator (solo el componente).
- La primera vez guarda la **imagen de referencia** (baseline). Después compara píxel a píxel y, si se pasa del umbral (`maxDiffPixelRatio: 0.01`), falla. El informe HTML enseña la esperada, la actual y la diferencia.
- `animations: 'disabled'`, `caret: 'hide'` y `mask: [locator]` tapan lo que cambia entre ejecuciones (el dashboard tapa el nombre de usuario).
- **Determinismo**: datos fijos (API falsa), reloj fijo, zona horaria fija. Validado con `--repeat-each=2`.
- **Por sistema operativo**: Windows, Linux y macOS renderizan las fuentes distinto. Las capturas llevan `{platform}` en el nombre. En CI se ejecutan dentro de la imagen oficial `mcr.microsoft.com/playwright`, y las de Linux se generan con el workflow manual (`actualizar_capturas`).
- Cambio intencionado → `npm run e2e:visual:update` y revisar el diff en la PR.
- **Caso real:** al reforzar el anillo de foco de la tabla, el test detectó 5064 píxeles distintos (3 %). Era intencionado, así que se actualizó la referencia.

### 2.15 Accesibilidad (`e2e/accesibilidad.spec.ts`)

- **axe-core**: `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()`. El test exige cero violaciones y el mensaje enumera regla, selector y detalle.
- **Lo que encontró en Psoas** (todo de contraste, WCAG 1.4.3, mínimo 4.5:1 en texto normal):
  - Descripciones del login y rol del header: el color cumplía, pero `opacity: 0.85` lo dejaba en 3.51:1.
  - Botón de peligro: rojo-600 sobre rojo-100 = 3.95:1 → `--feedback-error-fg` pasa a rojo-700.
  - Texto del separador del login con `--text-tertiary` (3.62:1) → `--text-secondary`.
- **Límite**: axe detecta en torno a un tercio de los problemas. El resto exige probar con teclado y lector de pantalla. Por eso hay un test que abre el detalle **solo con teclado** (`focus` + `Enter`).
- **`toMatchAriaSnapshot`** (`pacientes.spec.ts`): compara el árbol de accesibilidad (roles y nombres) en YAML. Rompe si alguien cambia la tabla por `div`s aunque se vea igual. Los dos puntos dentro del nombre rompen el YAML, así que ahí se usa una regex (`row /Lucía García López/`).
- Mejora encontrada y hecha en TDD: filas clicables accesibles por teclado y foco visible (WCAG 2.1.1 y 2.4.7).

### 2.16 Testing de API con `request` (`e2e/docker/nginx.spec.ts`)

La fixture `request` hace peticiones HTTP sin navegador: `request.get(url)` → `status()`, `headers()`, `text()`, `json()`. Se usa para comprobar las cabeceras de seguridad, el fallback del SPA, la caché de assets y el 404. También vale para preparar datos por API antes de un test de UI (crear un paciente sin pasar por el formulario).

### 2.17 Proyectos: cross-browser y móvil

| Proyecto | Dispositivo | Qué ejecuta |
| --- | --- | --- |
| `chromium` | Desktop Chrome | Todo menos `@mobile`, `@docker` y `@contrato` |
| `firefox` | Desktop Firefox | `@smoke` |
| `webkit` | Desktop Safari | `@smoke` |
| `mobile-chrome` | Pixel 7 | `@mobile` |
| `mobile-safari` | iPhone 14 | `@mobile` |
| `contrato` | Desktop Chrome | `@contrato` (Pact, en serie) |
| `docker` | Desktop Chrome | `@docker` (solo con `WEB_URL`) |

WebKit es el motor de Safari: si funciona en WebKit, es muy probable que funcione en Safari. Los proyectos pueden depender de otros (`dependencies`), p. ej. un `setup` que hace login primero.

### 2.18 Paralelismo, sharding y CI

- **Workers**: procesos que ejecutan tests a la vez en una máquina.
- **Sharding**: `--shard=1/2` reparte la suite entre máquinas. En CI cada shard deja un informe `blob` y el job `informe-e2e` los une con `playwright merge-reports`.
- **Retries y flaky**: en CI 2 reintentos; un test que pasa al reintentar se marca *flaky*, no verde. Se investiga, no se ignora.

### 2.19 Depurar

| Herramienta | Comando | Para qué |
| --- | --- | --- |
| Trace Viewer | `npx playwright show-trace traza.zip` | Línea de tiempo con DOM, red y consola de cada paso |
| Informe HTML | `npm run e2e:report` | Resultados, capturas, vídeos y diffs visuales |
| UI mode | `npm run e2e:ui` | Ejecutar y ver tests en modo interactivo, con *watch* |
| Inspector | `npm run e2e:debug` | Paso a paso, con `page.pause()` |
| Codegen | `npm run e2e:codegen` | Graba clics y genera código con buenos localizadores |
| `error-context.md` | En `test-results/` | Snapshot del árbol de accesibilidad en el momento del fallo |

### 2.20 Lo que no se usa y por qué

- **Component testing de Playwright** (`@playwright/experimental-ct-*`): experimental y sin soporte oficial para Angular. En Angular los componentes se prueban con TestBed.
- **Proyecto `setup` + `storageState`**: no guarda `sessionStorage` (apartado 2.9).
- **HAR**: tiene sentido con un backend real del que grabar tráfico; aquí la API falsa es más explícita.

---

## 3. Contract testing con Pact (`e2e/contrato/api.pact.spec.ts`)

**Problema que resuelve.** Los E2E con API falsa son rápidos, pero los mocks pueden **mentir**: si el backend cambia `access_token` por `token`, los tests del front siguen en verde. Los E2E contra el back real detectan el cambio, pero son lentos y necesitan los dos desplegados.

**Cómo funciona (dirigido por el consumidor).**

1. **Consumidor (Psoas)**: declara cada interacción con un estado (`given('hay pacientes registrados')`), la petición esperada y la **forma** de la respuesta con *matchers* (`string()`, `integer()`, `eachLike()`, `regex()`).
2. Pact levanta un **servidor mock en `localhost:3000`** y la app real, en el navegador, habla con él. Si la app pide otra cosa, falla. Si todo cuadra, escribe `pacts/psoas-web-psoas-api.json`.
3. **Proveedor (psoas-backend)**: en su pipeline, Pact reproduce cada interacción contra la API real, preparando cada `given` (*provider states*). Si el back ya no cumple, **falla el pipeline del back** antes de desplegar.
4. **Pact Broker / PactFlow**: guarda los contratos y sus verificaciones. `can-i-deploy` responde: "¿esta versión del front es compatible con lo que hay en producción del back?".

**Principio**: el contrato solo incluye lo que el front **usa** (ley de Postel). Así el back puede añadir campos sin romper nada.

**Supuesto a validar**: el contrato dice que el login responde `200`. NestJS responde `201` por defecto en un `POST` salvo con `@HttpCode(200)`. La verificación del proveedor lo confirmaría. Justo para eso sirve el contract testing.

**Alternativa ligera**: validar las respuestas contra un esquema (OpenAPI o Zod) generado desde el back.

*"Contract tests give me the confidence of integration tests at the speed of unit tests: the frontend publishes what it needs, and the backend's pipeline verifies it before deploying."*

---

## 4. Integración continua (`.github/workflows/ci.yml`)

| Job | Qué hace |
| --- | --- |
| `calidad` | `npm ci`, lint, tests unitarios con cobertura y umbral, build de producción |
| `e2e` (matriz de 2 shards) | Navegadores con `--with-deps`, build de desarrollo, Playwright sin `@visual` |
| `informe-e2e` | Une los blobs en un informe HTML |
| `visual` | Dentro de `mcr.microsoft.com/playwright:v1.63.0-noble` para que las capturas sean reproducibles |
| `docker` | Construye la imagen, la arranca y ejecuta `e2e/docker` (cabeceras, CSP, caché) |

Detalles: `concurrency` cancela ejecuciones viejas de la misma rama, `cache: npm` acelera `npm ci`, los artefactos (cobertura, informe, capturas, contrato) se suben aunque falle algo (`if: always()`).

**Equivalencia en Azure DevOps** (la oferta lo pide):

```yaml
trigger: [main]
pool: { vmImage: ubuntu-latest }
stages:
  - stage: Calidad
    jobs:
      - job: lint_y_unit
        steps:
          - task: NodeTool@0
            inputs: { versionSpec: '22.x' }
          - script: npm ci
          - script: npm run lint
          - script: npm run test:ci
          - task: PublishCodeCoverageResults@2
            inputs: { summaryFileLocation: coverage/psoas/lcov.info }
  - stage: E2E
    dependsOn: Calidad
    jobs:
      - job: playwright
        strategy: { parallel: 2 }   # sharding
        steps:
          - script: npm ci && npx playwright install --with-deps
          - script: npx ng build --configuration development
          - script: npx playwright test --shard=$(System.JobPositionInPhase)/$(System.TotalJobsInPhase)
```

GitHub Actions → Azure: `jobs` ≈ `jobs`, `needs` ≈ `dependsOn`, `matrix` ≈ `strategy.matrix`/`parallel`, `actions/upload-artifact` ≈ `PublishPipelineArtifact`.

---

## 5. Seguridad del contenedor (lo que prueban los tests de `e2e/docker`)

- **Cabeceras** (`docker/nginx/security-headers.inc.template`): CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, HSTS y `server_tokens off`.
- **Trampa de nginx**: un `add_header` dentro de un `location` **anula** todos los heredados del `server`. Por eso las cabeceras están en un include que va en cada `location`, y hay un test que comprueba que el JS con hash también las lleva.
- **CSP y Angular**: la build mete CSS crítico inline y un `onload="this.media='all'"`. Se permite ese único script con su hash (`'unsafe-hashes' 'sha256-…'`); `style-src` necesita `'unsafe-inline'` porque Angular inyecta los estilos de los componentes. El test del navegador escucha la consola por si la CSP bloquea algo.
- **Configuración en tiempo de arranque**: `connect-src` lee `API_ORIGIN` con las plantillas `envsubst` de la imagen oficial de nginx. Se cambia sin recompilar.

---

## 6. Hallazgos que encontraron los tests (historias para la entrevista)

| Hallazgo | Cómo se detectó | Arreglo |
| --- | --- | --- |
| La suite unitaria nunca se había ejecutado | Al lanzar `ng test` | `angular.json` → `tsconfig.spec.json` + `src/test.ts` zoneless + providers en 24 specs |
| Un spec importaba una clase que no existía | Error de compilación del test | `MenuDetailPatientComponent` |
| 4 fallos de contraste WCAG AA | axe-core | Tokens y opacidades |
| Filas de tabla no usables con teclado | TDD + test E2E solo con teclado | `tabindex`, Enter/Espacio, `aria-label`, foco visible |
| Foco casi invisible | Revisión de la captura visual | Contorno de marca de 2 px |
| El formulario rechaza la letra del DNI en minúscula y el teléfono con espacios, aunque el código luego los normaliza | Test de alta | Pendiente: aceptar y normalizar, o avisar mejor |
| La app avisa con `alert()` nativo | Test de alta | Pendiente: un aviso accesible (`role="status"` o snackbar) |
| Test flaky: `acceso-privado` falló 1 vez en Firefox con la suite completa en local | Pasó 15 de 15 con `--repeat-each=5` y 68 de 68 en la siguiente ejecución completa | Causa probable: `ng serve` compilando chunks lazy bajo carga. En CI se sirve la build estática; si reaparece, la traza de `on-first-retry` dirá dónde espera |
| Cabeceras de nginx perdidas en `location` | Conocimiento de nginx + test de API | Include en cada `location` |

---

## 7. Preguntas de entrevista con respuesta corta

1. **¿Qué testearías primero en una app nueva?** Lo que más duele si se rompe: login, guards, interceptor y el flujo principal (alta de paciente). Unitarios para la lógica, un E2E por flujo crítico.
2. **¿Mock, stub o spy?** Stub devuelve datos fijos, spy registra llamadas, mock además verifica cómo se usó. Ejemplos en el apartado 1.4.
3. **¿Cómo pruebas un servicio HTTP?** `HttpTestingController`: `expectOne`, comprobar método y cuerpo, `flush`, `verify`.
4. **¿Cómo evitas tests E2E frágiles?** Localizadores por rol, aserciones web-first sin `sleep`, datos y reloj fijos, aislamiento por contexto, mocks de red, sin depender del orden.
5. **¿Por qué un test pasa en local y falla en CI?** Datos, tiempo, zona horaria, fuentes o recursos distintos; paralelismo; orden. Se mira la traza (`trace: on-first-retry`).
6. **¿Qué es un test flaky y qué haces con él?** Uno que a veces pasa y a veces no. Se reproduce con `--repeat-each`, se mira la traza y se arregla la causa. Nunca se tapa con más reintentos.
7. **¿Cómo pruebas la accesibilidad?** axe en CI para lo automático, tests de teclado y aria snapshots para la estructura, y revisión manual con lector de pantalla.
8. **¿Qué aporta un test visual que no aporte uno funcional?** Detecta regresiones de CSS: un botón que se mueve, un color que cambia, un foco que desaparece.
9. **¿Contract testing o E2E contra el back real?** Contratos para la compatibilidad de la API en cada commit; unos pocos E2E reales en un entorno de staging para el humo final.
10. **¿TDD siempre?** Donde la lógica está clara (validaciones, transformaciones, accesibilidad de un componente). Para explorar UI, primero el prototipo y luego los tests.
11. **¿Qué cobertura pides?** Un suelo que no baje (ratchet) y que los caminos críticos estén cubiertos. El porcentaje solo no garantiza nada.
12. **¿Por qué Playwright y no Selenium?** Esperas automáticas, aislamiento por contexto, red interceptable, tres motores con una API, trazas y tests visuales integrados.
