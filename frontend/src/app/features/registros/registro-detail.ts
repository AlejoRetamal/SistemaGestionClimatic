import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { finalize } from 'rxjs';
import { RegistrosService } from './registros.service';
import { RegistroDetalle } from './registro.model';
import { errorMessage } from '../../shared/error-message';
@Component({
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe],
  template: `
    <a class="back-link" routerLink="/inicio/mantenimiento/registros">← Historial de trabajos</a>
    <h1>Detalle del trabajo</h1>
    @if (loading()) {
      <p class="notice" role="status">Cargando trabajo…</p>
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (record(); as row) {
      <section class="panel">
        <h2>{{ row.tarea_nombre }}</h2>
        <dl class="summary-grid">
          <div>
            <dt>Máquina</dt>
            <dd>{{ row.maquina_nombre }}</dd>
          </div>
          <div>
            <dt>Operario</dt>
            <dd>{{ row.operario_nombre }}</dd>
          </div>
          <div>
            <dt>Origen</dt>
            <dd>{{ row.origen }}</dd>
          </div>
          <div>
            <dt>Horómetro</dt>
            <dd>
              {{
                row.medicion_horometro === null ? '—' : (row.medicion_horometro | number: '1.0-2')
              }}
            </dd>
          </div>
          <div>
            <dt>Inicio</dt>
            <dd>
              {{ row.duracion_inicio ? (row.duracion_inicio | date: 'dd/MM/yyyy HH:mm') : '—' }}
            </dd>
          </div>
          <div>
            <dt>Fin</dt>
            <dd>{{ row.duracion_fin ? (row.duracion_fin | date: 'dd/MM/yyyy HH:mm') : '—' }}</dd>
          </div>
          <div>
            <dt>Orden asociada</dt>
            <dd>{{ row.orden_descripcion || 'Sin orden' }}</dd>
          </div>
        </dl>
      </section>
      <h2>Repuestos utilizados</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Repuesto</th>
              <th>Cantidad</th>
            </tr>
          </thead>
          <tbody>
            @for (part of row.repuestos; track part.repuesto_id) {
              <tr>
                <td>{{ part.repuesto_nombre }}</td>
                <td>{{ part.cantidad | number: '1.0-2' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="2">No se registraron repuestos utilizados.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p class="field-help">
        Este registro conserva el historial del trabajo. Las correcciones se habilitarán cuando esté
        definido su procedimiento de revisión.
      </p>
    }
  `,
})
export class RegistroDetailComponent {
  readonly record = signal<RegistroDetalle | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  constructor() {
    const id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
    inject(RegistrosService)
      .get(id)
      .pipe(
        takeUntilDestroyed(inject(DestroyRef)),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (row) => this.record.set(row),
        error: (e) => this.error.set(errorMessage(e, 'No se pudo cargar el trabajo.')),
      });
  }
}
