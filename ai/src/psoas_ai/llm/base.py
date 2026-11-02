"""Contrato común para cualquier proveedor de LLM.

El resto del código (RAG, agentes, API) solo conoce estas clases. Cambiar de Gemini a
Azure OpenAI es cambiar una variable de entorno, no reescribir la aplicación.
Es el patrón *adapter*: cada proveedor traduce su formato a este.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

Rol = Literal["user", "assistant", "tool"]


@dataclass
class ToolSpec:
    """Herramienta que el modelo puede pedir usar. `parameters` es JSON Schema."""

    name: str
    description: str
    parameters: dict[str, Any]


@dataclass
class ToolCall:
    """Petición del modelo: "ejecuta `name` con estos argumentos". El modelo NO la ejecuta."""

    id: str
    name: str
    arguments: dict[str, Any]


@dataclass
class Message:
    role: Rol
    content: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    # Solo en role="tool": a qué llamada responde este resultado.
    tool_call_id: str | None = None
    name: str | None = None
    # Mensaje original del proveedor. Gemini, por ejemplo, exige devolver tal cual su turno
    # (con su "thought signature") cuando se encadenan llamadas a herramientas.
    raw: Any = None


@dataclass
class Usage:
    input_tokens: int = 0
    output_tokens: int = 0


@dataclass
class LLMResponse:
    text: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    usage: Usage = field(default_factory=Usage)
    raw: Any = None

    def as_message(self) -> Message:
        return Message(
            role="assistant", content=self.text, tool_calls=self.tool_calls, raw=self.raw
        )


class LLMProvider(Protocol):
    """Lo mínimo que la app necesita de un proveedor."""

    nombre: str

    def chat(
        self,
        system: str,
        messages: list[Message],
        tools: list[ToolSpec] | None = None,
        json_output: bool = False,
        temperature: float = 0.0,
    ) -> LLMResponse: ...

    def embed(self, texts: list[str], for_query: bool = False) -> list[list[float]]: ...
