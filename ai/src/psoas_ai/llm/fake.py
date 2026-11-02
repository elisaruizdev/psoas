"""Proveedor falso: sin red, sin clave y determinista.

Sirve para tres cosas:
1. Tests rápidos y estables (un test que llama a un LLM real es lento, cuesta y no es repetible).
2. CI sin secretos.
3. Probar la app en local sin clave.

Embeddings: "bolsa de palabras" con hashing. No entiende sinónimos (eso es lo que aporta un
modelo de embeddings real), pero agrupa textos que comparten palabras, y siempre da lo mismo.
"""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from collections.abc import Callable

import numpy as np

from .base import LLMResponse, Message, ToolSpec

DIMENSIONES = 512

STOPWORDS = {
    "que",
    "por",
    "para",
    "con",
    "sin",
    "los",
    "las",
    "del",
    "una",
    "uno",
    "como",
    "mas",
    "muy",
    "esta",
    "este",
    "tras",
    "sus",
    "les",
    "hay",
    "ser",
    "fue",
    "son",
    "pero",
    "cual",
    "cuales",
    "cuando",
    "donde",
    "quien",
    "han",
    "tiene",
    "tuvo",
    "ella",
    "ese",
    "esa",
    "desde",
    "hasta",
}

Guion = Callable[[str, list[Message], list[ToolSpec] | None, bool], LLMResponse]


def tokens(texto: str) -> list[str]:
    sin_tildes = unicodedata.normalize("NFKD", texto.lower()).encode("ascii", "ignore").decode()
    palabras = re.findall(r"[a-z0-9]+", sin_tildes)
    # Raíz muy simple: las 6 primeras letras ("rodilla"/"rodillas" → "rodill").
    return [p[:6] for p in palabras if len(p) > 2 and p not in STOPWORDS]


def embedding_hash(texto: str) -> list[float]:
    vector = np.zeros(DIMENSIONES)
    for token in tokens(texto):
        indice = int(hashlib.md5(token.encode()).hexdigest(), 16) % DIMENSIONES
        vector[indice] += 1.0
    norma = np.linalg.norm(vector)
    return (vector / norma).tolist() if norma else vector.tolist()


class FakeProvider:
    nombre = "fake"

    def __init__(self, guion: list[LLMResponse] | Guion | None = None) -> None:
        """`guion`: lista de respuestas que se devuelven en orden, o una función que decide."""
        self._guion = guion
        self.llamadas: list[dict] = []  # para que los tests comprueben qué se le envió

    def chat(
        self,
        system: str,
        messages: list[Message],
        tools: list[ToolSpec] | None = None,
        json_output: bool = False,
        temperature: float = 0.0,
    ) -> LLMResponse:
        self.llamadas.append(
            {"system": system, "messages": list(messages), "tools": tools, "json": json_output}
        )
        if isinstance(self._guion, list):
            if not self._guion:
                raise AssertionError("El guion del FakeProvider se ha quedado sin respuestas")
            return self._guion.pop(0)
        if callable(self._guion):
            return self._guion(system, messages, tools, json_output)
        return _respuesta_por_defecto(system, messages, json_output)

    def embed(self, texts: list[str], for_query: bool = False) -> list[list[float]]:
        return [embedding_hash(t) for t in texts]


def _respuesta_por_defecto(system: str, messages: list[Message], json_output: bool) -> LLMResponse:
    """Comportamiento razonable sin guion, para usar la API en local sin clave."""
    ultimo = next((m.content for m in reversed(messages) if m.role == "user"), "")
    if json_output:
        if "ENRUTADOR" in system:
            agenda = re.search(r"\b(cita|citas|agenda|hora|cu[aá]ndo|pr[oó]xima)\b", ultimo, re.I)
            return LLMResponse(text=json.dumps({"ruta": "agenda" if agenda else "clinico"}))
        if "REVISOR" in system:
            return LLMResponse(text=json.dumps({"aprobado": True, "problemas": []}))
        return LLMResponse(text="{}")
    # RAG extractivo: devuelve el primer fragmento recuperado y lo cita.
    fragmento = re.search(r"\[1\][^\n]*\n(.+)", ultimo)
    if fragmento:
        return LLMResponse(text=f"{fragmento.group(1).strip()[:300]} [1]")
    return LLMResponse(text="(modo sin LLM) Configura LLM_PROVIDER=gemini y GEMINI_API_KEY.")
