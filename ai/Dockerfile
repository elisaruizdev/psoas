# Imagen del asistente de IA (FastAPI). Las claves NO van en la imagen: llegan al arrancar
# como variables de entorno (docker-compose las lee de ai/.env).
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.13.0 /uv /bin/uv

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

# Primero solo las dependencias: esta capa se reutiliza mientras no cambie uv.lock.
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --locked --no-dev --no-install-project

COPY src ./src
COPY data ./data
RUN uv sync --locked --no-dev

# Sin privilegios de root dentro del contenedor.
RUN useradd --create-home --uid 10001 asistente
USER asistente

EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/salud')"
CMD [".venv/bin/uvicorn", "psoas_ai.api:app", "--host", "0.0.0.0", "--port", "8000"]
