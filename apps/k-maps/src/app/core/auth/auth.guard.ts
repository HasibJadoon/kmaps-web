import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Screens whose reads the gateway only answers with a session (workers/backend/src/modules.ts:
 * cm and studio are private modules; ar is private apart from its registries; core users,
 * workspaces and SRS are a reader's own; qr/ar practice and drills are private paths).
 * Without a live token the reader goes to /login and comes back here afterwards.
 */
export const authGuard: CanActivateFn = (_route, state) => gate(state.url);

function gate(returnUrl: string): boolean | UrlTree {
  if (inject(AuthService).isSignedIn()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl } });
}

/** Only same-app paths may be returned to after sign-in. */
export function safeReturnUrl(raw: string | null | undefined, fallback = '/hub'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/login')) return fallback;
  return raw;
}
