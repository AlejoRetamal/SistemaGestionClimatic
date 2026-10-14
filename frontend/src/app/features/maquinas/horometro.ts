import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { finalize } from 'rxjs';
import { Maquina } from './maquina.model';
import { MaquinasService } from './maquinas.service';
import { decimalPlaces } from '../../shared/form-validators';
import { errorMessage } from '../../shared/error-message';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  template: `
    <a class="back-link" routerLink="/inicio/mantenimiento/maquinas/listado"
      >← Listado de máquinas</a
    >
    <h1>Actualizar horómetro</h1>
    @if (loading()) {
      <p class="notice" role="status">Cargando máquinas…</p>
    }
    @if (error()) {
      <p class="error" role="alert">
        {{ error() }} <button class="secondary" (click)="load()">Recargar</button>
      </p>
    }
    <form class="panel form-panel" [formGroup]="form" (ngSubmit)="save()">
      <fieldset [disabled]="loading() || saving()">
        <label for="maquina">Máquina</label
        ><select id="maquina" formControlName="maquina_id" (change)="select()">
          <option [ngValue]="null">Seleccionar máquina</option>
          @for (m of machines(); track m.id) {
            <option [ngValue]="m.id">
              {{ m.nombre }}{{ m.status === 'Activo' ? '' : ' (dada de baja)' }}
            </option>
          }
        </select>
        @if (selected()) {
          <p>
            Horas actuales: <strong>{{ selected()!.horas | number: '1.0-2' }}</strong>
          </p>
        }
        <label for="horas">Nueva lectura de horómetro</label
        ><input
          id="horas"
          type="number"
          formControlName="horas"
          min="0"
          max="9999999999.99"
          step="0.01"
        />
        @if (form.touched && form.invalid) {
          <p class="error" role="alert">
            Seleccioná una máquina e ingresá una lectura no negativa, con hasta dos decimales.
          </p>
        }
        <div class="form-actions">
          <button class="primary" [disabled]="saving() || loading()">
            {{ saving() ? 'Actualizando…' : 'Actualizar horómetro' }}
          </button>
        </div>
      </fieldset>
    </form>
    @if (success()) {
      <p class="success" role="status">{{ success() }}</p>
    }
  `,
})
export class HorometroComponent {
  private readonly api = inject(MaquinasService);
  private readonly destroyRef = inject(DestroyRef);
  readonly machines = signal<Maquina[]>([]);
  readonly selected = signal<Maquina | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly form = inject(FormBuilder).group({
    maquina_id: [null as number | null, Validators.required],
    horas: [
      null as number | null,
      [Validators.required, Validators.min(0), Validators.max(9999999999.99), decimalPlaces],
    ],
  });
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
        next: (rows) => {
          this.machines.set(rows);
          this.select();
        },
        error: (e) => this.error.set(errorMessage(e, 'No se pudieron cargar las máquinas.')),
      });
  }
  select(): void {
    this.selected.set(
      this.machines().find((m) => m.id === this.form.controls.maquina_id.value) || null,
    );
    this.form.controls.horas.setValue(this.selected()?.horas ?? null);
    this.success.set('');
  }
  save(): void {
    if (this.saving() || this.loading()) return;
    this.form.markAllAsTouched();
    const m = this.selected();
    const hours = this.form.controls.horas.value;
    if (this.form.invalid || !m || hours === null) return;
    const lower = hours < m.horas;
    if (
      !window.confirm(
        lower
          ? `La lectura bajará de ${m.horas} a ${hours}. ¿Confirmás esta corrección?`
          : `¿Actualizar el horómetro de ${m.nombre} a ${hours}?`,
      )
    )
      return;
    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    this.api
      .meter(m.id, hours, m.horas, lower)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (updated) => {
          this.selected.set(updated);
          this.machines.update((rows) =>
            rows.map((row) => (row.id === updated.id ? updated : row)),
          );
          this.success.set('Horómetro actualizado correctamente.');
        },
        error: (e) => this.error.set(errorMessage(e, 'No se pudo actualizar el horómetro.')),
      });
  }
}
