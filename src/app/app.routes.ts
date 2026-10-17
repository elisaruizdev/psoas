import { Routes } from '@angular/router';
import { AUTH_ROUTES } from './features/auth/auth.routes';
import { authGuard } from './features/auth/guards/auth.guard';

export const routes: Routes = [
  ...AUTH_ROUTES,
  {
    path: '',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/private-area/private-area.routes').then((m) => m.privateAreaRoutes),
  },
];   