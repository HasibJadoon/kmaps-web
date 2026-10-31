import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface Envelope<T> {
  ok: boolean;
  data: T;
}

type Params = Record<string, string | number | boolean>;

/**
 * Worldview (WV) worker reads and writes for the worldview screens — through
 * HttpClient, so the auth interceptor adds the session and handles 401s.
 * Response shapes stay with the screens; this service only unwraps `{ ok, data }`.
 */
@Injectable({ providedIn: 'root' })
export class WorldviewApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase.replace(/\/+$/, '');

  get<T>(path: string, params?: Params): Observable<T> {
    return this.http
      .get<Envelope<T>>(`${this.base}/${path.replace(/^\/+/, '')}`, { params: params ? new HttpParams({ fromObject: params }) : undefined })
      .pipe(map((res) => res.data));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<Envelope<T>>(`${this.base}/${path.replace(/^\/+/, '')}`, body)
      .pipe(map((res) => res.data));
  }

  // ── named reads used by the worldview screens ─────────────────────────────
  counts(): Promise<Record<string, number>> {
    return firstValueFrom(this.get<Record<string, number>>('worldview/counts'));
  }

  brainstormSessions<T>(limit = 30): Promise<T[]> {
    return firstValueFrom(this.get<T[]>('wv/brainstorm', { limit })).then(asArray);
  }

  createBrainstorm<T>(body: { title: string; topic?: string; worldview?: string; content?: string }): Promise<T> {
    return firstValueFrom(this.post<T>('wv/brainstorm', body));
  }

  comparisons<T>(limit = 20): Promise<T[]> {
    return firstValueFrom(this.get<T[]>('wv/comparisons', { limit })).then(asArray);
  }

  comparison<T>(id: number | string): Promise<T> {
    return firstValueFrom(this.get<T>(`wv/comparisons/${encodeURIComponent(String(id))}`));
  }

  contrast<T>(surah: number, from: number, to: number): Promise<T | null> {
    return firstValueFrom(this.get<T>(`wv/positions/contrast/${surah}/${from}-${to}`)).then((d) => d ?? null);
  }

  /** Passages that have a contrast built (Lens screen). */
  contrastPassages<T>(): Promise<T[]> {
    return firstValueFrom(this.get<{ passages: T[] }>('wv/positions/contrast')).then((d) => asArray(d?.passages));
  }

  timeline<T>(): Promise<T> {
    return firstValueFrom(this.get<T>('wv/timeline'));
  }

  mapLayer<T>(layerId: string): Promise<T> {
    return firstValueFrom(this.get<T>(`wv/maps/${encodeURIComponent(layerId)}`));
  }
}

function asArray<T>(v: T[] | null | undefined): T[] {
  return Array.isArray(v) ? v : [];
}
