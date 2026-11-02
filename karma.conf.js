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
      require('karma-junit-reporter'),
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
      // cobertura: formato XML que pinta Azure DevOps (PublishCodeCoverageResults).
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcovonly' },
        { type: 'cobertura', file: 'cobertura.xml' },
      ],
      // Umbral mínimo de cobertura ("ratchet"): si un cambio la baja, `ng test --code-coverage`
      // falla. Se sube a medida que se añaden tests, nunca se baja.
      check: {
        global: {
          statements: 90,
          branches: 80,
          functions: 88,
          lines: 90,
        },
      },
    },
    // JUnit: lo leen Azure DevOps (PublishTestResults) y GitHub para pintar los tests uno a uno.
    junitReporter: {
      outputDir: require('path').join(__dirname, './test-results/unit'),
      outputFile: 'junit.xml',
      useBrowserName: false,
    },
    reporters: ['progress', 'kjhtml', 'junit'],
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
