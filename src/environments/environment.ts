export const environment = {
  production: false,
  baseUrl: 'http://localhost:3000',
  // Asistente de IA (servicio Python de ai/). Vacío = la pestaña "Asistente" no aparece.
  // En local: `cd ai && uv run uvicorn psoas_ai.api:app --port 8000`.
  aiUrl: 'http://localhost:8000',
  // Microfrontends que se cargan en tiempo de ejecución (ver microfrontends/README.md).
  // En local: `npm run dev` dentro de microfrontends/resumen-citas. Si no está levantado,
  // el dashboard simplemente no muestra el widget.
  microfrontends: {
    resumenCitas: 'http://localhost:4300/src/psoas-resumen-citas.ts',
  },
};
