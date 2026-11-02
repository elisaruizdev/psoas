# Psoas AI · asistente clínico

Servicio en **Python** que añade IA a Psoas: los fisioterapeutas preguntan en lenguaje natural
por la historia de sus pacientes y por la agenda, y reciben respuestas **con citas a las notas**,
sin que ningún dato identificativo salga hacia el proveedor del modelo.

| Requisito típico de un puesto de IA | Dónde está |
|---|---|
| Integración de LLMs por API (OpenAI, Azure OpenAI, Gemini) | `llm/`: un contrato común y tres adaptadores intercambiables por variable de entorno |
| Embeddings, base de datos vectorial y búsqueda semántica | `rag/indice.py`: embeddings + **Qdrant** con filtro por paciente |
| RAG con respuestas verificables | `rag/respuesta.py`: contexto numerado, citas `[n]` y comprobación de citas inventadas |
| Agentes LLM (*tool calling*) | `agents/bucle.py` + `agents/herramientas.py`: el bucle escrito a mano |
| Flujos multiagente | `agents/orquestador.py`: enrutador → especialistas → revisor con reintento |
| Calidad medible | `evals/`: hit@k y MRR de recuperación, fugas de privacidad y comprobaciones de respuestas |
| Producción | Reintentos con *backoff*, límites de pasos, trazas, tokens, validación de entrada y RGPD |

## Arquitectura

```
                 ┌────────────── API (FastAPI) · CLI ──────────────┐
                 │  /buscar      /preguntar         /asistente     │
                 └──────┬────────────┬─────────────────┬───────────┘
                        │            │                 │
                        │            │        ┌── ORQUESTADOR ───────────────────────┐
                        │            │        │ enrutador → clínico (RAG)            │
                        │            │        │          → agenda (agente + tools)   │
                        │            │        │          → revisor ↺ (1 reintento)   │
                        │            │        └──────────────────────────────────────┘
                        ▼            ▼
            ┌── privacidad: anonimizar ⇄ restaurar (el LLM solo ve marcadores) ──┐
            │                                                                    │
            │  RAG: trocear → embeddings → Qdrant (coseno + filtro paciente_id)  │
            └──────────────────────────────┬─────────────────────────────────────┘
                                           ▼
                     LLMProvider ── Gemini │ OpenAI │ Azure OpenAI │ Fake (tests)
```

## Probarlo

Requisitos: Python 3.12 y [uv](https://docs.astral.sh/uv/).

```bash
cd ai
uv sync

# Sin clave ni red (proveedor falso, determinista):
uv run psoas-ai buscar "dolor al saltar"
uv run psoas-ai asistente "¿Qué le pasa en la rodilla a Mario Sanz Gil?"
uv run psoas-ai evals

# Con Gemini (gratis: clave en https://aistudio.google.com/apikey)
export LLM_PROVIDER=gemini GEMINI_API_KEY=...        # PowerShell: $env:LLM_PROVIDER="gemini"
uv run psoas-ai preguntar "¿Cómo ha evolucionado la lumbalgia de Lucía García López?"
uv run psoas-ai asistente "¿Cuándo es la próxima cita de Carmen?"
uv run psoas-ai evals

# API con documentación interactiva en http://localhost:8000/docs
uv run uvicorn psoas_ai.api:app --reload --port 8000

# Calidad
uv run pytest        # 51 tests, sin red
uv run ruff check . && uv run ruff format --check .
```

Variables: ver [`.env.example`](.env.example). Los modelos son configurables. Por defecto se usa
`gemini-flash-latest`, un alias que apunta siempre al Flash vigente y evita que el código caduque.

## Decisiones (y cómo defenderlas)

**¿Por qué una capa propia sobre los SDK y no LangChain?** Para la demo, escribir el bucle del
agente y el RAG a mano enseña qué hacen los frameworks por dentro, y el adaptador ocupa unas
50 líneas por proveedor. En un equipo valoraría LangGraph o el Agents SDK del proveedor si hay
flujos largos con estado, *human-in-the-loop* o persistencia. Cambiar de opinión es barato porque
el resto del código depende del contrato `LLMProvider`, no del SDK.

**¿Por qué un *workflow* y no un agente que lo decide todo?** Es más predecible, más barato y se
puede probar. El enrutador es una sola llamada con salida JSON validada. La autonomía (encadenar
herramientas) solo está donde hace falta: en la agenda. Si la salida del enrutador es inválida,
se va a la ruta segura («fuera de ámbito»).

**¿Por qué Qdrant?** Es una base de datos vectorial de verdad, con filtros por metadatos dentro de
la búsqueda (no se mezclan pacientes) y modo en memoria sin servidor. En producción iría en
Docker o en la nube con la misma API. Alternativas: **pgvector** si ya hay PostgreSQL (Psoas lo
tiene en el backend; sería mi opción para producción), Azure AI Search si el cliente vive en
Azure, o Chroma y LanceDB para prototipos.

**Trocear (*chunking*).** Por frases, con un máximo de 400 caracteres y una frase de solape. Las
notas clínicas son cortas, así que casi siempre queda un trozo por nota. Con documentos largos
(informes en PDF) probaría tamaños distintos y mediría con las evals.

**Alucinaciones.** Cuatro defensas: (1) si no hay contexto por encima de un umbral, no se llama
al LLM («No consta en las notas»); (2) el prompt exige citar; (3) se comprueba en código que cada
`[n]` existe; (4) el revisor contrasta la respuesta con las fuentes y, si falla, hay un reintento
con su crítica. Si tampoco aprueba, la respuesta sale con un aviso, no se oculta.

**Privacidad (RGPD, datos de salud).** Antes de indexar y antes de cada llamada se sustituyen
nombres, DNI/NIE, teléfonos y emails por marcadores. El mapa para restaurarlos nunca sale del
servidor. Hay un test y una eval que auditan todos los prompts enviados. En producción: acuerdo
de tratamiento con el proveedor, región UE (Azure OpenAI y Vertex lo permiten) y un detector
NER (Presidio) para lo que no cubren las expresiones regulares.

***Prompt injection*.** Las notas pueden contener texto malicioso («ignora tus instrucciones»).
El prompt las trata como datos, las herramientas son de **solo lectura** y validan sus
argumentos, y el agente tiene un tope de pasos. Una acción con efectos (cancelar una cita)
pediría confirmación humana.

**Coste y fiabilidad.** Temperatura 0, se cuentan los tokens de cada petición y hay reintentos con
*backoff* exponencial y *jitter* para los 429 y 5xx (el plan gratuito de Gemini limita las
peticiones por minuto). Ideas siguientes: caché de embeddings, modelo pequeño para el enrutador y
el revisor y modelo grande solo para redactar, y *streaming* de la respuesta.

**Evals.** Tres niveles: recuperación (hit@k, MRR; deterministas, en CI), privacidad (fugas = 0;
en CI) y respuestas (con LLM real, bajo demanda). El siguiente paso sería un *LLM-as-judge* con
rúbrica, calibrado con valoraciones de fisioterapeutas, y comparar versiones del prompt antes de
desplegar.

## Estructura

```
ai/
├── data/clinica.json          datos ficticios (3 pacientes, 9 notas, 4 citas)
├── src/psoas_ai/
│   ├── llm/                   contrato + Gemini, OpenAI/Azure, Fake + reintentos
│   ├── rag/                   troceado, índice vectorial (Qdrant), respuesta con citas
│   ├── agents/                herramientas, bucle del agente, orquestador multiagente
│   ├── evals/                 casos y métricas
│   ├── privacidad.py          seudonimización
│   ├── datos.py · servicio.py · api.py · cli.py · config.py
└── tests/                     51 tests sin red (FakeProvider con guion)
```
