// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  {
    // microfrontends/ son paquetes independientes, con su propio tsconfig y sus tests.
    ignores: ['dist/**', '.angular/**', 'node_modules/**', 'coverage/**', 'microfrontends/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': 'off',
      '@angular-eslint/component-selector': 'off',
      // Angular moderno (AGENTS.md): signals para inputs, outputs y consultas, inject() y OnPush.
      // Ya lo cumple todo el código: estas reglas evitan volver atrás.
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/prefer-output-emitter-ref': 'error',
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // En la app los errores se cuentan al usuario (avisos o role="alert"), no en la consola.
    files: ['src/**/*.ts'],
    rules: { 'no-console': 'error' },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended],
    rules: {},
  },
);
