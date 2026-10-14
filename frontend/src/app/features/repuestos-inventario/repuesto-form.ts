import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of, finalize } from 'rxjs';
import { RepuestosService } from './repuestos.service';
import { Prioridad, Proveedor } from './repuesto.model';
import { MaquinasService } from '../maquinas/maquinas.service';
import { Maquina } from '../maquinas/maquina.model';
import { nonBlank } from '../../shared/form-validators';
import { errorMessage } from '../../shared/error-message';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <a class="back-link" routerLink="/inicio/mantenimiento/repuestos">← Repuestos / Inventario</a>
    <h1>{{ id ? 'Editar repuesto' : 'Nuevo repuesto' }}</h1>
    @if (loading()) {
      <p class="notice" role="status">Cargando información…</p>
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (success()) {
      <p class="success" role="status">
        Repuesto guardado. <a routerLink="/inicio/mantenimiento/repuestos">Volver al listado</a>
      </p>
    }
    @if (ready()) {
      <form class="panel form-panel" [formGroup]="form" (ngSubmit)="save()">
        <fieldset [disabled]="saving() || created()">
          <div class="form-grid">
            <div>
              <label for="nombre">Nombre *</label
              ><input id="nombre" formControlName="nombre" maxlength="150" />
            </div>
            <div>
              <label for="maquina">Máquina *</label
              ><select id="maquina" formControlName="maquina_id">
                <option [ngValue]="null">Seleccionar</option>
                @for (m of machines(); track m.id) {
                  <option [ngValue]="m.id">{{ m.nombre }}</option>
                }
              </select>
            </div>
            <div class="span-all">
              <label for="descripcion">Descripción</label
              ><textarea
                id="descripcion"
                formControlName="descripcion"
                rows="3"
                maxlength="10000"
              ></textarea>
            </div>
            <div class="span-all">
              <label for="observaciones">Observaciones</label
              ><textarea
                id="observaciones"
                formControlName="observaciones"
                rows="3"
                maxlength="10000"
              ></textarea>
            </div>
            <div>
              <label for="foto">Foto (URL o referencia opcional)</label
              ><input id="foto" formControlName="foto" maxlength="500" />
            </div>
            <div>
              <label for="prioridad">Prioridad</label
              ><select id="prioridad" formControlName="prioritario">
                <option [ngValue]="null">Sin prioridad</option>
                <option value="Rojo">Rojo</option>
                <option value="Amarillo">Amarillo</option>
                <option value="Verde">Verde</option>
              </select>
            </div>
            <div class="span-all">
              <label for="proveedores">Proveedores</label
              ><select id="proveedores" multiple formControlName="proveedores" size="5">
                @for (p of providers(); track p.id) {
                  <option [ngValue]="p.id">{{ p.nombre }}</option>
                }
              </select>
              <p class="field-help">Podés seleccionar varios proveedores con Ctrl o Cmd.</p>
            </div>
          </div>
          @if (form.touched && form.invalid) {
            <p class="error" role="alert">
              Revisá el nombre, la máquina y la longitud de los campos.
            </p>
          }
          <div class="actions form-actions">
            <button class="primary" [disabled]="saving() || created()">
              {{ saving() ? 'Guardando…' : 'Guardar repuesto' }}</button
            ><a class="button secondary" routerLink="/inicio/mantenimiento/repuestos">Volver</a>
          </div>
        </fieldset>
      </form>
    }
  `,
})
export class RepuestoFormComponent {
  private readonly api = inject(RepuestosService);
  private readonly machinesApi = inject(MaquinasService);
  private readonly destroyRef = inject(DestroyRef);
  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly machines = signal<Maquina[]>([]);
  readonly providers = signal<Proveedor[]>([]);
  readonly loading = signal(true);
  readonly ready = signal(false);
  readonly saving = signal(false);
  readonly created = signal(false);
  readonly error = signal('');
  readonly success = signal(false);
  readonly form = inject(FormBuilder).group({
    nombre: ['', [nonBlank, Validators.maxLength(150)]],
    maquina_id: [null as number | null, Validators.required],
    descripcion: ['', Validators.maxLength(10000)],
    observaciones: ['', Validators.maxLength(10000)],
    foto: ['', Validators.maxLength(500)],
    prioritario: [null as Prioridad | null],
    proveedores: [[] as number[]],
  });
  constructor() {
    forkJoin({
      machines: this.machinesApi.list(),
      providers: this.api.providers(),
      part: this.id ? this.api.get(this.id) : of(null),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.machines.set(result.machines);
          this.providers.set(result.providers);
          if (result.part) this.form.patchValue(result.part);
          this.ready.set(true);
        },
        error: (e) => this.error.set(errorMessage(e, 'No se pudo cargar la información.')),
      });
  }
  save(): void {
    if (this.saving() || this.created()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    if (!value.maquina_id) return;
    const data = {
      ...value,
      nombre: value.nombre?.trim() || '',
      maquina_id: value.maquina_id,
      proveedores: value.proveedores || [],
    };
    this.saving.set(true);
    this.error.set('');
    this.success.set(false);
    (this.id ? this.api.update(this.id, data) : this.api.create(data))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.success.set(true);
          if (!this.id) this.created.set(true);
        },
        error: (e) => this.error.set(errorMessage(e, 'No se pudo guardar el repuesto.')),
      });
  }
}
