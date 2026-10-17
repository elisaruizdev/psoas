import { Routes } from '@angular/router';
import { publicGuard } from './guards/public.guard';

const loginLayout = () =>
  import('./components/login-layout/login-layout').then((m) => m.LoginLayout);

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    canActivate: [publicGuard],
    loadComponent: loginLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/login/login').then((m) => m.Login),
        title: 'Iniciar sesión - psoas',
      },
    ],
  },
  {
    path: 'registro',
    canActivate: [publicGuard],
    loadComponent: loginLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/register/register').then((m) => m.Register),
        title: 'Solicitar acceso - psoas',
      },
    ],
  },
  {
    path: 'resetear-contraseña',
    canActivate: [publicGuard],
    loadComponent: loginLayout,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/reset-password/reset-password').then((m) => m.ResetPassword),
        title: 'Restablecer contraseña - psoas',
      },
    ],
  },
  {
    path: 'verificar-registro',
    loadComponent: loginLayout,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/verify-register/verify-register').then((m) => m.VerifyRegister),
        title: 'Verificar email - psoas',
      },
    ],
  },
  {
    path: 'recuperar-contraseña',
    canActivate: [publicGuard],
    loadComponent: loginLayout,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/forgot-password/forgot-password').then((m) => m.ForgotPassword),
        title: 'Recuperar contraseña - psoas',
      },
    ],
  },
];
