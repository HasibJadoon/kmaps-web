import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { LexiconSpineService } from '../lexicon-spine.service';
import { RootAnalysisVm } from '../../services/quran/quran-surah.service';

/**
 * Root view — the UNIVERSAL lexicon spine for one root: its core meaning, the
 * classical-lexicon coverage (Maqāyīs / Mufradāt / Lane / Sinai), and its derived
 * family of lemmas. Corpus-agnostic; NO occurrence context. Shared across the
 * Lexicon, the Quran researcher Lexicon, and Surah.
 */
@Component({
  selector: 'km-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './root.component.html',
  styleUrl: './root.component.scss',
})
export class RootComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly spine = inject(LexiconSpineService);

  readonly root = signal<string>(this.route.snapshot.paramMap.get('root') ?? '');
  readonly profile = signal<RootAnalysisVm | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  /** Classical-lexicon lenses in display order (present = authored in D1). */
  readonly lensKeys = ['maqayis', 'mufradat', 'lane', 'sinai'] as const;
  readonly lensLabels: Record<string, string> = {
    maqayis: 'Maqāyīs', mufradat: 'Mufradāt', lane: 'Lane', sinai: 'Sinai',
  };

  ngOnInit(): void {
    const r = this.root();
    if (!r) { this.loading.set(false); return; }
    this.spine.rootProfile(r).subscribe({
      next: (p) => { this.profile.set(p); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load root'); this.loading.set(false); },
    });
  }

  hasLens(key: string): boolean {
    const l = this.profile()?.lenses as Record<string, unknown> | undefined;
    return !!l?.[key];
  }
}
