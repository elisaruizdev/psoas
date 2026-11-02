"""Adaptador para OpenAI y Azure OpenAI (SDK oficial `openai`).

Azure OpenAI expone la misma API que OpenAI en `https://<recurso>.openai.azure.com/openai/v1/`,
así que es el mismo adaptador con otra URL base. Diferencias que conviene saber:
- En Azure, `model` es el nombre de TU deployment, no el del modelo.
- Los datos se quedan en tu suscripción y región (lo que suele pedir un cliente corporativo),
  con autenticación por clave o por Entra ID, red privada y filtros de contenido.
"""

from __future__ import annotations

import json
from typing import Any

from openai import OpenAI

from .base import LLMResponse, Message, ToolCall, ToolSpec, Usage
from .reintentos import con_reintentos


class OpenAIProvider:
    def __init__(
        self,
        api_key: str,
        modelo: str,
        modelo_embeddings: str,
        base_url: str | None = None,
        nombre: str = "openai",
    ) -> None:
        # max_retries=0: los reintentos los gestiona con_reintentos, igual en todos los proveedores.
        self._client = OpenAI(api_key=api_key, base_url=base_url, max_retries=0)
        self._modelo = modelo
        self._modelo_embeddings = modelo_embeddings
        self.nombre = nombre

    @classmethod
    def azure(cls, endpoint: str, api_key: str, deployment: str, deployment_embeddings: str):
        return cls(
            api_key=api_key,
            modelo=deployment,
            modelo_embeddings=deployment_embeddings,
            base_url=f"{endpoint.rstrip('/')}/openai/v1/",
            nombre="azure",
        )

    def chat(
        self,
        system: str,
        messages: list[Message],
        tools: list[ToolSpec] | None = None,
        json_output: bool = False,
        temperature: float = 0.0,
    ) -> LLMResponse:
        kwargs: dict[str, Any] = {
            "model": self._modelo,
            "messages": [{"role": "system", "content": system}] + [_mensaje(m) for m in messages],
            "temperature": temperature,
        }
        if tools:
            kwargs["tools"] = [
                {
                    "type": "function",
                    "function": {
                        "name": t.name,
                        "description": t.description,
                        "parameters": t.parameters,
                    },
                }
                for t in tools
            ]
        if json_output:
            kwargs["response_format"] = {"type": "json_object"}

        respuesta = con_reintentos(lambda: self._client.chat.completions.create(**kwargs))
        mensaje = respuesta.choices[0].message
        llamadas = [
            ToolCall(
                id=c.id, name=c.function.name, arguments=json.loads(c.function.arguments or "{}")
            )
            for c in (mensaje.tool_calls or [])
            if c.type == "function"
        ]
        uso = respuesta.usage
        return LLMResponse(
            text=mensaje.content or "",
            tool_calls=llamadas,
            usage=Usage(
                input_tokens=uso.prompt_tokens if uso else 0,
                output_tokens=uso.completion_tokens if uso else 0,
            ),
        )

    def embed(self, texts: list[str], for_query: bool = False) -> list[list[float]]:
        respuesta = con_reintentos(
            lambda: self._client.embeddings.create(model=self._modelo_embeddings, input=texts)
        )
        return [d.embedding for d in respuesta.data]


def _mensaje(m: Message) -> dict[str, Any]:
    if m.role == "tool":
        return {"role": "tool", "tool_call_id": m.tool_call_id, "content": m.content}
    if m.role == "assistant" and m.tool_calls:
        return {
            "role": "assistant",
            "content": m.content or None,
            "tool_calls": [
                {
                    "id": c.id,
                    "type": "function",
                    "function": {
                        "name": c.name,
                        "arguments": json.dumps(c.arguments, ensure_ascii=False),
                    },
                }
                for c in m.tool_calls
            ],
        }
    return {"role": m.role, "content": m.content}
