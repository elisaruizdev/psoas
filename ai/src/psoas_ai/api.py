"""API HTTP del asistente (FastAPI). Documentación interactiva en /docs.

uv run uvicorn psoas_ai.api:app --reload --port 8000

Con PSOAS_API_URL definida, cada petición debe llevar `Authorization: Bearer <token>` (el
mismo JWT de la app Angular): con él se leen los datos del backend. Sin ella, usa el JSON
de ejemplo y no pide token.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import TypeVar

import httpx
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import Settings
from .fuente_api import SinPermiso
from .rag import responder
from .servicio import Servicio, Servicios

log = logging.getLogger("psoas_ai")
T = TypeVar("T")


class Pregunta(BaseModel):
    pregunta: str = Field(min_length=3, max_length=1000)
    paciente_id: str | None = None


class Peticion(BaseModel):
    mensaje: str = Field(min_length=3, max_length=1000)


class Fuente(BaseModel):
    id: str
    paciente_id: str
    fecha: str
    tipo: str
    texto: str
    score: float


class RespuestaPregunta(BaseModel):
    respuesta: str
    fuentes: list[Fuente]
    citas_invalidas: list[int]
    tokens: int


class RespuestaAsistente(BaseModel):
    respuesta: str
    ruta: str
    aprobado: bool
    intentos: int
    traza: list[str]
    tokens: int


class Salud(BaseModel):
    estado: str
    proveedor: str
    origen_datos: str


def create_app(
    servicio: Servicio | None = None,
    servicios: Servicios | None = None,
    settings: Settings | None = None,
) -> FastAPI:
    """Fábrica. Los tests inyectan un `Servicio` fijo (ignora el token) o un `Servicios`."""
    s = settings or Settings()
    app = FastAPI(title="Psoas · asistente clínico", version="0.2.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=s.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )
    estado: dict[str, Servicios] = {}

    def gestor() -> Servicios:
        # Perezoso: el proveedor se crea en la primera petición, no al importar el módulo.
        if "g" not in estado:
            estado["g"] = servicios or Servicios(s)
        return estado["g"]

    def svc(authorization: str | None) -> Servicio:
        if servicio is not None:
            return servicio
        token = (authorization or "").removeprefix("Bearer ").strip() or None
        try:
            return gestor().obtener(token)
        except SinPermiso as e:
            raise HTTPException(401, "Sesión no válida: vuelve a iniciar sesión") from e
        except httpx.HTTPError as e:
            log.warning("No se pudo leer el backend: %s", e)
            raise HTTPException(502, "No se han podido leer los datos de la clínica") from e

    def con_llm(funcion: Callable[[], T]) -> T:
        """Los fallos del proveedor (cuota agotada, caída) se devuelven como 503 legible."""
        try:
            return funcion()
        except HTTPException:
            raise
        except Exception as e:
            log.exception("Fallo del proveedor de LLM")
            raise HTTPException(503, "El modelo de IA no está disponible ahora mismo") from e

    @app.get("/salud", response_model=Salud)
    def salud():
        if servicio is not None:
            return Salud(estado="ok", proveedor=servicio.llm.nombre, origen_datos="fijo")
        g = gestor()
        return Salud(estado="ok", proveedor=g.llm.nombre, origen_datos=g.origen)

    @app.get("/buscar", response_model=list[Fuente])
    def buscar(
        q: str = Query(min_length=2),
        paciente_id: str | None = None,
        k: int = Query(4, le=10),
        authorization: str | None = Header(default=None),
    ):
        s_ = svc(authorization)
        return con_llm(
            lambda: [_fuente(r) for r in s_.indice.buscar(q, k=k, paciente_id=paciente_id)]
        )

    @app.post("/preguntar", response_model=RespuestaPregunta)
    def preguntar(body: Pregunta, authorization: str | None = Header(default=None)):
        s_ = svc(authorization)
        r = con_llm(
            lambda: responder(
                s_.llm, s_.indice, body.pregunta, body.paciente_id, pacientes=s_.clinica.pacientes
            )
        )
        return RespuestaPregunta(
            respuesta=r.texto,
            fuentes=[_fuente(f) for f in r.fuentes],
            citas_invalidas=r.citas_invalidas,
            tokens=r.uso.input_tokens + r.uso.output_tokens,
        )

    @app.post("/asistente", response_model=RespuestaAsistente)
    def asistente(body: Peticion, authorization: str | None = Header(default=None)):
        s_ = svc(authorization)
        r = con_llm(lambda: s_.orquestador.atender(body.mensaje))
        return RespuestaAsistente(
            respuesta=r.texto,
            ruta=r.ruta,
            aprobado=r.aprobado,
            intentos=r.intentos,
            traza=[f"{t.agente}: {t.detalle}" for t in r.traza],
            tokens=r.uso.input_tokens + r.uso.output_tokens,
        )

    return app


def _fuente(r) -> Fuente:
    f = r.fragmento
    return Fuente(
        id=f.id, paciente_id=f.paciente_id, fecha=f.fecha, tipo=f.tipo, texto=f.texto, score=r.score
    )


app = create_app()
