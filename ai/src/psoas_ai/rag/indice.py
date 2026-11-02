"""Indexación y búsqueda semántica con una base de datos vectorial (Qdrant).

Flujo de un RAG (Retrieval-Augmented Generation):

    INDEXAR (una vez, o cuando cambian los datos)
      notas → anonimizar → trocear (chunks) → embeddings → guardar en Qdrant con metadatos

    CONSULTAR (en cada pregunta)
      pregunta → embedding → vecinos más cercanos (coseno), filtrando por paciente → contexto

Qdrant corre aquí "en memoria" (QdrantClient(":memory:")), sin servidor ni coste. El mismo
código funciona contra un Qdrant en Docker o en la nube cambiando solo la URL.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from ..datos import Clinica, Nota
from ..llm import LLMProvider
from ..privacidad import anonimizar

COLECCION = "notas_clinicas"
MAX_CARACTERES = 400


@dataclass(frozen=True)
class Fragmento:
    id: str  # "n-2#0": nota y posición del trozo
    nota_id: str
    paciente_id: str
    tipo: str
    fecha: str
    texto: str  # ya anonimizado


@dataclass(frozen=True)
class Resultado:
    fragmento: Fragmento
    score: float  # similitud coseno: 1 = idéntico, 0 = nada que ver


def trocear(nota: Nota, texto: str, max_caracteres: int = MAX_CARACTERES) -> list[Fragmento]:
    """Trocea por frases sin pasar de `max_caracteres`, con una frase de solape entre trozos
    para no partir una idea por la mitad. Las notas cortas quedan en un solo trozo."""
    frases = [f for f in re.split(r"(?<=[.!?])\s+", texto.strip()) if f]
    trozos: list[list[str]] = [[]]
    for frase in frases:
        actual = trozos[-1]
        if actual and len(" ".join(actual + [frase])) > max_caracteres:
            trozos.append([actual[-1], frase])  # solape: repite la última frase
        else:
            actual.append(frase)
    return [
        Fragmento(
            id=f"{nota.id}#{i}",
            nota_id=nota.id,
            paciente_id=nota.paciente_id,
            tipo=nota.tipo,
            fecha=nota.fecha,
            texto=" ".join(t),
        )
        for i, t in enumerate(trozos)
        if t
    ]


class IndiceVectorial:
    def __init__(self, llm: LLMProvider, cliente: QdrantClient | None = None) -> None:
        self._llm = llm
        self._qdrant = cliente or QdrantClient(":memory:")
        self.total = 0

    def indexar(self, clinica: Clinica) -> int:
        fragmentos: list[Fragmento] = []
        for nota in clinica.notas:
            texto, _ = anonimizar(nota.texto, clinica.pacientes)
            fragmentos += trocear(nota, texto)
        if not fragmentos:
            return 0

        vectores = self._llm.embed([f.texto for f in fragmentos])
        if self._qdrant.collection_exists(COLECCION):
            self._qdrant.delete_collection(COLECCION)
        self._qdrant.create_collection(
            COLECCION, vectors_config=VectorParams(size=len(vectores[0]), distance=Distance.COSINE)
        )
        self._qdrant.upsert(
            COLECCION,
            points=[
                PointStruct(
                    # Qdrant pide UUID o entero: UUID determinista a partir del id del trozo.
                    id=str(uuid.uuid5(uuid.NAMESPACE_URL, f.id)),
                    vector=v,
                    payload=f.__dict__,
                )
                for f, v in zip(fragmentos, vectores, strict=True)
            ],
        )
        self.total = len(fragmentos)
        return self.total

    def buscar(self, consulta: str, k: int = 4, paciente_id: str | None = None) -> list[Resultado]:
        vector = self._llm.embed([consulta], for_query=True)[0]
        # El filtro por metadatos se aplica DENTRO de la búsqueda: nunca se mezclan pacientes.
        filtro = (
            Filter(must=[FieldCondition(key="paciente_id", match=MatchValue(value=paciente_id))])
            if paciente_id
            else None
        )
        puntos = self._qdrant.query_points(
            COLECCION, query=vector, limit=k, query_filter=filtro, with_payload=True
        ).points
        return [Resultado(Fragmento(**p.payload), p.score) for p in puntos if p.payload]
