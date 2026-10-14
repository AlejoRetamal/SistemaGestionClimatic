import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { RepuestosService } from './repuestos.service';
import { Repuesto, stockState } from './repuesto.model';
import { decimalPlaces } from '../../shared/form-validators';
import { errorMessage } from '../../shared/error-message';
@Component({
  standalone: true,
  imports: [RouterLink, DecimalPipe, ReactiveFormsModule],
  styles: `
    .part-thumbnail {
      width: 80px;
      height: 80px;
      display: grid;
      place-items: center;
      overflow: hidden;
      border: 1px solid #dce5e0;
      border-radius: 8px;
      background: #f4f7f6;
    }
    .part-thumbnail img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .part-thumbnail span {
      padding: 8px;
      color: #61746d;
      font-size: 0.75rem;
      text-align: center;
    }
  `,
  template: `
    <a class="back-link" routerLink="/inicio/mantenimiento">← Mantenimiento</a>
    <div class="page-heading">
      <h1>Repuestos / Inventario</h1>
      <a class="button primary" routerLink="nuevo">+ Nuevo repuesto</a>
    </div>
    <div class="tabs" role="group" aria-label="Vista">
      <button class="secondary" [class.selected]="!inventory()" (click)="inventory.set(false)">
        Repuestos</button
      ><button class="secondary" [class.selected]="inventory()" (click)="inventory.set(true)">
        Inventario
      </button>
    </div>
    <div class="toolbar">
      <label for="search">Buscar</label
      ><input
        id="search"
        type="search"
        placeholder="Repuesto o máquina"
        (input)="search.set($any($event.target).value)"
      />
    </div>
    @if (error()) {
      <p class="error" role="alert">
        {{ error() }} <button class="secondary" (click)="load()">Recargar</button>
      </p>
    }
    @if (selected(); as part) {
      <form class="panel form-panel" [formGroup]="stockForm" (ngSubmit)="saveStock()">
        <h2>{{ minimumMode() ? 'Editar stock mínimo' : 'Ingresar stock' }} · {{ part.nombre }}</h2>
        <p>Stock actual: {{ part.cantidad_actual | number: '1.0-2' }}</p>
        <label for="quantity">{{ minimumMode() ? 'Cantidad mínima' : 'Cantidad a sumar' }}</label
        ><input
          #stockQuantity
          id="quantity"
          type="number"
          formControlName="cantidad"
          [min]="minimumMode() ? 0 : 0.01"
          max="9999999999.99"
          step="0.01"
        />
        @if (stockForm.touched && stockForm.invalid) {
          <p class="error">Ingresá una cantidad válida, con hasta dos decimales.</p>
        }
        <div class="actions form-actions">
          <button class="primary" [disabled]="busy()">
            {{ busy() ? 'Guardando…' : 'Guardar' }}</button
          ><button type="button" class="secondary" [disabled]="busy()" (click)="selected.set(null)">
            Cancelar
          </button>
        </div>
      </form>
    }
    @if (loading()) {
      <p class="notice" role="status">Cargando repuestos…</p>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Repuesto</th>
              <th>Máquina</th>
              @if (!inventory()) {
                <th>Descripción</th>
                <th>Prioridad</th>
              }
              <th>Stock actual</th>
              <th>Stock mínimo</th>
              <th>Estado de stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (part of filtered(); track part.id) {
              <tr>
                <td>
                  <div class="part-thumbnail">
                    @if (part.foto && !failedImages().has(part.foto)) {
                      <img
                        [src]="part.foto"
                        [alt]="'Imagen de ' + part.nombre"
                        width="80"
                        height="80"
                        loading="lazy"
                        decoding="async"
                        referrerpolicy="no-referrer"
                        (error)="imageFailed(part.foto)"
                      />
                    } @else {
                      <span>{{ part.foto ? 'Imagen no disponible' : 'Sin imagen' }}</span>
                    }
                  </div>
                </td>
                <td>{{ part.nombre }}</td>
                <td>{{ part.maquina_nombre }}</td>
                @if (!inventory()) {
                  <td>{{ part.descripcion || '—' }}</td>
                  <td>{{ part.prioritario || '—' }}</td>
                }
                <td>{{ part.cantidad_actual | number: '1.0-2' }}</td>
                <td>{{ part.cantidad_minima | number: '1.0-2' }}</td>
                <td>
                  <span
                    class="badge"
                    [class.stock-red]="state(part) === 'Rojo'"
                    [class.stock-yellow]="state(part) === 'Amarillo'"
                    [class.stock-green]="state(part) === 'Verde'"
                    >{{
                      state(part) === 'Rojo'
                        ? 'Mínimo o inferior'
                        : state(part) === 'Amarillo'
                          ? 'Cerca del mínimo'
                          : 'Normal'
                    }}</span
                  >
                </td>
                <td>
                  <div class="actions">
                    <a class="button secondary" [routerLink]="[part.id, 'editar']">Editar</a
                    ><button class="secondary" [disabled]="busy()" (click)="openStock(part, false)">
                      Ingresar stock</button
                    ><button class="secondary" [disabled]="busy()" (click)="openStock(part, true)">
                      Mínimo</button
                    ><button class="danger" [disabled]="busy()" (click)="remove(part)">
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="inventory() ? 7 : 9">No hay repuestos para mostrar.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
    @if (success()) {
      <p class="success" role="status">{{ success() }}</p>
    }
  `,
})
export class RepuestosListComponent {
  private readonly api = inject(RepuestosService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly stockQuantity = viewChild<ElementRef<HTMLInputElement>>('stockQuantity');
  readonly parts = signal<Repuesto[]>([]);
  readonly failedImages = signal<ReadonlySet<string>>(new Set());
  readonly search = signal('');
  readonly inventory = signal(false);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly selected = signal<Repuesto | null>(null);
  readonly minimumMode = signal(false);
  readonly state = stockState;
  readonly filtered = computed(() =>
    this.parts().filter((p) =>
      `${p.nombre} ${p.maquina_nombre}`.toLowerCase().includes(this.search().toLowerCase()),
    ),
  );
  readonly stockForm = inject(FormBuilder).group({
    cantidad: [
      null as number | null,
      [Validators.required, Validators.min(0), Validators.max(9999999999.99), decimalPlaces],
    ],
  });
  constructor() {
    this.load();
  }
  imageFailed(url: string | null): void {
    if (url) this.failedImages.update((urls) => new Set([...urls, url]));
  }
  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (rows) => this.parts.set(rows),
        error: (e) => this.error.set(errorMessage(e, 'No se pudieron cargar los repuestos.')),
      });
  }
  openStock(part: Repuesto, minimum: boolean): void {
    if (this.busy()) return;
    this.selected.set(part);
    this.minimumMode.set(minimum);
    this.stockForm.reset({ cantidad: minimum ? part.cantidad_minima : null });
    this.stockForm.controls.cantidad.setValidators([
      Validators.required,
      Validators.min(minimum ? 0 : 0.01),
      Validators.max(9999999999.99),
      decimalPlaces,
    ]);
    this.stockForm.controls.cantidad.updateValueAndValidity();
    this.success.set('');
    this.error.set('');
    // The editor is above the table and may be offscreen for lower rows.
    // Wait until Angular renders it before scrolling and moving keyboard focus.
    afterNextRender(
      () => {
        const input = this.stockQuantity()?.nativeElement;
        if (!input) return;
        input.scrollIntoView({ block: 'center', behavior: 'auto' });
        input.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }
  saveStock(): void {
    this.stockForm.markAllAsTouched();
    const part = this.selected();
    const quantity = this.stockForm.controls.cantidad.value;
    if (this.busy() || !part || quantity === null || this.stockForm.invalid) return;
    if (
      !window.confirm(
        this.minimumMode()
          ? `¿Fijar el stock mínimo de ${part.nombre} en ${quantity}?`
          : `¿Sumar ${quantity} al stock de ${part.nombre}?`,
      )
    )
      return;
    this.busy.set(true);
    this.error.set('');
    (this.minimumMode()
      ? this.api.minimum(part.id, quantity)
      : this.api.addStock(part.id, quantity)
    )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (updated) => {
          this.parts.update((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
          this.selected.set(null);
          this.success.set('Inventario actualizado.');
        },
        error: (e) => this.error.set(errorMessage(e, 'No se pudo actualizar el inventario.')),
      });
  }
  remove(part: Repuesto): void {
    if (
      this.busy() ||
      !window.confirm(
        `¿Eliminar ${part.nombre}? Solo será posible si no tiene relaciones que lo impidan.`,
      )
    )
      return;
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    this.api
      .remove(part.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.parts.update((rows) => rows.filter((r) => r.id !== part.id));
          this.success.set('Repuesto eliminado.');
        },
        error: (e) => this.error.set(errorMessage(e, 'No se pudo eliminar el repuesto.')),
      });
  }
}
