"""Caché de embeddings en memoria.

Al refrescar los datos del backend se reindexan las notas, pero casi todas son las mismas
que la vez anterior. Calcular el embedding de un texto que ya se calculó cuesta dinero y
peticiones (el plan gratuito de Gemini limita las peticiones por minuto) para obtener el
mismo vector. Esta caché solo pide al proveedor los textos nuevos.
"""

from __future__ import annotations

from ..llm.base import LLMProvider, LLMResponse, Message, ToolSpec


class ProveedorConCache:
    def __init__(self, proveedor: LLMProvider, max_entradas: int = 10_000) -> None:
        self._proveedor = proveedor
        self._cache: dict[tuple[str, bool], list[float]] = {}
        self._max = max_entradas
        self.nombre = proveedor.nombre
        self.aciertos = 0

    def chat(
        self,
        system: str,
        messages: list[Message],
        tools: list[ToolSpec] | None = None,
        json_output: bool = False,
        temperature: float = 0.0,
    ) -> LLMResponse:
        return self._proveedor.chat(system, messages, tools, json_output, temperature)

    def embed(self, texts: list[str], for_query: bool = False) -> list[list[float]]:
        nuevos = list(dict.fromkeys(t for t in texts if (t, for_query) not in self._cache))
        if nuevos:
            if len(self._cache) + len(nuevos) > self._max:
                self._cache.clear()  # sencillo: se vacía entera; suficiente para este volumen
            for texto, vector in zip(nuevos, self._proveedor.embed(nuevos, for_query), strict=True):
                self._cache[(texto, for_query)] = vector
        self.aciertos += len(texts) - len(nuevos)
        return [self._cache[(t, for_query)] for t in texts]
