import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { ModuleKey, ModuleStatus } from '../models/user';
@Injectable({ providedIn: 'root' })
export class ModuleService {
  private readonly http = inject(HttpClient);
  getStatus(module: ModuleKey): Observable<ModuleStatus> {
    return this.http.get<ModuleStatus>(`/api/modulos/${module}`).pipe(timeout(10000));
  }
}
