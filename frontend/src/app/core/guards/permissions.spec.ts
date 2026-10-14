import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from '../../app.routes';
import { AuthService } from '../auth/auth.service';
import { ModuleService } from '../services/module.service';
import { PermissionService } from '../permissions/permission.service';
import { ModuleKey, Role, User } from '../models/user';
import { MaquinasService } from '../../features/maquinas/maquinas.service';

const matrix: Record<Role, ModuleKey[]> = {
  Direccion: ['administracion', 'produccion', 'mantenimiento', 'comercial'],
  Administracion: ['administracion'],
  Mantenimiento: ['mantenimiento'],
  Produccion: ['mantenimiento'],
};
describe('Role routes and menu', () => {
  const current = signal<User | null>(null);
  beforeEach(() => {
    current.set(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: MaquinasService, useValue: { list: () => of([]) } },
        { provide: AuthService, useValue: { user: current, connectionError: signal('') } },
        {
          provide: ModuleService,
          useValue: {
            getStatus: (modulo: ModuleKey) =>
              of({ modulo, estado: 'pendiente', mensaje: 'Preparado' }),
          },
        },
      ],
    });
  });
  it('redirects anonymous direct navigation to login', async () => {
    await RouterTestingHarness.create('/inicio/mantenimiento');
    expect(TestBed.inject(Router).url).toBe('/login');
  });
  it('protects anonymous nested maintenance navigation', async () => {
    await RouterTestingHarness.create('/inicio/mantenimiento/maquinas');
    expect(TestBed.inject(Router).url).toBe('/login');
  });
  for (const [role, modules] of Object.entries(matrix)) {
    it(`inherits maintenance permission on child routes for ${role}`, async () => {
      current.set({
        id: 1,
        nombre: 'Ana',
        apellido: null,
        email: null,
        grupo: role as Role,
        modulos: modules,
      });
      await RouterTestingHarness.create('/inicio/mantenimiento/maquinas');
      expect(TestBed.inject(Router).url).toBe(
        modules.includes('mantenimiento') ? '/inicio/mantenimiento/maquinas' : '/sin-permiso',
      );
    });
    it(`shows only authorized cards for ${role}`, async () => {
      current.set({
        id: 1,
        nombre: 'Ana',
        apellido: null,
        email: null,
        grupo: role as Role,
        modulos: modules,
      });
      const harness = await RouterTestingHarness.create('/inicio');
      expect(
        TestBed.inject(PermissionService)
          .modules()
          .map((module) => module.key),
      ).toEqual(modules);
      expect(harness.routeNativeElement?.querySelectorAll('.module-card').length).toBe(
        modules.length,
      );
    });
    for (const module of [
      'administracion',
      'produccion',
      'mantenimiento',
      'comercial',
    ] as ModuleKey[]) {
      it(`protects direct URL ${role} -> ${module}`, async () => {
        current.set({
          id: 1,
          nombre: 'Ana',
          apellido: null,
          email: null,
          grupo: role as Role,
          modulos: modules,
        });
        await RouterTestingHarness.create(`/inicio/${module}`);
        expect(TestBed.inject(Router).url).toBe(
          modules.includes(module) ? `/inicio/${module}` : '/sin-permiso',
        );
      });
    }
  }
});
