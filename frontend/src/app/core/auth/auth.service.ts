import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, firstValueFrom, of, tap, timeout } from 'rxjs';
import { User } from '../models/user';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly currentUser = signal<User | null>(null);
  readonly user = this.currentUser.asReadonly();
  readonly connectionError = signal('');
  async restore(): Promise<void> {
    await firstValueFrom(
      this.http.get<User>('/api/auth/me').pipe(
        timeout(10000),
        tap((user) => {
          this.currentUser.set(user);
          this.connectionError.set('');
        }),
        catchError((error: unknown) => {
          this.currentUser.set(null);
          if (!(error instanceof HttpErrorResponse && error.status === 401))
            this.connectionError.set(
              'No se pudo recuperar la sesión. Verificá que la API está disponible.',
            );
          return of(null);
        }),
      ),
    );
  }
  login(pin: string): Observable<User> {
    return this.http.post<User>('/api/auth/login', { pin }).pipe(
      timeout(10000),
      tap((user) => {
        this.currentUser.set(user);
        this.connectionError.set('');
      }),
    );
  }
  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}).pipe(
      timeout(10000),
      tap(() => this.clear()),
    );
  }
  clear(): void {
    this.currentUser.set(null);
  }
}
