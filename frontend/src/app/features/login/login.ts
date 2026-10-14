import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../shared/error-message';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: ` <main class="login-page">
    <section class="login-intro">
      <img
        class="brand-logo login-logo"
        src="/logo-climatic.png"
        alt="Climatic SRL"
        width="1722"
        height="490"
      />
      <h1>Tu espacio de trabajo.</h1>
      <p>Gestión interna de mantenimiento y operaciones.</p>
    </section>
    <section class="panel login-panel" aria-labelledby="login-title">
      <p class="eyebrow">ACCESO AL SISTEMA</p>
      <h2 id="login-title">Iniciar sesión</h2>
      <p class="muted">Ingresá tu PIN personal para continuar.</p>
      @if (auth.connectionError()) {
        <p class="notice" role="status">{{ auth.connectionError() }}</p>
      }
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label for="pin">PIN</label>
        <input
          id="pin"
          type="password"
          inputmode="numeric"
          autocomplete="current-password"
          formControlName="pin"
          maxlength="128"
          [attr.aria-invalid]="form.controls.pin.touched && form.controls.pin.invalid"
          aria-describedby="pin-help"
          autofocus
        />
        <p id="pin-help" class="field-help">
          Usá solamente números. Los ceros iniciales se conservan.
        </p>
        @if (form.controls.pin.touched && form.controls.pin.invalid) {
          <p class="error" role="alert">Ingresá un PIN numérico.</p>
        }
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
        <button class="primary full" type="submit" [disabled]="loading()">
          {{ loading() ? 'Ingresando…' : 'Ingresar' }}
        </button>
      </form>
    </section>
  </main>`,
})
export class LoginComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    pin: ['', [Validators.required, Validators.pattern(/^[0-9]{1,128}$/)]],
  });
  submit(): void {
    if (this.loading()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    this.auth
      .login(this.form.getRawValue().pin)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.form.reset();
          void this.router.navigate(['/inicio']);
        },
        error: (error: unknown) =>
          this.error.set(errorMessage(error, 'No se pudo iniciar sesión. Intentá nuevamente.')),
      });
  }
}
