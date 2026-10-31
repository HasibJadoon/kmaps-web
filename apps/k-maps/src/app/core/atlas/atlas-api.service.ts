import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendApiService } from '../../shared/services/backend-api.service';
import { LandingAtlas } from './atlas.models';

/** The landing atlas, served by the worldview worker (wv_landing_atlas_item). */
@Injectable({ providedIn: 'root' })
export class AtlasApiService {
  private readonly api = inject(BackendApiService);

  landingAtlas(): Observable<LandingAtlas> {
    return this.api.getData<LandingAtlas>('wv', ['landing-atlas']);
  }
}
