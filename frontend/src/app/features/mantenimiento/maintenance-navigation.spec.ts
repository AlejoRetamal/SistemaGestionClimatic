import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { mantenimientoRoutes } from './mantenimiento.routes';
import { CatalogPageComponent } from '../../shared/catalog/catalog-page';
import { CatalogService } from '../../shared/catalog/catalog.service';
import { MaquinaFormComponent } from '../maquinas/maquina-form';
import { MaquinasService } from '../maquinas/maquinas.service';
import { OrdenesService } from '../ordenes/ordenes.service';

const base = '/inicio/mantenimiento';
const catalogs = [
  ['tareas', 'tareas/menu', 'tareas'],
  ['tareas-extraordinarias', 'tareas/menu', 'tareas-extraordinarias'],
  ['planes/preventivos', 'planes', 'planes/preventivos'],
  ['planes/predictivos', 'planes', 'planes/predictivos'],
  ['ordenes', 'ordenes', 'ordenes/listado'],
];

describe('Maintenance menu and form navigation', () => {
  beforeEach(() => {
    const api = {
      list: () => of([]),
      get: () => of({ id: 1, nombre: 'Prueba' }),
      options: () => of([{ value: 1, label: 'Prueba' }]),
      create: () => of({ id: 1 }),
      update: () => of({ id: 1 }),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'inicio/mantenimiento', children: mantenimientoRoutes }]),
        { provide: CatalogService, useValue: api },
        { provide: MaquinasService, useValue: api },
        { provide: OrdenesService, useValue: api },
      ],
    });
  });

  function expectReturns(harness: RouterTestingHarness, target: string, saved = false) {
    const links = harness.routeNativeElement!.querySelectorAll<HTMLAnchorElement>(
      'a.back-link, .form-actions a, .success a',
    );
    expect(links.length).toBe(saved ? 3 : 2);
    for (const link of links) expect(link.getAttribute('href')).toBe(base + '/' + target);
  }

  for (const [path, menu, list] of catalogs) {
    for (const editing of [false, true]) {
      it(`${path}: ${editing ? 'edit returns to list' : 'create returns to menu'}, including after saving`, async () => {
        const harness = await RouterTestingHarness.create();
        const page = await harness.navigateByUrl(
          base + '/' + path + (editing ? '/1/editar' : '/nueva'),
          CatalogPageComponent,
        );
        const target = editing ? list : menu;
        expectReturns(harness, target);
        for (const field of page.definition.fields)
          page.form.controls[field.key].setValue(
            ['number', 'select'].includes(field.type) ? 1 : 'Prueba',
          );
        page.save();
        harness.detectChanges();
        expect(page.success()).not.toBe('');
        expectReturns(harness, target, true);
      });
    }
    it(`${list}: list does not offer a duplicate create entry`, async () => {
      const harness = await RouterTestingHarness.create(base + '/' + list);
      expect(harness.routeNativeElement!.querySelectorAll('.page-heading a').length).toBe(0);
    });
  }

  for (const editing of [false, true]) {
    it(`machines: ${editing ? 'edit returns to list' : 'create returns to menu'} before and after saving`, async () => {
      const harness = await RouterTestingHarness.create();
      const page = await harness.navigateByUrl(
        base + '/maquinas/' + (editing ? '1/editar' : 'nueva'),
        MaquinaFormComponent,
      );
      const target = editing ? 'maquinas/listado' : 'maquinas';
      expectReturns(harness, target);
      page.form.controls.nombre.setValue('Prueba');
      page.save();
      harness.detectChanges();
      expect(page.success()).not.toBe('');
      expectReturns(harness, target, true);
    });
  }
  it('machine list keeps creation in the menu', async () => {
    const harness = await RouterTestingHarness.create(base + '/maquinas/listado');
    expect(harness.routeNativeElement!.querySelectorAll('.page-heading a').length).toBe(0);
  });
});
