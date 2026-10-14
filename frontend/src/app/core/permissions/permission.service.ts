import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { ModuleKey } from '../models/user';
export interface ModuleCard {
  key: ModuleKey;
  title: string;
  description: string;
  symbol: string;
}
export const MODULES: readonly ModuleCard[] = [
  {
    key: 'administracion',
    title: 'Administración',
    description: 'Personas, proveedores y gestión interna.',
    symbol: 'A',
  },
  {
    key: 'produccion',
    title: 'Producción',
    description: 'Espacio de trabajo de producción.',
    symbol: 'P',
  },
  {
    key: 'mantenimiento',
    title: 'Mantenimiento',
    description: 'Máquinas, trabajos, órdenes e inventario.',
    symbol: 'M',
  },
  {
    key: 'comercial',
    title: 'Comercial / Pedidos',
    description: 'Espacio de gestión comercial.',
    symbol: 'C',
  },
];
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly auth = inject(AuthService);
  // The API supplies the central role matrix; never infer permissions from localStorage.
  readonly modules = computed(() => MODULES.filter((module) => this.canAccess(module.key)));
  canAccess(module: ModuleKey): boolean {
    return this.auth.user()?.modulos.includes(module) ?? false;
  }
}
