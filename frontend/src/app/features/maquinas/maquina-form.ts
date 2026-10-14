import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MaquinasService } from './maquinas.service';
import { errorMessage } from '../../shared/error-message';
import { nonBlank, decimalPlaces } from '../../shared/form-validators';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <a class="back-link" routerLink="/inicio/mantenimiento/maquinas">← Máquinas</a>
    <h1>{{ id ? 'Editar máquina' : 'Nueva máquina' }}</h1>
    @if (loading()) {
      <p class="notice" role="status">Cargando máquina…</p>
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (success()) {
      <p class="success" role="status">
        {{ success() }} <a routerLink="/inicio/mantenimiento/maquinas">Volver al listado</a>
      </p>
    }
    @if (ready()) {
      <form class="panel form-panel" [formGroup]="form" (ngSubmit)="save()">
        <fieldset [disabled]="saving() || created()">
          <div class="form-grid">
            <div>
              <label for="nombre">Nombre *</label
              ><input id="nombre" formControlName="nombre" maxlength="150" required />
            </div>
            <div>
              <label for="nombre-corto">Nombre corto</label
              ><input id="nombre-corto" formControlName="nombre_corto" maxlength="50" />
            </div>
            <div>
              <label for="instalada">Potencia instalada</label
              ><input
                id="instalada"
                type="number"
                formControlName="potencia_instalada"
                min="0"
                max="99999999.99"
                step="0.01"
              />
            </div>
            <div>
              <label for="demandada">Potencia demandada</label
              ><input
                id="demandada"
                type="number"
                formControlName="potencia_demandada"
                min="0"
                max="99999999.99"
                step="0.01"
              />
            </div>
            <div class="span-all">
              <label for="observaciones">Observaciones</label
              ><textarea
                id="observaciones"
                formControlName="observaciones"
                rows="4"
                maxlength="10000"
              ></textarea>
            </div>
          </div>
          @if (form.touched && form.invalid) {
            <p class="error" role="alert">
              Revisá el nombre y los valores numéricos: deben ser no negativos, con hasta dos
              decimales.
            </p>
          }
          <div class="actions form-actions">
            <button class="primary" type="submit" [disabled]="saving() || created()">
              {{ saving() ? 'Guardando…' : 'Guardar máquina' }}</button
            ><a class="button secondary" routerLink="/inicio/mantenimiento/maquinas">Volver</a>
          </div>
        </fieldset>
      </form>
    }
  `,
})
export class MaquinaFormComponent {
  private readonly api = inject(MaquinasService);
  private readonly destroyRef = inject(DestroyRef);
  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly ready = signal(!this.id);
  readonly error = signal('');
  readonly success = signal('');
  readonly created = signal(false);
  readonly form = inject(FormBuilder).group({
    nombre: ['', [nonBlank, Validators.maxLength(150)]],
    nombre_corto: ['', Validators.maxLength(50)],
    potencia_instalada: [
      null as number | null,
      [Validators.min(0), Validators.max(99999999.99), decimalPlaces],
    ],
    potencia_demandada: [
      null as number | null,
      [Validators.min(0), Validators.max(99999999.99), decimalPlaces],
    ],
    observaciones: ['', Validators.maxLength(10000)],
  });
  constructor() {
    if (this.id) {
      this.loading.set(true);
      this.api
        .get(this.id)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.loading.set(false)),
        )
        .subscribe({
          next: (row) => {
            this.form.patchValue(row);
            this.ready.set(true);
          },
          error: (e) => this.error.set(errorMessage(e, 'No se pudo cargar la máquina.')),
        });
    }
  }
  save(): void {
    if (this.saving() || this.created()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const data = { ...value, nombre: value.nombre?.trim() || '' };
    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    (this.id ? this.api.update(this.id, data) : this.api.create(data))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.success.set('Máquina guardada correctamente.');
          if (!this.id) this.created.set(true);
        },
        error: (e) => this.error.set(errorMessage(e, 'No se pudo guardar la máquina.')),
      });
  }
}
