"""Leer los datos de la clínica desde la API de Psoas (NestJS) con el token del usuario.

El asistente no tiene acceso propio a la base de datos: pide los datos al backend con el
mismo JWT que usa el navegador. Así hereda los permisos del usuario y no abre una puerta
nueva a los datos: si el token no vale, el backend responde 401 y aquí no se ve nada.
"""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

import httpx

from .datos import Cita, Clinica, Nota, Paciente

ZONA = ZoneInfo("Europe/Madrid")


class SinPermiso(Exception):
    """El backend ha rechazado el token (401/403)."""


def _nombre(p: dict) -> str:
    return " ".join(x for x in (p.get("name"), p.get("surname"), p.get("second_surname")) if x)


def _texto(*partes: str | None) -> str:
    return " ".join(p.strip().rstrip(".") + "." for p in partes if p and p.strip())


def _fecha(valor: str | None) -> str:
    return (valor or "")[:10]


def _hora_local(iso: str) -> str:
    """'2026-11-04T09:00:00.000Z' → '2026-11-04T10:00' en hora de Madrid."""
    instante = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return instante.astimezone(ZONA).strftime("%Y-%m-%dT%H:%M")


def clinica_desde_json_api(
    pacientes: list[dict],
    diagnosticos: dict[str, list[dict]],
    tratamientos: dict[str, list[dict]],
    sesiones: dict[str, list[dict]],
    citas: list[dict],
) -> Clinica:
    """Traduce las respuestas de la API al modelo del asistente. Función pura: se prueba sin red."""
    notas: list[Nota] = []
    for p in pacientes:
        pid = p["id"]
        motivo = _texto(p.get("consultation_reason"), p.get("medical_history"))
        if motivo:
            notas.append(Nota(f"motivo-{pid}", pid, "motivo", _fecha(p.get("createdAt")), motivo))
        for d in diagnosticos.get(pid, []):
            texto = _texto(d.get("diagnosis_type"), d.get("description"), d.get("observations"))
            notas.append(Nota(d["id"], pid, "diagnostico", _fecha(d.get("diagnosis_date")), texto))
        for t in tratamientos.get(pid, []):
            texto = _texto(
                f"Tratamiento {t.get('treatment_name', '')}",
                t.get("description"),
                f"Objetivos: {t['objectives']}" if t.get("objectives") else None,
            )
            notas.append(Nota(t["id"], pid, "tratamiento", _fecha(t.get("start_date")), texto))
        for s in sesiones.get(pid, []):
            texto = _texto(
                f"Técnicas: {s['techniques_applied']}" if s.get("techniques_applied") else None,
                f"Evolución: {s['patient_evolution']}" if s.get("patient_evolution") else None,
                s.get("observations"),
            )
            notas.append(Nota(s["id"], pid, "sesion", _fecha(s.get("session_date")), texto))

    return Clinica(
        pacientes=[
            Paciente(
                id=p["id"],
                nombre=_nombre(p),
                dni=p.get("identifier") or "",
                telefono=p.get("phone") or "",
                email=p.get("email") or "",
            )
            for p in pacientes
        ],
        notas=[n for n in notas if n.texto],
        citas=[
            Cita(
                id=c["id"],
                paciente_id=c["patient_id"],
                fecha=_hora_local(c["appointment_date"]),
                fisio=_nombre(c.get("physio") or {}) or "sin asignar",
                estado=c.get("status", ""),
            )
            for c in citas
        ],
    )


def cargar_clinica(base_url: str, token: str, cliente: httpx.Client | None = None) -> Clinica:
    http = cliente or httpx.Client(timeout=10)
    cabeceras = {"Authorization": f"Bearer {token}"}

    def get(ruta: str):
        respuesta = http.get(f"{base_url.rstrip('/')}{ruta}", headers=cabeceras)
        if respuesta.status_code in (401, 403):
            raise SinPermiso(f"El backend rechazó el token ({respuesta.status_code})")
        respuesta.raise_for_status()
        return respuesta.json()

    pacientes = get("/patients")
    ids = [p["id"] for p in pacientes]
    return clinica_desde_json_api(
        pacientes,
        diagnosticos={pid: get(f"/diagnoses/patient/{pid}") for pid in ids},
        tratamientos={pid: get(f"/treatments/patient/{pid}") for pid in ids},
        sesiones={pid: get(f"/sessions/patient/{pid}") for pid in ids},
        citas=get("/appointments"),
    )
