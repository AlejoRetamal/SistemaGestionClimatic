import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { finalize } from 'rxjs';
import { RegistrosService } from './registros.service';
import { Registro } from './registro.model';
import { errorMessage } from '../../shared/error-message';
@Component({
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe],
  template: `
    <a class="back-link" routerLink="/inicio/mantenimiento">← Mantenimiento</a>
    <div class="page-heading">
      <h1>Historial de trabajos</h1>
      <a class="button primary" routerLink="/inicio/mantenimiento/registrar-tarea"
        >Registrar tarea programada</a
      >
    </div>
    <div class="toolbar">
      <label for="search">Buscar</label
      ><input
        id="search"
        type="search"
        placeholder="Operario, tarea o máquina"
        (input)="search.set($any($event.target).value)"
      />
    </div>
    @if (error()) {
      <p class="error" role="alert">
        {{ error() }} <button class="secondary" (click)="load()">Reintentar</button>
      </p>
    }
    @if (loading()) {
      <p class="notice" role="status">Cargando historial…</p>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha de ejecución</th>
              <th>Operario</th>
              <th>Tarea</th>
              <th>Máquina</th>
              <th>Origen</th>
              <th>Horómetro</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Orden asociada</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (row of filtered(); track row.id) {
              <tr>
                <td>{{ row.fecha ? (row.fecha | date: 'dd/MM/yyyy') : '—' }}</td>
                <td>{{ row.operario_nombre }}</td>
                <td>{{ row.tarea_nombre }}</td>
                <td>{{ row.maquina_nombre }}</td>
                <td>{{ row.origen }}</td>
                <td>
                  {{
                    row.medicion_horometro === null
                      ? '—'
                      : (row.medicion_horometro | number: '1.0-2')
                  }}
                </td>
                <td>
                  {{ row.duracion_inicio ? (row.duracion_inicio | date: 'dd/MM/yyyy HH:mm') : '—' }}
                </td>
                <td>
                  {{ row.duracion_fin ? (row.duracion_fin | date: 'dd/MM/yyyy HH:mm') : '—' }}
                </td>
                <td>{{ row.orden_descripcion || '—' }}</td>
                <td><a class="button secondary" [routerLink]="[row.id]">Ver detalle</a></td>
              </tr>
            } @empty {
              <tr>
                <td colspan="10">No hay trabajos registrados.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class RegistrosListComponent {
  private readonly api = inject(RegistrosService);
  private readonly destroyRef = inject(DestroyRef);
  readonly rows = signal<Registro[]>([]);
  readonly search = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly filtered = computed(() =>
    this.rows().filter((row) =>
      `${row.operario_nombre} ${row.tarea_nombre} ${row.maquina_nombre}`
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
        error: (e) => this.error.set(errorMessage(e, 'No se pudo cargar el historial.')),
      });
  }
}
