import json

import pytest

from psoas_ai.agents import FUERA_DE_AMBITO, Orquestador, ejecutar_agente, herramientas_clinica
from psoas_ai.llm import FakeProvider, LLMResponse, ToolCall


@pytest.fixture
def herramientas(clinica, indice):
    return herramientas_clinica(clinica, indice, hoy="2026-11-10")


def llamar(_herramienta, **argumentos):
    return LLMResponse(
        tool_calls=[ToolCall(id=f"id-{_herramienta}", name=_herramienta, arguments=argumentos)]
    )


def json_(**valores):
    return LLMResponse(text=json.dumps(valores))


# --- Herramientas -------------------------------------------------------------------------
def test_specs_en_json_schema_con_obligatorios_y_opcionales(herramientas):
    spec = next(s for s in herramientas.specs if s.name == "citas_de_paciente")
    assert spec.parameters["required"] == ["paciente_id"]
    assert set(spec.parameters["properties"]) == {"paciente_id", "desde"}


@pytest.mark.parametrize(
    ("nombre", "argumentos", "error"),
    [
        ("no_existe", {}, "no existe"),
        ("citas_de_paciente", {}, "Faltan argumentos"),
        ("citas_de_paciente", {"paciente_id": "p-1", "hackear": True}, "desconocidos"),
        ("citas_de_paciente", {"paciente_id": 1}, "debe ser string"),
    ],
)
def test_valida_lo_que_pide_el_modelo_y_devuelve_el_error_como_resultado(
    herramientas, nombre, argumentos, error
):
    assert error in json.loads(herramientas.ejecutar(nombre, argumentos))["error"]


def test_herramientas_devuelven_ids_y_no_datos_personales(herramientas):
    assert json.loads(herramientas.ejecutar("buscar_paciente", {"nombre": "lucia"})) == [
        {"paciente_id": "p-1"}
    ]
    citas = json.loads(
        herramientas.ejecutar("citas_de_paciente", {"paciente_id": "p-1", "desde": "2026-11-10"})
    )
    assert citas == [{"fecha": "2026-11-18T10:00", "fisio": "Ana Ruiz", "estado": "programada"}]
    notas = herramientas.ejecutar(
        "buscar_en_historia", {"consulta": "teléfono de contacto", "paciente_id": "p-1"}
    )
    assert "612" not in notas


# --- Bucle del agente --------------------------------------------------------------------
def test_bucle_encadena_herramientas_hasta_la_respuesta_final(herramientas):
    llm = FakeProvider(
        [
            llamar("buscar_paciente", nombre="Lucía"),
            llamar("citas_de_paciente", paciente_id="p-1", desde="2026-11-10"),
            LLMResponse(text="Su próxima cita es el 18/11 a las 10:00 con Ana Ruiz."),
        ]
    )
    r = ejecutar_agente(llm, "sistema", "¿Próxima cita de Lucía?", herramientas)

    assert r.completado and r.respuesta.startswith("Su próxima cita es el 18/11")
    assert [p.herramienta for p in r.pasos] == ["buscar_paciente", "citas_de_paciente"]
    # En la 3.ª llamada el modelo ve todo: petición, sus 2 peticiones de tool y los 2 resultados.
    historial = llm.llamadas[2]["messages"]
    assert [m.role for m in historial] == ["user", "assistant", "tool", "assistant", "tool"]
    assert historial[2].tool_call_id == "id-buscar_paciente"


def test_bucle_se_corta_al_llegar_al_limite_de_pasos(herramientas):
    llm = FakeProvider(lambda *_: llamar("fecha_de_hoy"))  # un modelo que nunca termina
    r = ejecutar_agente(llm, "s", "x", herramientas, max_pasos=3)
    assert not r.completado and len(r.pasos) == 3 and len(llm.llamadas) == 3


# --- Orquestador multiagente ---------------------------------------------------------------
def test_ruta_clinica_con_rag_y_revision_aprobada(clinica, indice):
    llm = FakeProvider(
        [
            json_(ruta="clinico"),
            LLMResponse(text="[PACIENTE_p-2] tiene tendinopatía rotuliana [1]."),
            json_(aprobado=True),
        ]
    )
    r = Orquestador(llm, clinica, indice, "2026-11-10").atender(
        "¿Qué tiene Mario Sanz Gil en la rodilla?"
    )

    assert r.ruta == "clinico" and r.aprobado and r.intentos == 1
    assert r.texto == "Mario Sanz Gil tiene tendinopatía rotuliana [1]."
    assert all("Mario" not in m.content for ll in llm.llamadas for m in ll["messages"])
    # El RAG se filtró por el paciente nombrado.
    assert "paciente p-2" in llm.llamadas[1]["messages"][0].content
    assert "paciente p-1" not in llm.llamadas[1]["messages"][0].content


def test_si_el_revisor_rechaza_reintenta_con_su_critica(clinica, indice):
    llm = FakeProvider(
        [
            json_(ruta="clinico"),
            LLMResponse(text="Tiene una rotura de ligamento [1]."),
            json_(aprobado=False, problemas=["la rotura no aparece en las fuentes"]),
            LLMResponse(text="Tiene tendinopatía rotuliana [1]."),
            json_(aprobado=True),
        ]
    )
    r = Orquestador(llm, clinica, indice, "2026-11-10").atender(
        "¿Qué tiene Mario Sanz Gil en la rodilla?"
    )

    assert r.aprobado and r.intentos == 2 and r.texto == "Tiene tendinopatía rotuliana [1]."
    reintento = llm.llamadas[3]["messages"][0].content
    assert "CORRIGE ESTO" in reintento and "la rotura no aparece en las fuentes" in reintento


def test_si_nunca_aprueba_avisa_al_usuario(clinica, indice):
    llm = FakeProvider(
        [json_(ruta="clinico")]
        + [LLMResponse(text="Algo [1]."), json_(aprobado=False, problemas=["x"])] * 2
    )
    r = Orquestador(llm, clinica, indice, "2026-11-10").atender(
        "¿Qué tiene Mario Sanz Gil en la rodilla?"
    )
    assert not r.aprobado and r.intentos == 2 and "verifícala" in r.texto


def test_ruta_agenda_usa_el_agente_con_herramientas(clinica, indice):
    llm = FakeProvider(
        [
            json_(ruta="agenda"),
            llamar("buscar_paciente", nombre="[PACIENTE_p-3]"),
            llamar("citas_de_paciente", paciente_id="p-3"),
            LLMResponse(text="[PACIENTE_p-3] tiene cita el 5/11 a las 9:00."),
            json_(aprobado=True),
        ]
    )
    r = Orquestador(llm, clinica, indice, "2026-11-01").atender(
        "¿Cuándo tiene cita Carmen Ortega Ruiz?"
    )

    assert r.ruta == "agenda" and r.texto == "Carmen Ortega Ruiz tiene cita el 5/11 a las 9:00."
    assert [t.agente for t in r.traza] == ["enrutador", "agenda", "agenda", "revisor"]
    assert (
        "citas_de_paciente" in llm.llamadas[-1]["messages"][0].content
    )  # el revisor ve las fuentes


@pytest.mark.parametrize(
    "salida", ['{"ruta": "fuera_de_ambito"}', '{"ruta": "inventada"}', "no es json"]
)
def test_fuera_de_ambito_o_salida_rara_responde_fijo_sin_mas_llamadas(clinica, indice, salida):
    llm = FakeProvider([LLMResponse(text=salida)])
    r = Orquestador(llm, clinica, indice, "2026-11-10").atender("¿Me recetas ibuprofeno?")
    assert r.texto == FUERA_DE_AMBITO and r.ruta == "fuera_de_ambito" and len(llm.llamadas) == 1


def test_buscar_paciente_acepta_el_marcador_anonimizado(herramientas):
    assert json.loads(herramientas.ejecutar("buscar_paciente", {"nombre": "[PACIENTE_p-3]"})) == [
        {"paciente_id": "p-3"}
    ]
    assert "aviso" in json.loads(
        herramientas.ejecutar("buscar_paciente", {"nombre": "[PACIENTE_zz]"})
    )
