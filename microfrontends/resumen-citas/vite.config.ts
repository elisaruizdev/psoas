/// <reference types="vitest" />
import { defineConfig } from 'vite';

// El microfrontend se publica como UN archivo ES module autocontenido (Lit incluido).
// La app que lo usa (Angular, React, HTML plano...) solo necesita:
//   <script type="module" src="https://cdn.../psoas-resumen-citas.js"></script>
export default defineConfig({
  build: {
    lib: {
      entry: 'src/psoas-resumen-citas.ts',
      formats: ['es'],
      fileName: () => 'psoas-resumen-citas.js',
    },
    target: 'es2022',
  },
  // En local la app Angular (localhost:4200) lo pide a este servidor (localhost:4300).
  server: { cors: true },
  preview: { cors: true },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
