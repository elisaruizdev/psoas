"""Modo con datos reales: la API de Psoas leída con el token del usuario (sin red: dobles)."""

import httpx
import pytest
from fastapi.testclient import TestClient

from psoas_ai.api import create_app
from psoas_ai.config import Settings
from psoas_ai.datos import Clinica
from psoas_ai.fuente_api import SinPermiso, cargar_clinica, clinica_desde_json_api
from psoas_ai.llm import FakeProvider
from psoas_ai.llm.cache import ProveedorConCache
from psoas_ai.servicio import Servicios

# Respuestas de la API con la forma real del backend (datos ficticios).
PACIENTE = {
    "id": "u-1",
    "name": "Ana",
    "surname": "López",
    "second_surname": "Serrano",
    "phone": "611000001",
    "email": "ana@example.com",
    "identifier": "12345678Z",
    "consultation_reason": "Dolor lumbar al estar sentada",
    "medical_history": None,
    "createdAt": "2026-10-19T19:28:56.645Z",
}
DIAGNOSTICO = {
    "id": "d-1",
    "diagnosis_date": "2026-09-09",
    "diagnosis_type": "Lumbalgia mecánica",
    "description": "Dolor en zona L4-L5 sin irradiación.",
    "observations": "Trabaja muchas horas frente al ordenador",
}
TRATAMIENTO = {
    "id": "t-1",
    "start_date": "2026-09-14",
    "treatment_name": "Estabilización lumbar",
    "description": "Terapia manual y core.",
    "objectives": "Reducir el dolor",
}
SESION = {
    "id": "s-1",
    "session_date": "2026-09-21",
    "techniques_applied": "Movilización lumbar",
    "patient_evolution": "EVA 6/10 a 4/10",
    "observations": None,
}
CITA = {
    "id": "c-1",
    "patient_id": "u-1",
    "appointment_date": "2026-11-04T09:00:00.000Z",
    "status": "scheduled",
    "physio": {"name": "Laura", "surname": "Martín", "second_surname": None},
}


def respuestas_api(request: httpx.Request) -> httpx.Response:
    if request.headers.get("Authorization") != "Bearer bueno":
        return httpx.Response(401, json={"message": "Unauthorized"})
    rutas = {
        "/patients": [PACIENTE],
        "/diagnoses/patient/u-1": [DIAGNOSTICO],
        "/treatments/patient/u-1": [TRATAMIENTO],
        "/sessions/patient/u-1": [SESION],
        "/appointments": [CITA],
    }
    return httpx.Response(200, json=rutas[request.url.path])


@pytest.fixture
def http():
    return httpx.Client(transport=httpx.MockTransport(respuestas_api))


def test_traduce_la_api_al_modelo_del_asistente(http):
    c = cargar_clinica("http://api:3000/", "bueno", cliente=http)

    assert [p.nombre for p in c.pacientes] == ["Ana López Serrano"]
    assert c.pacientes[0].dni == "12345678Z"
    textos = {n.tipo: n.texto for n in c.notas}
    assert textos["motivo"] == "Dolor lumbar al estar sentada."
    assert textos["diagnostico"].startswith("Lumbalgia mecánica. Dolor en zona L4-L5")
    assert "Objetivos: Reducir el dolor." in textos["tratamiento"]
    assert textos["sesion"] == "Técnicas: Movilización lumbar. Evolución: EVA 6/10 a 4/10."
    # La API da UTC; el asistente trabaja en hora de Madrid (9:00 UTC = 10:00 en noviembre).
    assert c.citas[0].fecha == "2026-11-04T10:00"
    assert c.citas[0].fisio == "Laura Martín"


def test_token_rechazado_por_el_backend(http):
    with pytest.raises(SinPermiso):
        cargar_clinica("http://api:3000", "malo", cliente=http)


def test_sin_notas_vacias_y_campos_opcionales():
    c = clinica_desde_json_api(
        [{"id": "x", "name": "Solo", "consultation_reason": None}], {}, {}, {}, []
    )
    assert c.notas == [] and c.pacientes[0].nombre == "Solo" and c.pacientes[0].dni == ""


# --- Caché de embeddings ----------------------------------------------------------------
def test_la_cache_solo_pide_los_textos_nuevos():
    llamadas = []

    class Contador(FakeProvider):
        def embed(self, texts, for_query=False):
            llamadas.append(list(texts))
            return super().embed(texts, for_query)

    llm = ProveedorConCache(Contador())
    primero = llm.embed(["a dolor", "b rodilla"])
    segundo = llm.embed(["b rodilla", "c cuello", "c cuello"])

    assert llamadas == [["a dolor", "b rodilla"], ["c cuello"]]
    # Aciertos: "b rodilla" (ya estaba) y el segundo "c cuello" (repetido en la misma llamada).
    assert segundo[0] == primero[1] and llm.aciertos == 2
    llm.embed(["a dolor"], for_query=True)  # pregunta ≠ documento: otra entrada
    assert llamadas[-1] == ["a dolor"]


# --- Servicios por token ----------------------------------------------------------------
def settings_api():
    return Settings(proveedor="fake", psoas_api_url="http://api:3000")


def test_sin_url_de_api_usa_el_json_y_no_pide_token():
    servicios = Servicios(Settings(proveedor="fake"), llm=FakeProvider())
    assert servicios.origen == "json"
    assert servicios.obtener(None).indice.total == 9


def test_con_api_exige_token_y_cachea_por_token_durante_el_ttl(clinica):
    cargas, ahora = [], [0.0]

    def cargar(url, token):
        cargas.append(token)
        return clinica

    servicios = Servicios(
        settings_api(), FakeProvider(), cargar, ttl_segundos=60, reloj=lambda: ahora[0]
    )
    with pytest.raises(SinPermiso):
        servicios.obtener(None)

    a = servicios.obtener("tok-1")
    assert servicios.obtener("tok-1") is a  # dentro del TTL: no vuelve al backend
    servicios.obtener("tok-2")  # otro usuario: sus propios datos
    ahora[0] = 61
    assert servicios.obtener("tok-1") is not a  # caducado: se refresca
    assert cargas == ["tok-1", "tok-2", "tok-1"]


# --- API en modo datos reales -----------------------------------------------------------
@pytest.fixture
def cliente_api(http):
    servicios = Servicios(
        settings_api(), FakeProvider(), lambda url, tok: cargar_clinica(url, tok, cliente=http)
    )
    return TestClient(create_app(servicios=servicios, settings=settings_api()))


def test_api_responde_con_los_datos_del_backend(cliente_api):
    assert cliente_api.get("/salud").json()["origen_datos"] == "api"
    r = cliente_api.post(
        "/asistente",
        json={"mensaje": "¿Qué diagnóstico tiene Ana López Serrano?"},
        headers={"Authorization": "Bearer bueno"},
    )
    assert r.status_code == 200
    assert r.json()["ruta"] == "clinico"


@pytest.mark.parametrize("cabeceras", [{}, {"Authorization": "Bearer malo"}])
def test_sin_token_o_con_token_invalido_responde_401(cliente_api, cabeceras):
    r = cliente_api.post("/asistente", json={"mensaje": "hola qué tal"}, headers=cabeceras)
    assert r.status_code == 401


def test_si_el_backend_no_responde_502():
    def caido(url, token):
        raise httpx.ConnectError("sin conexión")

    app = create_app(
        servicios=Servicios(settings_api(), FakeProvider(), caido), settings=settings_api()
    )
    r = TestClient(app).get("/buscar", params={"q": "dolor"}, headers={"Authorization": "Bearer x"})
    assert r.status_code == 502


def test_si_el_modelo_falla_503(clinica):
    class Caido(FakeProvider):
        def chat(self, *args, **kwargs):
            raise RuntimeError("cuota agotada")

    servicios = Servicios(settings_api(), Caido(), lambda url, tok: clinica)
    app = create_app(servicios=servicios, settings=settings_api())
    r = TestClient(app).post(
        "/asistente", json={"mensaje": "¿cómo va Lucía?"}, headers={"Authorization": "Bearer x"}
    )
    assert r.status_code == 503
    assert "no está disponible" in r.json()["detail"]


def test_cors_permite_la_app_angular():
    app = create_app(servicios=Servicios(Settings(proveedor="fake"), FakeProvider()))
    r = TestClient(app).options(
        "/asistente",
        headers={"Origin": "http://localhost:8080", "Access-Control-Request-Method": "POST"},
    )
    assert r.headers["access-control-allow-origin"] == "http://localhost:8080"


def test_clinica_fixture_sigue_siendo_valida(clinica):
    assert isinstance(clinica, Clinica)


# --- Verificación del JWT (defensa en profundidad) ---------------------------------------
def _token(secreto="secreto-de-prueba-con-32-caracteres!", **cambios):
    import time

    import jwt

    datos = {"sub": 1, "exp": int(time.time()) + 3600, **cambios}
    return jwt.encode(datos, secreto, algorithm="HS256")


@pytest.mark.parametrize(
    ("token", "valido"),
    [
        (_token(), True),
        (_token(secreto="otro-secreto-distinto-de-32-caracteres"), False),  # firma falsa
        (_token(exp=1), False),  # caducado
        ("inventado", False),
    ],
)
def test_con_jwt_secret_verifica_firma_y_caducidad_antes_de_ir_al_backend(clinica, token, valido):
    cargas = []
    s = Settings(
        proveedor="fake",
        psoas_api_url="http://api:3000",
        jwt_secret="secreto-de-prueba-con-32-caracteres!",
    )
    servicios = Servicios(s, FakeProvider(), lambda url, tok: cargas.append(tok) or clinica)

    if valido:
        servicios.obtener(token)
        assert cargas == [token]
    else:
        with pytest.raises(SinPermiso):
            servicios.obtener(token)
        assert cargas == []  # ni siquiera se llama al backend


def test_token_sin_caducidad_se_rechaza(clinica):
    import jwt

    s = Settings(proveedor="fake", psoas_api_url="http://api:3000", jwt_secret="s" * 32)
    servicios = Servicios(s, FakeProvider(), lambda url, tok: clinica)
    with pytest.raises(SinPermiso):
        servicios.obtener(jwt.encode({"sub": 1}, "s" * 32, algorithm="HS256"))


def test_cargar_env_no_pisa_lo_que_ya_esta_definido(tmp_path, monkeypatch):
    from psoas_ai.config import cargar_env

    env = tmp_path / ".env"
    env.write_text(
        "# comentario\nPRUEBA_A=desde_archivo\nPRUEBA_B='con comillas'\n\n", encoding="utf-8"
    )
    monkeypatch.setenv("PRUEBA_A", "desde_entorno")
    monkeypatch.delenv("PRUEBA_B", raising=False)
    cargar_env(env)

    import os

    assert os.environ["PRUEBA_A"] == "desde_entorno"
    assert os.environ["PRUEBA_B"] == "con comillas"
