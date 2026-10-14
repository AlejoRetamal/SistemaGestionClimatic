import { HttpErrorResponse } from '@angular/common/http';
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No se pudo conectar con el servidor. Intentá nuevamente.';
    if (typeof error.error?.error === 'string') return error.error.error;
  }
  return fallback;
}
