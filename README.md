# Psoas

[![CI](https://github.com/elisaruizdev/psoas/actions/workflows/ci.yml/badge.svg)](https://github.com/elisaruizdev/psoas/actions/workflows/ci.yml)

Psoas is a web app for running a physiotherapy clinic. Physiotherapists use it to keep patient records, follow each patient's clinical history and treatments, log therapy sessions and schedule appointments, all from one private area.

This repository holds the frontend, built with Angular 20. It talks to a separate REST API, [psoas-backend](https://github.com/elisaruizdev/psoas-backend). The interface is in Spanish.

There is no hosted backend: the way to run Psoas is locally with Docker (see below), at no cost.

It also works as a study project: [`docs/README.md`](docs/README.md) (in Spanish) maps each topic (testing, CI/CD, microfrontends, Python, LLMs, RAG, agents, AI tooling for teams) to the code that applies it, with guides, exercises and review questions.

## Features

**Access**

- Physiotherapists request an account from the sign-up screen and confirm their email address.
- New accounts stay pending until an existing physiotherapist approves or rejects them.
- Login, password recovery and password reset.

**Dashboard**

- Today's appointments, how many sessions are done, sessions booked for the next week and the number of active patients.

**Patients**

- List, create, edit and delete patients (personal data, contact details, health insurance, emergency contact, reason for consultation).
- A detail view per patient with three tabs:
  - **Clinical history:** diagnoses, marked as active or resolved.
  - **Treatments:** treatment plans with objectives, planned sessions and status (active, paused, completed).
  - **Sessions:** a log of every session, with the techniques applied, the patient's progress and notes, grouped by treatment.

**Appointments**

- A table of appointments between patients and physiotherapists: create, edit, cancel and delete.

**Physiotherapists**

- Team list and profile details.
- Pending sign-up requests show at the top of the page, each with approve and reject buttons.

## Tech stack

- Angular 20 with standalone components, lazy-loaded routes and zoneless change detection
- Signals for screen state
- Angular Material and CDK
- Docker: multi-stage build served by nginx, plus a Compose file for the full stack
- Karma + Jasmine for unit and component tests (HttpTestingController, Angular Material harnesses, coverage threshold)
- Playwright for end-to-end, visual, accessibility (axe-core), mobile and cross-browser tests
- Pact for consumer-driven contract tests against the API
- GitHub Actions CI: lint, unit tests, build, sharded E2E, visual tests in the Playwright image, Docker image checks
- ESLint (`angular-eslint`, `typescript-eslint`) and Prettier

## Project structure

```text
src/app/
├── features/
│   ├── auth/              # login, sign-up, email check, password recovery, guards, interceptor
│   └── private-area/
│       ├── layout/        # header, tab menu, user menu, notifications
│       ├── dashboard/
│       ├── patients/      # list, new patient, detail (clinical history, treatments, sessions)
│       ├── sessions/      # appointments
│       └── physios/
└── shared/
    ├── models/
    ├── microfrontends/    # runtime loader for Web Component microfrontends
    ├── notifications/     # NotificationService (MatSnackBar) instead of alert()
    ├── validators/        # Spanish DNI/NIE (control letter) and phone validators
    └── ui/                # button, card, form, icon, modal, table, delete card

microfrontends/
└── resumen-citas/         # Lit Web Component, its own package, tests and build
```

Each feature keeps its own `models/` and `services/` folders. Services wrap the API calls and return typed `Observable`s.

The dashboard loads the `<psoas-resumen-citas>` microfrontend at runtime from the URL in `environment.microfrontends.resumenCitas`. If it is not available, the dashboard works without it. See [`microfrontends/README.md`](microfrontends/README.md).

## How authentication works

1. `POST /auth/login` returns an access token. `SessionService` stores the token, the physiotherapist's id and their name in `sessionStorage`.
2. `authInterceptor` adds `Authorization: Bearer <token>` to every request except the `/auth/` ones. On a `401` it clears the session and sends the user back to `/login`.
3. `authGuard` protects the private area. `publicGuard` sends users who are already logged in from the access screens to `/dashboard`.

## Run the whole app with Docker

The way to run Psoas. `docker-compose.yml` starts the full stack: PostgreSQL, the [backend API](https://github.com/elisaruizdev/psoas-backend), the AI assistant and this frontend served by nginx. The only requirement is [Docker](https://www.docker.com/products/docker-desktop/).

By default the backend is pulled straight from GitHub (`main`). To use a local clone instead (to change the backend or try a branch), create a `.env` file next to `docker-compose.yml` (ignored by git) with `BACKEND_PATH=../../back/psoas-backend` or wherever your clone is.

```bash
git clone https://github.com/elisaruizdev/psoas.git
cd psoas
docker compose up -d --build
```

Open `http://localhost:8080` and log in with the demo account:

| Email            | Password    |
| ---------------- | ----------- |
| `demo@psoas.dev` | `Demo1234!` |

On first start the API fills the database with sample patients, treatments, sessions and appointments for today and the coming days, so the dashboard has data from the start. There is also a pending sign-up request to approve.

| Service | What it runs                                 | Port   |
| ------- | -------------------------------------------- | ------ |
| `web`   | Angular build served by nginx (multi-stage)  | `8080` |
| `api`   | NestJS API                                   | `3000` |
| `ai`    | AI assistant (Python, FastAPI)               | `8000` |
| `db`    | PostgreSQL 16, data kept in a Docker volume  | —      |

The **Asistente** tab answers questions about patients' clinical history and appointments, reading the real data through the API with the logged-in user's token. Without configuration it runs in demo mode (no LLM). To use Gemini (free tier), create `ai/.env` from `ai/.env.example` with `LLM_PROVIDER=gemini` and your `GEMINI_API_KEY`. See [`ai/README.md`](ai/README.md).

If those ports are taken, pick others: `WEB_PORT=8081 API_PORT=3001 AI_PORT=8001 docker compose up -d --build`.

Stop it with `docker compose down`, or `docker compose down -v` to also wipe the database.

## Getting started

### Requirements

- Node.js 20 or later
- The Psoas backend running locally on `http://localhost:3000`, or a different URL set in the environment files (see below)

### Install and run

```bash
npm install
npm start
```

Then open `http://localhost:4200/`. The app reloads whenever you change a source file.

### Environments

The API URL is set in `src/environments/`:

| File                        | `baseUrl`                           |
| --------------------------- | ----------------------------------- |
| `environment.ts`            | `http://localhost:3000`             |
| `environment.production.ts` | `https://psoas-backend.onrender.com` (no longer running: Docker overrides it with `http://localhost:3000`) |

## Scripts

| Command                   | What it does                                          |
| ------------------------- | ----------------------------------------------------- |
| `npm start`               | Starts the dev server on port 4200                    |
| `npm run build`           | Builds for production into `dist/psoas/`              |
| `npm run watch`           | Rebuilds in development mode on every change          |
| `npm test`                | Runs the unit tests with Karma (watch mode)           |
| `npm run test:ci`         | Unit tests once, headless, with coverage and its minimum threshold |
| `npm run e2e`             | Runs every Playwright project (starts the dev server if it isn't running) |
| `npm run e2e:smoke`       | Only `@smoke` tests                                   |
| `npm run e2e:a11y`        | Accessibility audit with axe-core (WCAG 2.1 AA)       |
| `npm run e2e:visual`      | Visual regression tests (`toHaveScreenshot`)          |
| `npm run e2e:visual:update` | Accepts intended visual changes as the new baseline |
| `npm run e2e:mobile`      | Pixel 7 and iPhone 14 emulation                       |
| `npm run e2e:contrato`    | Pact contract tests; writes `pacts/psoas-web-psoas-api.json` |
| `npm run e2e:docker`      | Tests the Docker image (needs `WEB_URL`, e.g. `http://localhost:8080`) |
| `npm run e2e:ui`          | Playwright UI mode                                    |
| `npm run e2e:debug`       | Runs with the Playwright inspector                    |
| `npm run e2e:report`      | Opens the last HTML report                            |
| `npm run e2e:codegen`     | Records a test by clicking through the app            |
| `npm run lint`            | Runs ESLint                                           |

Before the first end-to-end run, install the Playwright browsers with `npx playwright install`.

## Testing

| Layer | Tool | Where |
| ----- | ---- | ----- |
| Unit and component | Karma + Jasmine, `HttpTestingController`, Material harnesses | `src/**/*.spec.ts`, helpers in `src/testing/` |
| End-to-end | Playwright with fixtures and page objects | `e2e/*.spec.ts`, `e2e/fixtures.ts`, `e2e/pages/` |
| Accessibility | `@axe-core/playwright`, keyboard-only flows, ARIA snapshots | `e2e/accesibilidad.spec.ts` |
| Visual | `toHaveScreenshot`, baselines per OS in `e2e/__screenshots__/` | `e2e/visual.spec.ts` |
| Cross-browser and mobile | Chromium, Firefox, WebKit, Pixel 7, iPhone 14 | projects in `playwright.config.ts` |
| Contract | Pact (consumer side) | `e2e/contrato/` |
| Container | Playwright `request` + browser against nginx | `e2e/docker/` |
| Microfrontend | Vitest + happy-dom (component), Playwright (integration with Angular) | `microfrontends/resumen-citas/src/*.test.ts`, `e2e/microfrontend.spec.ts` |

Unit test coverage is above 90 % of lines and the build fails if it drops (thresholds in `karma.conf.js`). CI runs on GitHub Actions (`.github/workflows/ci.yml`) and the same pipeline is available for Azure DevOps (`azure-pipelines.yml`), which publishes JUnit results and Cobertura coverage.

The E2E tests never hit a real backend: `e2e/support/api-mock.ts` intercepts every call to `localhost:3000` and freezes the browser clock, so results and screenshots are the same on every run. A study guide with every concept, in Spanish, is in `docs/guia-testing.md`.

## Deployment

There is no hosted deployment of the full app: the backend is not deployed anywhere, so use Docker locally.

The frontend is still set up for Vercel (`vercel.json` sends every route to `index.html`, so deep links such as `/patients` work when the page is reloaded), but without a backend the hosted version can show the screens and cannot log in.

It can also run on any server as a Docker image. The `Dockerfile` builds the app with Node and copies only the static files into an nginx image. `docker/nginx/` does the same SPA fallback as `vercel.json`, caches the hashed JS and CSS files and sends security headers (Content-Security-Policy, `nosniff`, `X-Frame-Options`, Referrer-Policy, Permissions-Policy, HSTS) with `server_tokens off`. The API URL is baked into the bundle at build time; the CSP `connect-src` reads it from `API_ORIGIN` when the container starts:

```bash
docker build --build-arg API_URL=https://my-api.example.com -t psoas-front .
docker run -p 8080:80 psoas-front
```
