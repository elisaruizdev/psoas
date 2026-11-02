# Guía de IA de Psoas

Todo lo que hay de IA en el repo, explicado para estudiarlo sobre código real. Cada apartado dice
**qué es**, **dónde está en Psoas** y **por qué se hizo así**. Al final hay ejercicios para
practicar sobre el propio proyecto y preguntas para repasar.

Estado a 2 de noviembre de 2026: servicio en Python (`ai/`) con 77 tests sin red, pestaña
**Asistente** en la app y servicio `ai` en `docker-compose.yml`, probado con Gemini y con los
datos reales del backend.

---

## 0. El mapa: concepto → archivo

| Concepto | Dónde | Apartado |
| --- | --- | --- |
| Python moderno (uv, tipado, dataclasses, pydantic) | `ai/pyproject.toml`, `ai/src/psoas_ai/datos.py` | 1 |
| LLM por API con proveedores intercambiables | `ai/src/psoas_ai/llm/` | 2 |
| Reintentos, tiempo máximo y modelo de respaldo | `llm/reintentos.py`, `llm/gemini.py` | 2.5 |
| Embeddings y base de datos vectorial (Qdrant) | `rag/indice.py`, `llm/cache.py` | 3 |
| RAG con citas verificadas | `rag/respuesta.py` | 4 |
| Agente con *tool calling* | `agents/bucle.py`, `agents/herramientas.py` | 5 |
| Flujo multiagente | `agents/orquestador.py` | 6 |
| Privacidad y seguridad | `privacidad.py`, `servicio.py`, `fuente_api.py` | 7 |
| Evals | `evals/` | 8 |
| Integración con la app (Angular, Docker, CSP) | `src/app/features/private-area/assistant/`, `docker-compose.yml` | 9 |
| Assets para agentes de IA (Claude Code, Cursor…) | `AGENTS.md`, `CLAUDE.md`, `.claude/`, `.cursor/rules/` | 10 |

Cómo probarlo todo: [`ai/README.md`](../ai/README.md) (terminal) y `docker compose up -d --build`
(app completa, pestaña **Asistente**).

---

## 1. Python para aplicaciones de IA

- **uv** (`ai/pyproject.toml`, `ai/uv.lock`): gestor de paquetes y entornos que sustituye a
  pip + venv + pip-tools. `uv sync` instala exactamente lo del `uv.lock`, así que el portátil, el
  CI (`.github/workflows/ai.yml`) y la imagen Docker (`ai/Dockerfile`) usan las mismas versiones.
- **Tipado** (`str | None`, `list[Paciente]`): no se comprueba al ejecutar; documenta y lo
  revisan herramientas como mypy o pyright. `Protocol` (`llm/base.py`) es una interfaz por forma,
  como una `interface` de TypeScript: cualquier clase con `chat` y `embed` vale.
- **dataclass** para datos internos (`datos.py`: `Paciente`, `Nota`, `Cita`); **pydantic** para lo
  que entra desde fuera (`api.py`: `Peticion` valida longitud y devuelve 422 si no cuadra).
- **Genéricos modernos**: `def con_reintentos[T](funcion: Callable[[], T]) -> T` (Python 3.12).
- **pytest**: fixtures inyectadas por nombre (`tests/conftest.py`: `clinica`, `indice`),
  `parametrize` para tests por tablas, `monkeypatch` para variables de entorno y `TestClient` para
  la API. Ningún test llama a un LLM real: usan `FakeProvider` (apartado 2.4).
- **ruff**: lint y formato en una sola herramienta (`uv run ruff check . && uv run ruff format .`).

## 2. LLMs por API

### 2.1 Lo básico

- **Token**: trozo de texto (en español, algo menos que una palabra). Se paga por tokens de
  entrada y de salida. El asistente los cuenta en cada respuesta (`Usage` en `llm/base.py`) y la
  app los enseña en «Cómo se ha respondido».
- **Sin memoria**: cada llamada reenvía todo el historial (*system prompt* + mensajes + resultados
  de herramientas). Lo ves en `agents/bucle.py`: el `historial` crece en cada paso.
- **Temperatura 0** en todo el proyecto: clasificar, extraer y resumir notas son tareas que deben
  dar siempre lo mismo.
- **Salida estructurada**: el enrutador y el revisor piden JSON (`json_output=True`) y el código
  **lo valida siempre**; si llega algo raro, se toma un valor seguro (`orquestador.py`, `_json`).

### 2.2 El contrato común (patrón *adapter*)

`llm/base.py` define `LLMProvider` con dos métodos, `chat` y `embed`, y tipos propios (`Message`,
`ToolCall`, `ToolSpec`, `LLMResponse`). Cada proveedor traduce su formato a ese contrato:

| Adaptador | Archivo | Lo particular |
| --- | --- | --- |
| Gemini | `llm/gemini.py` | Roles `user`/`model`; hay que reenviar el turno del modelo tal cual (*thought signature*); `task_type` distinto para documento y pregunta en los embeddings |
| OpenAI | `llm/openai_provider.py` | `tool_calls` con argumentos en texto JSON; mensajes `role: "tool"` con `tool_call_id` |
| Azure OpenAI | `llm/openai_provider.py` (`OpenAIProvider.azure`) | La misma API con otra URL base; `model` es el nombre de **tu deployment** |
| Falso | `llm/fake.py` | Sin red ni clave: respuestas con guion y embeddings por *hashing* |

El resto del código solo conoce el contrato. Cambiar de proveedor es cambiar `LLM_PROVIDER` en
`ai/.env` (`llm/__init__.py`, `crear_proveedor`).

### 2.3 OpenAI vs Azure OpenAI vs Gemini

- **Azure OpenAI**: los mismos modelos que OpenAI, pero en tu suscripción de Azure. Aporta región
  (datos en la UE), autenticación con Entra ID, red privada, filtros de contenido y facturación
  de Azure. Por eso lo eligen las empresas que ya viven en Azure.
- **Gemini** (Google AI Studio): tiene plan gratuito con límites por minuto y por día; es el que
  usa el proyecto. Para empresas, Vertex AI (Google Cloud) da lo equivalente a Azure.

### 2.4 Por qué un proveedor falso

Un test que llama a un LLM real es lento, cuesta dinero, necesita secretos en el CI y no da
siempre lo mismo. `FakeProvider` acepta un **guion** (lista de respuestas o función) y guarda lo
que se le envió (`llamadas`), así los tests comprueban qué prompt salió, por ejemplo que no
lleve datos personales (`tests/test_rag.py`).

### 2.5 Fiabilidad: reintentos, tiempo máximo y respaldo

- **Reintentos con backoff exponencial y jitter** (`llm/reintentos.py`): 408, 429 y 5xx son
  transitorios; se espera 1 s, 2 s, 4 s… más un poco de azar para que no reintenten todos a la vez.
  Un 400 o un 401 es un error nuestro: no se reintenta.
- **Tiempo máximo** (`llm/gemini.py`, `TIMEOUT_MS`): el SDK de Google no trae ninguno. Un modelo
  saturado dejaba la conexión abierta y la petición del usuario se colgaba más de 5 minutos. Un
  tiempo agotado cuenta como 408 (transitorio).
- **Modelo de respaldo**: `GEMINI_MODEL=gemini-flash-latest,gemini-flash-lite-latest`. Si el
  primero sigue fallando tras 2 intentos, se pasa al siguiente y se queda en él.
- **Alias de modelo** (`gemini-flash-latest`): apunta siempre al Flash vigente; los nombres con
  versión caducan (con la clave del proyecto, `gemini-2.5-flash` ya da 404).

## 3. Embeddings y base de datos vectorial

- **Embedding**: un vector de números que representa el significado de un texto. Textos
  parecidos quedan cerca aunque no compartan palabras («dolores de cabeza por el ordenador»
  encuentra «cefalea tensional»). Se comparan con **similitud coseno** (1 = igual, 0 = nada que ver).
- **Qdrant** (`rag/indice.py`): base de datos vectorial. Aquí corre en memoria
  (`QdrantClient(":memory:")`), sin servidor; el mismo código funciona contra un Qdrant en Docker
  o en la nube. Para no comparar con todos los vectores usa un índice aproximado (**HNSW**).
- **Filtro por metadatos dentro de la búsqueda** (`paciente_id`): nunca se mezclan historias de
  pacientes. Filtrar después de buscar puede dejarte sin resultados o colar datos que no tocan.
- **Troceado (*chunking*)** (`trocear`): por frases, máximo 400 caracteres y una frase de solape.
  Trozos grandes diluyen el significado; pequeños pierden contexto. Se decide midiendo (apartado 8).
- **Caché de embeddings** (`llm/cache.py`): al refrescar los datos, casi todas las notas son las
  mismas; solo se pide el embedding de los textos nuevos.
- **Alternativas**: pgvector (si ya hay PostgreSQL, como en el backend de Psoas: sería la opción
  para producción), Azure AI Search, Pinecone, Chroma. **Búsqueda híbrida** (vectores + palabras
  clave, BM25) para nombres propios y códigos; **reranking** para reordenar los primeros resultados.

## 4. RAG (Retrieval-Augmented Generation)

```
INDEXAR:   notas → anonimizar → trocear → embeddings → Qdrant (con paciente, tipo y fecha)
CONSULTAR: pregunta → anonimizar → embedding → top-k filtrado → prompt con contexto numerado
           → respuesta con citas [n] → comprobar citas → restaurar nombres
```

Cuatro defensas contra las alucinaciones (`rag/respuesta.py` y `agents/orquestador.py`):

1. **Umbral de relevancia**: si ningún fragmento supera `score_minimo`, no se llama al LLM y se
   responde «No consta en las notas clínicas». Ahorra coste y evita inventar.
2. **Prompt estricto**: solo el contexto, citar cada afirmación y tratar el contexto como datos.
3. **Comprobación de citas en código**: una cita `[7]` cuando solo hay 4 fragmentos es una
   alucinación (`citas_invalidas`). Acepta también el formato agrupado `[1, 3]`.
4. **Revisor**: otro paso del flujo contrasta la respuesta con las fuentes (apartado 6).

## 5. Agentes y *tool calling*

- **Agente** = LLM + bucle + herramientas + límites. El modelo **no ejecuta nada**: devuelve
  «quiero llamar a `citas_de_paciente` con estos argumentos» y el código lo hace.
- **El bucle** (`agents/bucle.py`), escrito a mano para ver lo que hace un framework por dentro:
  mandar historial y herramientas → si responde texto, fin → si pide herramientas, ejecutarlas,
  añadir los resultados al historial y repetir. Con **límite de pasos** (un agente puede
  entrar en bucle), **traza** de cada paso y **suma de tokens**.
- **Herramientas** (`agents/herramientas.py`): cada una con descripción clara (el modelo elige por
  ella) y JSON Schema. El código **valida** los argumentos (el modelo puede inventarse campos o
  tipos) y devuelve los errores como resultado, para que el modelo pueda corregirse. Todas son de
  **solo lectura** (mínimo privilegio).
- Las herramientas trabajan con ids y marcadores (`[PACIENTE_x]`), nunca con datos personales.

## 6. Flujo multiagente

```
petición (ya anonimizada)
   │
   ▼
ENRUTADOR ─┬─► CLÍNICO (RAG + Qdrant) ──┐
           ├─► AGENDA (agente + tools) ─┴─► REVISOR ── aprueba ──► respuesta
           │                                  │
           │                                  └─ rechaza ─► el especialista reintenta 1 vez con su crítica
           └─► fuera de ámbito ─────────────────────────────────► respuesta fija (sin LLM)
```

- **Routing**: una llamada barata con JSON clasifica la petición y la manda a un especialista con
  sus propias instrucciones y herramientas. Cada especialista es más fiable que un único agente
  que lo haga todo. Si el JSON es inválido, ruta segura: «fuera de ámbito».
- **Evaluator-optimizer**: el revisor comprueba la respuesta contra las fuentes; si la rechaza, el
  especialista lo intenta otra vez con la crítica. La crítica va al **prompt**, no a la búsqueda:
  mezclarla con la pregunta cambiaba el embedding y empeoraba la recuperación (fallo real, cazado
  por un test). Si tampoco aprueba, la respuesta sale con un aviso; no se oculta.
- **Workflow frente a agente autónomo**: el código decide el orden y la autonomía solo está donde
  hace falta (la agenda encadena herramientas). Es más predecible, más barato y se puede probar.
  Son los patrones de [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents).

## 7. Privacidad y seguridad

- **Seudonimización** (`privacidad.py`): son datos de salud (categoría especial del RGPD). Antes de
  indexar y de cada llamada se sustituyen nombres (completo y «nombre + primer apellido»), DNI/NIE,
  teléfonos y emails por marcadores (`[PACIENTE_x]`, `[DNI_1]`…). El mapa para restaurarlos no
  sale del servidor. Un test y una eval auditan todos los prompts enviados.
- **Datos con el token del usuario** (`fuente_api.py`): el asistente no tiene acceso propio a la
  base de datos; pide los datos a la API de Psoas con el JWT de quien pregunta.
- **Defensa en profundidad** (`servicio.py`, `_verificar`): el asistente comprueba él mismo la
  firma del JWT (HS256 fijo, nunca el algoritmo que diga el token) y la caducidad, y solo guarda el
  hash del token en su caché. Así no depende de que otra pieza haga bien su parte: el backend
  pasó un tiempo sin exigir token (corregido en `psoas-backend`, PR #9, con un guard global que
  además rechaza cuentas que ya no están activas).
- ***Prompt injection***: una nota puede contener «ignora tus instrucciones». Se mitiga tratando
  el contenido como datos en el prompt, con herramientas de solo lectura, validación y límite de
  pasos. Una acción con efectos (cancelar una cita) pediría confirmación humana.
- **Claves**: en `ai/.env`, ignorado por git. **Nunca** en `ai/.env.example`, que es la plantilla
  y sí se sube. En Docker llegan por `env_file` al arrancar; no se copian en la imagen.

## 8. Evals

Un LLM no se prueba con un único `assertEqual`: se fija un conjunto de casos
(`evals/casos.json`) y se mide cada versión (otro prompt, otro modelo, otro troceado).

| Nivel | Métrica | Coste | Cuándo |
| --- | --- | --- | --- |
| Recuperación | **hit@k** (¿sale el fragmento correcto entre los k primeros?) y **MRR** (posición media del primer acierto) | Gratis, determinista | En cada CI |
| Privacidad | Fugas de datos personales en los prompts | Gratis, determinista | En cada CI |
| Respuestas | Debe contener, no debe contener, citas válidas | Llamadas al LLM | Bajo demanda |
| Siguiente paso | *LLM-as-judge* con rúbrica, calibrado con valoraciones humanas | Más llamadas | Antes de cambiar prompt o modelo |

`uv run psoas-ai evals` las ejecuta con el proveedor de `ai/.env`.

## 9. Integración con la app

```
Navegador (Angular, /assistant) ──JWT──► ai (FastAPI :8000) ──JWT──► api (NestJS :3000) ──► PostgreSQL
                                              └──► Gemini (solo marcadores, nunca datos personales)
```

- **Pantalla** (`src/app/features/private-area/assistant/`): chat con la ruta elegida, si está
  revisada y la traza de los agentes. `role="log"` con `aria-live` para lectores de pantalla y foco
  de vuelta al campo al responder. axe encontró 4 textos con poco contraste, ya corregidos.
- **Tras el primer pintado**: la salud del asistente se pide con `afterNextRender`, así la
  comprobación no retrasa que se vea la pantalla.
- **La pestaña es opcional**: aparece solo si el entorno tiene `aiUrl` (en Docker sí; en Vercel no).
- **CORS** (`ai/src/psoas_ai/api.py`) y **CSP** (`docker/nginx/security-headers.inc.template`,
  `connect-src` con `AI_ORIGIN`): el navegador solo puede llamar a los orígenes permitidos.
- **Errores legibles**: 401 (sesión no válida), 502 (no se pudo leer el backend), 503 (el modelo
  no está disponible). La app explica cada uno y conserva la pregunta.

## 10. Assets para agentes de IA en el repo

El valor para un equipo no está en que cada persona use bien su asistente, sino en que el
conocimiento viva **en el repositorio** y lo use cualquier agente.

| Asset | Para qué | En Psoas |
| --- | --- | --- |
| `AGENTS.md` | Convenciones, comandos y prohibiciones; lo leen Codex, Cursor, Antigravity… | Fuente única del proyecto |
| `CLAUDE.md` | Lo específico de Claude Code; importa `@AGENTS.md` | Skills, subagente y hook |
| Skill | Procedimiento que se carga solo cuando hace falta | `.claude/skills/componente-angular`, `tests-componente` |
| Subagente | Tarea con contexto propio y herramientas limitadas | `.claude/agents/revisor-accesibilidad.md` (solo lectura) |
| Hook | Algo que se ejecuta **siempre**, sin depender del modelo | `.claude/hooks/lint-al-editar.mjs` (se activa en `.claude/settings.json`, ver `CLAUDE.md`) |
| MCP | Conectar herramientas externas (Figma, Jira, BD) | `.mcp.json` (Figma) |
| Reglas de Cursor | Lo mismo para Cursor, por tipo de archivo | `.cursor/rules/` |

**Cómo elegir:** si debe pasar siempre, hook o CI; si es una convención, `AGENTS.md`; si es un
procedimiento que se usa a veces, skill; si ensucia el contexto o necesita otro rol, subagente.

**Implantarlo en un equipo:** medir antes (tiempo de PR a producción, bugs, cobertura), empezar
con un equipo piloto, un estándar mínimo (`AGENTS.md` + 3 skills de lo que más se repite + un
hook), formación práctica sobre su propio código, medir otra vez y compartir los assets en un
repo versionado con PR y revisión, como cualquier código.

---

## 11. Fallos reales encontrados por el camino

| Fallo | Cómo se detectó | Arreglo |
| --- | --- | --- |
| Las peticiones al asistente se colgaban más de 5 minutos | Prueba con Docker; volcado de pila con `faulthandler` dentro del contenedor | Tiempo máximo de 20 s, tiempo agotado = transitorio, modelo de respaldo |
| `gemini-flash-latest` devolvía 503 («alta demanda») | Primera prueba con la clave real | Modelo de respaldo `gemini-flash-lite-latest` |
| Los tokens reales del backend se rechazaban | Test del JWT: el backend pone `"sub": 1` (número) y PyJWT exige texto | `verify_sub=False`; la firma y la caducidad sí se validan |
| El backend daba pacientes sin token | Al probar el asistente con un token inventado | Verificación del JWT en el asistente y guard JWT global en `psoas-backend` (PR #9) |
| «Ana López» llegaba al modelo sin anonimizar | Traza del agente con Gemini real | Anonimizar también «nombre + primer apellido» |
| Las citas `[1, 3]` no se contaban | Respuesta real de Gemini | Expresión regular que admite grupos |
| La crítica del revisor empeoraba la búsqueda | Test del reintento | La crítica va al prompt, no a la consulta |
| El botón «Preguntar» recargaba la página | E2E | `(ngSubmit)` necesita `FormsModule`; ahora `(submit)` con `preventDefault` |
| 4 textos con poco contraste en el asistente | axe en el E2E | Tokens de texto con contraste AA |
| La clave estaba en `ai/.env.example` | Revisión antes del commit | Movida a `ai/.env` (ignorado) |

## 12. Ejercicios sobre el proyecto

Cada uno se comprueba con `uv run pytest` (o `npm run test:ci` en la parte Angular).

1. **Una herramienta nueva**: añade `fisios_de_paciente` en `agents/herramientas.py` que devuelva
   con qué fisioterapeutas tiene citas un paciente. Escribe su test en `tests/test_agentes.py`.
2. **Un caso de eval**: añade dos preguntas a `evals/casos.json` y mira cómo cambian hit@k y MRR
   con el proveedor falso y con Gemini.
3. **Troceado**: cambia `MAX_CARACTERES` a 150 en `rag/indice.py` y compara las evals. ¿Qué pasa?
4. **Otro proveedor**: si consigues una clave de OpenAI o de Azure, pon `LLM_PROVIDER=openai` y
   repite las preguntas de la pestaña Asistente. Compara tokens y respuestas.
5. **Salida estructurada más estricta**: haz que el enrutador valide su JSON con un modelo de
   pydantic en vez de con `dict.get`.
6. **Streaming**: devuelve la respuesta del especialista clínico token a token
   (`StreamingResponse` en FastAPI) y píntala en Angular según llega.
7. **Búsqueda híbrida**: combina el resultado de Qdrant con una búsqueda por palabras clave y
   mide si mejora la recuperación de nombres propios.
8. **Una skill nueva**: crea `.claude/skills/nueva-herramienta-agente/SKILL.md` que explique a
   Claude Code cómo añadir una herramienta al asistente siguiendo las convenciones del repo.

## 13. Preguntas para repasar

1. **¿Qué es RAG y cuándo no lo usarías?** Dar al modelo los fragmentos relevantes de tus datos
   para que responda con ellos y los cite. No hace falta si todo cabe en el contexto o si el
   problema es de formato y no de conocimiento.
2. **¿RAG o *fine-tuning*?** RAG para conocimiento que cambia y debe citarse; *fine-tuning* para
   estilo o formato muy concretos con miles de ejemplos.
3. **¿Cómo reduces las alucinaciones?** Umbral, prompt que exige citar, comprobación de citas en
   código y revisor; y medirlo con evals.
4. **¿Agente o *workflow*?** *Workflow* si los pasos se conocen; agente donde el camino depende de
   lo que se descubre.
5. **¿Por qué el modelo nunca ejecuta las herramientas?** Porque solo genera texto: el código
   valida y ejecuta, y así controla permisos, errores y límites.
6. **¿Cómo integras varios proveedores?** Con un contrato propio y un adaptador por proveedor.
7. **¿Qué es *prompt injection* y cómo se mitiga?** Instrucciones escondidas en los datos. Se
   tratan como datos, se limita lo que el agente puede hacer y las acciones con efectos piden
   confirmación.
8. **¿Qué mides en un RAG?** Recuperación (hit@k, MRR), fidelidad a las fuentes y que diga «no
   consta» cuando no hay respuesta.
9. **¿Cómo controlas el coste?** Contar tokens, no llamar al LLM sin contexto, caché de
   embeddings, modelo pequeño para clasificar y revisar.
10. **¿Qué pondrías en un `AGENTS.md`?** Comandos, convenciones, cómo se prueba, reglas de git y
    de seguridad; lo mínimo para que cualquier agente trabaje como el equipo.
