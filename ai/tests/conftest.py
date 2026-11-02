import os

# Antes de importar psoas_ai: los tests no leen el ai/.env de quien los ejecuta (su clave).
os.environ["PSOAS_AI_SIN_ENV"] = "1"

import pytest  # noqa: E402

from psoas_ai.config import Settings  # noqa: E402
from psoas_ai.datos import Clinica  # noqa: E402
from psoas_ai.llm import FakeProvider  # noqa: E402
from psoas_ai.rag import IndiceVectorial  # noqa: E402


@pytest.fixture
def clinica() -> Clinica:
    return Clinica.desde_json(Settings().datos)


@pytest.fixture
def indice(clinica) -> IndiceVectorial:
    indice = IndiceVectorial(FakeProvider())
    indice.indexar(clinica)
    return indice
