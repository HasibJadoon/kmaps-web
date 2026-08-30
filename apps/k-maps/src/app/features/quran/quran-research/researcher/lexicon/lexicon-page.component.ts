import {
  ChangeDetectionStrategy, Component, ElementRef, ViewChild,
  inject, signal, OnInit, AfterViewInit, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  forkJoin, debounceTime, distinctUntilChanged, Subject, switchMap, of, catchError, map,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import gsap from 'gsap';
import {
  AlDictionaryApiService,
  AlDictSource, ScholarshipNote,
} from '../../../../../shared/services/al-dictionary-api.service';

interface RootMeta {
  text_ar: string;
  meaning_ar: string | null;
  frequency_quran: number | null;
}

interface SourceHit {
  count:   number;
  samples: string[];
}

@Component({
  selector: 'km-lexicon-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lexicon-page.component.html',
  styleUrl: './lexicon-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconPageComponent implements OnInit, AfterViewInit {
  @ViewChild('catalog')   catalogRef?:   ElementRef<HTMLElement>;
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  private readonly api    = inject(AlDictionaryApiService);
  private readonly router = inject(Router);

  readonly sources        = signal<AlDictSource[]>([]);
  readonly sourcesLoading = signal(true);
  readonly searchTerm     = signal('');
  readonly searching      = signal(false);
  readonly rootMeta       = signal<RootMeta | null>(null);
  readonly hitsBySlug     = signal<Map<string, SourceHit>>(new Map());

  readonly scholarship    = signal<ScholarshipNote[]>([]);

  readonly scholarshipCards = computed(() => {
    const notes = this.scholarship();
    if (!notes.length) return [];
    const bySource = new Map<string, {
      source_slug: string;
      source_id:   string;
      title_ar:    string;
      title_en:    string;
      author:      string;
      year:        number | null;
      genre:       string;
      genre_label: { ar: string; en: string };
      url:         string | null;
      notes:       ScholarshipNote[];

      samples:     string[];
    }>();
    for (const n of notes) {
      const key = n.source.id;
      if (!bySource.has(key)) {
        bySource.set(key, {
          source_slug: '',
          source_id:   n.source_id,
          title_ar:    n.source.title_ar,
          title_en:    n.source.title_en,
          author:      n.source.author,
          year:        n.source.year,
          genre:       n.source.genre,
          genre_label: n.source.genre_label,
          url:         n.source.url,
          notes:       [],
          samples:     [],
        });
      }
      const card = bySource.get(key)!;
      card.notes.push(n);
      const sample = (n.root_text ?? n.root_norm ?? '').trim();
      if (sample && !card.samples.includes(sample)) card.samples.push(sample);
    }
    return [...bySource.values()];
  });

  readonly quickRoots = ['كتب', 'علم', 'قرأ', 'رحم', 'حمد', 'أمن', 'نزل', 'خلق'];

  readonly hitSources = computed(() => {
    const hits = this.hitsBySlug();
    if (hits.size === 0) return [];
    return this.sources()
      .filter(s => hits.has(s.slug) && (hits.get(s.slug)?.count ?? 0) > 0)
      .sort((a, b) => (hits.get(b.slug)!.count) - (hits.get(a.slug)!.count));
  });

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(
      debounceTime(320),
      distinctUntilChanged(),
      switchMap(q => {
        const t = q.trim();
        if (!t) {
          this.rootMeta.set(null);
          this.hitsBySlug.set(new Map());
          this.scholarship.set([]);
          this.searching.set(false);
          return of(null);
        }
        this.searching.set(true);
        return forkJoin({

          compare:     this.api.getV2RootCompare(t).pipe(catchError(() => of(null))),
          dict:        this.api.getRootEntries(t, 20).pipe(catchError(() => of(null))),
          scholarship: this.api.getRootScholarship(t).pipe(
            catchError(() => of({ root_norm: t, notes: [], total: 0 })),
          ),
        }).pipe(map(res => ({ ...res, q: t })));
      }),
      takeUntilDestroyed(),
    ).subscribe(res => {
      this.searching.set(false);
      if (!res) {
        this.hitsBySlug.set(new Map());
        this.scholarship.set([]);
        return;
      }

      const { compare, dict, scholarship, q } = res;
      this.scholarship.set(scholarship?.notes ?? []);

      if (dict) {
        this.rootMeta.set({
          text_ar: dict.root.text_ar,
          meaning_ar: dict.root.meaning_ar,
          frequency_quran: dict.root.frequency_quran,
        });
      } else if (compare?.canonical) {
        this.rootMeta.set({
          text_ar: compare.canonical.root_text,
          meaning_ar: null,
          frequency_quran: compare.canonical.frequency_quran,
        });
      } else {
        this.rootMeta.set({ text_ar: q, meaning_ar: null, frequency_quran: null });
      }

      const hits = new Map<string, SourceHit>();
      const SAMPLE_CAP = 6;

      for (const src of compare?.sources ?? []) {
        const samples: string[] = [];
        const head = (src.root_text ?? '').trim();
        if (head) samples.push(head);
        hits.set(src.source_slug, { count: src.sections || 1, samples });
      }

      for (const src of dict?.sources ?? []) {
        if (hits.has(src.slug)) continue;
        const samples: string[] = [];
        for (const e of src.entries) {
          const head = (e.heading_norm ?? '').trim();
          if (head && !samples.includes(head)) {
            samples.push(head);
          } else if (e.text_ar) {

            const tok = e.text_ar.trim().split(/[\s،,;:.]+/)
              .find(w => /[؀-ۿ]/.test(w) && w.length <= 16);
            if (tok && !samples.includes(tok)) samples.push(tok);
          }
          if (samples.length >= SAMPLE_CAP) break;
        }
        hits.set(src.slug, { count: src.entry_count, samples });
      }

      this.hitsBySlug.set(hits);
    });
  }

  ngOnInit(): void {
    this.api.getSources().subscribe({
      next: res => { this.sources.set(res.sources); this.sourcesLoading.set(false); },
      error: () => this.sourcesLoading.set(false),
    });
  }

  ngAfterViewInit(): void { this.animateCatalog(); }

  setSearch(value: string): void {
    this.searchTerm.set(value);
    this.search$.next(value);
  }
  tryRoot(root: string): void {
    this.searchTerm.set(root);
    this.search$.next(root);
    queueMicrotask(() => this.searchInputRef?.nativeElement.focus());
  }
  clearSearch(): void { this.setSearch(''); }
  focusSearch(): void {
    queueMicrotask(() => this.searchInputRef?.nativeElement.focus());
  }

  openBooks(): void {
    this.router.navigate(['/lexicon/books']);
  }

  openSourceAtRoot(src: AlDictSource): void {
    const root = this.searchTerm().trim();
    this.router.navigate(['/lexicon/books', src.slug], {
      queryParams: root ? { root } : undefined,
    });
  }

  hit(slug: string): SourceHit | null {
    return this.hitsBySlug().get(slug) ?? null;
  }
  hasResults(): boolean {
    return this.hitsBySlug().size > 0 && this.hitSources().length > 0;
  }

  openScholarshipAtRoot(sourceSlug: string): void {
    const root = this.searchTerm().trim();
    this.router.navigate(['/lexicon/books', sourceSlug], {
      queryParams: root ? { root } : undefined,
    });
  }

  private animateCatalog(): void {
    const cards = Array.from(
      this.catalogRef?.nativeElement.querySelectorAll<HTMLElement>('.lx-hit-card') ?? [],
    );
    if (!cards.length) return;
    gsap.fromTo(
      cards,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.28, stagger: 0.035, ease: 'power3.out', clearProps: 'transform' },
    );
  }
}
