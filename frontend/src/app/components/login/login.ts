import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  constructor(private router: Router) {}

  onLogin() {
    if (this.pin === '2708') {
      localStorage.setItem('userGroup', 'Direccion');
      localStorage.setItem('userName', 'Alejo');
      localStorage.setItem('userId', '1');
      this.router.navigate(['/inicio/direccion']);
    } else {
      this.error = 'PIN incorrecto';
    }
  }
}