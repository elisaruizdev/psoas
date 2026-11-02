"""Monta las piezas: datos, proveedor, índice vectorial y orquestador.

Dos orígenes de datos:
- JSON de ejemplo (`ai/data/clinica.json`): demo sin backend.
- API de Psoas (`PSOAS_API_URL`): los datos reales, leídos con el token de cada usuario.
  Se guardan unos segundos por token para no pedir todo al backend en cada pregunta.
"""

from __future__ import annotations

import hashlib
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime

import jwt

from .agents import Orquestador
from .config import Settings
from .datos import Clinica
from .fuente_api import ZONA, SinPermiso, cargar_clinica
from .llm import LLMProvider, crear_proveedor
from .llm.cache import ProveedorConCache
from .rag import IndiceVectorial


def hoy_en_madrid() -> str:
    return datetime.now(ZONA).date().isoformat()


@dataclass
class Servicio:
    llm: LLMProvider
    clinica: Clinica
    indice: IndiceVectorial
    orquestador: Orquestador

    @classmethod
    def desde_clinica(cls, llm: LLMProvider, clinica: Clinica, hoy: str | None = None) -> Servicio:
        indice = IndiceVectorial(llm)
        indice.indexar(clinica)
        return cls(llm, clinica, indice, Orquestador(llm, clinica, indice, hoy or hoy_en_madrid()))

    @classmethod
    def crear(
        cls,
        llm: LLMProvider | None = None,
        settings: Settings | None = None,
        hoy: str | None = None,
    ) -> Servicio:
        """Servicio sobre el JSON de ejemplo."""
        s = settings or Settings()
        return cls.desde_clinica(llm or crear_proveedor(s), Clinica.desde_json(s.datos), hoy)


class Servicios:
    """Da el Servicio que toca a cada petición según el origen de datos configurado."""

    def __init__(
        self,
        settings: Settings | None = None,
        llm: LLMProvider | None = None,
        cargar: Callable[[str, str], Clinica] = cargar_clinica,
        ttl_segundos: float = 60,
        reloj: Callable[[], float] = time.monotonic,
        max_usuarios: int = 50,
    ) -> None:
        self._s = settings or Settings()
        self.llm = ProveedorConCache(llm or crear_proveedor(self._s))
        self._cargar = cargar
        self._ttl = ttl_segundos
        self._reloj = reloj
        self._max = max_usuarios
        self._json: Servicio | None = None
        self._por_token: dict[str, tuple[float, Servicio]] = {}

    @property
    def origen(self) -> str:
        return "api" if self._s.psoas_api_url else "json"

    def obtener(self, token: str | None) -> Servicio:
        if not self._s.psoas_api_url:
            if self._json is None:
                self._json = Servicio.desde_clinica(self.llm, Clinica.desde_json(self._s.datos))
            return self._json

        if not token:
            raise SinPermiso("Falta el token de sesión")
        self._verificar(token)
        # Se guarda el hash, nunca el token en claro.
        clave = hashlib.sha256(token.encode()).hexdigest()
        guardado = self._por_token.get(clave)
        if guardado and self._reloj() - guardado[0] < self._ttl:
            return guardado[1]

        servicio = Servicio.desde_clinica(self.llm, self._cargar(self._s.psoas_api_url, token))
        if len(self._por_token) >= self._max:
            self._por_token.clear()
        self._por_token[clave] = (self._reloj(), servicio)
        return servicio

    def _verificar(self, token: str) -> None:
        """Defensa en profundidad: no fiarse de que el backend compruebe el token.

        Se valida firma (HS256, el algoritmo fijado: nunca el que diga la cabecera del token)
        y caducidad. Sin JWT_SECRET no se puede validar aquí y se depende del backend.
        """
        if not self._s.jwt_secret:
            return
        try:
            # verify_sub=False: el backend de Psoas pone "sub" numérico (el id del fisio) y
            # PyJWT exige texto; la firma y la caducidad, que es lo que importa, sí se validan.
            jwt.decode(
                token,
                self._s.jwt_secret,
                algorithms=["HS256"],
                options={"require": ["exp"], "verify_sub": False},
            )
        except jwt.PyJWTError as e:
            raise SinPermiso(f"Token no válido: {type(e).__name__}") from e
