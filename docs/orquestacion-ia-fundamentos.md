# Fundamentos de orquestación de agentes de IA — Bloque 1

> Notas de aprendizaje personal, no relacionadas con el código de Psoas.
> Objetivo: posicionarme en el mercado como AI/Agent Orchestration Engineer en ~2 años.

## Resumen en una historia

Un **LLM** es un predictor de texto sin memoria ni capacidad de actuar por sí solo. Un **agente**
aparece cuando envuelves ese LLM en un bucle de código que le deja usar **herramientas** — el LLM
nunca ejecuta nada, solo "pide" una acción en texto/JSON, y el código de alrededor la ejecuta de
verdad y le devuelve el resultado.

Cada vez que hablas con un modelo, se le manda **todo el historial otra vez** (system prompt +
conversación + resultados de herramientas), troceado en **tokens** (fragmentos de texto, no
palabras). Hay un límite de tokens por llamada (**context window**), y cuanto más largo se pone
eso, peor "presta atención" el modelo a lo que quedó atrás (**lost in the middle**) — incluso
antes de llegar al límite técnico.

Cuando se acerca ese límite, el sistema **compacta**: resume lo antiguo, mantiene lo reciente.
Para no depender de eso, hay dos estrategias que no dependen de "cortar la conversación":
**reglas** (se inyectan frescas siempre, no envejecen con el chat) y **subagentes** (aíslan
trabajo en un contexto separado que no ensucia el principal). Y para que algo sobreviva de verdad
entre sesiones distintas (no solo dentro de una conversación larga), hace falta **memoria
persistente** externa (Engram) — que tampoco es automática: alguien (el agente) tiene que decidir
llamarla.

Todo esto se conecta con el **MCP**: el protocolo estándar que permite que ese "pedir una acción"
del agente hable con herramientas externas cualquiera (Figma, Slack, Engram, un navegador) sin
reinventar la integración cada vez.

## Glosario — término exacto + definición de una línea

| Término | Qué es |
|---|---|
| **LLM** | El motor de predicción de texto (Claude, GPT...); sin memoria, sin ejecución de código propia |
| **Agente** | LLM + bucle de código + herramientas + memoria |
| **Agent loop / bucle del agente** | El ciclo: pedir acción → ejecutar → leer resultado → decidir el siguiente paso |
| **Tool calling / function calling** | El mecanismo por el que el LLM "pide" (en texto/JSON) ejecutar una acción concreta |
| **MCP (Model Context Protocol)** | Estándar abierto (Anthropic, nov. 2024) que define cómo un agente descubre y llama herramientas externas de cualquier proveedor |
| **Servidor MCP** | El programa que expone esas herramientas siguiendo el estándar (Engram, Figma, el navegador de Cursor...) |
| **Token** | La unidad mínima de texto que procesa el modelo (no es palabra ni letra) |
| **Context window** | El máximo de tokens que el modelo puede "ver" en una sola llamada |
| **Lost in the middle** | La atención del modelo se degrada con contextos largos, antes incluso de llegar al límite técnico |
| **Compactación (compaction)** | Resumir/descartar contexto antiguo cuando se acerca el límite |
| **Memoria corta (short-term memory)** | Lo que cabe dentro del context window actual, de la conversación viva |
| **Memoria larga / persistente** | Información que sobrevive fuera del context window, recuperada e inyectada cuando hace falta (Engram) |
| **Reglas (rules)** | Contexto persistente que se inyecta fresco cada vez, inmune al "lost in the middle" |
| **Subagente** | Un agente delegado con su propio contexto aislado, que no contamina el del agente principal |

## Visión global — cómo se conecta todo

```
LLM (motor de texto puro)
  + bucle de código + herramientas + memoria
  = AGENTE
      │
      ├─ el bucle usa → TOOL CALLING
      │                    └─ hacia → SERVIDORES MCP (hablando el protocolo MCP)
      │
      ├─ cada vuelta consume → TOKENS dentro del CONTEXT WINDOW
      │                            └─ si se acerca el límite (o degrada antes: LOST IN THE MIDDLE)
      │                                 └─ → COMPACTACIÓN (resume lo antiguo)
      │
      ├─ para sobrevivir más allá del chat → MEMORIA LARGA (Engram)
      │
      └─ para NO depender de memoria/compactación → REGLAS + SUBAGENTES
           (contexto estructurado de forma que no se degrada con el tiempo)
```

## Ejemplos reales vividos (para citar en entrevista)

- **MCP con capacidad nativa vs. wrapper simple**: Figma construyó herramientas (`get_design_context`,
  `get_motion_context`) que no son un simple wrapper de su API — son lógica nueva diseñada para que
  un LLM la entienda. Velneo (ERP) hizo lo mismo: añadió un servidor MCP nativo en la versión 37 de
  vERP, exponiendo procesos/búsquedas/tablas con autenticación Bearer y lista blanca de permisos.
- **Memoria persistente real**: Engram guarda en SQLite local (`~/.engram/engram.db`, modo WAL),
  con sincronización opcional a la nube (`engram sync --cloud`) y exportación a JSON portable
  (`engram export`).
- **Subagentes con contexto aislado**: al investigar la integración de Velneo, delegué varias
  búsquedas y lecturas a un proceso separado — el resultado final volvió resumido, sin ensuciar la
  conversación principal.

## Estado del bloque

**Bloque 1 (fundamentos): ~90% cerrado.** Pendiente solo detalle muy técnico de tokenización y
algoritmos concretos de compactación (no crítico para el objetivo de posicionamiento).

**Siguiente bloque sugerido:** Bloque 2 — Frameworks de orquestación (LangGraph, patrones
supervisor/worker, cuándo NO usar un framework).
