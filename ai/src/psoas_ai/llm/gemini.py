"""Adaptador para la API de Gemini (SDK oficial `google-genai`).

Plan gratuito: basta una clave de Google AI Studio (https://aistudio.google.com/apikey).
"""

from __future__ import annotations

import json
from typing import Any

from google import genai
from google.genai import types

from .base import LLMResponse, Message, ToolCall, ToolSpec, Usage
from .reintentos import con_reintentos

LOTE_EMBEDDINGS = 100  # máximo de textos por petición de embeddings


class GeminiProvider:
    nombre = "gemini"

    def __init__(self, api_key: str, modelo: str, modelo_embeddings: str) -> None:
        self._client = genai.Client(api_key=api_key)
        self._modelo = modelo
        self._modelo_embeddings = modelo_embeddings

    # --- Chat -------------------------------------------------------------------
    def chat(
        self,
        system: str,
        messages: list[Message],
        tools: list[ToolSpec] | None = None,
        json_output: bool = False,
        temperature: float = 0.0,
    ) -> LLMResponse:
        config = types.GenerateContentConfig(
            system_instruction=system,
            temperature=temperature,
            tools=[self._tool(tools)] if tools else None,
            response_mime_type="application/json" if json_output else None,
        )
        respuesta = con_reintentos(
            lambda: self._client.models.generate_content(
                model=self._modelo, contents=self._contents(messages), config=config
            )
        )

        llamadas = [
            ToolCall(
                id=fc.id or f"{fc.name}-{i}", name=fc.name or "", arguments=dict(fc.args or {})
            )
            for i, fc in enumerate(respuesta.function_calls or [])
        ]
        uso = respuesta.usage_metadata
        candidato = respuesta.candidates[0].content if respuesta.candidates else None
        return LLMResponse(
            text=(respuesta.text or "") if not llamadas else "",
            tool_calls=llamadas,
            usage=Usage(
                input_tokens=(uso.prompt_token_count or 0) if uso else 0,
                output_tokens=(uso.candidates_token_count or 0) if uso else 0,
            ),
            raw=candidato,
        )

    @staticmethod
    def _tool(tools: list[ToolSpec]) -> types.Tool:
        return types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name=t.name, description=t.description, parameters_json_schema=t.parameters
                )
                for t in tools
            ]
        )

    @staticmethod
    def _contents(messages: list[Message]) -> list[types.Content]:
        """Traduce el historial común al formato de Gemini (roles "user" y "model")."""
        contents: list[types.Content] = []
        for m in messages:
            if m.role == "user":
                contents.append(types.Content(role="user", parts=[types.Part(text=m.content)]))
            elif m.role == "assistant":
                if isinstance(m.raw, types.Content):
                    contents.append(m.raw)  # tal cual: conserva la thought signature
                    continue
                partes = [types.Part(text=m.content)] if m.content else []
                partes += [
                    types.Part(function_call=types.FunctionCall(name=c.name, args=c.arguments))
                    for c in m.tool_calls
                ]
                contents.append(types.Content(role="model", parts=partes))
            else:  # tool: los resultados seguidos van juntos en un único turno
                parte = types.Part.from_function_response(
                    name=m.name or "", response={"resultado": _json_o_texto(m.content)}
                )
                previo = contents[-1] if contents else None
                if previo is not None and previo.role == "user" and _solo_respuestas(previo):
                    previo.parts.append(parte)
                else:
                    contents.append(types.Content(role="user", parts=[parte]))
        return contents

    # --- Embeddings -------------------------------------------------------------
    def embed(self, texts: list[str], for_query: bool = False) -> list[list[float]]:
        # El task_type importa: la pregunta y el documento se codifican distinto.
        tarea = "RETRIEVAL_QUERY" if for_query else "RETRIEVAL_DOCUMENT"
        vectores: list[list[float]] = []
        for i in range(0, len(texts), LOTE_EMBEDDINGS):
            lote = texts[i : i + LOTE_EMBEDDINGS]
            respuesta = con_reintentos(
                lambda lote=lote: self._client.models.embed_content(
                    model=self._modelo_embeddings,
                    contents=lote,
                    config=types.EmbedContentConfig(task_type=tarea, output_dimensionality=768),
                )
            )
            vectores += [list(e.values or []) for e in respuesta.embeddings or []]
        return vectores


def _json_o_texto(contenido: str) -> Any:
    try:
        return json.loads(contenido)
    except (json.JSONDecodeError, TypeError):
        return contenido


def _solo_respuestas(content: types.Content) -> bool:
    return bool(content.parts) and all(p.function_response for p in content.parts)
