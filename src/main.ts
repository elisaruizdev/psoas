import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  // Si Angular no llega a arrancar no hay interfaz donde avisar: la consola es lo único que queda.
  // eslint-disable-next-line no-console
  .catch((err) => console.error(err));
