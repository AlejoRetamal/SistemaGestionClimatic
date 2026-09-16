import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private router: Router) {}

  isAuthenticated(): boolean {
    return !!localStorage.getItem('userGroup');
  }

  getUserGroup(): string | null {
    return localStorage.getItem('userGroup');
  }

  login(userGroup: string, userName: string, userId: string) {
    localStorage.setItem('userGroup', userGroup);
    localStorage.setItem('userName', userName);
    localStorage.setItem('userId', userId);
  }

  logout() {
    localStorage.removeItem('userGroup');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    this.router.navigate(['/login']);
  }
}