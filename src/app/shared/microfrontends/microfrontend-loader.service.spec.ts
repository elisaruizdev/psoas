import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { MicrofrontendLoader } from './microfrontend-loader.service';

describe('MicrofrontendLoader', () => {
  // Cada test usa un nombre de etiqueta único: customElements no permite "des-registrar".
  let contador = 0;
  const etiquetaUnica = () => `mfe-prueba-${Date.now()}-${contador++}`;

  function crear(platform: 'browser' | 'server' = 'browser'): MicrofrontendLoader {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
    return TestBed.inject(MicrofrontendLoader);
  }

  afterEach(() => {
    document.head.querySelectorAll('script[src^="data:"], script[src*="no-existe"]').forEach((s) => s.remove());
  });

  it('sin URL o en el servidor no carga nada', async () => {
    expect(await crear().load(undefined, etiquetaUnica())).toBeFalse();
    TestBed.resetTestingModule();
    expect(await crear('server').load('https://cdn/mfe.js', etiquetaUnica())).toBeFalse();
  });

  it('si el elemento ya está registrado, no inserta ningún script', async () => {
    const etiqueta = etiquetaUnica();
    customElements.define(etiqueta, class extends HTMLElement {});
    const antes = document.head.querySelectorAll('script').length;

    expect(await crear().load('https://cdn/mfe.js', etiqueta)).toBeTrue();
    expect(document.head.querySelectorAll('script').length).toBe(antes);
  });

  it('inserta el script una sola vez y resuelve cuando el elemento se registra', async () => {
    const etiqueta = etiquetaUnica();
    // Un módulo "en línea" que registra el Custom Element, como haría el bundle real.
    const codigo = `customElements.define('${etiqueta}', class extends HTMLElement {});`;
    const url = `data:text/javascript,${encodeURIComponent(codigo)}`;
    const loader = crear();

    const [a, b] = await Promise.all([loader.load(url, etiqueta), loader.load(url, etiqueta)]);

    expect(a).toBeTrue();
    expect(b).toBeTrue();
    expect(document.head.querySelectorAll(`script[src="${url}"]`).length).toBe(1);
  });

  it('si el script no carga, resuelve false (la página sigue funcionando)', async () => {
    const resultado = await crear().load('http://localhost:1/no-existe.js', etiquetaUnica());
    expect(resultado).toBeFalse();
  });
});
