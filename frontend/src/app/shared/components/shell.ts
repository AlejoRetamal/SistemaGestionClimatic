import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../error-message';
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: ` <header class="navbar">
      <a class="brand" routerLink="/inicio" aria-label="Climatic SRL — Inicio"
        ><img
          class="brand-logo navbar-logo"
          src="/logo-climatic.png"
          alt="Climatic SRL"
          width="1722"
          height="490"
        />
        <span class="brand-sub">Gestión interna</span></a
      >
      <nav aria-label="Navegación principal">
        <a routerLink="/inicio">Inicio</a
        ><span class="user-name">{{ auth.user()?.nombre }} {{ auth.user()?.apellido }}</span>
        <button class="secondary" (click)="logout()" [disabled]="loading()">
          {{ loading() ? 'Cerrando…' : 'Cerrar sesión' }}
        </button>
      </nav>
    </header>
    @if (error()) {
      <p class="error shell-error" role="alert">{{ error() }}</p>
    }
    <main class="workspace"><router-outlet /></main>
    <footer class="footer">Climatic SRL · Sistema de gestión interna</footer>`,
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly loading = signal(false);
  readonly error = signal('');
  logout(): void {
    if (this.loading() || !window.confirm('¿Querés cerrar la sesión?')) return;
    this.loading.set(true);
    this.error.set('');
    this.auth
      .logout()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/login']),
        error: (error: unknown) =>
          this.error.set(errorMessage(error, 'No se pudo cerrar la sesión. Intentá nuevamente.')),
      });
  }
}
