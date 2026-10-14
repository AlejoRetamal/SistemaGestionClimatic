import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MODULES } from '../../core/permissions/permission.service';
import { ModuleKey } from '../../core/models/user';
import { ModuleService } from '../../core/services/module.service';
import { MAINTENANCE_LINKS } from '../mantenimiento/maintenance-links';
import { errorMessage } from '../../shared/error-message';
@Component({
  selector: 'app-module-page',
  standalone: true,
  imports: [RouterLink],
  template: ` <a class="back-link" routerLink="/inicio">← Volver al inicio</a>
    <p class="eyebrow">MÓDULOS</p>
    <h1>{{ title() }}</h1>
    @if (loading()) {
      <p class="notice" role="status">Cargando módulo…</p>
    } @else if (error()) {
      <div class="error" role="alert">
        {{ error() }} <button class="secondary" (click)="load()">Reintentar</button>
      </div>
    } @else {
      <p class="lead">{{ message() }}</p>
      @if (module() === 'mantenimiento') {
        <div class="feature-grid">
          @for (item of maintenance; track item.title) {
            @if (item.path) {
              <a class="panel feature-card module-card" [routerLink]="item.path"
                ><h2>{{ item.title }}</h2>
                <p>{{ item.detail }}</p>
                <span class="card-link">Ingresar →</span></a
              >
            } @else {
              <article class="panel feature-card">
                <span class="badge">Próximas fases</span>
                <h2>{{ item.title }}</h2>
                <p>{{ item.detail }}</p>
              </article>
            }
          }
        </div>
      } @else {
        <section class="panel empty-state">
          <h2>Espacio preparado</h2>
          <p>
            Las funcionalidades de este módulo se incorporarán cuando sus reglas están definidas.
          </p>
        </section>
      }
    }`,
})
export class ModulePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ModuleService);
  private readonly destroyRef = inject(DestroyRef);
  readonly module = signal<ModuleKey>('mantenimiento');
  readonly title = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly maintenance = MAINTENANCE_LINKS;
  constructor() {
    this.route.data.pipe(takeUntilDestroyed()).subscribe((data) => {
      const key = data['module'] as ModuleKey;
      this.module.set(key);
      this.title.set(MODULES.find((item) => item.key === key)?.title || '');
      this.load();
    });
  }
  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .getStatus(this.module())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (result) => this.message.set(result.mensaje),
        error: (error: unknown) =>
          this.error.set(errorMessage(error, 'No se pudo cargar el módulo.')),
      });
  }
}
