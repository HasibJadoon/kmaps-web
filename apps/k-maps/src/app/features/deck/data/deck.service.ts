import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { BackendApiService } from '../../../shared/services/backend-api.service';
import { environment } from '../../../../environments/environment';
import { asDeckLayout, type Deck, type DeckSummary } from '../domain/deck.models';

@Injectable({ providedIn: 'root' })
export class DeckService {
  private readonly api = inject(BackendApiService);

  list(filters: { domain?: string; subdomain?: string } = {}): Observable<DeckSummary[]> {
    let params = new HttpParams();
    if (filters.domain) params = params.set('domain', filters.domain);
    if (filters.subdomain) params = params.set('subdomain', filters.subdomain);
    return this.api.getData<DeckSummary[]>('cm', ['decks'], { params });
  }

  private resolveAsset(url: string): string {
    if (!url.startsWith('/api/')) return url;
    return environment.apiBase.replace(/\/+$/, '') + url.slice('/api'.length);
  }

  get(slug: string): Observable<Deck> {
    return this.api.getData<Deck>('cm', ['decks', slug]).pipe(
      // The worker already normalises, but a deck authored against a newer
      // contract can still carry a layout this build has no renderer for.
      // Narrow it here so the template's @switch always has a case.
      map((deck) => ({
        ...deck,
        slides: deck.slides.map((s) => ({
          ...s,
          layout: asDeckLayout(s.layout),
          // Image urls are gateway-relative (/api/cm/assets/...); this app's
          // API base may be a proxy path or an absolute origin.
          image: s.image ? { ...s.image, url: this.resolveAsset(s.image.url) } : null,
        })),
      })),
    );
  }
}
