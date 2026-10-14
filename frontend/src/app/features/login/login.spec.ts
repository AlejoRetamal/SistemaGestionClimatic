import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login';
import { AuthService } from '../../core/auth/auth.service';
describe('PIN login', () => {
  const login = vi.fn();
  beforeEach(() => {
    login.mockReset();
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { login, connectionError: signal('') } },
      ],
    });
  });
  it('validates PIN before calling the API', () => {
    const component = TestBed.createComponent(LoginComponent).componentInstance;
    component.form.setValue({ pin: 'abc' });
    component.submit();
    expect(login).not.toHaveBeenCalled();
  });
  it('always goes to /inicio after login and preserves zeroes', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    login.mockReturnValue(of({ grupo: 'Produccion' }));
    const component = TestBed.createComponent(LoginComponent).componentInstance;
    component.form.setValue({ pin: '0012' });
    component.submit();
    expect(login).toHaveBeenCalledWith('0012');
    expect(navigate).toHaveBeenCalledWith(['/inicio']);
    expect(component.form.controls.pin.value).toBe('');
    expect(component.loading()).toBe(false);
  });
  it('allows retry after a server error', () => {
    login.mockReturnValue(throwError(() => new Error('offline')));
    const component = TestBed.createComponent(LoginComponent).componentInstance;
    component.form.setValue({ pin: '0012' });
    component.submit();
    expect(component.error()).not.toBe('');
    expect(component.loading()).toBe(false);
  });
});
