import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface HubListResponse {
  ok: boolean;
  results?: unknown[];
  items?: unknown[];
  data?: unknown[];
  total?: number;
}

/**
 * Hub table reads and quick-create writes. Paths are gateway paths after /api
 * (e.g. `/wv/sources?limit=50`); HttpClient carries the session via the auth interceptor.
 */
@Injectable({ providedIn: 'root' })
export class HubApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase.replace(/\/+$/, '');

  list(path: string): Observable<HubListResponse> {
    return this.http.get<HubListResponse>(this.url(path));
  }

  create(path: string, body: unknown): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(this.url(path), body);
  }

  url(path: string): string {
    return `${this.base}/${path.replace(/^\/+/, '')}`;
  }
}
