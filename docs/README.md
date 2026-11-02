# Estudiar Psoas

Psoas es una app real de gestión de una clínica de fisioterapia. Este repo reúne, sobre ese
mismo código, todo lo que se pide hoy a un perfil de front-end senior y de IA aplicada al
desarrollo. Cada guía explica qué es cada cosa, dónde está en el código y por qué se hizo así.

## Orden recomendado

| # | Guía | Qué aprendes | Código principal |
| --- | --- | --- | --- |
| 1 | [Auditoría: registro](auditoria-registro.md) y [estudio](auditoria-estudio.md) | Cómo se revisa y se ordena un front heredado | `src/app/` |
| 2 | [Guía de testing](guia-testing.md) | Karma/Jasmine, Playwright, accesibilidad, tests visuales, Pact, Docker, CI en GitHub Actions y Azure DevOps | `src/**/*.spec.ts`, `e2e/`, `.github/`, `azure-pipelines.yml` |
| 3 | [Microfrontends](../microfrontends/README.md) | Web Components con Lit, carga en tiempo de ejecución, Shadow DOM | `microfrontends/`, `src/app/shared/microfrontends/` |
| 4 | [Fundamentos de orquestación de IA](orquestacion-ia-fundamentos.md) | Qué es un agente, tokens, contexto, MCP (teoría) | — |
| 5 | [Guía de IA](guia-ia.md) | Python, LLMs por API, embeddings y Qdrant, RAG, agentes, multiagente, evals, privacidad, assets para agentes | `ai/`, `src/app/features/private-area/assistant/`, `.claude/` |

## Del requisito al código

| Requisito | Dónde está |
| --- | --- |
| Angular moderno (standalone, signals, zoneless) | `src/app/` |
| Formularios y validación (DNI/NIE con letra de control, teléfono) | `src/app/shared/validators/`, `src/app/shared/ui/form/` |
| Avisos accesibles en lugar de `alert()` | `src/app/shared/notifications/` |
| Tests con cobertura mínima garantizada (>90 %) | `karma.conf.js`, `src/**/*.spec.ts` |
| E2E, accesibilidad y regresión visual | `e2e/` |
| CI/CD en GitHub Actions y Azure DevOps | `.github/workflows/`, `azure-pipelines.yml`, `.azure/` |
| Docker y cabeceras de seguridad | `Dockerfile`, `docker/nginx/`, `docker-compose.yml` |
| Microfrontends con Web Components (Lit) | `microfrontends/` |
| Python para aplicaciones de IA | `ai/` |
| Integración de LLMs por API (Gemini, OpenAI, Azure OpenAI) | `ai/src/psoas_ai/llm/` |
| Embeddings, base de datos vectorial y búsqueda semántica | `ai/src/psoas_ai/rag/` |
| Agentes y flujos multiagente | `ai/src/psoas_ai/agents/` |
| Evals de IA | `ai/src/psoas_ai/evals/` |
| IA dentro del producto | Pestaña **Asistente** (`docker compose up -d --build`) |
| Assets para agentes (Claude Code, Cursor, Antigravity) | `AGENTS.md`, `CLAUDE.md`, `.claude/`, `.cursor/rules/` |

## Cómo practicar

- **Ejecutar**: `docker compose up -d --build` y entra en http://localhost:8080 con
  `demo@psoas.dev` / `Demo1234!`. Todo corre en local y gratis; no hay nada desplegado.
- **Backend local**: clona [psoas-backend](https://github.com/elisaruizdev/psoas-backend) y crea
  un `.env` junto a `docker-compose.yml` con `BACKEND_PATH=<ruta del clon>` (por ejemplo
  `../../back/psoas-backend`). Así Docker usa tu copia y puedes estudiar y cambiar también el backend.
- **Romper y arreglar**: cambia algo, ejecuta los tests y mira qué falla y por qué.
- **Ejercicios**: al final de la [guía de IA](guia-ia.md#12-ejercicios-sobre-el-proyecto) hay
  ejercicios sobre el propio código, y en cada guía, preguntas para repasar.
