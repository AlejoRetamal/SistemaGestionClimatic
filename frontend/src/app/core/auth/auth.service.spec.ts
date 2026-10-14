import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { User } from '../models/user';

const user: User = {
  id: 1,
  nombre: 'Ana',
  apellido: 'Prueba',
  email: null,
  grupo: 'Produccion',
  modulos: ['mantenimiento'],
};
describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('restores the authenticated user from the server', async () => {
    const promise = auth.restore();
    http.expectOne('/api/auth/me').flush(user);
    await promise;
    expect(auth.user()).toEqual(user);
  });
  it('accepts an anonymous 401 without inventing a user', async () => {
    const promise = auth.restore();
    http.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    await promise;
    expect(auth.user()).toBeNull();
    expect(auth.connectionError()).toBe('');
  });
  it('reports restore failure without leaving the bootstrap pending', async () => {
    const promise = auth.restore();
    http.expectOne('/api/auth/me').flush({}, { status: 503, statusText: 'Unavailable' });
    await promise;
    expect(auth.user()).toBeNull();
    expect(auth.connectionError()).not.toBe('');
  });
  it('preserves leading zeroes and clears the user only after successful logout', () => {
    auth.login('0012').subscribe();
    const request = http.expectOne('/api/auth/login');
    expect(request.request.body).toEqual({ pin: '0012' });
    request.flush(user);
    auth.logout().subscribe({ error: () => {} });
    http.expectOne('/api/auth/logout').flush({}, { status: 500, statusText: 'Error' });
    expect(auth.user()).toEqual(user);
    auth.logout().subscribe();
    http.expectOne('/api/auth/logout').flush(null);
    expect(auth.user()).toBeNull();
  });
});
