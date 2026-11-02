"""Configuración por variables de entorno (12-factor): nada de claves en el código."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


def cargar_env(ruta: Path = RAIZ / ".env") -> None:
    """Lee `ai/.env` (ignorado por git) si existe. Las variables ya definidas en el entorno
    mandan: así Docker o el CI pueden sobrescribirlas sin tocar el archivo."""
    if not ruta.is_file():
        return
    for linea in ruta.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        clave, valor = linea.split("=", 1)
        os.environ.setdefault(clave.strip(), valor.strip().strip("\"'"))


# Los tests no deben depender del .env de quien los ejecuta.
if os.getenv("PSOAS_AI_SIN_ENV") != "1":
    cargar_env()


@dataclass(frozen=True)
class Settings:
    # gemini (gratis con clave de Google AI Studio) | openai | azure | fake (sin red, para tests)
    proveedor: str = field(default_factory=lambda: os.getenv("LLM_PROVIDER", "fake"))

    gemini_api_key: str | None = field(default_factory=lambda: os.getenv("GEMINI_API_KEY"))
    # Alias que siempre apunta al Flash vigente: evita que el código caduque con cada versión.
    gemini_modelo: str = field(
        default_factory=lambda: os.getenv(
            "GEMINI_MODEL", "gemini-flash-latest,gemini-flash-lite-latest"
        )
    )
    gemini_modelo_embeddings: str = field(
        default_factory=lambda: os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
    )

    openai_api_key: str | None = field(default_factory=lambda: os.getenv("OPENAI_API_KEY"))
    openai_modelo: str = field(default_factory=lambda: os.getenv("OPENAI_MODEL", "gpt-4o-mini"))
    openai_modelo_embeddings: str = field(
        default_factory=lambda: os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
    )

    # En Azure el "modelo" es el nombre del deployment que creas en Azure AI Foundry.
    azure_endpoint: str | None = field(default_factory=lambda: os.getenv("AZURE_OPENAI_ENDPOINT"))
    azure_api_key: str | None = field(default_factory=lambda: os.getenv("AZURE_OPENAI_API_KEY"))
    azure_deployment: str = field(
        default_factory=lambda: os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")
    )
    azure_deployment_embeddings: str = field(
        default_factory=lambda: os.getenv(
            "AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-small"
        )
    )

    datos: Path = field(
        default_factory=lambda: Path(os.getenv("PSOAS_AI_DATA", RAIZ / "data" / "clinica.json"))
    )
    # Si está, los datos se leen de la API de Psoas con el token de cada usuario.
    psoas_api_url: str | None = field(default_factory=lambda: os.getenv("PSOAS_API_URL") or None)
    # Secreto con el que el backend firma los JWT. Si está, el asistente verifica la firma y la
    # caducidad del token antes de pedir nada: no depende de que el backend lo compruebe.
    jwt_secret: str | None = field(default_factory=lambda: os.getenv("JWT_SECRET") or None)
    # Orígenes del navegador que pueden llamar a esta API (la app Angular).
    cors_origins: list[str] = field(
        default_factory=lambda: os.getenv(
            "CORS_ORIGINS", "http://localhost:4200,http://localhost:8080"
        ).split(",")
    )
