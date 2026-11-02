"""API HTTP del asistente (FastAPI). Documentación interactiva en /docs.

uv run uvicorn psoas_ai.api:app --reload --port 8000
"""

from __future__ import annotations

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .servicio import Servicio


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


def create_app(servicio: Servicio | None = None) -> FastAPI:
    """Fábrica: los tests inyectan un Servicio con un proveedor falso."""
    app = FastAPI(title="Psoas · asistente clínico", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:4200"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    estado: dict[str, Servicio] = {}

    def svc() -> Servicio:
        # Perezoso: el índice se construye en la primera petición, no al importar el módulo.
        if "s" not in estado:
            estado["s"] = servicio or Servicio.crear()
        return estado["s"]

    @app.get("/salud")
    def salud() -> dict:
        s = svc()
        return {"estado": "ok", "proveedor": s.llm.nombre, "fragmentos_indexados": s.indice.total}

    @app.get("/buscar", response_model=list[Fuente])
    def buscar(
        q: str = Query(min_length=2), paciente_id: str | None = None, k: int = Query(4, le=10)
    ):
        return [_fuente(r) for r in svc().indice.buscar(q, k=k, paciente_id=paciente_id)]

    @app.post("/preguntar", response_model=RespuestaPregunta)
    def preguntar(body: Pregunta):
        from .rag import responder

        s = svc()
        r = responder(
            s.llm, s.indice, body.pregunta, body.paciente_id, pacientes=s.clinica.pacientes
        )
        return RespuestaPregunta(
            respuesta=r.texto,
            fuentes=[_fuente(f) for f in r.fuentes],
            citas_invalidas=r.citas_invalidas,
            tokens=r.uso.input_tokens + r.uso.output_tokens,
        )

    @app.post("/asistente", response_model=RespuestaAsistente)
    def asistente(body: Peticion):
        r = svc().orquestador.atender(body.mensaje)
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
