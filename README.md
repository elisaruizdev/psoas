# Psoas

Psoas is a web app for running a physiotherapy clinic. Physiotherapists use it to keep patient records, follow each patient's clinical history and treatments, log therapy sessions and schedule appointments, all from one private area.

This repository holds the frontend, built with Angular 20. It talks to a separate REST API ([psoas-backend](https://psoas-backend.onrender.com) in production). The interface is in Spanish.

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
- Karma + Jasmine for unit tests, Playwright for end-to-end tests
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
    └── ui/                # button, card, form, icon, modal, table, delete card
```

Each feature keeps its own `models/` and `services/` folders. Services wrap the API calls and return typed `Observable`s.

## How authentication works

1. `POST /auth/login` returns an access token. `SessionService` stores the token, the physiotherapist's id and their name in `sessionStorage`.
2. `authInterceptor` adds `Authorization: Bearer <token>` to every request except the `/auth/` ones. On a `401` it clears the session and sends the user back to `/login`.
3. `authGuard` protects the private area. `publicGuard` sends users who are already logged in from the access screens to `/dashboard`.

## Run the whole app with Docker

The quickest way to try Psoas. `docker-compose.yml` starts the full stack: PostgreSQL, the [backend API](https://github.com/elisaruizdev/psoas-backend) (pulled straight from GitHub) and this frontend served by nginx. The only requirement is [Docker](https://www.docker.com/products/docker-desktop/).

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
| `db`    | PostgreSQL 16, data kept in a Docker volume  | —      |

If those ports are taken, pick others: `WEB_PORT=8081 API_PORT=3001 docker compose up -d --build`.

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
| `environment.production.ts` | `https://psoas-backend.onrender.com` |

## Scripts

| Command                   | What it does                                          |
| ------------------------- | ----------------------------------------------------- |
| `npm start`               | Starts the dev server on port 4200                    |
| `npm run build`           | Builds for production into `dist/psoas/`              |
| `npm run watch`           | Rebuilds in development mode on every change          |
| `npm test`                | Runs the unit tests with Karma                        |
| `npm run e2e`             | Runs the Playwright tests in `e2e/` (starts the dev server if it isn't running) |
| `npm run lint`            | Runs ESLint                                           |
| `npm run serve:ssr:psoas` | Serves the SSR build with Node                        |

Before the first end-to-end run, install the Playwright browser with `npx playwright install chromium`.

## Deployment

The frontend is set up for Vercel. `vercel.json` sends every route to `index.html`, so deep links such as `/patients` work when the page is reloaded.

It can also run on any server as a Docker image. The `Dockerfile` builds the app with Node and copies only the static files into an nginx image. `nginx.conf` does the same SPA fallback as `vercel.json` and caches the hashed JS and CSS files. The API URL is baked in at build time:

```bash
docker build --build-arg API_URL=https://my-api.example.com -t psoas-front .
docker run -p 8080:80 psoas-front
```
