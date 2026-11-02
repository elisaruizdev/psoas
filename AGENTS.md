# AGENTS.md · Psoas

Instrucciones para agentes de IA que trabajan en este repo (Claude Code, Cursor, Codex,
Antigravity…). Es la **fuente única** de convenciones: `CLAUDE.md` la importa y las reglas
de `.cursor/rules/` la complementan. Si cambia una convención, se cambia aquí.

## Qué es

Frontend Angular 20 de una clínica de fisioterapia (pacientes, fisios, citas, dashboard). El
backend (NestJS) es otro repo. Además, en este repo:
- `ai/`: asistente clínico en Python (RAG, agentes). Ver `ai/README.md`.
- `microfrontends/`: Web Components con Lit, si están (ver su README).

## Comandos

| Para | Comando |
|---|---|
| Arrancar | `npm start` (http://localhost:4200) |
| Lint | `npm run lint` |
| Tests unitarios + cobertura | `npm run test:ci` (falla si la cobertura baja del umbral de `karma.conf.js`) |
| E2E | `npx playwright test --project=chromium` (`--grep @smoke` para los rápidos) |
| Build | `npm run build` |
| IA (Python) | `cd ai && uv run pytest && uv run ruff check .` |

Antes de dar una tarea por terminada: lint + tests unitarios en verde. Si tocas plantillas o
flujos de usuario, también los E2E de Chromium.

## Convenciones de código (Angular)

- Componentes standalone, app **zoneless**: el estado que pinta la plantilla va en `signal`/`computed`.
- Nombres sin sufijo: `patients.ts` exporta `Patients`; `patients.service.ts` exporta `PatientsService`.
- Servicios: solo HTTP, tipados con el modelo (nunca `any`), devuelven `Observable`. La suscripción
  vive en el componente con `takeUntilDestroyed(this.destroyRef)`.
- Errores: siempre con feedback al usuario. **Nunca `alert()`**: usa el servicio de avisos de
  `shared/notifications` o un `role="alert"` en la página. `confirm()` solo para borrados.
- Formularios: `shared/ui/form` con `FormConfig`. Validadores reutilizables en `shared/validators`
  (DNI/NIE con letra de control, teléfono español).
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
- Nunca subas claves: van en variables de entorno (`ai/.env`, ignorado por git).
