"""Proveedores de LLM intercambiables detrás de un mismo contrato (`LLMProvider`)."""

from __future__ import annotations

from ..config import Settings
from .base import LLMProvider, LLMResponse, Message, ToolCall, ToolSpec, Usage
from .fake import FakeProvider

__all__ = [
    "FakeProvider",
    "LLMProvider",
    "LLMResponse",
    "Message",
    "ToolCall",
    "ToolSpec",
    "Usage",
    "crear_proveedor",
]


def crear_proveedor(settings: Settings | None = None) -> LLMProvider:
    """Fábrica: elige el adaptador según LLM_PROVIDER. Los imports son perezosos para no
    cargar SDKs que no se usan."""
    s = settings or Settings()
    match s.proveedor:
        case "fake":
            return FakeProvider()
        case "gemini":
            from .gemini import GeminiProvider

            if not s.gemini_api_key:
                raise ValueError(
                    "Falta GEMINI_API_KEY (gratis en https://aistudio.google.com/apikey)"
                )
            return GeminiProvider(s.gemini_api_key, s.gemini_modelo, s.gemini_modelo_embeddings)
        case "openai":
            from .openai_provider import OpenAIProvider

            if not s.openai_api_key:
                raise ValueError("Falta OPENAI_API_KEY")
            return OpenAIProvider(s.openai_api_key, s.openai_modelo, s.openai_modelo_embeddings)
        case "azure":
            from .openai_provider import OpenAIProvider

            if not (s.azure_endpoint and s.azure_api_key):
                raise ValueError("Faltan AZURE_OPENAI_ENDPOINT y AZURE_OPENAI_API_KEY")
            return OpenAIProvider.azure(
                s.azure_endpoint, s.azure_api_key, s.azure_deployment, s.azure_deployment_embeddings
            )
        case otro:
            raise ValueError(f"LLM_PROVIDER desconocido: {otro!r} (gemini | openai | azure | fake)")
