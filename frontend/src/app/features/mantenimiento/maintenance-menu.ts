import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MaintenanceMenu } from './maintenance-links';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <a class="back-link" routerLink="/inicio/mantenimiento">← Mantenimiento</a>
    <h1>{{ menu.title }}</h1>
    <p class="lead">{{ menu.detail }}</p>
    <nav class="feature-grid" [attr.aria-label]="menu.title">
      @for (item of menu.links; track item.path) {
        <a class="panel feature-card module-card" [routerLink]="item.path">
          <h2>{{ item.title }}</h2>
          <p>{{ item.detail }}</p>
          <span class="card-link">Ingresar →</span>
        </a>
      }
    </nav>
  `,
})
export class MaintenanceMenuComponent {
  readonly menu = inject(ActivatedRoute).snapshot.data['menu'] as MaintenanceMenu;
}
