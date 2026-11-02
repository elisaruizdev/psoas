"""Evals: medir la calidad del sistema con un conjunto fijo de casos.

Un LLM no se prueba como una función normal: la misma pregunta puede dar respuestas
distintas. Las evals convierten "parece que funciona" en números que se comparan entre
versiones (otro modelo, otro prompt, otro tamaño de trozo...).

Tres niveles, de más barato a más caro:
1. RECUPERACIÓN (determinista, sin LLM generativo): ¿el fragmento correcto sale entre los k
   primeros? Métricas: hit@k y MRR (posición media del primer acierto).
2. PRIVACIDAD (determinista): ¿algún prompt enviado al proveedor contiene un dato personal?
3. RESPUESTAS (necesita LLM real): comprobaciones de contenido ("debe contener 3/10"),
   negativas ("no debe hablar de la rodilla") y citas válidas. Un paso más sería un
   "LLM-as-judge" con una rúbrica, calibrado contra valoraciones humanas.

    uv run psoas-ai evals                       # con el proveedor de LLM_PROVIDER
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from ..datos import Clinica
from ..llm import FakeProvider, LLMProvider
from ..privacidad import contiene_datos_personales
from ..rag import IndiceVectorial, responder

CASOS = Path(__file__).with_name("casos.json")


@dataclass
class Informe:
    hit_at_k: float = 0.0
    mrr: float = 0.0
    fallos_recuperacion: list[str] = field(default_factory=list)
    fugas_privacidad: int = 0
    respuestas_ok: int = 0
    respuestas_total: int = 0
    fallos_respuesta: list[str] = field(default_factory=list)

    def resumen(self) -> str:
        lineas = [
            f"Recuperación  hit@k={self.hit_at_k:.0%}  MRR={self.mrr:.2f}",
            f"Privacidad    fugas={self.fugas_privacidad}",
        ]
        if self.respuestas_total:
            lineas.append(f"Respuestas    {self.respuestas_ok}/{self.respuestas_total} correctas")
        lineas += [f"  ✗ {f}" for f in self.fallos_recuperacion + self.fallos_respuesta]
        return "\n".join(lineas)


def evaluar(
    llm: LLMProvider,
    clinica: Clinica,
    k: int = 3,
    con_respuestas: bool = True,
    casos: dict | None = None,
) -> Informe:
    casos = casos or json.loads(CASOS.read_text(encoding="utf-8"))
    indice = IndiceVectorial(llm)
    indice.indexar(clinica)
    informe = Informe()

    # 1. Recuperación
    reciprocos = []
    for caso in casos["recuperacion"]:
        ids = [
            r.fragmento.nota_id
            for r in indice.buscar(caso["pregunta"], k=k, paciente_id=caso.get("paciente_id"))
        ]
        posicion = ids.index(caso["esperada"]) + 1 if caso["esperada"] in ids else None
        reciprocos.append(1 / posicion if posicion else 0.0)
        if not posicion:
            informe.fallos_recuperacion.append(
                f"'{caso['pregunta']}' → esperaba {caso['esperada']}, salió {ids}"
            )
    total = len(casos["recuperacion"])
    informe.hit_at_k = sum(1 for r in reciprocos if r) / total
    informe.mrr = sum(reciprocos) / total

    # 3. Respuestas (con el proveedor falso no tiene sentido evaluar redacción)
    if con_respuestas and type(llm) is not FakeProvider:
        for caso in casos["respuestas"]:
            r = responder(
                llm, indice, caso["pregunta"], caso.get("paciente_id"), pacientes=clinica.pacientes
            )
            texto = r.texto.lower()
            problemas = [f"falta '{t}'" for t in caso["debe_contener"] if t.lower() not in texto]
            problemas += [f"sobra '{t}'" for t in caso["no_debe_contener"] if t.lower() in texto]
            problemas += [f"cita inválida {n}" for n in r.citas_invalidas]
            informe.respuestas_total += 1
            if problemas:
                informe.fallos_respuesta.append(f"'{caso['pregunta']}': {', '.join(problemas)}")
            else:
                informe.respuestas_ok += 1

    # 2. Privacidad: se audita lo que de verdad se envió (el proveedor falso lo registra).
    espia = FakeProvider()
    indice_espia = IndiceVectorial(espia)
    indice_espia.indexar(clinica)
    for caso in casos["respuestas"]:
        responder(
            espia,
            indice_espia,
            caso["pregunta"],
            caso.get("paciente_id"),
            pacientes=clinica.pacientes,
        )
    informe.fugas_privacidad = sum(
        contiene_datos_personales(m.content, clinica.pacientes)
        for llamada in espia.llamadas
        for m in llamada["messages"]
    )
    return informe
