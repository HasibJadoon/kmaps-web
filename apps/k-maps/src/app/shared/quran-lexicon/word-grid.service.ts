import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendApiService } from '../services/backend-api.service';
import { WordGridQuery, WordGridResult } from './word-grid.types';

/**
 * Fetches the lightweight, scope-based word grid from GET /api/qr/word-grid.
 * One call shape serves every grid surface (Root, Surah, Passage, Lexicon).
 */
@Injectable({ providedIn: 'root' })
export class WordGridService {
  private readonly api = inject(BackendApiService);

  fetch(q: WordGridQuery): Observable<WordGridResult> {
    const params: Record<string, string | number> = { scope: q.scope };
    if (q.root != null) params['root'] = q.root;
    if (q.surahId != null) params['surahId'] = q.surahId;
    if (q.ayahFrom != null) params['ayahFrom'] = q.ayahFrom;
    if (q.ayahTo != null) params['ayahTo'] = q.ayahTo;
    return this.api.getData<WordGridResult>('qr', ['word-grid'], { params });
  }
}
