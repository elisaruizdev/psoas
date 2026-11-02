import { Routes } from '@angular/router';
import { PrivateLayout} from './layout/private-layout/private-layout';

export const privateAreaRoutes: Routes = [
  {
    path: '',
    component: PrivateLayout,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'patients',
        loadComponent: () => import('./patients/patients').then((m) => m.Patients),
      },
      {
        path: 'sessions',
        loadComponent: () => import('./sessions/sessions').then((m) => m.Sessions),
      },
      {
        path: 'physios',
        loadComponent: () => import('./physios/physios').then((m) => m.Physios),
      },
      {
        path: 'assistant',
        loadComponent: () => import('./assistant/assistant').then((m) => m.Assistant),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
];
