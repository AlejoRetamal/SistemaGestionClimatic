import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { finalize } from 'rxjs';
import { MaquinasService } from './maquinas.service';
import { Maquina } from './maquina.model';
import { errorMessage } from '../../shared/error-message';
@Component({
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
    <a class="back-link" routerLink="/inicio/mantenimiento/maquinas">← Máquinas</a>
    <div class="page-heading">
      <div>
        <p class="eyebrow">EQUIPOS</p>
        <h1>{{ baja ? 'Baja de máquinas' : 'Listado de máquinas' }}</h1>
      </div>
    </div>
    <div class="toolbar">
      <label for="machine-search">Buscar</label
      ><input
        id="machine-search"
        type="search"
        placeholder="Nombre o nombre corto"
        (input)="search.set($any($event.target).value)"
      />
      @if (!baja) {
        <a routerLink="/inicio/mantenimiento/horometro">Actualizar horómetro</a>
      }
    </div>
    @if (error()) {
      <p class="error" role="alert">
        {{ error() }} <button class="secondary" (click)="load()">Reintentar</button>
      </p>
    }
    @if (loading()) {
      <p class="notice" role="status">Cargando máquinas…</p>
    } @else {
      <div class="table-wrap">
        <table>
          <caption class="sr-only">
            Listado de máquinas
          </caption>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Nombre corto</th>
              <th>Potencia instalada</th>
              <th>Potencia demandada</th>
              <th>Horas</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (machine of filtered(); track machine.id) {
              <tr>
                <td>{{ machine.nombre }}</td>
                <td>{{ machine.nombre_corto || '—' }}</td>
                <td>
                  {{
                    machine.potencia_instalada === null
                      ? '—'
                      : (machine.potencia_instalada | number: '1.0-2')
                  }}
                </td>
                <td>
                  {{
                    machine.potencia_demandada === null
                      ? '—'
                      : (machine.potencia_demandada | number: '1.0-2')
                  }}
                </td>
                <td>{{ machine.horas | number: '1.0-2' }}</td>
                <td>
                  <span class="badge" [class.inactive]="machine.status !== 'Activo'">{{
                    machine.status
                  }}</span>
                </td>
                <td>
                  <div class="actions">
                    @if (!baja) {
                      <a
                        class="button secondary"
                        [routerLink]="['/inicio/mantenimiento/maquinas', machine.id, 'editar']"
                        >Editar</a
                      >
                    }
                    @if (baja && machine.status === 'Activo') {
                      <button class="danger" [disabled]="busy()" (click)="deactivate(machine)">
                        Dar de baja
                      </button>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7">
                  {{
                    baja
                      ? 'No hay máquinas activas para dar de baja.'
                      : 'No hay máquinas para mostrar.'
                  }}
                </td>
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
export class MaquinasListComponent {
  readonly baja = inject(ActivatedRoute).snapshot.data['baja'] === true;
  private readonly api = inject(MaquinasService);
  private readonly destroyRef = inject(DestroyRef);
  readonly machines = signal<Maquina[]>([]);
  readonly search = signal('');
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly filtered = computed(() =>
    this.machines().filter(
      (m) =>
        (!this.baja || m.status === 'Activo') &&
        `${m.nombre} ${m.nombre_corto || ''}`.toLowerCase().includes(this.search().toLowerCase()),
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
        next: (rows) => this.machines.set(rows),
        error: (e) => this.error.set(errorMessage(e, 'No se pudieron cargar las máquinas.')),
      });
  }
  deactivate(machine: Maquina): void {
    if (
      this.busy() ||
      !window.confirm('¿Dar de baja a ' + machine.nombre + '? Su historial se conservará.')
    )
      return;
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    this.api
      .deactivate(machine.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (updated) => {
          this.machines.update((rows) => rows.map((m) => (m.id === updated.id ? updated : m)));
          this.success.set('Máquina dada de baja.');
        },
        error: (e) => this.error.set(errorMessage(e, 'No se pudo dar de baja la máquina.')),
      });
  }
}
