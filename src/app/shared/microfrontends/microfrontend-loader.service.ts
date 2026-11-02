import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

/**
 * Carga microfrontends publicados como Web Components en tiempo de ejecución.
 *
 * El microfrontend se despliega por su cuenta (otra URL, otro equipo, otro ciclo de
 * versiones). Angular no lo importa ni lo compila: inserta un <script type="module">
 * y espera a que el Custom Element quede registrado.
 *
 * - Devuelve `false` en vez de lanzar si no carga: el MFE es un extra y la página
 *   tiene que funcionar sin él (degradación elegante).
 * - Cachea por URL: aunque varios componentes lo pidan, el script se inserta una vez.
 * - En el servidor (SSR/prerender) no hay `customElements`: devuelve `false`.
 */
@Injectable({ providedIn: 'root' })
export class MicrofrontendLoader {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly cargas = new Map<string, Promise<boolean>>();

  static readonly TIMEOUT_MS = 5000;

  load(url: string | undefined, tagName: string): Promise<boolean> {
    if (!this.isBrowser || !url) {
      return Promise.resolve(false);
    }
    const registry = this.document.defaultView?.customElements;
    if (!registry) {
      return Promise.resolve(false);
    }
    if (registry.get(tagName)) {
      return Promise.resolve(true);
    }
    const enCurso = this.cargas.get(url);
    if (enCurso) {
      return enCurso;
    }

    const carga = new Promise<boolean>((resolve) => {
      const script = this.document.createElement('script');
      script.type = 'module';
      script.src = url;
      script.onerror = () => {
        this.cargas.delete(url); // permite reintentar más tarde
        script.remove();
        resolve(false);
      };
      this.document.head.appendChild(script);

      const timeout = setTimeout(() => resolve(false), MicrofrontendLoader.TIMEOUT_MS);
      registry.whenDefined(tagName).then(() => {
        clearTimeout(timeout);
        resolve(true);
      });
    });

    this.cargas.set(url, carga);
    return carga;
  }
}
