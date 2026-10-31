import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

type Params = HttpParams | Record<string, string | number | boolean | readonly (string | number | boolean)[]>;

/**
 * The Arabic-learning (AR) worker, for the /arabic screens. Paths are gateway paths
 * after /api (`ar/text/shelf`, `ar/intake/:id`). Bodies come back as the worker sent
 * them (`{ ok, data }`), so screens keep their own response types. Going through
 * HttpClient means the auth interceptor adds the session and handles 401s.
 */
@Injectable({ providedIn: 'root' })
export class ArabicApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase.replace(/\/+$/, '');

  url(path: string): string {
    return `${this.base}/${path.replace(/^\/+/, '')}`;
  }

  get<T>(path: string, options?: { params?: Params }): Observable<T> {
    return this.http.get<T>(this.url(path), options);
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.url(path), body);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.url(path), body);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(this.url(path), body);
  }
}
