"""Proveedores: reintentos, fábrica y traducción de formatos (sin llamar a ninguna API)."""

import json

import pytest
from google.genai import types

from psoas_ai.config import Settings
from psoas_ai.llm import FakeProvider, LLMResponse, Message, ToolCall, crear_proveedor
from psoas_ai.llm.fake import embedding_hash, tokens
from psoas_ai.llm.gemini import GeminiProvider
from psoas_ai.llm.openai_provider import _mensaje
from psoas_ai.llm.reintentos import con_reintentos


class ErrorHttp(Exception):
    def __init__(self, code):
        self.code = code


def test_reintenta_429_con_espera_creciente_y_acaba_devolviendo():
    intentos, esperas = [], []

    def llamada():
        intentos.append(1)
        if len(intentos) < 3:
            raise ErrorHttp(429)
        return "ok"

    assert con_reintentos(llamada, base=1.0, dormir=esperas.append) == "ok"
    assert len(intentos) == 3
    assert 1.0 <= esperas[0] < 1.5 and 2.0 <= esperas[1] < 2.5  # exponencial + jitter


def test_no_reintenta_errores_del_cliente():
    def llamada():
        raise ErrorHttp(401)

    with pytest.raises(ErrorHttp):
        con_reintentos(llamada, dormir=lambda _: pytest.fail("no debía esperar"))


def test_se_rinde_tras_el_ultimo_intento():
    def llamada():
        raise ErrorHttp(503)

    with pytest.raises(ErrorHttp):
        con_reintentos(llamada, intentos=2, dormir=lambda _: None)


def test_fabrica_elige_proveedor_y_exige_claves():
    assert crear_proveedor(Settings(proveedor="fake")).nombre == "fake"
    with pytest.raises(ValueError, match="GEMINI_API_KEY"):
        crear_proveedor(Settings(proveedor="gemini", gemini_api_key=None))
    with pytest.raises(ValueError, match="AZURE"):
        crear_proveedor(Settings(proveedor="azure", azure_endpoint=None))
    with pytest.raises(ValueError, match="desconocido"):
        crear_proveedor(Settings(proveedor="otro"))
    azure = crear_proveedor(
        Settings(proveedor="azure", azure_endpoint="https://x.openai.azure.com/", azure_api_key="k")
    )
    assert azure.nombre == "azure"
    assert str(azure._client.base_url) == "https://x.openai.azure.com/openai/v1/"


def test_embeddings_falsos_normalizados_y_parecidos_si_comparten_palabras():
    a, b, c = (
        embedding_hash(t) for t in ["dolor de rodilla", "rodillas con dolor", "cefalea tensional"]
    )
    coseno = lambda x, y: sum(i * j for i, j in zip(x, y, strict=True))  # noqa: E731
    assert abs(coseno(a, a) - 1) < 1e-9
    assert coseno(a, b) > 0.9 > coseno(a, c)
    assert tokens("Rodillas, y CUÁDRICEPS") == ["rodill", "cuadri"]


def test_fake_con_guion_devuelve_en_orden_y_registra_lo_enviado():
    llm = FakeProvider([LLMResponse(text="uno"), LLMResponse(text="dos")])
    assert llm.chat("s", [Message("user", "hola")]).text == "uno"
    assert llm.chat("s", []).text == "dos"
    assert llm.llamadas[0]["messages"][0].content == "hola"
    with pytest.raises(AssertionError, match="sin respuestas"):
        llm.chat("s", [])


def test_traduccion_a_formato_openai():
    llamada = ToolCall(id="c1", name="buscar_paciente", arguments={"nombre": "Lucía"})
    assert _mensaje(Message("assistant", "", tool_calls=[llamada])) == {
        "role": "assistant",
        "content": None,
        "tool_calls": [
            {
                "id": "c1",
                "type": "function",
                "function": {"name": "buscar_paciente", "arguments": '{"nombre": "Lucía"}'},
            }
        ],
    }
    assert _mensaje(Message("tool", '{"ok": 1}', tool_call_id="c1")) == {
        "role": "tool",
        "tool_call_id": "c1",
        "content": '{"ok": 1}',
    }


def test_traduccion_a_formato_gemini_agrupa_resultados_de_herramientas():
    historial = [
        Message("user", "¿citas de Lucía?"),
        Message("assistant", tool_calls=[ToolCall("1", "a", {}), ToolCall("2", "b", {"x": 1})]),
        Message("tool", json.dumps({"r": 1}), tool_call_id="1", name="a"),
        Message("tool", "texto plano", tool_call_id="2", name="b"),
    ]
    contents = GeminiProvider._contents(historial)

    assert [c.role for c in contents] == ["user", "model", "user"]
    assert [p.function_call.name for p in contents[1].parts] == ["a", "b"]
    respuestas = contents[2].parts
    assert [p.function_response.name for p in respuestas] == ["a", "b"]
    assert respuestas[0].function_response.response == {"resultado": {"r": 1}}
    assert respuestas[1].function_response.response == {"resultado": "texto plano"}


def test_gemini_reenvia_el_turno_original_del_modelo():
    original = types.Content(
        role="model", parts=[types.Part(text="pensando", thought_signature=b"firma")]
    )
    contents = GeminiProvider._contents([Message("assistant", raw=original)])
    assert contents[0] is original
