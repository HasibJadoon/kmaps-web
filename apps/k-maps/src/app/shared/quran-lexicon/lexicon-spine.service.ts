import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BackendApiService } from '../services/backend-api.service';
import { RootDisplay } from './word-grid.types';

/**
 * The universal lexicon spine, read from the DISPLAY LAYER (qr_morph_display_root).
 * Every field — including every icon (a lucide name) — is data; the UI renders it
 * verbatim. The row is a materialized projection of the ar-linguistics word-analysis
 * aggregation (classical lexicons Maqāyīs/Mufradāt/Lane/Sinai, derived family, senses),
 * produced by the kmaps-database populate pipeline. NO occurrence/naḥw context here.
 *
 * GET /api/qr/lexicon/root/<root>  →  RootDisplay
 */
@Injectable({ providedIn: 'root' })
export class LexiconSpineService {
  private readonly api = inject(BackendApiService);

  /** Root display record (bare Arabic, e.g. "بين"). */
  rootDisplay(root: string): Observable<RootDisplay> {
    return this.api.getData<RootDisplay>('qr', ['lexicon', 'root', root]);
  }
}
