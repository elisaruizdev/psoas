"""Configuración por variables de entorno (12-factor): nada de claves en el código."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    # gemini (gratis con clave de Google AI Studio) | openai | azure | fake (sin red, para tests)
    proveedor: str = field(default_factory=lambda: os.getenv("LLM_PROVIDER", "fake"))

    gemini_api_key: str | None = field(default_factory=lambda: os.getenv("GEMINI_API_KEY"))
    # Alias que siempre apunta al Flash vigente: evita que el código caduque con cada versión.
    gemini_modelo: str = field(
        default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-flash-latest")
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
