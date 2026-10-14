import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { sessionInterceptor } from './session.interceptor';

describe('Session HTTP protection', () => {
  let http: HttpTestingController;
  const user = signal<unknown>({ id: 1 });
  const clear = vi.fn(() => user.set(null));
  beforeEach(() => {
    user.set({ id: 1 });
    clear.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(
          withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-CSRF-Token' }),
          withInterceptors([sessionInterceptor]),
        ),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { user, clear } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/';
  });
  it('attaches the CSRF cookie to same-origin mutations', () => {
    document.cookie = 'XSRF-TOKEN=isolated-test-token; Path=/';
    TestBed.inject(HttpClient).post('/api/auth/logout', {}).subscribe();
    const request = http.expectOne('/api/auth/logout');
    expect(request.request.headers.get('X-CSRF-Token')).toBe('isolated-test-token');
    request.flush(null);
  });
  it('clears an expired session and redirects to login on API 401', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    TestBed.inject(HttpClient)
      .get('/api/auth/me')
      .subscribe({ error: () => {} });
    http.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(clear).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
  it('keeps the session on permission denial', () => {
    TestBed.inject(HttpClient)
      .get('/api/modulos/comercial')
      .subscribe({ error: () => {} });
    http.expectOne('/api/modulos/comercial').flush({}, { status: 403, statusText: 'Forbidden' });
    expect(clear).not.toHaveBeenCalled();
  });
});
