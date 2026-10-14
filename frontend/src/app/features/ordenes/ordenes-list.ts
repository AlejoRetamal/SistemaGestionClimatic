import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { finalize } from 'rxjs';
import { OrdenesService } from './ordenes.service';
import { Orden } from './orden.model';
import { errorMessage } from '../../shared/error-message';
@Component({
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <a class="back-link" routerLink="/inicio/mantenimiento/ordenes">← Órdenes de mantenimiento</a>
    <div class="page-heading">
      <h1>Órdenes de mantenimiento</h1>
    </div>
    <div class="toolbar">
      <label for="state">Estado</label
      ><select id="state" (change)="filter.set($any($event.target).value)">
        <option value="activas">Activas</option>
        <option value="cerradas">Cerradas</option>
        <option value="todas">Todas</option></select
      ><label for="search">Buscar</label
      ><input
        id="search"
        type="search"
        (input)="search.set($any($event.target).value)"
        placeholder="Descripción o máquina"
      />
    </div>
    @if (error()) {
      <p class="error" role="alert">
        {{ error() }} <button class="secondary" (click)="load()">Recargar</button>
      </p>
    }
    @if (loading()) {
      <p class="notice" role="status">Cargando órdenes…</p>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Empleado</th>
              <th>Descripción</th>
              <th>Máquina</th>
              <th>Estado</th>
              <th>Cierre</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (order of filtered(); track order.id) {
              <tr>
                <td>{{ order.fecha_creacion | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ order.empleado_nombre }}</td>
                <td>{{ order.descripcion }}</td>
                <td>{{ order.maquina_nombre }}</td>
                <td>{{ order.activo ? 'Activa' : 'Cerrada' }}</td>
                <td>
                  {{ order.fecha_cierre ? (order.fecha_cierre | date: 'dd/MM/yyyy HH:mm') : '—' }}
                </td>
                <td>
                  @if (order.activo) {
                    <div class="actions">
                      <a
                        class="button secondary"
                        [routerLink]="['/inicio/mantenimiento/ordenes', order.id, 'editar']"
                        >Editar</a
                      ><button class="danger" [disabled]="busy()" (click)="close(order)">
                        Cerrar orden
                      </button>
                    </div>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7">No hay órdenes para mostrar.</td>
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
export class OrdenesListComponent {
  private readonly api = inject(OrdenesService);
  private readonly destroyRef = inject(DestroyRef);
  readonly rows = signal<Orden[]>([]);
  readonly filter = signal('activas');
  readonly search = signal('');
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly filtered = computed(() =>
    this.rows().filter(
      (row) =>
        (this.filter() === 'todas' || (this.filter() === 'activas' ? !!row.activo : !row.activo)) &&
        `${row.descripcion} ${row.maquina_nombre} ${row.empleado_nombre}`
          .toLowerCase()
          .includes(this.search().toLowerCase()),
    ),
  );
  constructor() {
    this.load();
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
        next: (rows) => this.rows.set(rows),
        error: (e) => this.error.set(errorMessage(e, 'No se pudieron cargar las órdenes.')),
      });
  }
  close(order: Orden): void {
    if (
      this.busy() ||
      !window.confirm(`¿Cerrar la orden de ${order.maquina_nombre}: ${order.descripcion}?`)
    )
      return;
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    this.api
      .close(order.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (updated) => {
          this.rows.update((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
          this.success.set('Orden cerrada correctamente.');
        },
        error: (e) => this.error.set(errorMessage(e, 'No se pudo cerrar la orden.')),
      });
  }
}
