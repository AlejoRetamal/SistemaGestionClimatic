import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { RegistrosService } from './registros.service';
import { TareaExtraordinaria } from '../tareas-extraordinarias/extraordinaria.model';
import { errorMessage } from '../../shared/error-message';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <a class="back-link" routerLink="/inicio/mantenimiento">← Mantenimiento</a>
    <h1>Registrar tarea extraordinaria</h1>
    <p class="notice" role="status">
      El registro de estos trabajos está pendiente de definición: falta determinar la máquina y cómo
      vincular la ejecución con su tarea extraordinaria. Por ahora podés consultar o crear la
      definición.
    </p>
    @if (loading()) {
      <p role="status">Cargando tareas extraordinarias…</p>
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    <section class="panel form-panel">
      <label for="extra">Tarea extraordinaria</label
      ><select id="extra" [formControl]="selection" (change)="select()">
        <option [ngValue]="null">Seleccionar tarea</option>
        @for (task of tasks(); track task.id) {
          <option [ngValue]="task.id">{{ task.nombre }}</option>
        }
      </select>
      @if (selected()) {
        <h2>{{ selected()!.nombre }}</h2>
        <p>{{ selected()!.descripcion || 'Sin descripción.' }}</p>
      }
      <div class="actions form-actions">
        <a class="button primary" routerLink="/inicio/mantenimiento/tareas-extraordinarias/nueva"
          >Crear definición</a
        ><a class="button secondary" routerLink="/inicio/mantenimiento/tareas-extraordinarias"
          >Consultar definiciones</a
        >
      </div>
    </section>
  `,
})
export class RegistrarExtraordinariaComponent {
  readonly tasks = signal<TareaExtraordinaria[]>([]);
  readonly selected = signal<TareaExtraordinaria | null>(null);
  readonly selection = new FormControl<number | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  constructor() {
    inject(RegistrosService)
      .extraordinary()
      .pipe(
        takeUntilDestroyed(inject(DestroyRef)),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (rows) => this.tasks.set(rows),
        error: (e) =>
          this.error.set(errorMessage(e, 'No se pudieron cargar las tareas extraordinarias.')),
      });
  }
  select(): void {
    this.selected.set(this.tasks().find((t) => t.id === this.selection.value) || null);
  }
}
