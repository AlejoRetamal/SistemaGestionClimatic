import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { MenuComponent } from './components/menu/menu';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'inicio/direccion', component: MenuComponent, canActivate: [authGuard] },
  { path: 'inicio/mantenimiento', component: MenuComponent, canActivate: [authGuard] },
  { path: 'inicio/administracion', component: MenuComponent, canActivate: [authGuard] },
  { path: 'inicio/produccion', component: MenuComponent, canActivate: [authGuard] },
];