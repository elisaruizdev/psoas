# Registro de la auditoría

Fecha: 4 de octubre de 2026.

Alcance de la auditoría: revisar el frontend y dejar por escrito el comportamiento de entonces. Esa pasada añadió Playwright y no tocó la lógica de `src/app`. El primer paso de corrección (sesión e interceptor) está más abajo y sí modifica `src/app`.

## Qué se revisó

- Rutas en `src/app/app.routes.ts`, `src/app/features/auth/auth.routes.ts` y `src/app/features/private-area/private-area.routes.ts`.
- Sesión: `login.ts` escribe `sessionStorage`; `header.ts` la lee y la borra; `app.config.ts` registra `provideHttpClient()` sin interceptor.
- `verify-register.ts` y `auth.service.ts`.
- Dónde hay `any`, `console.error` y `subscribe` sin `takeUntilDestroyed`.
- Tests de Karma: siguen siendo smoke tests (`should create`). No se reescribieron.

## Qué se añadió

| Archivo | Acción | Motivo |
| --- | --- | --- |
| `playwright.config.ts` | Nuevo | Chromium, `baseURL` `http://localhost:4200`, `webServer` con `npx ng serve --port 4200`. Un solo worker para no saturar el servidor de desarrollo. |
| `e2e/login.spec.ts` | Nuevo | El formulario exige email y contraseña; el login mockeado guarda la sesión y abre `/dashboard`. |
| `e2e/acceso-privado.spec.ts` | Nuevo | Deja constancia de que `/patients` se abre sin token. |
| `e2e/verificar-registro.spec.ts` | Nuevo | Deja constancia de que, sin `?token=`, hoy sí se llama al API. |
| `package.json` | Script `e2e` y dependencia `@playwright/test` | Para lanzarlos con `npm run e2e`. |
| `.gitignore` | Informes de Playwright | `test-results/`, `playwright-report/` y la caché no van al repositorio. |
| `docs/auditoria-estudio.md` | Nuevo | El porqué de cada hallazgo y cómo pedir el cambio. |

`e2e/` está fuera de `src/`. El compilador de la app (`tsconfig.app.json` incluye solo `src/**/*.ts`) no la ve.

## Primera ejecución

`npm run e2e` el 4 de octubre de 2026.

Playwright levantó `ng serve` en el puerto 4200. No hizo falta el backend: las peticiones a `http://localhost:3000` van mockeadas con `page.route`.

La primera pasada falló: `page.goto` esperaba el evento `load` y `src/index.html` pide fuentes de Google que no terminan de cargar. Se cambió la espera a `domcontentloaded`. No se tocó la app.

Segunda pasada, 4 tests, 1 worker, Chromium: **4 passed** en unos 19 segundos.

- `e2e/acceso-privado.spec.ts` — sin token, `/patients` sigue en el área privada.
- `e2e/login.spec.ts` — el botón sigue deshabilitado con email inválido o contraseña de menos de 8 caracteres.
- `e2e/login.spec.ts` — el `POST /auth/login` mockeado guarda `token`, `id_physio` y `name`, y abre `/dashboard`.
- `e2e/verificar-registro.spec.ts` — sin `?token=` hay una llamada a `/auth/verify-email?token=undefined` y la app acaba en `/login?verified=true`.

Avisos que salieron del servidor y se dejaron como están: `darken()` obsoleto en `delete-card.scss` y `form.scss`.

La lista de arriba es la foto de la auditoría, antes de corregir. Los apartados siguientes cuentan cada paso ya cerrado. El inventario de `e2e/acceso-privado.spec.ts` describe el test original: más abajo se dice en qué se convirtió.

## Paso 1 — sesión e interceptor

Hecho el 4 de octubre de 2026.

**Qué se hizo.** El token deja de estar repartido entre el login y el header. `SessionService` es el único que escribe y lee `sessionStorage`. Un interceptor añade la cabecera `Authorization` en las peticiones de la clínica.

**Por qué.** Sin eso, el token se guardaba en el navegador y no salía en las llamadas. Un guard tampoco tendría un sitio único del que leer la sesión. Por eso este paso va antes que los guards.

**Archivos.**

- `src/app/features/auth/models/session.model.ts` — `AuthSession`: `token`, `idPhysio`, `name`.
- `src/app/features/auth/services/session.service.ts` — `save`, `token`, `idPhysio`, `name`, `clear`. Las claves siguen siendo `token`, `id_physio` y `name`. `clear()` sigue haciendo `sessionStorage.clear()`.
- `src/app/features/auth/interceptors/auth.interceptor.ts` — si hay token y la URL no contiene `/auth/`, clona la petición con `Authorization: Bearer <token>`.
- `src/app/app.config.ts` — `provideHttpClient(withInterceptors([authInterceptor]))`.
- `login.ts` llama a `session.save` con `access_token`, `user.id_physio` y `user.name`.
- `header.ts` lee el nombre y el id del servicio. El icono de salir llama a `session.clear()` y navega a `/login`.

**Qué no se rompió.** El cuerpo del login sigue siendo `{ email, password }`. La respuesta que se espera sigue trayendo `access_token` y `user`. El formato `Bearer` es una suposición: el backend no está en este repositorio. Si el API quiere el token pelado, se cambia solo el interceptor. Las rutas de `/auth/` (login, registro, verificación, contraseñas) no llevan la cabecera, para no adjuntar un token viejo a quien está creando la sesión.

**Cómo se comprobó.** `npm run e2e`, 4 passed. El `POST /auth/login` sale sin `Authorization`. Tras guardar el token, `GET /dashboard/stats` sale con `Bearer token-de-prueba`. `sessionStorage` queda con las tres claves.

## Paso 2 — guards

Hecho el 4 de octubre de 2026, después del paso 1. Leen el token de `SessionService`, no de `sessionStorage` directo.

**Qué se hizo.** La zona privada exige sesión. Quien ya tiene sesión no vuelve a ver el login ni el registro.

**Por qué.** Con el interceptor solo, cualquiera podía abrir `/patients` escribiendo la URL. El guard cierra esa puerta. Va en el mismo hilo que la sesión porque tiene que usar el mismo servicio: si otro agente mirara `sessionStorage` por su cuenta, el contrato se parte.

**Archivos.**

- `src/app/features/auth/guards/auth.guard.ts` — si no hay token, devuelve la ruta `/login`.
- `src/app/features/auth/guards/public.guard.ts` — si hay token, devuelve `/dashboard`.
- `src/app/app.routes.ts` — `canActivate: [authGuard]` en el `loadChildren` del área privada (`/dashboard`, `/patients`, `/sessions`, `/physios`).
- `src/app/features/auth/auth.routes.ts` — `publicGuard` en `login`, `registro`, `recuperar-contraseña` y `resetear-contraseña`.

**Qué no se rompió.** `/verificar-registro` no lleva `publicGuard`. Si lo llevara, un enlace de correo con una sesión vieja en el navegador iría al dashboard y no ejecutaría la verificación. Las URLs no cambian. El título «Psoas» del header sigue llamando a `goToLogin()` sin borrar la sesión: con el guard, esa pulsación acaba en `/dashboard` si el token sigue ahí. Salir de verdad es el icono, que sí limpia el storage.

**Cómo se comprobó.** `npm run e2e`, 6 passed.

- Sin token, `/patients` acaba en `/login` y se ve «Bienvenido de nuevo». No se llama a `/patients`.
- Con token, `/patients` se queda en el listado y `GET /patients` lleva `Bearer token-de-prueba`.
- Con token, `/login` acaba en `/dashboard` y `GET /dashboard/stats` lleva la misma cabecera.
- En ese momento el spec de verificación seguía afirmando el bug. El paso 3 lo corrige.

## Paso 3 — verificación de email

Hecho el 4 de octubre de 2026.

**Qué se hizo.** `verifyEmail` solo se llama si la URL trae `?token=`. Sin token, la pantalla va a `/login` sin el query `verified`. Hay un solo `Router`.

**Por qué.** El `if (token)` estaba vacío y la llamada iba siempre detrás. Sin query, el template string convertía el token en el texto `undefined` y el navegador pedía `GET /auth/verify-email?token=undefined`. Si el API respondía 200, el usuario acababa en `/login?verified=true` sin haber verificado nada. El constructor tenía dos `Router` (`routes` y `router`) para la misma clase.

**Archivos.** `src/app/features/auth/pages/verify-register/verify-register.ts` y `e2e/verificar-registro.spec.ts`.

**Qué no se rompió.** La ruta sigue siendo `/verificar-registro` y no lleva `publicGuard`. Con token, el éxito va a `/login?verified=true` y el fallo a `/login?verified=false`. La plantilla sigue vacía: quien no tiene token no se queda en una página en blanco, porque `goToLogin()` lo manda al login. El `console.error` del fallo se mantiene. Enseñarlo en el login entra en los errores que siguen abiertos, no en los listados.

**Cómo se comprobó.** `npm run e2e`, 8 passed. Tres de ellos son de esta pantalla:

- Sin `?token=`, cero peticiones a `/auth/verify-email` y la URL es `/login`, sin `verified`.
- Con `?token=token-correo` y el API en 200, una petición que contiene ese token y la URL acaba en `/login?verified=true`.
- Con el mismo token y el API en 400, la URL acaba en `/login?verified=false`.

## Paso 4 — errores visibles en los listados

Hecho el 4 de octubre de 2026.

**Qué se hizo.** Si la carga del listado falla, la pantalla lo dice y no enseña la tabla vacía. El dashboard no enseña las tarjetas a cero.

**Por qué.** Un 500 parecía «no hay pacientes» o «hoy no hay sesiones». Quien usa la clínica no tiene la consola abierta.

**Archivos.**

- `patients.ts` / `patients.html`: «No se han podido cargar los pacientes.»
- `sessions.ts` / `sessions.html`: «No se han podido cargar las citas.»
- `physios.ts` / `physios.html`: «No se han podido cargar los fisioterapeutas.»
- `dashboard.ts` / `dashboard.html`: «No se han podido cargar las estadísticas.»
- `e2e/listados.spec.ts`.

Cada uno guarda el texto en una signal `loadError`. Al volver a pedir los datos, esa signal se vacía. El `console.error` de antes se queda.

**Qué no se rompió.** `shared/ui` no se ha reescrito. El login sigue con su `errorMessage`. Abrir una ficha, aprobar o rechazar un fisio, y el fallo de verificación siguen solo en consola. Un 401 no cierra la sesión. El aviso usa el mismo rojo que el cuadro de error del login (`#dc2626` sobre `#fee2e2`).

**Cómo se comprobó.** `npm run e2e`, 12 passed. Con token y el API en 500:

- `/patients` muestra el aviso y no «Sin pacientes registrados».
- `/dashboard` muestra el aviso y no «Sesiones hoy».
- `/sessions` muestra el aviso y no «Sin citas programadas».
- `/physios` muestra el aviso y no «Sin resultados».

## Paso 5 — suscripciones que sobreviven a la pantalla

Hecho el 4 de octubre de 2026. Los tipos quedan para cuando se pidan: no entran en este paso.

**Qué se hizo.** La carga de pacientes, citas, fisios y dashboard, y las dos suscripciones de `verify-register.ts` (`queryParams` y `verifyEmail`), se cortan al destruir el componente con `takeUntilDestroyed(destroyRef)`.

**Por qué.** La app es zoneless. Si la respuesta llega después de salir de la pantalla, el `subscribe` podía hacer `signal.set` sobre un componente que ya no existe. `takeUntilDestroyed()` sin argumento solo vale en el constructor; aquí la suscripción está en `ngOnInit` o en un método, así que se pasa el `DestroyRef` del constructor.

**Archivos.** `patients.ts`, `sessions.ts`, `physios.ts`, `dashboard.ts`, `verify-register.ts`. `e2e/listados.spec.ts` espera la respuesta de `/patients`, navega a `/dashboard` y entonces la suelta.

**Qué no se rompió.** El dato se sigue pidiendo al entrar. El `error:` y `loadError` siguen igual. Los `afterClosed()` de los diálogos no se han tocado: se cierran con el diálogo. Tampoco las fichas, el alta, el login ni `shared/ui`. `reset-password.ts` lee el token con `snapshot`, no con una suscripción.

**Cómo se comprobó.** `npm run e2e`, 13 passed. El test nuevo entra en `/patients` con la respuesta retenida, se va a `/dashboard`, suelta esa respuesta y comprueba que se ven las sesiones de hoy y que el navegador no lanza un error de página.

## Paso 6 — tipos del login

Hecho el 4 de octubre de 2026.

**Qué se hizo.** `login` deja de devolver `Observable<any>`. El cuerpo y la respuesta tienen modelo, y `HttpClient` va genérico, igual que `createPatient` en `PatientsService`. El formulario del login usa controles no anulables, así que `getRawValue()` ya es `{ email, password }`.

**Por qué.** Con `any`, un cambio de nombre en el API (`access_token` que pasara a llamarse `token`) compilaba igual y se rompía en el navegador.

**Archivos.** `src/app/features/auth/models/login.model.ts` (nuevo), `auth.service.ts`, `login.ts`.

**Qué no se rompió.** El método sigue llamándose `login`. El cuerpo sigue siendo `{ email, password }`. La respuesta sigue leyendo `access_token`, `user.id_physio` y `user.name`. Registro, verificación y las dos rutas de contraseña siguen en `any`. Formularios, tabla y layout no se han tocado.

**Cómo se comprobó.** `npx ng build --configuration development` sin errores de tipos. El build de producción falla al descargar la fuente de Google por el certificado de esta máquina; no tiene que ver con el login. `npx playwright test e2e/login.spec.ts`: 3 passed. El `POST /auth/login` sigue enviando `{ email, password }` y la sesión guarda `token`, `id_physio` y `name`.

## Paso 7 — suscripciones de las fichas

Hecho el 4 de octubre de 2026.

**Qué se hizo.** Las fichas (paciente, fisio, cita y las pestañas de historial, tratamientos y sesiones), el alta de paciente y de cita, y los formularios de login, registro y contraseñas cortan el `subscribe` con `takeUntilDestroyed(destroyRef)`. Abrir un fisio o una cita, y aprobar o rechazar, también. Los `afterClosed()` de los diálogos siguen igual.

**Por qué.** Con zoneless, una respuesta tardía podía hacer `signal.set` sobre una ficha ya cerrada.

**Qué no se rompió.** `shared/ui` no se ha tocado. Los listados siguen pidiendo el dato al entrar.

## Paso 8 — error al abrir una ficha

Hecho el 4 de octubre de 2026.

**Qué se hizo.** Si `GET /patients/:id` falla, el diálogo muestra «No se ha podido abrir la ficha del paciente.» Si falla abrir un fisio o una cita, el listado muestra el aviso y la tabla sigue. Aprobar o rechazar un fisio, si falla, usa el mismo aviso. Si la verificación de email falla, el login muestra «No se ha podido verificar el email.» El `console.error` se mantiene.

**Qué no se rompió.** Un fallo del listado sigue ocultando la tabla vacía. El éxito de aprobar o rechazar sigue con `alert`.

## Paso 9 — mensaje de éxito del registro

Hecho el 4 de octubre de 2026.

**Qué se hizo.** `register.ts` hace `okMessage.set('')` antes de enviar. Antes sustituía la signal con `this.okMessage = signal('')`, así que la plantilla se quedaba con la signal vieja.

## Paso 10 — 401 cierra la sesión

Hecho el 4 de octubre de 2026.

**Qué se hizo.** Si una petición que no es de `/auth/` responde 401, el interceptor llama a `session.clear()` y navega a `/login`. El error se vuelve a lanzar. Un 401 de login o de registro no borra nada: esas URLs llevan `/auth/`.

**Cómo se comprobó.** `e2e/acceso-privado.spec.ts`: con token y `GET /patients` en 401, la URL acaba en `/login` y `sessionStorage` queda vacío.

## Paso 11 — rutas de auth y del área privada

Hecho el 4 de octubre de 2026.

**Qué se hizo.** Ya no hay dos `loadChildren` con `path: ''`. Las pantallas de auth (`login`, `registro`, `verificar-registro`, `recuperar-contraseña`, `resetear-contraseña`) son rutas con path propio, cada una con el layout de login. El área privada es el único `path: ''` que queda, detrás del guard. `/` sigue yendo a `login`.

**Qué no se rompió.** Las ocho URLs de siempre. `/verificar-registro` no lleva `publicGuard`.

## Paso 12 — tipos del resto de auth

Hecho el 4 de octubre de 2026.

**Qué se hizo.** Registro, verificación, recuperar contraseña y resetear contraseña dejan `any`. El cuerpo del registro es `RegisterForm`. Recuperar y resetear reciben un objeto, como el login. La respuesta es `RegisterResponse` o `EmailTokenResponse`.

**Qué no se rompió.** Los métodos siguen llamándose igual. Formularios, tabla y layout (`shared/ui`, avisos y menú) siguen con `any`: el plan pedía no reescribir `shared/ui` en este cambio.

**Cómo se comprobó.** `npx ng build --configuration development` sin errores. `npx playwright test`: 15 passed.

## Paso 13 — tipos de formulario, tabla y layout

Hecho el 4 de octubre de 2026.

**Qué se hizo.** El formulario compartido emite `FormValue` (`string | number | boolean | null` por campo). La tabla usa `TableRow`, con `id` y el resto de columnas del mismo tipo. Avisos, menú de usuario y las entradas del header usan `ClinicNotification`, `MenuUser` y `UserMenuItem`. Los clics de paciente, fisio y cita leen `TableRowClick`.

**Por qué.** Esos eran los `any` que el plan dejaba en `shared/ui` y en el layout.

**Qué no se rompió.** Las columnas de los listados siguen siendo texto. Abrir una ficha sigue usando el `id` de la fila. `shared/ui` no tiene ningún `subscribe`: no había nada que cortar con `takeUntilDestroyed`. Los `onSubmit` de las fichas siguen anotados como `any` aunque el formulario ya emite `FormValue`.

**Cómo se comprobó.** `npx ng build --configuration development` sin errores. `npx playwright test`: 15 passed. El clic en la fila de un paciente sigue abriendo la ficha.

## Paso 14 — tipos de los onSubmit

Hecho el 4 de octubre de 2026.

**Qué se hizo.** Los envíos de paciente, fisio, cita, diagnóstico, tratamiento y sesión reciben `FormValue`. Leen cada campo con `formText` o `formChoice`. El estado de un diagnóstico solo puede ser `active` o `resolved`, y el de un tratamiento `active`, `completed` o `paused`.

**Qué no se rompió.** Un teléfono sigue quitando los espacios. Un email sigue en minúsculas. Una cita sigue montando la fecha con el día y la hora del formulario. Quedan `any` sueltos que no eran este paso: las listas internas de `new-session.ts` y del historial de sesiones, el fisio anidado en `Session`, y las respuestas de aprobar, rechazar o borrar un fisio y de borrar una cita.

**Cómo se comprobó.** `npx ng build --configuration development` sin errores. `npx playwright test`: 15 passed.

## Paso 15 — los any que quedaban

Hecho el 4 de octubre de 2026.

**Qué se hizo.** El alta de cita guarda `Patient[]` y `Physio[]`. El historial de sesiones guarda `Physio[]`. `Session.physio` tiene nombre y apellidos, y `Session.treatment` es un `Treatment`. Aprobar y rechazar un fisio devuelven `Physio`. Borrar un fisio o una cita devuelve `void`, igual que borrar un paciente.

**Qué no se rompió.** Los métodos siguen llamándose igual. El alta sigue filtrando fisios activos. El historial sigue mostrando el nombre del fisio de la sesión.

**Cómo se comprobó.** `npx ng build --configuration development` sin errores. En `src/app` no queda ningún `any`. `npx playwright test`: 15 passed.

## Paso 16 — pulido y responsive

Hecho el 4 de octubre de 2026.

**Qué se hizo.** `provideClientHydration(withEventReplay())` queda registrado. `index.html` usa `lang="es"`. Los métodos `abrir*` de pacientes, citas y fisios pasan a inglés (`openPatientDetail`, `openNewPatient`, `openAppointmentDetail`, `openNewAppointment`, `openPhysioDetail`). Las etiquetas y el error de correo pasan a «Correo», «Correo o contraseña incorrectos» y «Correo no válido». El subtítulo del login es «Entra para acceder a la plataforma». Hay `eslint.config.js` y `npm run lint`: se apaga lo que choca con el proyecto (constructor, selectores `app-` / `f-` / `button-ui`, salidas ya publicadas) y se quitan imports y métodos vacíos que el lint marcaba. En pantallas estrechas el login se apila, el formulario de acceso reduce el padding, el contenido privado también, las pestañas hacen scroll horizontal, el header oculta el nombre, las cabeceras de listado hacen wrap, las solicitudes pendientes ocupan el ancho disponible, las tablas scrollean dentro de su caja y las rejillas usan `minmax(min(100%, 16rem), 1fr)`. Los diálogos `fullscreen-dialog` ocupan el ancho de la ventana por debajo de 768px.

**Qué no se rompió.** El campo de la API sigue llamándose `email`. `verifyEmail` y `EmailTokenResponse` no cambian. La inyección sigue en el constructor. Los 15 e2e anteriores siguen en verde.

**Cómo se comprobó.** `npx ng build --configuration development` sin errores. `npx eslint .` sin errores. `npx playwright test`: 19 passed, incluidos login y área privada a 390px y 1280px sin desborde horizontal del documento.

## Huecos que siguen abiertos

El plan y el pulido de esta pasada están hechos. Queda el aviso de Sass `darken()` en `form.scss` y `delete-card.scss`. El `ng build` de producción sigue fallando al incrustar MuseoModerno por el certificado TLS de esta máquina; el build de development y `ng serve` sí compilan.
