# Estudio de la auditoría

Léelo después de `docs/auditoria-registro.md`. Ese archivo dice qué se hizo. Este dice por qué, qué archivo habría que tocar, qué no hay que romper y cómo comprobarlo.

La base ya es de nivel medio-alto. Las correcciones del plan están hechas: el detalle está en `docs/auditoria-registro.md`, pasos 1 a 15. En `src/app` no queda ningún `any`.

## 1. Cómo está armada la app

**Qué hay hoy.** Angular 20, componentes standalone, rutas perezosas (`loadComponent` / `loadChildren`) y `provideZonelessChangeDetection()` en `src/app/app.config.ts`. El estado de las pantallas va en `signal` y `computed` (por ejemplo `src/app/features/private-area/patients/patients.ts`). Las carpetas siguen el dominio: `features/auth` y `features/private-area/{patients,sessions,physios,dashboard}`, con la UI repetible en `shared/ui`. TypeScript está en `strict` y `strictTemplates`.

**Por qué importa.** Zoneless significa que Angular no se entera de un cambio solo porque una variable se reasignó. Si el dato tiene que verse en la plantilla, tiene que pasar por una signal, un `computed` o el `async` pipe. Eso ya es criterio de alguien que usa la versión actual del framework, no un andamiaje viejo de módulos.

**Qué archivo tocaríamos.** Ninguno por este tema. La estructura se mantiene.

**Qué no hay que romper.** El prefijo `app-` en las pantallas y el patrón de `PatientsService`: un método por operación, `Observable<Modelo>`, suscripción en el componente. Los componentes siguen inyectando por constructor. `inject()` solo está en el interceptor y en los guards, porque esas funciones de Angular no tienen constructor.

**Cómo comprobarlo.** `npm start` y recorrer `/login`, `/dashboard`, `/patients`, `/sessions` y `/physios`. Cada pantalla llega por una ruta perezosa, sin cargar el resto al arrancar.

## 2. Auth de punta a punta

**Qué hay hoy.**

1. `login.ts` hace `POST /auth/login`. Si responde bien, `SessionService` guarda tres claves en `sessionStorage`: `token` (el campo `access_token`), `id_physio` y `name`. Luego navega a `/dashboard`.
2. `authInterceptor` añade `Authorization: Bearer <token>` a toda petición que no sea de `/auth/`. Las de login, registro, verificación y contraseña salen sin esa cabecera. Está registrado en `app.config.ts` con `withInterceptors`.
3. `authGuard` protege el árbol privado. Sin token, esas rutas van a `/login`. `publicGuard` protege login, registro y las pantallas de contraseña: con token van a `/dashboard`. `/verificar-registro` no lleva ese guard.
4. `header.ts` lee el nombre y el id a través de `SessionService`. Al salir, el servicio hace `sessionStorage.clear()` y el header navega a `/login`. Si el token caduca, nadie redirige.

Flujo actual:

```text
formulario login
    -> POST /auth/login (sin Authorization)
    -> SessionService escribe sessionStorage (token, id_physio, name)
    -> /dashboard
Las peticiones siguientes, salvo /auth/, llevan Authorization: Bearer <token>.
Sin token, /patients acaba en /login.
Con token, /login acaba en /dashboard.
Cerrar sesión borra el storage desde el header, vía SessionService.
```

Flujo que pediría un senior:

```text
formulario login
    -> POST /auth/login
    -> un servicio de sesión guarda el token
    -> un interceptor añade Authorization
    -> un guard deja pasar /dashboard solo si hay sesión
    -> si el API responde 401, el servicio borra la sesión y vuelve a /login
```

**Por qué importa.** El listado ya no se abre sin token, y las peticiones de la clínica ya llevan `Authorization`. Si el backend responde 401 en una petición que no es de `/auth/`, el interceptor borra la sesión y vuelve a `/login`. Un 401 de login no entra ahí: la URL lleva `/auth/` y el formulario sigue mostrando «Email o contraseña incorrectos».

**Qué archivo se tocó.** `auth.interceptor.ts` y `SessionService.clear()`.

**Qué no hay que romper.** Las tres claves que ya escribe el login (`token`, `id_physio`, `name`): el header las lee. El cuerpo del login sigue siendo `{ email, password }` y la respuesta sigue trayendo `access_token` y `user.id_physio` / `user.name`. El test `e2e/login.spec.ts` fija ese contrato.

**Cómo comprobarlo.** `npm run e2e`. Sin token, `/patients` acaba en `/login`. Con token, `/patients` sigue en el listado y `/login` acaba en `/dashboard`. El `GET /dashboard/stats` y el `GET /patients` llevan `Authorization`.

Frases: «Añade un interceptor que envíe el token.» «Protege `/dashboard` con un guard.» «Saca la sesión del header a un servicio.»

## 3. Verificación de email

Archivo: `src/app/features/auth/pages/verify-register/verify-register.ts`.

**Qué había.** El `if (token)` estaba vacío y `verifyEmail` se ejecutaba siempre. Sin `?token=`, la URL pedida era `/auth/verify-email?token=undefined`. Había dos `Router` en el constructor.

**Qué hay hoy.** Si no hay token, no hay petición y `goToLogin()` abre `/login` sin query `verified`. Si hay token, el éxito va a `/login?verified=true` y el fallo a `/login?verified=false`. Queda un solo `Router`.

**Por qué importa.** Un enlace de correo sin token ya no puede marcar la cuenta como verificada. La plantilla sigue vacía, así que sin token el usuario no se queda en una página en blanco.

**Qué no hay que romper.** La ruta `/verificar-registro` y que no lleve `publicGuard`. Con un token de verdad, los dos destinos (`verified=true` y `verified=false`) siguen igual. El fallo todavía solo hace `console.error`.

**Cómo comprobarlo.** `e2e/verificar-registro.spec.ts`: sin query, cero peticiones y URL `/login`; con `?token=token-correo` y API 200, una petición y `/login?verified=true`; con API 400, `/login?verified=false`.

## 4. Dos rutas en `path: ''`

**Qué hay hoy.** `AUTH_ROUTES` declara cada pantalla de auth con su path (`login`, `registro`, `verificar-registro`, `recuperar-contraseña`, `resetear-contraseña`), y cada una carga el layout de login. `app.routes.ts` las pone delante del único `path: ''`, que es el área privada con `authGuard`. `/` redirige a `login` con `pathMatch: 'full'`.

**Por qué importa.** Antes había dos árboles con `path: ''`. Una ruta nueva con el mismo path se quedaba en el primero que coincidiera.

**Qué no hay que romper.** Las URLs actuales: `/login`, `/registro`, `/verificar-registro`, `/recuperar-contraseña`, `/resetear-contraseña`, `/dashboard`, `/patients`, `/sessions`, `/physios`. Los tests e2e entran por esas rutas.

**Cómo comprobarlo.** Después del cambio, `npm run e2e` y un recorrido manual de esas ocho URLs. Cada una debe mostrar el layout que ya tiene hoy.

Frase: «Separa las rutas de auth y del área privada.»

## 5. Errores de los listados

**Qué había.** El login muestra `errorMessage`. El resto hacía `console.error` y un fallo de red parecía una lista vacía.

**Qué hay hoy.** Si falla la carga, estas pantallas muestran un aviso y no la tabla vacía:

- Pacientes: «No se han podido cargar los pacientes.»
- Citas: «No se han podido cargar las citas.»
- Fisios: «No se han podido cargar los fisioterapeutas.»
- Dashboard: «No se han podido cargar las estadísticas.» En vez de las tarjetas a cero.

El `console.error` se mantiene. Al volver a pedir los datos, el aviso se borra.

**Qué no se tocó en los listados.** `shared/ui`. Abrir una ficha ya muestra un aviso en el diálogo o en el listado. Aprobar o rechazar, si falla, usa el mismo aviso. El fallo de verificación se lee en el login. `register.ts` hace `okMessage.set('')`. Un 401 de la clínica cierra la sesión.

**Cómo comprobarlo.** `e2e/listados.spec.ts`: con token y el API en 500, cada pantalla muestra su aviso y no el texto de lista vacía.

## 6. Dónde está el `any`

**Qué hay hoy.** En `src/app` no queda ningún `any`. El alta de cita y el historial usan `Patient` y `Physio`. `Session.physio` tiene nombre y apellidos. Aprobar y rechazar devuelven `Physio`. Borrar un fisio o una cita devuelve `void`.

`PatientsService` sigue siendo el modelo a copiar para lo que queda: `createPatient` devuelve `Observable<Patient>` y el modelo vive en `patients.model.ts`. El login ya sigue ese patrón.

**Por qué importa.** Con `any`, un cambio de nombre en el API (`access_token` que pasa a llamarse `token`) compila igual y se rompe en el navegador. El strict del proyecto no protege lo que está marcado como `any`.

**Qué no hay que romper.** Los nombres de métodos que ya llaman los componentes. Tipar no es renombrar.

**Cómo comprobarlo.** `npx ng build` sin errores. Una búsqueda de `any` en `src/app` no devuelve nada.

## 7. Suscripciones y zoneless

**Qué hay hoy.** La carga de los listados, las fichas, el alta, el login, el registro, las contraseñas y `verify-register.ts` usan `pipe(takeUntilDestroyed(this.destroyRef))`. Los `afterClosed()` de los diálogos se cierran solos. `shared/ui` no tiene `subscribe`.

**Por qué importa.** Con zoneless, un `subscribe` que sigue vivo después de destruir el componente puede hacer `signal.set` sobre una vista que ya no está.

**Qué no hay que romper.** Seguir pidiendo el dato al entrar, y el `error:` que ya muestra `loadError` en los listados.

**Cómo comprobarlo.** `e2e/listados.spec.ts`: se retiene `GET /patients`, se navega a `/dashboard` y luego se suelta la respuesta. El dashboard se ve y no hay error de página.

## 8. Karma y Playwright

**Qué hay hoy.** `npm test` lanza Karma. Los `*.spec.ts` que hay (por ejemplo `patients.spec.ts`) comprueban que el componente se crea. No simulan el servicio ni un clic.

Playwright abre Chromium de verdad contra `http://localhost:4200`.

**Por qué importa.** «should create» dice que el archivo compila y que Angular instancia la clase. No dice que el login guarde el token ni que `/patients` esté abierto. Un senior usa los dos: Karma (o el test runner de Angular) para una función o un componente aislado, Playwright para un recorrido de usuario.

**Qué archivo tocaríamos.** Ninguno de Karma en esta pasada.

**Qué no hay que romper.** El script `test`. Sigue siendo `ng test`. El script nuevo es `e2e`.

**Cómo comprobarlo.** `npm test` para la unidad (hace falta un navegador para Karma). `npm run e2e` para el recorrido.

## 9. Playwright en este repo

Un test e2e recorre la app como una persona: abre una URL, rellena un campo, espera un texto. No sustituye al tipado ni a un guard. Si el guard no existe, el test solo puede contar que la puerta está abierta. No la cierra.

### `playwright.config.ts`

- `testDir`: `./e2e`.
- `baseURL`: `http://localhost:4200`.
- `webServer`: `npx ng serve --port 4200`. Si ya hay un `ng serve` en ese puerto, lo reutiliza (salvo en CI).
- Un solo proyecto, Chromium, y `workers: 1`. El servidor de desarrollo de Angular va mal si cuatro navegadores le piden rutas perezosas a la vez.
- `page.goto` usa `waitUntil: 'domcontentloaded'` porque `src/index.html` enlaza fuentes de Google y el evento `load` no llega.

### Carpeta `e2e/`

Está al lado de `src/`, no dentro. Así `ng build` no intenta compilar los specs.

### `page.route`

Intercepta `http://localhost:3000` y responde JSON falso. El backend puede estar apagado.

| Spec | Qué hace el usuario | Qué responde el mock | Qué se afirma hoy |
| --- | --- | --- | --- |
| `e2e/login.spec.ts` | Abre `/login` y rellena email y contraseña. | Nada en el test del formulario. | El botón «Iniciar sesión» sigue deshabilitado si el email no es válido o la contraseña tiene menos de 8 caracteres. Con `ana@psoas.es` y `12345678` se habilita. |
| `e2e/login.spec.ts` | Envía el formulario. | `POST /auth/login` devuelve `access_token` y `user`. `GET /dashboard/stats` devuelve ceros. | La URL acaba en `/dashboard`, se ve «Sesiones hoy», y `sessionStorage` tiene `token`, `id_physio` y `name`. |
| `e2e/acceso-privado.spec.ts` | Abre `/patients` sin sesión. | Nada: el guard corta antes del API. | La URL acaba en `/login` y se ve «Bienvenido de nuevo». |
| `e2e/acceso-privado.spec.ts` | Abre `/patients` con token en `sessionStorage`. | `GET /patients` devuelve `[]`. | La URL sigue en `/patients`, se ve el listado y la petición lleva `Authorization: Bearer token-de-prueba`. |
| `e2e/verificar-registro.spec.ts` | Abre `/verificar-registro` sin query. | El mock está preparado, pero no debe usarse. | Cero peticiones a `/auth/verify-email` y la URL es `/login`, sin `verified`. |
| `e2e/verificar-registro.spec.ts` | Abre `/verificar-registro?token=token-correo`. | `GET /auth/verify-email` devuelve 200. | Una petición con ese token y la URL acaba en `/login?verified=true`. |
| `e2e/verificar-registro.spec.ts` | La misma URL con token. | `GET /auth/verify-email` devuelve 400. | La URL acaba en `/login?verified=false`. |

### Cómo lanzarlos

```bash
npm run e2e
```

Equivale a `npx playwright test`. La primera vez en una máquina nueva hace falta el navegador: `npx playwright install chromium`.

### Cómo pedir un test nuevo

Hace falta la pantalla, la acción, la respuesta mockeada y qué debe verse. Ejemplo de frase: «Añade un e2e de alta de paciente: en `/patients` pulso Nuevo paciente, el `POST /patients` mockeado devuelve el paciente, y la tabla muestra su nombre.»

## 10. Orden si pides correcciones

1. Servicio de sesión e interceptor. Hecho.
2. Guards. Hecho. Sin token, el área privada va a `/login`. Con token, login y registro van a `/dashboard`.
3. Bug de `verify-register.ts`. Hecho. Sin `?token=` no hay petición. Con token, el éxito y el fallo siguen yendo a `/login?verified=true` y `verified=false`.
4. Errores visibles en los listados. Hecho en pacientes, citas, fisios y dashboard.
5. Tipos, copiando `PatientsService`. Hecho. En `src/app` no queda ningún `any`.
6. `takeUntilDestroyed` en listados, fichas, alta y formularios de auth. Hecho. `shared/ui` no suscribe nada, así que no había nada que cortar.
7. Error visible al abrir una ficha, al fallar aprobar/rechazar y al fallar la verificación. Hecho.
8. `okMessage.set('')` en el registro. Hecho.
9. Un 401 fuera de `/auth/` cierra la sesión y vuelve a `/login`. Hecho.
10. Rutas de auth con path propio, y un solo `path: ''` para el área privada. Hecho.

En ese mismo cambio no se reescribe `shared/ui` ni se migran todos los `@Input()` a `input()`. El proyecto mezcla las dos formas a propósito; se cambia un componente cuando se toca por otra razón. Tampoco hace falta pasar todo a `inject()`: aquí se usa el constructor.

El pulido posterior también está hecho: métodos de abrir ficha y alta en inglés, textos de correo en español, `lang="es"`, hidratación registrada, ESLint (`npm run lint`) y el layout en móvil. Queda un aviso de Sass (`darken()` en el formulario y en la tarjeta de borrado) y el build de producción sigue sin poder incrustar la fuente de Google por el certificado TLS de esta máquina.
