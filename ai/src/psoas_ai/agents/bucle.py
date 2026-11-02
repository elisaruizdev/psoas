"""El bucle de un agente, escrito a mano para que se vea qué hace un framework por debajo.

    mientras no haya respuesta final y queden pasos:
        1. mandar al LLM: instrucciones + historial + herramientas disponibles
        2. si responde texto → fin
        3. si pide herramientas → ejecutarlas, añadir los resultados al historial, volver a 1

Salvaguardas: límite de pasos (un agente puede entrar en bucle), traza de cada paso
(observabilidad: qué pidió, con qué argumentos, qué recibió) y suma de tokens (coste).
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ..llm import LLMProvider, Message, Usage
from .herramientas import RegistroHerramientas


@dataclass
class Paso:
    herramienta: str
    argumentos: dict
    resultado: str


@dataclass
class ResultadoAgente:
    respuesta: str
    pasos: list[Paso] = field(default_factory=list)
    uso: Usage = field(default_factory=Usage)
    completado: bool = True


def ejecutar_agente(
    llm: LLMProvider,
    sistema: str,
    peticion: str,
    herramientas: RegistroHerramientas,
    max_pasos: int = 6,
) -> ResultadoAgente:
    historial = [Message(role="user", content=peticion)]
    resultado = ResultadoAgente(respuesta="")

    for _ in range(max_pasos):
        salida = llm.chat(sistema, historial, tools=herramientas.specs)
        resultado.uso.input_tokens += salida.usage.input_tokens
        resultado.uso.output_tokens += salida.usage.output_tokens
        historial.append(salida.as_message())

        if not salida.tool_calls:
            resultado.respuesta = salida.text.strip()
            return resultado

        # El modelo puede pedir varias herramientas a la vez (llamadas en paralelo).
        for llamada in salida.tool_calls:
            respuesta = herramientas.ejecutar(llamada.name, llamada.arguments)
            resultado.pasos.append(Paso(llamada.name, llamada.arguments, respuesta))
            historial.append(
                Message(role="tool", content=respuesta, tool_call_id=llamada.id, name=llamada.name)
            )

    resultado.completado = False
    resultado.respuesta = "No he podido completar la tarea en el número de pasos permitido."
    return resultado
