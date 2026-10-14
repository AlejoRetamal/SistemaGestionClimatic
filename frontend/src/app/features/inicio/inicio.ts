import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PermissionService } from '../../core/permissions/permission.service';
@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [RouterLink],
  template: ` <p class="eyebrow">INICIO</p>
    <h1>Hola, {{ auth.user()?.nombre }}.</h1>
    <p class="lead">Elegí un módulo para comenzar.</p>
    <div class="module-grid">
      @for (module of permissions.modules(); track module.key) {
        <a class="module-card" [routerLink]="['/inicio', module.key]"
          ><span class="module-icon">{{ module.symbol }}</span>
          <h2>{{ module.title }}</h2>
          <p>{{ module.description }}</p>
          <span class="card-link">Ingresar <span aria-hidden="true">→</span></span>
        </a>
      } @empty {
        <p class="notice">
          Tu usuario no tiene módulos habilitados. Consultá con la persona responsable del sistema.
        </p>
      }
    </div>`,
})
export class InicioComponent {
  readonly auth = inject(AuthService);
  readonly permissions = inject(PermissionService);
}
