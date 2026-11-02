"""Flujo multiagente: enrutador → especialista → revisor (con un reintento).

                   ┌──────────────► especialista CLÍNICO  (RAG con citas) ─┐
    petición ─► ENRUTADOR                                                   ├─► REVISOR ─► respuesta
                   ├──────────────► especialista AGENDA   (agente + tools) ─┘     │
                   └──────────────► fuera de ámbito (respuesta fija, sin LLM)     │
                                         ▲                                        │
                                         └────── si no aprueba: 1 reintento ──────┘
                                                 con los problemas como feedback

Patrones (los de "Building effective agents" de Anthropic):
- **Routing**: un paso barato clasifica y manda a un especialista con instrucciones y
  herramientas propias. Cada especialista es más fiable que un agente que lo hace todo.
- **Evaluator-optimizer**: un segundo modelo revisa la respuesta contra las fuentes y, si
  falla, el especialista lo intenta otra vez con la crítica. Con un tope de intentos.

Es un *workflow* (el código decide el orden), no un agente autónomo que decide todo: más
predecible, más barato y más fácil de probar. La autonomía se reserva a la parte que la
necesita (el especialista de agenda, que encadena herramientas).
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Literal

from ..datos import Clinica
from ..llm import LLMProvider, Message, Usage
from ..privacidad import anonimizar, restaurar
from ..rag import IndiceVectorial, responder
from .bucle import ejecutar_agente
from .herramientas import herramientas_clinica

Ruta = Literal["clinico", "agenda", "fuera_de_ambito"]

ENRUTADOR = """Eres el ENRUTADOR del asistente de una clínica de fisioterapia.
Clasifica la petición en una ruta y responde SOLO con JSON: {"ruta": "<ruta>"}
- "clinico": preguntas sobre diagnósticos, evolución, sesiones o ejercicios de pacientes.
- "agenda": preguntas sobre citas, horarios o fechas.
- "fuera_de_ambito": cualquier otra cosa (incluido pedir diagnósticos nuevos o consejos médicos).
"""

AGENDA = """Eres el especialista de AGENDA de una clínica de fisioterapia.
Usa las herramientas para responder sobre citas. Si te nombran a un paciente, primero
busca su id con buscar_paciente. Para "próximas" citas, usa fecha_de_hoy. Responde en
español, breve, con fechas en formato día/mes y hora. No inventes citas.
Refiérete al paciente con el marcador que recibas (p. ej. [PACIENTE_p-1])."""

REVISOR = """Eres el REVISOR de calidad de un asistente clínico.
Recibes una PETICIÓN, las FUENTES que se usaron y la RESPUESTA. Comprueba que:
1. Todo lo que afirma la respuesta está en las fuentes (nada inventado).
2. Responde a lo que se pregunta.
3. No da consejos médicos ni diagnósticos nuevos.
Responde SOLO con JSON: {"aprobado": true|false, "problemas": ["..."]}
"""

FUERA_DE_AMBITO = (
    "Solo puedo ayudar con la historia clínica y la agenda de los pacientes de Psoas. "
    "Para valorar un caso nuevo, consulta con el fisioterapeuta responsable."
)


@dataclass
class Traza:
    agente: str
    detalle: str


@dataclass
class RespuestaAsistente:
    texto: str
    ruta: Ruta
    aprobado: bool
    intentos: int
    traza: list[Traza] = field(default_factory=list)
    uso: Usage = field(default_factory=Usage)


class Orquestador:
    def __init__(
        self,
        llm: LLMProvider,
        clinica: Clinica,
        indice: IndiceVectorial,
        hoy: str,
        max_intentos: int = 2,
    ) -> None:
        self._llm = llm
        self._clinica = clinica
        self._indice = indice
        self._herramientas = herramientas_clinica(clinica, indice, hoy)
        self._max_intentos = max_intentos

    def atender(self, peticion: str) -> RespuestaAsistente:
        texto, seudonimos = anonimizar(peticion, self._clinica.pacientes)
        uso = Usage()
        traza: list[Traza] = []

        ruta = self._enrutar(texto, uso)
        traza.append(Traza("enrutador", ruta))
        if ruta == "fuera_de_ambito":
            return RespuestaAsistente(FUERA_DE_AMBITO, ruta, True, 0, traza, uso)

        feedback = ""
        respuesta, fuentes, aprobado, intento = "", "", False, 0
        # `intento` se usa después del bucle (cuántos hicieron falta).
        for intento in range(1, self._max_intentos + 1):  # noqa: B007
            respuesta, fuentes = self._especialista(ruta, texto, feedback, uso, traza)
            aprobado, problemas = self._revisar(texto, fuentes, respuesta, uso)
            traza.append(Traza("revisor", "aprobado" if aprobado else f"rechazado: {problemas}"))
            if aprobado:
                break
            feedback = (
                "un revisor rechazó tu respuesta anterior por: "
                + "; ".join(problemas or ["no se ajusta a las fuentes"])
                + ". Corrígelo usando solo las fuentes."
            )

        if not aprobado:
            respuesta += (
                "\n\n(Aviso: esta respuesta no ha superado la revisión automática; verifícala.)"
            )
        return RespuestaAsistente(
            restaurar(respuesta, seudonimos), ruta, aprobado, intento, traza, uso
        )

    # --- Pasos ------------------------------------------------------------------------
    def _enrutar(self, texto: str, uso: Usage) -> Ruta:
        salida = self._llm.chat(ENRUTADOR, [Message(role="user", content=texto)], json_output=True)
        _sumar(uso, salida.usage)
        ruta = _json(salida.text).get("ruta")
        # Salida estructurada validada: si el modelo devuelve algo raro, ruta segura por defecto.
        return ruta if ruta in ("clinico", "agenda", "fuera_de_ambito") else "fuera_de_ambito"

    def _especialista(
        self, ruta: Ruta, texto: str, feedback: str, uso: Usage, traza: list[Traza]
    ) -> tuple[str, str]:
        if ruta == "clinico":
            # Si la petición nombra a un paciente, se filtra la búsqueda por él.
            paciente_id = next(
                (p.id for p in self._clinica.pacientes if f"[PACIENTE_{p.id}]" in texto), None
            )
            rag = responder(
                self._llm, self._indice, texto, paciente_id=paciente_id, feedback=feedback
            )
            _sumar(uso, rag.uso)
            traza.append(Traza("clinico", f"{len(rag.fuentes)} fragmentos, citas {rag.citas}"))
            fuentes = "\n".join(f"[{i}] {r.fragmento.texto}" for i, r in enumerate(rag.fuentes, 1))
            return rag.texto, fuentes

        peticion = (
            f"{texto}\n\nCORRIGE ESTO DEL INTENTO ANTERIOR: {feedback}" if feedback else texto
        )
        agente = ejecutar_agente(self._llm, AGENDA, peticion, self._herramientas)
        _sumar(uso, agente.uso)
        for paso in agente.pasos:
            traza.append(Traza("agenda", f"{paso.herramienta}({paso.argumentos})"))
        fuentes = "\n".join(f"{p.herramienta}{p.argumentos} → {p.resultado}" for p in agente.pasos)
        return agente.respuesta, fuentes

    def _revisar(
        self, peticion: str, fuentes: str, respuesta: str, uso: Usage
    ) -> tuple[bool, list[str]]:
        contenido = (
            f"PETICIÓN:\n{peticion}\n\n"
            f"FUENTES:\n{fuentes or '(ninguna)'}\n\n"
            f"RESPUESTA:\n{respuesta}"
        )
        salida = self._llm.chat(
            REVISOR, [Message(role="user", content=contenido)], json_output=True
        )
        _sumar(uso, salida.usage)
        veredicto = _json(salida.text)
        return bool(veredicto.get("aprobado")), list(veredicto.get("problemas") or [])


def _json(texto: str) -> dict:
    try:
        valor = json.loads(texto.strip().removeprefix("```json").removesuffix("```"))
        return valor if isinstance(valor, dict) else {}
    except json.JSONDecodeError:
        return {}


def _sumar(total: Usage, parcial: Usage) -> None:
    total.input_tokens += parcial.input_tokens
    total.output_tokens += parcial.output_tokens
