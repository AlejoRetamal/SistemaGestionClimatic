import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RegistrarTareaComponent } from './registrar-tarea';
import { RegistrosService } from './registros.service';
import { MaquinasService } from '../maquinas/maquinas.service';
import { RepuestosService } from '../repuestos-inventario/repuestos.service';
import { OrdenesService } from '../ordenes/ordenes.service';
import { AuthService } from '../../core/auth/auth.service';

describe('Work registration form', () => {
  const create = vi.fn();
  const listParts = vi.fn();
  let component: RegistrarTareaComponent;
  beforeEach(() => {
    create.mockReset().mockReturnValue(of({ id: 99 }));
    listParts.mockReset().mockReturnValue(of([{ id: 3, nombre: 'Correa', cantidad_actual: 4 }]));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    TestBed.configureTestingModule({
      imports: [RegistrarTareaComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user: signal({ id: 7, nombre: 'Ana' }) } },
        {
          provide: RegistrosService,
          useValue: {
            create,
            tasks: () =>
              of([
                { id: 1, nombre: 'Lubricar', maquina_id: 10, maquina_nombre: 'Prensa' },
                { id: 2, nombre: 'Limpiar', maquina_id: 20, maquina_nombre: 'Torno' },
              ]),
          },
        },
        { provide: MaquinasService, useValue: { get: (id: number) => of({ id, horas: 100 }) } },
        { provide: RepuestosService, useValue: { list: listParts } },
        {
          provide: OrdenesService,
          useValue: {
            list: () =>
              of([
                { id: 4, maquina_id: 10, descripcion: 'Revisar', activo: 1 },
                { id: 5, maquina_id: 20, descripcion: 'Reparar', activo: 1 },
              ]),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(RegistrarTareaComponent);
    component = fixture.componentInstance;
    component.form.controls.tarea_id.setValue(1);
    component.selectTask();
    component.form.patchValue({
      duracion_inicio: '2026-10-14T08:00',
      duracion_fin: '2026-10-14T09:00',
    });
    fixture.detectChanges();
  });
  afterEach(() => vi.restoreAllMocks());
  function part(quantity = 1): void {
    component.addPart();
    component.parts.at(component.parts.length - 1).setValue({ repuesto_id: 3, cantidad: quantity });
  }
  it('derives machine, filters parts and clears incompatible selections when changing task', () => {
    expect(listParts).toHaveBeenCalledWith(10);
    expect(component.compatibleOrders().map((order) => order.id)).toEqual([4]);
    part();
    component.form.controls.orden_mantenimiento_id.setValue(4);
    component.form.controls.tarea_id.setValue(2);
    component.selectTask();
    expect(listParts).toHaveBeenLastCalledWith(20);
    expect(component.parts.length).toBe(0);
    expect(component.form.controls.orden_mantenimiento_id.value).toBeNull();
    expect(component.machine()?.id).toBe(20);
  });
  it('does not submit duplicate parts or quantities beyond available stock', () => {
    part();
    part();
    component.save();
    expect(component.error()).toContain('No repitas');
    component.parts.removeAt(1);
    component.parts.at(0).controls.cantidad.setValue(5);
    component.save();
    expect(component.error()).toContain('Correa');
    expect(create).not.toHaveBeenCalled();
  });
  it('rejects reversed times and excessive decimal precision before API calls', () => {
    component.form.controls.duracion_fin.setValue('2026-10-14T07:00');
    component.save();
    expect(component.error()).toContain('anterior');
    component.form.patchValue({ duracion_fin: '2026-10-14T09:00', medicion_horometro: 100.001 });
    component.save();
    expect(component.form.invalid).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });
  it('requires confirmation for a lower reading and submits no employee, machine or origin override', () => {
    component.form.controls.medicion_horometro.setValue(90);
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    component.save();
    expect(create).not.toHaveBeenCalled();
    component.save();
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('bajará de 100 a 90'));
    expect(create).toHaveBeenCalledWith({
      tarea_id: 1,
      medicion_horometro: 90,
      duracion_inicio: '2026-10-14T08:00',
      duracion_fin: '2026-10-14T09:00',
      orden_mantenimiento_id: null,
      repuestos: [],
      confirmar_reduccion: true,
      horas_esperadas: 100,
    });
    component.save();
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('preserves the form after server rejection and allows a retry', () => {
    part(2);
    create.mockReturnValueOnce(
      throwError(
        () => new HttpErrorResponse({ status: 409, error: { error: 'El stock cambió.' } }),
      ),
    );
    component.save();
    expect(component.error()).toBe('El stock cambió.');
    expect(component.saving()).toBe(false);
    expect(component.savedId()).toBeNull();
    expect(component.parts.at(0).controls.cantidad.value).toBe(2);
    component.save();
    expect(component.savedId()).toBe(99);
  });
});
