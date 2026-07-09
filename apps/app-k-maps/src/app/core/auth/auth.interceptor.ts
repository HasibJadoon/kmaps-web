import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly router = inject(Router);
  private readonly tokenKey = 'auth_token';
  private redirecting = false;

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const authRequest = this.withAuthHeader(request);

    return next.handle(authRequest).pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401 && this.shouldHandleUnauthorized(authRequest)) {
          localStorage.removeItem(this.tokenKey);

          if (!this.redirecting && !this.router.url.startsWith('/login')) {
            this.redirecting = true;
            void this.router.navigateByUrl('/login', { replaceUrl: true }).finally(() => {
              this.redirecting = false;
            });
          }
        }

        return throwError(() => error);
      })
    );
  }

  private withAuthHeader(request: HttpRequest<unknown>): HttpRequest<unknown> {
    if (!this.shouldAttachToken(request)) {
      return request;
    }

    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      return request;
    }

    return request.clone({
      setHeaders: {
        authorization: `Bearer ${token}`,
      },
    });
  }

  private shouldAttachToken(request: HttpRequest<unknown>): boolean {
    if (!this.isApiRequest(request.url)) {
      return false;
    }

    const normalizedUrl = request.url.toLowerCase();
    if (normalizedUrl.endsWith('/login') || normalizedUrl.includes('/login?')) {
      return false;
    }

    return true;
  }

  private shouldHandleUnauthorized(request: HttpRequest<unknown>): boolean {
    return this.shouldAttachToken(request);
  }

  private isApiRequest(url: string): boolean {
    const apiBase = environment.apiBase.replace(/\/+$/, '');
    if (!apiBase) {
      return url.startsWith('/api');
    }

    if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
      return url.startsWith(apiBase);
    }

    return url.startsWith(apiBase) || url.startsWith('/api') || url.startsWith('api/');
  }
}
