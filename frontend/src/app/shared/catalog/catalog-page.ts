import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { finalize, forkJoin, of } from 'rxjs';
import { CatalogService } from './catalog.service';
import { CatalogDefinition, CatalogOption, CatalogRow, FieldValue } from './catalog.model';
import { nonBlank, decimalPlaces } from '../form-validators';
import { errorMessage } from '../error-message';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <a class="back-link" [routerLink]="editing ? definition.path : '/inicio/mantenimiento'"
      >← {{ editing ? definition.title : 'Mantenimiento' }}</a
    >
    <div class="page-heading">
      <h1>
        {{
          editing ? (id ? 'Editar ' + definition.singular : definition.newLabel) : definition.title
        }}
      </h1>
      @if (!editing) {
        <a class="button primary" [routerLink]="definition.path + '/nueva'"
          >+ {{ definition.newLabel }}</a
        >
      }
    </div>
    @if (definition.description) {
      <p class="lead">{{ definition.description }}</p>
    }
    @if (definition.links && !editing) {
      <nav class="tabs" aria-label="Tipos de planes">
        @for (link of definition.links; track link.path) {
          <a
            class="button secondary"
            [class.selected]="link.path === definition.path"
            [routerLink]="link.path"
            >{{ link.label }}</a
          >
        }
      </nav>
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (success()) {
      <p class="success" role="status">
        {{ success() }}
        @if (editing) {
          <a [routerLink]="definition.path">Volver al listado</a>
        }
      </p>
    }
    @if (loading()) {
      <p class="notice" role="status">Cargando información…</p>
    } @else if (ready()) {
      @if (editing) {
        <form class="panel form-panel" [formGroup]="form" (ngSubmit)="save()">
          <fieldset [disabled]="busy() || created()">
            <div class="form-grid">
              @for (field of definition.fields; track field.key) {
                <div [class.span-all]="field.type === 'textarea'">
                  <label [for]="field.key">{{ field.label }}{{ field.required ? ' *' : '' }}</label>
                  @switch (field.type) {
                    @case ('textarea') {
                      <textarea
                        [id]="field.key"
                        [formControlName]="field.key"
                        rows="4"
                        [attr.maxlength]="field.max || 10000"
                      ></textarea>
                    }
                    @case ('select') {
                      <select [id]="field.key" [formControlName]="field.key">
                        <option [ngValue]="null">Seleccionar</option>
                        @for (
                          option of options()[field.key] || field.options || [];
                          track option.value
                        ) {
                          <option [ngValue]="option.value">{{ option.label }}</option>
                        }
                      </select>
                    }
                    @case ('number') {
                      <input
                        [id]="field.key"
                        [formControlName]="field.key"
                        type="number"
                        [min]="field.min || 0"
                        [max]="field.max || 9999999999.99"
                        step="0.01"
                      />
                    }
                    @default {
                      <input
                        [id]="field.key"
                        [formControlName]="field.key"
                        [attr.maxlength]="field.max || 150"
                      />
                    }
                  }
                  @if (form.controls[field.key].touched && form.controls[field.key].invalid) {
                    <p class="error" role="alert">Revisá {{ field.label.toLowerCase() }}.</p>
                  }
                </div>
              }
            </div>
            <div class="actions form-actions">
              <button class="primary" [disabled]="busy() || created()">
                {{ busy() ? 'Guardando…' : 'Guardar' }}</button
              ><a class="button secondary" [routerLink]="definition.path">Volver</a>
            </div>
          </fieldset>
        </form>
      } @else {
        <div class="toolbar">
          <label for="search">Buscar</label
          ><input
            id="search"
            type="search"
            placeholder="Buscar por nombre o máquina"
            (input)="search.set($any($event.target).value)"
          />
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                @for (column of definition.columns; track column.key) {
                  <th>{{ column.label }}</th>
                }
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (row of filtered(); track row.id) {
                <tr>
                  @for (column of definition.columns; track column.key) {
                    <td>{{ row[column.key] ?? '—' }}</td>
                  }
                  <td>
                    <div class="actions">
                      <a class="button secondary" [routerLink]="[definition.path, row.id, 'editar']"
                        >Editar</a
                      ><button class="danger" [disabled]="busy()" (click)="remove(row)">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td [attr.colspan]="definition.columns.length + 1">
                    No hay registros para mostrar.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
})
export class CatalogPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CatalogService);
  private readonly destroyRef = inject(DestroyRef);
  readonly definition = this.route.snapshot.data['catalog'] as CatalogDefinition;
  readonly editing = this.route.snapshot.data['mode'] === 'form';
  readonly id = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly rows = signal<CatalogRow[]>([]);
  readonly options = signal<Record<string, CatalogOption[]>>({});
  readonly search = signal('');
  readonly loading = signal(true);
  readonly ready = signal(false);
  readonly busy = signal(false);
  readonly created = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly filtered = computed(() =>
    this.rows().filter((row) =>
      this.definition.columns.some((column) =>
        String(row[column.key] ?? '')
          .toLowerCase()
          .includes(this.search().toLowerCase()),
      ),
    ),
  );
  readonly form = new FormGroup<Record<string, FormControl<FieldValue>>>({});
  constructor() {
    for (const field of this.definition.fields) {
      const validators: ValidatorFn[] = [];
      if (field.required)
        validators.push(
          field.type === 'text' || field.type === 'textarea' ? nonBlank : Validators.required,
        );
      if (field.type === 'number')
        validators.push(
          Validators.min(field.min || 0),
          Validators.max(field.max || 9999999999.99),
          decimalPlaces,
        );
      else if (field.type !== 'select') validators.push(Validators.maxLength(field.max || 150));
      this.form.addControl(
        field.key,
        new FormControl<FieldValue>(
          field.type === 'text' || field.type === 'textarea' ? '' : null,
          validators,
        ),
      );
    }
    if (this.editing) {
      const lookups = this.definition.fields.filter((field) => field.lookup);
      forkJoin({
        row: this.id ? this.api.get(this.definition.endpoint, this.id) : of(null),
        options: lookups.length
          ? forkJoin(lookups.map((field) => this.api.options(field.lookup!)))
          : of([]),
      })
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.loading.set(false)),
        )
        .subscribe({
          next: (result) => {
            this.options.set(
              Object.fromEntries(lookups.map((field, index) => [field.key, result.options[index]])),
            );
            if (result.row)
              for (const field of this.definition.fields)
                this.form.controls[field.key].setValue(result.row[field.key] ?? null);
            this.ready.set(true);
          },
          error: (e) => this.error.set(errorMessage(e, 'No se pudo cargar la información.')),
        });
    } else this.load();
  }
  load(): void {
    this.loading.set(true);
    this.api
      .list(this.definition.endpoint)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (rows) => {
          this.rows.set(rows);
          this.ready.set(true);
        },
        error: (e) => this.error.set(errorMessage(e, 'No se pudo cargar el listado.')),
      });
  }
  save(): void {
    if (this.busy() || this.created()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    const data = this.form.getRawValue();
    (this.id
      ? this.api.update(this.definition.endpoint, this.id, data)
      : this.api.create(this.definition.endpoint, data)
    )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.success.set('Información guardada correctamente.');
          if (!this.id) this.created.set(true);
        },
        error: (e) => this.error.set(errorMessage(e, 'No se pudo guardar la información.')),
      });
  }
  remove(row: CatalogRow): void {
    if (
      this.busy() ||
      !window.confirm(
        `¿Eliminar ${this.definition.singular} ${row['nombre'] || row['tarea_nombre'] || ''}?`,
      )
    )
      return;
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    this.api
      .remove(this.definition.endpoint, row.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.rows.update((rows) => rows.filter((r) => r.id !== row.id));
          this.success.set('Registro eliminado.');
        },
        error: (e) => this.error.set(errorMessage(e, 'No se pudo eliminar el registro.')),
      });
  }
}
