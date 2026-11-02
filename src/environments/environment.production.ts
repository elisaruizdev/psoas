export const environment = {
  production: true,
  baseUrl: 'https://psoas-backend.onrender.com',
  // Vacío = desactivado. En un despliegue real sería la URL del bundle en su CDN, p. ej.
  // 'https://mfe.psoas.es/resumen-citas/1.0.0/psoas-resumen-citas.js' (versionado en la URL).
  microfrontends: {
    resumenCitas: '',
  },
};
