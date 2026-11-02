"""Seudonimización antes de enviar texto a un LLM externo.

Los datos de salud son categoría especial en el RGPD. Principio de minimización: el modelo
no necesita saber el DNI ni el teléfono para resumir una lumbalgia. Se sustituyen por marcadores
([DNI_1], [TEL_1], [EMAIL_1], [PACIENTE_p-1]) y, si hace falta, se restauran EN NUESTRO
servidor al devolver la respuesta. El proveedor nunca ve los datos identificativos.

Limitación honesta: las expresiones regulares no cubren todo (un nombre propio de un familiar
escrito en una nota libre, por ejemplo). En producción se añadiría un detector de entidades
(NER, p. ej. Presidio) y, sobre todo, un acuerdo de tratamiento de datos con el proveedor
(Azure OpenAI y Vertex AI lo ofrecen, con residencia de datos en la UE).
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass, field

from .datos import Paciente

PATRONES = [
    ("DNI", re.compile(r"\b(?:\d{8}|[XYZxyz]\d{7})[-\s]?[A-Za-z]\b")),
    ("EMAIL", re.compile(r"\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b")),
    # Teléfono español: prefijo opcional y 9 cifras empezando por 6-9, con separadores.
    ("TEL", re.compile(r"(?<![\d+])(?:(?:\+34|0034)[\s.-]?)?[6789](?:[\s.-]?\d){8}(?!\d)")),
]


@dataclass
class Seudonimos:
    """Mapa marcador → valor real. Nunca sale de nuestro servidor."""

    mapa: dict[str, str] = field(default_factory=dict)
    _contadores: dict[str, int] = field(default_factory=dict)

    def marcador(self, tipo: str, valor: str) -> str:
        for clave, existente in self.mapa.items():
            if existente == valor and clave.startswith(f"[{tipo}"):
                return clave  # el mismo valor recibe siempre el mismo marcador
        self._contadores[tipo] = self._contadores.get(tipo, 0) + 1
        clave = f"[{tipo}_{self._contadores[tipo]}]"
        self.mapa[clave] = valor
        return clave


def anonimizar(
    texto: str, pacientes: Iterable[Paciente] = (), seudonimos: Seudonimos | None = None
) -> tuple[str, Seudonimos]:
    s = seudonimos or Seudonimos()
    # Primero los nombres conocidos: el completo y "nombre + primer apellido", que es como
    # se suele escribir ("Ana López" por "Ana López Serrano"). Del más largo al más corto
    # para que el completo gane al parcial.
    variantes = []
    for p in pacientes:
        s.mapa[f"[PACIENTE_{p.id}]"] = p.nombre
        palabras = p.nombre.split()
        variantes.append((p.nombre, p.id))
        if len(palabras) > 2:
            variantes.append((" ".join(palabras[:2]), p.id))
    for nombre, pid in sorted(variantes, key=lambda v: -len(v[0])):
        patron = rf"(?<!\w){re.escape(nombre)}(?!\w)"
        texto = re.sub(patron, f"[PACIENTE_{pid}]", texto, flags=re.IGNORECASE)
    for tipo, patron in PATRONES:
        texto = patron.sub(lambda m, tipo=tipo: s.marcador(tipo, m.group(0).strip()), texto)
    return texto, s


def restaurar(texto: str, seudonimos: Seudonimos) -> str:
    for marcador, valor in seudonimos.mapa.items():
        texto = texto.replace(marcador, valor)
    return texto


def contiene_datos_personales(texto: str, pacientes: Iterable[Paciente] = ()) -> bool:
    """Comprobación de seguridad para evals y tests: ¿se escapa algún dato identificativo?"""
    if any(patron.search(texto) for _, patron in PATRONES):
        return True
    return any(p.nombre.lower() in texto.lower() for p in pacientes)
