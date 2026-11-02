export const environment = {
  production: false,
  baseUrl: 'http://localhost:3000',
  // Microfrontends que se cargan en tiempo de ejecución (ver microfrontends/README.md).
  // En local: `npm run dev` dentro de microfrontends/resumen-citas. Si no está levantado,
  // el dashboard simplemente no muestra el widget.
  microfrontends: {
    resumenCitas: 'http://localhost:4300/src/psoas-resumen-citas.ts',
  },
};
