// Configuración de Karma (runner de los tests unitarios).
// https://karma-runner.github.io/latest/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
    ],
    client: {
      jasmine: {
        // Jasmine ejecuta los tests en orden aleatorio: si uno depende de otro, sale a la luz.
        random: true,
      },
    },
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/psoas'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }, { type: 'lcovonly' }],
      // Umbral mínimo de cobertura ("ratchet"): si un cambio la baja, `ng test --code-coverage`
      // falla. Se sube a medida que se añaden tests, nunca se baja.
      check: {
        global: {
          statements: 45,
          branches: 20,
          functions: 30,
          lines: 45,
        },
      },
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    customLaunchers: {
      // Chrome sin ventana para CI y contenedores (sin sandbox de usuario).
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox'],
      },
    },
    restartOnFileChange: true,
  });
};
