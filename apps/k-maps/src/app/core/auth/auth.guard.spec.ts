import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { authGuard, safeReturnUrl } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  let signedIn = false;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: AuthService, useValue: { isSignedIn: () => signedIn } },
      ],
    });
  });

  const run = (url: string) =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot));

  it('lets a signed-in reader through', () => {
    signedIn = true;
    expect(run('/docs/abc')).toBe(true);
  });

  it('sends a signed-out reader to /login with the way back', () => {
    signedIn = false;
    const result = run('/docs/abc?x=1');
    expect(result instanceof UrlTree).toBe(true);
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fdocs%2Fabc%3Fx%3D1');
  });
});

describe('safeReturnUrl', () => {
  it('keeps same-app paths', () => {
    expect(safeReturnUrl('/arabic/library')).toBe('/arabic/library');
  });

  it('refuses other origins, protocol-relative URLs and the login page', () => {
    expect(safeReturnUrl('https://evil.example')).toBe('/hub');
    expect(safeReturnUrl('//evil.example/x')).toBe('/hub');
    expect(safeReturnUrl('/login?returnUrl=/x')).toBe('/hub');
    expect(safeReturnUrl(null)).toBe('/hub');
    expect(safeReturnUrl(undefined, '/landing')).toBe('/landing');
  });
});
