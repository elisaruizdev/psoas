"""Herramientas (tools) que un agente puede pedir usar.

El LLM no ejecuta nada: devuelve "quiero llamar a citas_de_paciente con {...}". Este módulo
valida esa petición contra el JSON Schema y ejecuta la función de verdad.

Buenas prácticas que se aplican aquí:
- Descripciones claras: el modelo elige la herramienta por la descripción.
- Validación de argumentos: el modelo puede inventarse parámetros o tipos.
- Los errores se devuelven como resultado, no como excepción: así el modelo puede corregirse.
- Solo lectura: ninguna herramienta borra ni modifica (mínimo privilegio). Una acción con
  efectos (p. ej. cancelar una cita) pediría confirmación humana.
"""

from __future__ import annotations

import json
import re
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from ..datos import Clinica
from ..llm import ToolSpec
from ..privacidad import anonimizar
from ..rag import IndiceVectorial

TIPOS_JSON = {"string": str, "integer": int, "number": (int, float), "boolean": bool}


@dataclass
class Herramienta:
    spec: ToolSpec
    funcion: Callable[..., Any]


class RegistroHerramientas:
    def __init__(self) -> None:
        self._herramientas: dict[str, Herramienta] = {}

    def registrar(self, nombre: str, descripcion: str, parametros: dict[str, Any]):
        def decorador(funcion: Callable[..., Any]) -> Callable[..., Any]:
            schema = {
                "type": "object",
                "properties": parametros,
                "required": [k for k, v in parametros.items() if not v.get("opcional")],
            }
            for v in schema["properties"].values():
                v.pop("opcional", None)
            self._herramientas[nombre] = Herramienta(ToolSpec(nombre, descripcion, schema), funcion)
            return funcion

        return decorador

    @property
    def specs(self) -> list[ToolSpec]:
        return [h.spec for h in self._herramientas.values()]

    def ejecutar(self, nombre: str, argumentos: dict[str, Any]) -> str:
        herramienta = self._herramientas.get(nombre)
        if herramienta is None:
            return _error(
                f"La herramienta '{nombre}' no existe. Disponibles: {list(self._herramientas)}"
            )
        error = _validar(herramienta.spec.parameters, argumentos)
        if error:
            return _error(error)
        try:
            return json.dumps(herramienta.funcion(**argumentos), ensure_ascii=False, default=str)
        except Exception as e:  # el agente recibe el fallo y puede reintentar de otra forma
            return _error(f"{type(e).__name__}: {e}")


def _error(mensaje: str) -> str:
    return json.dumps({"error": mensaje}, ensure_ascii=False)


def _validar(schema: dict[str, Any], argumentos: dict[str, Any]) -> str | None:
    propiedades = schema.get("properties", {})
    faltan = [k for k in schema.get("required", []) if k not in argumentos]
    if faltan:
        return f"Faltan argumentos obligatorios: {faltan}"
    sobran = [k for k in argumentos if k not in propiedades]
    if sobran:
        return f"Argumentos desconocidos: {sobran}"
    for clave, valor in argumentos.items():
        tipo = TIPOS_JSON.get(propiedades[clave].get("type", ""))
        if tipo and not isinstance(valor, tipo):
            return f"'{clave}' debe ser {propiedades[clave]['type']}"
    return None


def herramientas_clinica(
    clinica: Clinica, indice: IndiceVectorial, hoy: str
) -> RegistroHerramientas:
    """Herramientas de la clínica. Lo que devuelven va anonimizado: el LLM trabaja con ids."""
    registro = RegistroHerramientas()

    @registro.registrar(
        "buscar_paciente",
        "Busca pacientes por nombre o parte del nombre. Devuelve su id, necesario para el resto "
        "de herramientas. Úsala primero si el usuario nombra a un paciente.",
        {"nombre": {"type": "string", "description": "Nombre o apellido, p. ej. 'Lucía'"}},
    )
    def buscar_paciente(nombre: str):
        # El modelo solo ve marcadores: si recibe "[PACIENTE_x]", el id ya va dentro.
        marcador = re.fullmatch(r"\[PACIENTE_(.+)\]", nombre.strip())
        if marcador and clinica.paciente(marcador.group(1)):
            return [{"paciente_id": marcador.group(1)}]
        return [{"paciente_id": p.id} for p in clinica.buscar_pacientes(nombre)] or {
            "aviso": "No hay pacientes con ese nombre"
        }

    @registro.registrar(
        "citas_de_paciente",
        "Lista las citas de un paciente ordenadas por fecha, con fisioterapeuta y estado.",
        {
            "paciente_id": {"type": "string", "description": "Id del paciente, p. ej. 'p-1'"},
            "desde": {
                "type": "string",
                "description": (
                    "Fecha mínima AAAA-MM-DD. Para 'próximas citas' usa la fecha de hoy."
                ),
                "opcional": True,
            },
        },
    )
    def citas_de_paciente(paciente_id: str, desde: str | None = None):
        return [
            {"fecha": c.fecha, "fisio": c.fisio, "estado": c.estado}
            for c in clinica.citas_de(paciente_id, desde)
        ]

    @registro.registrar(
        "buscar_en_historia",
        "Búsqueda semántica en las notas clínicas (diagnósticos y sesiones). Devuelve fragmentos.",
        {
            "consulta": {"type": "string", "description": "Qué buscar, en lenguaje natural"},
            "paciente_id": {
                "type": "string",
                "description": "Limitar a un paciente",
                "opcional": True,
            },
        },
    )
    def buscar_en_historia(consulta: str, paciente_id: str | None = None):
        return [
            {"fecha": r.fragmento.fecha, "tipo": r.fragmento.tipo, "texto": r.fragmento.texto}
            for r in indice.buscar(
                anonimizar(consulta, clinica.pacientes)[0], k=3, paciente_id=paciente_id
            )
        ]

    @registro.registrar("fecha_de_hoy", "Devuelve la fecha de hoy (AAAA-MM-DD).", {})
    def fecha_de_hoy():
        return {"hoy": hoy}

    return registro
