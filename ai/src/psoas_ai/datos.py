"""Acceso a los datos de la clínica (en la demo, un JSON; en Psoas real, la API de NestJS)."""

from __future__ import annotations

import json
import unicodedata
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Paciente:
    id: str
    nombre: str
    dni: str
    telefono: str
    email: str


@dataclass(frozen=True)
class Nota:
    id: str
    paciente_id: str
    tipo: str  # diagnostico | sesion
    fecha: str
    texto: str


@dataclass(frozen=True)
class Cita:
    id: str
    paciente_id: str
    fecha: str
    fisio: str
    estado: str


def _plano(texto: str) -> str:
    return unicodedata.normalize("NFKD", texto.lower()).encode("ascii", "ignore").decode()


class Clinica:
    def __init__(self, pacientes: list[Paciente], notas: list[Nota], citas: list[Cita]) -> None:
        self.pacientes = pacientes
        self.notas = notas
        self.citas = citas

    @classmethod
    def desde_json(cls, ruta: Path) -> Clinica:
        datos = json.loads(Path(ruta).read_text(encoding="utf-8"))
        return cls(
            pacientes=[Paciente(**p) for p in datos["pacientes"]],
            notas=[Nota(**n) for n in datos["notas"]],
            citas=[Cita(**c) for c in datos["citas"]],
        )

    def paciente(self, paciente_id: str) -> Paciente | None:
        return next((p for p in self.pacientes if p.id == paciente_id), None)

    def buscar_pacientes(self, nombre: str) -> list[Paciente]:
        """Búsqueda por nombre sin distinguir mayúsculas ni tildes."""
        buscado = _plano(nombre)
        return [p for p in self.pacientes if buscado in _plano(p.nombre)]

    def citas_de(self, paciente_id: str, desde: str | None = None) -> list[Cita]:
        citas = [c for c in self.citas if c.paciente_id == paciente_id]
        if desde:
            citas = [c for c in citas if c.fecha >= desde]
        return sorted(citas, key=lambda c: c.fecha)
