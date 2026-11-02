import pytest

from psoas_ai.config import Settings
from psoas_ai.datos import Clinica
from psoas_ai.llm import FakeProvider
from psoas_ai.rag import IndiceVectorial


@pytest.fixture
def clinica() -> Clinica:
    return Clinica.desde_json(Settings().datos)


@pytest.fixture
def indice(clinica) -> IndiceVectorial:
    indice = IndiceVectorial(FakeProvider())
    indice.indexar(clinica)
    return indice
