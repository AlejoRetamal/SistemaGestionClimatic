import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { MODULES } from './core/permissions/permission.service';
export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'inicio',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () => import('./shared/components/shell').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/inicio/inicio').then((m) => m.InicioComponent),
      },
      {
        path: 'mantenimiento',
        data: { module: 'mantenimiento' },
        canActivate: [permissionGuard],
        canActivateChild: [permissionGuard],
        loadChildren: () =>
          import('./features/mantenimiento/mantenimiento.routes').then(
            (m) => m.mantenimientoRoutes,
          ),
      },
      ...MODULES.filter((module) => module.key !== 'mantenimiento').map((module) => ({
        path: module.key,
        data: { module: module.key },
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./features/inicio/module-page').then((m) => m.ModulePageComponent),
      })),
    ],
  },
  {
    path: 'sin-permiso',
    canActivate: [authGuard],
    data: {
      title: 'Acceso restringido',
      message: 'Tu usuario no tiene permiso para acceder a este módulo.',
    },
    loadComponent: () =>
      import('./shared/components/message-page').then((m) => m.MessagePageComponent),
  },
  {
    path: '**',
    data: {
      title: 'Página no encontrada',
      message: 'La dirección no existe o todavía no está disponible.',
    },
    loadComponent: () =>
      import('./shared/components/message-page').then((m) => m.MessagePageComponent),
  },
];
