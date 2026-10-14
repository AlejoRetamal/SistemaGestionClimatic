import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
@Component({
  selector: 'app-message-page',
  standalone: true,
  imports: [RouterLink],
  template: `<main class="message-page panel">
    <p class="eyebrow">CLIMATIC SRL</p>
    <h1>{{ title }}</h1>
    <p>{{ message }}</p>
    <a class="button primary" routerLink="/inicio">Volver al inicio</a>
  </main>`,
})
export class MessagePageComponent {
  private readonly route = inject(ActivatedRoute);
  readonly title = this.route.snapshot.data['title'] as string;
  readonly message = this.route.snapshot.data['message'] as string;
}
