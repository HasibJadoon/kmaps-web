import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef,
  inject, signal, viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ProvidersResponse {
  data?: {
    google?: { enabled?: boolean; client_id?: string };
    apple?: { enabled?: boolean; client_id?: string; redirect_uri?: string; scope?: string };
  };
}
interface TokenResponse { data?: { token?: string }; error?: { message?: string } }

interface GoogleCredential { credential?: string }
interface AppleAuthResponse { authorization?: { id_token?: string }; user?: { name?: { firstName?: string; lastName?: string } } }

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const APPLE_SRC = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset['loaded'] === '1') { resolve(); return; }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`failed to load ${src}`)));
      return;
    }
    const el = document.createElement('script');
    el.src = src; el.async = true; el.defer = true;
    el.addEventListener('load', () => { el.dataset['loaded'] = '1'; resolve(); });
    el.addEventListener('error', () => reject(new Error(`failed to load ${src}`)));
    document.head.appendChild(el);
  });
}

@Component({
  selector: 'km-login',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements AfterViewInit {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  private readonly googleBtn = viewChild<ElementRef<HTMLElement>>('googleBtn');

  readonly loadingProviders = signal(true);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly google = signal<{ enabled: boolean; clientId: string }>({ enabled: false, clientId: '' });
  readonly apple = signal<{ enabled: boolean; clientId: string; redirectUri: string; scope: string }>(
    { enabled: false, clientId: '', redirectUri: '', scope: 'name email' },
  );

  ngAfterViewInit(): void {
    this.http.get<ProvidersResponse>(`${environment.apiBase}/core/auth/providers`).subscribe({
      next: (res) => {
        const g = res?.data?.google, a = res?.data?.apple;
        this.google.set({ enabled: !!g?.enabled, clientId: g?.client_id ?? '' });
        this.apple.set({
          enabled: !!a?.enabled, clientId: a?.client_id ?? '',
          redirectUri: a?.redirect_uri ?? '', scope: a?.scope ?? 'name email',
        });
        this.loadingProviders.set(false);
        if (this.google().enabled) void this.initGoogle();
      },
      error: () => {
        this.loadingProviders.set(false);
        this.error.set('Could not reach the sign-in service.');
      },
    });
  }

  private async initGoogle(): Promise<void> {
    try {
      await loadScript(GSI_SRC);

      const gsi = (window as unknown as {
        google?: { accounts?: { id?: {
          initialize(o: Record<string, unknown>): void;
          renderButton(el: HTMLElement, o: Record<string, unknown>): void;
        } } };
      }).google?.accounts?.id;
      const host = this.googleBtn()?.nativeElement;
      if (!gsi || !host) { this.error.set('Google sign-in failed to load.'); return; }

      gsi.initialize({
        client_id: this.google().clientId,
        callback: (resp: GoogleCredential) => this.exchange('google', resp?.credential ?? ''),

        error_callback: (err: { type?: string }) => {
          this.busy.set(false);
          this.error.set(
            err?.type === 'popup_closed'
              ? 'Sign-in was cancelled.'
              : `Google rejected this origin (${window.location.origin}). Add it to the OAuth client's Authorized JavaScript origins.`,
          );
        },
      });
      gsi.renderButton(host, {
        theme: 'filled_black', size: 'large', shape: 'pill',
        text: 'continue_with', width: 280,
      });
    } catch {
      this.error.set('Google sign-in failed to load.');
    }
  }

  async signInApple(): Promise<void> {
    this.error.set(null);
    try {
      await loadScript(APPLE_SRC);
      const appleId = (window as unknown as {
        AppleID?: { auth?: {
          init(o: Record<string, unknown>): void;
          signIn(): Promise<AppleAuthResponse>;
        } };
      }).AppleID?.auth;
      if (!appleId) { this.error.set('Apple sign-in failed to load.'); return; }

      const cfg = this.apple();
      appleId.init({
        clientId: cfg.clientId, scope: cfg.scope,
        redirectURI: cfg.redirectUri, usePopup: true,
      });
      const res = await appleId.signIn();
      const idToken = res?.authorization?.id_token ?? '';

      const n = res?.user?.name;
      const name = [n?.firstName, n?.lastName].filter(Boolean).join(' ').trim() || undefined;
      this.exchange('apple', idToken, name);
    } catch {

      this.busy.set(false);
    }
  }

  private exchange(provider: 'google' | 'apple', idToken: string, name?: string): void {
    if (!idToken) { this.error.set('No credential returned by the provider.'); return; }
    this.busy.set(true);
    this.error.set(null);
    this.http
      .post<TokenResponse>(`${environment.apiBase}/core/auth/oauth/${provider}`,
        name ? { id_token: idToken, name } : { id_token: idToken })
      .subscribe({
        next: (res) => {
          const token = res?.data?.token;
          this.busy.set(false);
          if (!token) { this.error.set('Sign-in failed.'); return; }
          localStorage.setItem('km_token', token);
          void this.router.navigate(['/hub']);
        },
        error: (e: { error?: { error?: { message?: string } } }) => {
          this.busy.set(false);
          this.error.set(e?.error?.error?.message ?? 'Sign-in failed.');
        },
      });
  }
}
