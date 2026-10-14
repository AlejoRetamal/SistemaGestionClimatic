import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { finalize, forkJoin, Subscription } from 'rxjs';
import { RegistrosService } from './registros.service';
import { Tarea } from '../tareas/tarea.model';
import { Maquina } from '../maquinas/maquina.model';
import { MaquinasService } from '../maquinas/maquinas.service';
import { RepuestosService } from '../repuestos-inventario/repuestos.service';
import { Repuesto } from '../repuestos-inventario/repuesto.model';
import { OrdenesService } from '../ordenes/ordenes.service';
import { Orden } from '../ordenes/orden.model';
import { AuthService } from '../../core/auth/auth.service';
import { decimalPlaces } from '../../shared/form-validators';
import { errorMessage } from '../../shared/error-message';
function localNow(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  template: `
    <a class="back-link" routerLink="/inicio/mantenimiento">← Mantenimiento</a>
    <h1>Registro de tareas programadas</h1>
    <p class="lead">Registrá un trabajo realizado y sus repuestos utilizados.</p>
    @if (loading()) {
      <p class="notice" role="status">Cargando tareas…</p>
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (ready()) {
      <form class="panel form-panel execution-form" [formGroup]="form" (ngSubmit)="save()">
        <fieldset [disabled]="saving() || !!savedId()">
          <div class="form-grid">
            <div class="span-all">
              <label for="tarea">Tarea *</label
              ><select id="tarea" formControlName="tarea_id" (change)="selectTask()">
                <option [ngValue]="null">Seleccionar tarea</option>
                @for (task of tasks(); track task.id) {
                  <option [ngValue]="task.id">{{ task.nombre }} · {{ task.maquina_nombre }}</option>
                }
              </select>
            </div>
            <div>
              <label for="machine">Máquina</label
              ><input id="machine" [value]="selectedTask()?.maquina_nombre || ''" readonly />
            </div>
            <div>
              <label for="operario">Operario</label
              ><input id="operario" [value]="userName()" readonly />
            </div>
            @if (loadingTask()) {
              <p class="notice span-all" role="status">
                Cargando horómetro y repuestos compatibles…
              </p>
            }
            @if (machine()) {
              <p class="span-all">
                Horómetro actual: <strong>{{ machine()!.horas | number: '1.0-2' }}</strong>
                <button
                  type="button"
                  class="secondary"
                  [disabled]="loadingTask()"
                  (click)="selectTask()"
                >
                  Recargar tarea
                </button>
              </p>
            }
            <div>
              <label for="lectura">Medición del horómetro *</label
              ><input
                id="lectura"
                type="number"
                formControlName="medicion_horometro"
                min="0"
                max="9999999999.99"
                step="0.01"
              />
            </div>
            <div>
              <label for="orden">Orden relacionada (opcional)</label
              ><select id="orden" formControlName="orden_mantenimiento_id">
                <option [ngValue]="null">Sin orden</option>
                @for (order of compatibleOrders(); track order.id) {
                  <option [ngValue]="order.id">
                    {{ order.descripcion }}{{ order.activo ? '' : ' (cerrada)' }}
                  </option>
                }
              </select>
            </div>
            <div>
              <label for="inicio">Hora de inicio *</label
              ><input id="inicio" type="datetime-local" formControlName="duracion_inicio" />
            </div>
            <div>
              <label for="fin">Hora de fin *</label
              ><input id="fin" type="datetime-local" formControlName="duracion_fin" />
            </div>
          </div>
          <h2>Repuestos utilizados</h2>
          <p class="field-help">
            Solo se muestran los repuestos asociados a la máquina de esta tarea.
          </p>
          <div formArrayName="repuestos">
            @for (control of parts.controls; track control; let index = $index) {
              <div class="consumption-row" [formGroupName]="index">
                <div>
                  <label [for]="'part-' + index">Repuesto</label
                  ><select [id]="'part-' + index" formControlName="repuesto_id">
                    <option [ngValue]="null">Seleccionar</option>
                    @for (part of availableParts(); track part.id) {
                      <option [ngValue]="part.id">
                        {{ part.nombre }} · stock {{ part.cantidad_actual }}
                      </option>
                    }
                  </select>
                </div>
                <div>
                  <label [for]="'quantity-' + index">Cantidad</label
                  ><input
                    [id]="'quantity-' + index"
                    type="number"
                    formControlName="cantidad"
                    min="0.01"
                    max="9999999999.99"
                    step="0.01"
                  />
                </div>
                <button type="button" class="secondary" (click)="parts.removeAt(index)">
                  Quitar
                </button>
              </div>
            }
          </div>
          <button
            type="button"
            class="secondary"
            [disabled]="
              loadingTask() || !machine() || !availableParts().length || parts.length >= 100
            "
            (click)="addPart()"
          >
            + Agregar repuesto
          </button>
          @if (machine() && !availableParts().length) {
            <p class="field-help">
              La máquina no tiene repuestos asociados. Podés registrar el trabajo sin consumos.
            </p>
          }
          @if (form.touched && form.invalid) {
            <p class="error" role="alert">
              Completá tarea, horómetro y horarios. Revisá las cantidades y repuestos seleccionados.
            </p>
          }
          <div class="actions form-actions">
            <button
              class="primary"
              [disabled]="saving() || loadingTask() || !machine() || !!savedId()"
            >
              {{ saving() ? 'Guardando trabajo…' : 'Registrar trabajo' }}</button
            ><a class="button secondary" routerLink="/inicio/mantenimiento/registros"
              >Ver historial</a
            >
          </div>
        </fieldset>
      </form>
    }
    @if (savedId()) {
      <div class="success" role="status">
        Trabajo guardado correctamente.
        <a [routerLink]="['/inicio/mantenimiento/registros', savedId()]">Ver detalle</a>
        <button class="secondary" (click)="reset()">Registrar otro trabajo</button>
      </div>
    }
  `,
})
export class RegistrarTareaComponent {
  private readonly api = inject(RegistrosService);
  private readonly machinesApi = inject(MaquinasService);
  private readonly partsApi = inject(RepuestosService);
  private readonly ordersApi = inject(OrdenesService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private taskRequest?: Subscription;
  readonly tasks = signal<Tarea[]>([]);
  readonly orders = signal<Orden[]>([]);
  readonly selectedTask = signal<Tarea | null>(null);
  readonly machine = signal<Maquina | null>(null);
  readonly availableParts = signal<Repuesto[]>([]);
  readonly loading = signal(true);
  readonly loadingTask = signal(false);
  readonly ready = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly savedId = signal<number | null>(null);
  readonly userName = computed(() =>
    `${this.auth.user()?.nombre || ''} ${this.auth.user()?.apellido || ''}`.trim(),
  );
  readonly compatibleOrders = computed(() =>
    this.orders().filter((order) => order.maquina_id === this.selectedTask()?.maquina_id),
  );
  readonly parts = new FormArray([this.partControl()]);
  readonly form = this.fb.group({
    tarea_id: [null as number | null, Validators.required],
    medicion_horometro: [
      null as number | null,
      [Validators.required, Validators.min(0), Validators.max(9999999999.99), decimalPlaces],
    ],
    duracion_inicio: [localNow(), Validators.required],
    duracion_fin: [localNow(), Validators.required],
    orden_mantenimiento_id: [null as number | null],
    repuestos: this.parts,
  });
  constructor() {
    this.parts.clear();
    forkJoin({ tasks: this.api.tasks(), orders: this.ordersApi.list() })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.tasks.set(result.tasks);
          this.orders.set(result.orders);
          this.ready.set(true);
        },
        error: (e) => this.error.set(errorMessage(e, 'No se pudieron cargar las tareas.')),
      });
  }
  private partControl() {
    return this.fb.group({
      repuesto_id: [null as number | null, Validators.required],
      cantidad: [
        1 as number | null,
        [Validators.required, Validators.min(0.01), Validators.max(9999999999.99), decimalPlaces],
      ],
    });
  }
  addPart(): void {
    if (this.parts.length < 100) this.parts.push(this.partControl());
  }
  selectTask(): void {
    this.taskRequest?.unsubscribe();
    this.machine.set(null);
    this.availableParts.set([]);
    this.parts.clear();
    this.form.controls.orden_mantenimiento_id.setValue(null);
    this.form.controls.medicion_horometro.setValue(null);
    this.error.set('');
    const task = this.tasks().find((t) => t.id === this.form.controls.tarea_id.value) || null;
    this.selectedTask.set(task);
    if (!task) {
      this.loadingTask.set(false);
      return;
    }
    this.loadingTask.set(true);
    this.taskRequest = forkJoin({
      machine: this.machinesApi.get(task.maquina_id),
      parts: this.partsApi.list(task.maquina_id),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingTask.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.machine.set(result.machine);
          this.availableParts.set(result.parts);
          this.form.controls.medicion_horometro.setValue(result.machine.horas);
        },
        error: (e) =>
          this.error.set(errorMessage(e, 'No se pudieron cargar los datos de la máquina.')),
      });
  }
  reset(): void {
    this.form.reset({
      tarea_id: null,
      medicion_horometro: null,
      duracion_inicio: localNow(),
      duracion_fin: localNow(),
      orden_mantenimiento_id: null,
    });
    this.savedId.set(null);
    this.selectTask();
  }
  save(): void {
    if (this.saving() || this.loadingTask() || this.savedId()) return;
    this.form.markAllAsTouched();
    this.error.set('');
    const value = this.form.getRawValue(),
      machine = this.machine();
    if (
      this.form.invalid ||
      !machine ||
      !value.tarea_id ||
      value.medicion_horometro === null ||
      !value.duracion_inicio ||
      !value.duracion_fin
    )
      return;
    if (value.duracion_fin < value.duracion_inicio) {
      this.error.set('La hora de fin no puede ser anterior al inicio.');
      return;
    }
    const used = value.repuestos.map((part) => ({
      repuesto_id: part.repuesto_id!,
      cantidad: part.cantidad!,
    }));
    if (new Set(used.map((part) => part.repuesto_id)).size !== used.length) {
      this.error.set('No repitas un repuesto. Sumá su cantidad en una sola fila.');
      return;
    }
    for (const item of used) {
      const part = this.availableParts().find((p) => p.id === item.repuesto_id);
      if (!part || item.cantidad > part.cantidad_actual) {
        this.error.set(`No hay stock suficiente de ${part?.nombre || 'uno de los repuestos'}.`);
        return;
      }
    }
    const lower = value.medicion_horometro < machine.horas;
    if (
      !window.confirm(
        lower
          ? `La lectura bajará de ${machine.horas} a ${value.medicion_horometro}. ¿Confirmás la corrección y el registro del trabajo?`
          : '¿Guardar el trabajo y descontar los repuestos utilizados?',
      )
    )
      return;
    this.saving.set(true);
    this.api
      .create({
        tarea_id: value.tarea_id,
        medicion_horometro: value.medicion_horometro,
        duracion_inicio: value.duracion_inicio,
        duracion_fin: value.duracion_fin,
        orden_mantenimiento_id: value.orden_mantenimiento_id,
        repuestos: used,
        confirmar_reduccion: lower,
        horas_esperadas: machine.horas,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (result) => this.savedId.set(result.id),
        error: (e) =>
          this.error.set(
            errorMessage(e, 'No se pudo guardar el trabajo. No se guardaron consumos parciales.'),
          ),
      });
  }
}
