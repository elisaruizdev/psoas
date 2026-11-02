@AGENTS.md

## Específico de Claude Code

Este repo trae assets compartidos en `.claude/` (se versionan para que todo el equipo los use):

- **Skills**
  - `componente-angular`: crea un componente siguiendo las convenciones, con su spec.
  - `tests-componente`: cubre un componente existente con tests de comportamiento y comprueba la cobertura.
- **Subagente** `revisor-accesibilidad`: revisa plantillas cambiadas buscando problemas WCAG.
  Úsalo antes de abrir una PR que toque `.html`.
- **Hook** `.claude/hooks/lint-al-editar.mjs` (PostToolUse): tras cada edición pasa ESLint al
  `.ts` editado (o ruff al `.py` de `ai/`) y devuelve los errores al agente para que los corrija
  en el momento. Se activa en `.claude/settings.json`:

  ```json
  {
    "hooks": {
      "PostToolUse": [
        {
          "matcher": "Edit|Write|MultiEdit",
          "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/lint-al-editar.mjs\"", "timeout": 90 }]
        }
      ]
    }
  }
  ```

Preferencias del proyecto: explicaciones en español, cambios pequeños y verificados, y si
descubres un fallo fuera del alcance de la tarea, avísalo en vez de arreglarlo sin preguntar.
