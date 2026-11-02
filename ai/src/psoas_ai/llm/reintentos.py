"""Reintentos con espera exponencial y jitter.

Las APIs de LLM fallan de forma transitoria: 429 (límite de peticiones, muy habitual en el
plan gratuito de Gemini), 500/503 (sobrecarga). Reintentar con esperas crecientes y algo de
azar (jitter) evita que todos los clientes reintenten a la vez. Los 4xx que no son 429 son
errores nuestros (petición mal hecha, clave inválida): reintentarlos no sirve de nada.
"""

from __future__ import annotations

import random
import time
from collections.abc import Callable

REINTENTABLES = {408, 429, 500, 502, 503, 504}


def codigo_http(error: Exception) -> int | None:
    """Saca el código HTTP de las excepciones de google-genai y openai sin importarlas."""
    for atributo in ("code", "status_code", "status"):
        valor = getattr(error, atributo, None)
        if isinstance(valor, int):
            return valor
    return None


def con_reintentos[T](
    funcion: Callable[[], T],
    intentos: int = 4,
    base: float = 1.0,
    dormir: Callable[[float], None] = time.sleep,
) -> T:
    for intento in range(1, intentos + 1):
        try:
            return funcion()
        except Exception as error:
            codigo = codigo_http(error)
            if codigo not in REINTENTABLES or intento == intentos:
                raise
            dormir(base * 2 ** (intento - 1) + random.uniform(0, base / 2))
    raise AssertionError("inalcanzable")
