import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const isApi = req.url.startsWith(environment.apiBase) || req.url.startsWith('/api');
  const isAuthEndpoint = req.url.includes('/core/auth/') || req.url.includes('/seed-admin');

  let request = req;
  if (isApi && !isAuthEndpoint) {
    const token = auth.token();
    if (token) {
      request = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
  }

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isApi &&
        !isAuthEndpoint
      ) {
        auth.clear();
        if (!router.url.startsWith('/login')) {
          void router.navigate(['/login'], { replaceUrl: true, queryParams: { returnUrl: router.url } });
        }
      }
      return throwError(() => error);
    }),
  );
};
