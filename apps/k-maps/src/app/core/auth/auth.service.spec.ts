import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService, TOKEN_KEY, jwtExp } from './auth.service';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiBase.replace(/\/+$/, '')}/core/auth`;

function jwt(payload: object): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.sig`;
}

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('is signed out without a token', () => {
    expect(auth.isSignedIn()).toBe(false);
  });

  it('is signed in with a token that has not expired', () => {
    localStorage.setItem(TOKEN_KEY, jwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 }));
    expect(auth.isSignedIn()).toBe(true);
  });

  it('is signed out once the token has expired', () => {
    localStorage.setItem(TOKEN_KEY, jwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) - 10 }));
    expect(auth.isSignedIn()).toBe(false);
  });

  it('treats a token without exp as live (the server decides)', () => {
    localStorage.setItem(TOKEN_KEY, 'opaque-token');
    expect(auth.isSignedIn()).toBe(true);
  });

  it('reads exp from a JWT, null when unreadable', () => {
    expect(jwtExp(jwt({ exp: 1234 }))).toBe(1234);
    expect(jwtExp('not.a-jwt')).toBeNull();
    expect(jwtExp('nodots')).toBeNull();
  });

  it('signIn posts the id_token and stores the session token', () => {
    let got: string | null | undefined;
    auth.signIn('google', 'id-tok', 'Ann').subscribe((t) => (got = t));
    const req = http.expectOne(`${BASE}/oauth/google`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ id_token: 'id-tok', name: 'Ann' });
    req.flush({ ok: true, data: { token: 'tok-1' } });
    expect(got).toBe('tok-1');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok-1');
  });

  it('signIn without a token in the answer stores nothing', () => {
    let got: string | null | undefined;
    auth.signIn('apple', 'id-tok').subscribe((t) => (got = t));
    http.expectOne(`${BASE}/oauth/apple`).flush({ ok: false, error: { message: 'no' } });
    expect(got).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('providers unwraps data', () => {
    let got: unknown;
    auth.providers().subscribe((p) => (got = p));
    http.expectOne(`${BASE}/providers`).flush({ ok: true, data: { google: { enabled: true, client_id: 'c' } } });
    expect(got).toEqual({ google: { enabled: true, client_id: 'c' } });
  });

  it('clear removes the token', () => {
    auth.setToken('x');
    auth.clear();
    expect(auth.token()).toBeNull();
  });
});
