import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { TOKEN_KEY } from './auth.service';
import { environment } from '../../../environments/environment';

const API = environment.apiBase.replace(/\/+$/, '');

describe('authInterceptor', () => {
  let http: HttpClient;
  let ctl: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    ctl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctl.verify());

  it('adds the bearer token to API calls', () => {
    localStorage.setItem(TOKEN_KEY, 'tok');
    http.get(`${API}/ar/text/shelf`).subscribe();
    const req = ctl.expectOne(`${API}/ar/text/shelf`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok');
    req.flush({});
  });

  it('never sends the token to the sign-in endpoints or other hosts', () => {
    localStorage.setItem(TOKEN_KEY, 'tok');
    http.get(`${API}/core/auth/providers`).subscribe();
    http.get('https://example.org/x').subscribe();
    expect(ctl.expectOne(`${API}/core/auth/providers`).request.headers.has('Authorization')).toBe(false);
    expect(ctl.expectOne('https://example.org/x').request.headers.has('Authorization')).toBe(false);
  });

  it('on 401 clears the session and goes to /login', () => {
    localStorage.setItem(TOKEN_KEY, 'tok');
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    http.get(`${API}/cm/documents`).subscribe({ error: () => {} });
    ctl.expectOne(`${API}/cm/documents`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(nav).toHaveBeenCalledWith(['/login'], expect.objectContaining({ replaceUrl: true }));
  });
});
