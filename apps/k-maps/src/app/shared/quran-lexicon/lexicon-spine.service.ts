import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BackendApiService } from '../services/backend-api.service';
import { RootDisplay } from './word-grid.types';

@Injectable({ providedIn: 'root' })
export class LexiconSpineService {
  private readonly api = inject(BackendApiService);

  rootDisplay(root: string): Observable<RootDisplay> {
    return this.api.getData<RootDisplay>('qr', ['lexicon', 'root', root]);
  }
}
