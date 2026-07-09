import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BackendApiService } from '../services/backend-api.service';
import { RootAnalysisVm } from '../services/quran/quran-surah.service';

/**
 * The universal lexicon spine — the deep, corpus-agnostic profile per ROOT,
 * aggregated by the ar-linguistics worker from the classical lexicons
 * (Maqāyīs, Rāghib's Mufradāt, Lane, Sinai), the derived family, senses,
 * near-synonyms and antonyms. NO occurrence/naḥw context lives here.
 *
 * GET /api/al/word-analysis?roots=<root>  →  { [root]: RootAnalysis }
 */
@Injectable({ providedIn: 'root' })
export class LexiconSpineService {
  private readonly api = inject(BackendApiService);

  /** Universal profile for a single root (bare Arabic, e.g. "كتب"). */
  rootProfile(root: string): Observable<RootAnalysisVm | null> {
    return this.api
      .getData<Record<string, RootAnalysisVm>>('al', ['word-analysis'], { params: { roots: root } })
      .pipe(map((byRoot) => byRoot?.[root] ?? Object.values(byRoot ?? {})[0] ?? null));
  }
}
