"""Línea de comandos para probar el asistente sin levantar la API.

uv run psoas-ai buscar "dolor al saltar"
uv run psoas-ai preguntar "¿Cómo va la lumbalgia de Lucía García López?"
uv run psoas-ai asistente "¿Cuándo es la próxima cita de Mario?"
uv run psoas-ai evals
"""

from __future__ import annotations

import argparse
import sys

from .evals import evaluar
from .rag import responder
from .servicio import Servicio


def main(argv: list[str] | None = None) -> int:
    # La consola de Windows no siempre usa UTF-8: evita errores con tildes y símbolos.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(prog="psoas-ai", description="Asistente clínico de Psoas")
    sub = parser.add_subparsers(dest="comando", required=True)
    b = sub.add_parser("buscar", help="búsqueda semántica en las notas")
    b.add_argument("consulta")
    b.add_argument("--paciente")
    p = sub.add_parser("preguntar", help="pregunta con RAG y citas")
    p.add_argument("pregunta")
    p.add_argument("--paciente")
    a = sub.add_parser("asistente", help="flujo multiagente (enrutador, especialistas, revisor)")
    a.add_argument("mensaje")
    sub.add_parser("evals", help="métricas de recuperación, privacidad y respuestas")
    args = parser.parse_args(argv)

    s = Servicio.crear()
    print(f"[proveedor: {s.llm.nombre} · {s.indice.total} fragmentos indexados]\n")

    if args.comando == "buscar":
        for r in s.indice.buscar(args.consulta, paciente_id=args.paciente):
            print(f"{r.score:.2f}  {r.fragmento.id}  {r.fragmento.texto[:90]}…")
    elif args.comando == "preguntar":
        r = responder(s.llm, s.indice, args.pregunta, args.paciente, pacientes=s.clinica.pacientes)
        print(r.texto, "\n")
        for i, f in enumerate(r.fuentes, 1):
            print(f"  [{i}] {f.fragmento.id} ({f.fragmento.fecha}) score {f.score:.2f}")
    elif args.comando == "asistente":
        r = s.orquestador.atender(args.mensaje)
        print(r.texto, "\n")
        for t in r.traza:
            print(f"  · {t.agente}: {t.detalle}")
        print(f"  tokens: {r.uso.input_tokens} entrada / {r.uso.output_tokens} salida")
    else:
        print(evaluar(s.llm, s.clinica).resumen())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
