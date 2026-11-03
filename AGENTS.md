# AGENTS.md · Psoas

Instrucciones para agentes de IA que trabajan en este repo (Claude Code, Cursor, Codex,
Antigravity…). Es la **fuente única** de convenciones: `CLAUDE.md` la importa y las reglas
de `.cursor/rules/` la complementan. Si cambia una convención, se cambia aquí.

## Qué es

Frontend Angular 20 de una clínica de fisioterapia (pacientes, fisios, citas, dashboard). El
backend (NestJS) es otro repo. Además, en este repo:
- `ai/`: asistente clínico en Python (RAG, agentes). Ver `ai/README.md`. La app lo usa en la
  pestaña **Asistente** (`src/app/features/private-area/assistant/`), solo si el entorno tiene `aiUrl`.
- `microfrontends/`: Web Components con Lit (ver su README).
- `docs/`: guías de estudio de todo lo anterior; índice en `docs/README.md`. Si cambias algo que
  una guía explica, actualiza la guía en el mismo PR.

## Comandos

| Para | Comando |
|---|---|
| Arrancar | `npm start` (http://localhost:4200) |
| Lint | `npm run lint` |
| Tests unitarios + cobertura | `npm run test:ci` (falla si la cobertura baja del umbral de `karma.conf.js`) |
| E2E | `npx playwright test --project=chromium` (`--grep @smoke` para los rápidos) |
| Build | `npm run build` |
| IA (Python) | `cd ai && uv run pytest && uv run ruff check .` |
| App completa (BD + API + IA + web) | `docker compose up -d --build` → http://localhost:8080 (`demo@psoas.dev` / `Demo1234!`) |

Antes de dar una tarea por terminada: lint + tests unitarios en verde. Si tocas plantillas o
flujos de usuario, también los E2E de Chromium.

## Convenciones de código (Angular)

- Componentes standalone, app **zoneless**: el estado que pinta la plantilla va en `signal`/`computed`.
  Todos con `OnPush`, dependencias con `inject()`, entradas y salidas con `input()`/`output()`
  (`model()` si el componente también cambia el valor). El lint lo exige.
- Nombres sin sufijo: `patients.ts` exporta `Patients`; `patients.service.ts` exporta `PatientsService`.
- Servicios: solo HTTP, tipados con el modelo (nunca `any`), devuelven `Observable`. La suscripción
  vive en el componente con `takeUntilDestroyed(this.destroyRef)`.
- Errores: siempre con feedback al usuario. **Nunca `alert()`**: usa el servicio de avisos de
  `shared/notifications` o un `role="alert"` en la página. `confirm()` solo para borrados.
- Formularios: `shared/ui/form` con `FormConfig`. Validadores reutilizables en `shared/validators`
  (DNI/NIE con letra de control, teléfono español).
- Fechas y nombres: nunca a mano en el componente. En plantillas, los pipes `displayDate` y
  `fullName` (`shared/pipes`); en TypeScript, `shared/utils/dates.ts` (`localIsoDate` para la API,
  nunca `toISOString()`) y `shared/utils/text.ts`. Las etiquetas de estado viven junto a su modelo.
- Lógica de negocio (agrupar, ordenar, calcular) en funciones puras con su test, fuera del componente.
- Accesibilidad: cada input con `<label for>`, errores asociados con `aria-describedby`, foco
  visible, nada que solo funcione con ratón. Hay tests con axe y de teclado: no los rompas.
- Estilos: SCSS con los tokens de `src/scss/base/_tokens.scss`, nunca colores sueltos.

## Tests

- Unitarios (Karma + Jasmine, zoneless): dobles de los servicios con `jasmine.createSpyObj` y
  `of()`/`throwError()`; helpers en `src/testing/` (`provideTestDialog`, `provideTestNotifications`,
  fixtures `aPatient()`, `aSession()`…). Prueba también el camino de error.
- Nombres de test en español y en forma de comportamiento: "si la API falla, muestra el error".
- E2E (Playwright): fixtures de `e2e/fixtures.ts` y Page Objects de `e2e/pages/`. Localizadores
  por rol y nombre accesible (`getByRole`), no por clases CSS. La API está simulada
  (`e2e/support/api-mock.ts`): ningún test toca un backend real.

## Git

- Nunca push directo a `main`: rama (`feature/…`, `fix/…`) y Pull Request.
- No crear ramas `test/…` (choca con una rama `test` existente en el remoto).
- Mensajes en español con prefijo: `FEAT:`, `FIX:`, `TEST:`, `DOCS:`, `CI:`, `CHORE:`.

## Datos y seguridad

- Son datos de salud (categoría especial del RGPD). No pegues datos reales en prompts, tests ni
  fixtures: usa los ficticios de `src/testing/fixtures.ts` y `ai/data/clinica.json`.
- Nunca subas claves: van en `ai/.env` (ignorado por git). **Nunca en `ai/.env.example`**: es la
  plantilla y sí se sube. Antes de un commit, comprueba que no entra ninguna clave.
- Lo que se envía a un LLM va anonimizado (`ai/src/psoas_ai/privacidad.py`); no añadas llamadas
  al modelo que se salten ese paso.
- Toda llamada al backend fuera de `/auth` necesita el JWT (guard global en `psoas-backend`, PR #9);
  el interceptor de `features/auth/interceptors/` lo añade. El asistente lo verifica también por
  su cuenta (defensa en profundidad).
