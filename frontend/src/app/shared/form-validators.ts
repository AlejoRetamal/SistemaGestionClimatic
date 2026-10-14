import { AbstractControl, ValidationErrors } from '@angular/forms';
export function nonBlank(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.trim() ? null : { required: true };
}
export function decimalPlaces(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (value === null || value === '') return null;
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    /^-?\d+(\.\d{1,2})?$/.test(String(value))
    ? null
    : { decimalPlaces: true };
}
