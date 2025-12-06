import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/login-layout/login-layout').then((m) => m.LoginLayout),
    children: [
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
      {
        path: 'login',
        loadComponent: () => import('./pages/login/login').then((m) => m.Login),
        title: 'Iniciar sesión - psoas',
      },
      {
        path: 'registro',
        loadComponent: () => import('./pages/register/register').then((m) => m.Register),
        title: 'Solicitar acceso - psoas',
      },
      {
        path: 'resetear-contraseña',
        loadComponent: () =>
          import('./pages/reset-password/reset-password').then((m) => m.ResetPassword),
        title: 'Restablecer contraseña - psoas',
      },
      {
        path: 'verificar-registro',
        loadComponent: () =>
          import('./pages/verify-register/verify-register').then((m) => m.VerifyRegister),
        title: 'Verificar email - psoas',
      },
      {
        path: 'recuperar-contraseña',
        loadComponent: () =>
          import('./pages/forgot-password/forgot-password').then((m) => m.ForgotPassword),
        title: 'Recuperar contraseña - psoas',
      },
    ],
  },
];