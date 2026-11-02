"""Monta las piezas una vez: datos, proveedor, índice vectorial y orquestador."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from .agents import Orquestador
from .config import Settings
from .datos import Clinica
from .llm import LLMProvider, crear_proveedor
from .rag import IndiceVectorial


@dataclass
class Servicio:
    llm: LLMProvider
    clinica: Clinica
    indice: IndiceVectorial
    orquestador: Orquestador

    @classmethod
    def crear(
        cls,
        llm: LLMProvider | None = None,
        settings: Settings | None = None,
        hoy: str | None = None,
    ) -> Servicio:
        s = settings or Settings()
        proveedor = llm or crear_proveedor(s)
        clinica = Clinica.desde_json(s.datos)
        indice = IndiceVectorial(proveedor)
        indice.indexar(clinica)
        fecha = hoy or date.today().isoformat()
        return cls(proveedor, clinica, indice, Orquestador(proveedor, clinica, indice, fecha))
