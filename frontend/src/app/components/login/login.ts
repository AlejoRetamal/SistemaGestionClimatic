import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  pin = '';
  error = '';
  loading = false;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  onLogin() {
    this.loading = true;
    this.error = '';

    this.apiService.login(this.pin).subscribe({
      next: (response) => {
        this.authService.login(response.grupo, response.nombre, response.id);
        this.router.navigate([`/inicio/${response.grupo.toLowerCase()}`]);
      },
      error: (err) => {
        this.error = err.error?.error || 'Error en el servidor';
        this.loading = false;
      }
    });
  }
}