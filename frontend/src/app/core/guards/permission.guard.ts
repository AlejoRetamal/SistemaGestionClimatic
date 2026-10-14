import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../permissions/permission.service';
import { ModuleKey } from '../models/user';
export const permissionGuard: CanActivateFn = (route) => {
  const module = route.data['module'] as ModuleKey;
  return inject(PermissionService).canAccess(module)
    ? true
    : inject(Router).createUrlTree(['/sin-permiso']);
};
