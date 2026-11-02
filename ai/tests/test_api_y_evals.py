import pytest
from fastapi.testclient import TestClient

from psoas_ai.api import create_app
from psoas_ai.evals import evaluar
from psoas_ai.llm import FakeProvider, LLMResponse
from psoas_ai.servicio import Servicio


@pytest.fixture
def cliente():
    servicio = Servicio.crear(llm=FakeProvider(), hoy="2026-11-01")
    return TestClient(create_app(servicio))


def test_salud(cliente):
    assert cliente.get("/salud").json() == {
        "estado": "ok",
        "proveedor": "fake",
        "origen_datos": "fijo",
    }


def test_buscar_con_filtro(cliente):
    r = cliente.get("/buscar", params={"q": "dolor al saltar", "paciente_id": "p-2", "k": 2})
    assert r.status_code == 200
    assert [f["paciente_id"] for f in r.json()] == ["p-2", "p-2"]


def test_preguntar_devuelve_respuesta_y_fuentes(cliente):
    r = cliente.post(
        "/preguntar", json={"pregunta": "¿qué ejercicios de ergonomía tiene?", "paciente_id": "p-3"}
    )
    cuerpo = r.json()
    assert r.status_code == 200
    assert cuerpo["fuentes"][0]["id"] == "n-8#0"
    assert cuerpo["respuesta"].endswith("[1]") and cuerpo["citas_invalidas"] == []


def test_asistente_devuelve_traza(cliente):
    cuerpo = cliente.post(
        "/asistente", json={"mensaje": "¿Cuándo es la próxima cita de Lucía?"}
    ).json()
    assert cuerpo["ruta"] == "agenda"
    assert cuerpo["traza"][0] == "enrutador: agenda"


@pytest.mark.parametrize(
    ("ruta", "cuerpo"),
    [("/preguntar", {"pregunta": ""}), ("/asistente", {"mensaje": "x" * 1001}), ("/preguntar", {})],
)
def test_valida_la_entrada(cliente, ruta, cuerpo):
    assert cliente.post(ruta, json=cuerpo).status_code == 422


def test_evals_de_recuperacion_y_privacidad(clinica):
    informe = evaluar(FakeProvider(), clinica)
    assert informe.hit_at_k == 1.0 and informe.mrr > 0.9
    assert informe.fugas_privacidad == 0
    assert informe.respuestas_total == 0  # con el falso no se evalúa la redacción
    assert "hit@k=100%" in informe.resumen()


def test_evals_de_respuestas_con_un_llm(clinica):
    class LLMDePrueba(FakeProvider):  # no es FakeProvider "puro": activa las evals de respuesta
        pass

    casos = {
        "recuperacion": [{"pregunta": "dolor al bajar escaleras", "esperada": "n-4"}],
        "respuestas": [
            {
                "pregunta": "¿Mejora la EVA de dolor?",
                "paciente_id": "p-1",
                "debe_contener": ["3/10"],
                "no_debe_contener": [],
            },
            {
                "pregunta": "¿Qué le duele al bajar escaleras?",
                "paciente_id": "p-2",
                "debe_contener": ["tendinopat"],
                "no_debe_contener": ["ibuprofeno"],
            },
        ],
    }

    def responde(system, messages, tools, json_output):
        if "EVA" in messages[-1].content.split("PREGUNTA:")[-1]:
            return LLMResponse(text="Ha bajado a 3/10 [1].")  # correcta
        return LLMResponse(text="Toma ibuprofeno [9].")  # inventada y con una cita inexistente

    informe = evaluar(LLMDePrueba(responde), clinica, casos=casos)

    assert (informe.respuestas_ok, informe.respuestas_total) == (1, 2)
    fallo = informe.fallos_respuesta[0]
    assert "falta 'tendinopat'" in fallo
    assert "sobra 'ibuprofeno'" in fallo
    assert "cita inválida 9" in fallo
