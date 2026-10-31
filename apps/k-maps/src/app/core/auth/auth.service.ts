import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export const TOKEN_KEY = 'km_token';

export interface AuthProviders {
  google?: { enabled?: boolean; client_id?: string };
  apple?: { enabled?: boolean; client_id?: string; redirect_uri?: string; scope?: string };
}

interface Envelope<T> { ok?: boolean; data?: T; error?: { message?: string } }

/**
 * The session: the bearer token the core worker issues on sign-in, kept in
 * localStorage under `km_token`. The interceptor attaches it; the guard asks
 * `isSignedIn()` before opening a screen whose reads need a session.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase.replace(/\/+$/, '')}/core/auth`;

  token(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }

  setToken(token: string): void {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* storage blocked */ }
  }

  clear(): void {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
  }

  /** A token is present and, if it carries an `exp`, it has not passed. */
  isSignedIn(now: number = Date.now()): boolean {
    const token = this.token();
    if (!token) return false;
    const exp = jwtExp(token);
    return exp == null || exp * 1000 > now;
  }

  providers(): Observable<AuthProviders> {
    return this.http.get<Envelope<AuthProviders>>(`${this.base}/providers`).pipe(map((r) => r?.data ?? {}));
  }

  /** Trade a Google/Apple id_token for a K-Maps session token and store it. */
  signIn(provider: 'google' | 'apple', idToken: string, name?: string): Observable<string | null> {
    const body = name ? { id_token: idToken, name } : { id_token: idToken };
    return this.http.post<Envelope<{ token?: string }>>(`${this.base}/oauth/${provider}`, body).pipe(
      map((res) => {
        const token = res?.data?.token ?? null;
        if (token) this.setToken(token);
        return token;
      }),
    );
  }
}

/** The `exp` claim (seconds) of a JWT, or null when it has none or can't be read. */
export function jwtExp(token: string): number | null {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
}
