from psoas_ai.datos import Nota
from psoas_ai.llm import FakeProvider, LLMResponse
from psoas_ai.privacidad import contiene_datos_personales
from psoas_ai.rag import NO_CONSTA, IndiceVectorial, responder, trocear


def test_trocea_por_frases_con_solape():
    nota = Nota("n-x", "p-1", "sesion", "2026-01-01", "")
    texto = "Primera frase larga. " * 3 + "Frase final distinta."
    trozos = trocear(nota, texto, max_caracteres=50)

    assert len(trozos) > 1
    assert [t.id for t in trozos][:2] == ["n-x#0", "n-x#1"]
    # Solape: la última frase de un trozo abre el siguiente.
    assert trozos[1].texto.startswith(trozos[0].texto.split(". ")[-1].rstrip("."))
    assert all(len(t.texto) <= 50 + 25 for t in trozos)


def test_indexa_anonimizado_nunca_guarda_datos_personales(indice, clinica):
    resultados = indice.buscar("contacto teléfono email", k=10)
    assert resultados
    assert not any(
        contiene_datos_personales(r.fragmento.texto, clinica.pacientes) for r in resultados
    )


def test_busqueda_semantica_encuentra_la_nota_relevante(indice):
    assert indice.buscar("dolor al bajar escaleras", k=1)[0].fragmento.nota_id == "n-4"


def test_el_filtro_por_paciente_no_mezcla_historias(indice):
    resultados = indice.buscar("dolor al saltar en la rodilla", k=5, paciente_id="p-1")
    assert resultados and {r.fragmento.paciente_id for r in resultados} == {"p-1"}


def test_responde_con_contexto_numerado_y_sin_datos_personales(indice, clinica):
    llm = FakeProvider([LLMResponse(text="Tiene una tendinopatía rotuliana [1].")])
    r = responder(
        llm, indice, "¿Qué tiene en la rodilla Mario Sanz Gil?", pacientes=clinica.pacientes
    )

    enviado = llm.llamadas[0]["messages"][0].content
    assert "[1] (diagnostico, 2026-08-18, paciente p-2)" in enviado
    assert "Mario" not in enviado and "[PACIENTE_p-2]" in enviado
    assert "SOLO la información del CONTEXTO" in llm.llamadas[0]["system"]
    assert r.citas == [1] and r.citas_invalidas == []


def test_detecta_citas_a_fragmentos_que_no_existen(indice):
    llm = FakeProvider([LLMResponse(text="Según [1] y [7], mejora.")])
    r = responder(llm, indice, "dolor al saltar", k=2)
    assert r.citas_invalidas == [7]


def test_sin_contexto_relevante_no_llama_al_llm(indice):
    llm = FakeProvider([])  # si se llamara, fallaría: el guion está vacío
    r = responder(llm, indice, "xyz qwerty zzz")
    assert r.texto == NO_CONSTA and not r.llamo_al_llm and llm.llamadas == []


def test_restaura_el_nombre_en_la_respuesta(indice, clinica):
    llm = FakeProvider([LLMResponse(text="[PACIENTE_p-2] mejora [1].")])
    r = responder(llm, indice, "¿Cómo va Mario Sanz Gil al saltar?", pacientes=clinica.pacientes)
    assert r.texto == "Mario Sanz Gil mejora [1]."


def test_reindexar_sustituye_la_coleccion(clinica):
    indice = IndiceVectorial(FakeProvider())
    assert indice.indexar(clinica) == indice.indexar(clinica) == 9
    assert len(indice.buscar("dolor", k=50)) == 9


def test_entiende_citas_agrupadas(indice):
    llm = FakeProvider([LLMResponse(text="Mejora [1, 2] y sigue igual [4,9].")])
    r = responder(llm, indice, "dolor al saltar", k=2)
    assert r.citas == [1, 2, 4, 9] and r.citas_invalidas == [4, 9]
