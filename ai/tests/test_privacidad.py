import pytest

from psoas_ai.privacidad import anonimizar, contiene_datos_personales, restaurar


@pytest.mark.parametrize(
    "dato",
    ["12345678Z", "X1234567L", "612 345 678", "+34 699 111 222", "655-43-21-00", "ana@example.com"],
)
def test_detecta_y_sustituye_cada_tipo_de_dato(dato):
    texto, _ = anonimizar(f"Contacto: {dato}.")
    assert dato not in texto
    assert not contiene_datos_personales(texto)


def test_nombres_de_pacientes_conocidos_sin_distinguir_mayusculas(clinica):
    texto, s = anonimizar("lucía garcía lópez vino con Mario Sanz Gil", clinica.pacientes)
    assert texto == "[PACIENTE_p-1] vino con [PACIENTE_p-2]"
    assert s.mapa["[PACIENTE_p-1]"] == "Lucía García López"


def test_el_mismo_valor_recibe_el_mismo_marcador_y_se_puede_restaurar():
    original = "Llamar al 612 345 678. Si no contesta, otra vez al 612 345 678 o a b@c.es"
    texto, s = anonimizar(original)
    assert texto.count("[TEL_1]") == 2
    assert "[EMAIL_1]" in texto
    assert restaurar(texto, s) == original


def test_no_confunde_cifras_clinicas_con_telefonos():
    texto, s = anonimizar("EVA 7/10, 5 series de 45 segundos, 30 minutos sentada")
    assert s.mapa == {}
    assert texto == "EVA 7/10, 5 series de 45 segundos, 30 minutos sentada"
