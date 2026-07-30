import {
  ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of, catchError } from 'rxjs';
import {
  AlDictionaryApiService, LexV2RootCompare, LexV2SearchHit,
} from '../../../shared/services/al-dictionary-api.service';
import { deathLabelAr } from '../data/lexicon-sources.service';

type Mode = 'root' | 'word' | 'fts';

// View-model for one dictionary card in the 3D grid.
interface SourceCard {
  root_norm: string;
  source_slug: string;
  titleAr: string;
  byline: string;
  pageLabel: string | null;
  snippet: string | null;
  derivations: number;
  citations: number;
  bilingual: boolean;
  glyph: string;
}

interface RootHero {
  root: string;
  letters: string[];
  meaning: string | null;
  frequency: number | null;
  sourceCount: number;
  derivations: number;
  typeLabel: string;
}

const ROOT_TYPE_AR: Record<string, string> = {
  biliteral: 'ثنائي', trilateral: 'ثلاثي', quadrilateral: 'رباعي',
  quinqueliteral: 'خماسي',
};
const WEAK_PATTERN_AR: Record<string, string> = {
  sound: 'صحيح', assimilated: 'مثال', hollow: 'أجوف', defective: 'ناقص',
  hamzated: 'مهموز', doubled: 'مضاعف',
};

@Component({
  selector: 'km-lexicon-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './lexicon-search.component.html',
  styleUrl: './lexicon-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconSearchComponent {
  private readonly api        = inject(AlDictionaryApiService);
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly q        = signal('');
  readonly mode     = signal<Mode>('root');
  readonly draft    = signal('');          // the input box value
  readonly loading  = signal(false);
  readonly searched = signal(false);

  // Root mode → multi-source compare (hero + 3D grid). Other modes → flat list.
  readonly compare = signal<LexV2RootCompare | null>(null);
  readonly results = signal<LexV2SearchHit[]>([]);
  readonly total   = signal(0);

  readonly modes: { id: Mode; label: string; hint: string }[] = [
    { id: 'root', label: 'جذر',  hint: 'المصادر التي فيها هذا الجذر' },
    { id: 'word', label: 'كلمة', hint: 'مطابقة الكلمة في المداخل' },
    { id: 'fts',  label: 'نصّ',  hint: 'بحث في نصّ المعاجم' },
  ];

  readonly modeLabel = computed(() => {
    switch (this.mode()) {
      case 'word': return 'كلمة';
      case 'fts':  return 'نصّ';
      default:     return 'جذر';
    }
  });

  // ── Root hero — canonical data, all derived from the compare payload ───────
  readonly hero = computed<RootHero | null>(() => {
    const rc = this.compare();
    if (!rc || !rc.sources?.length) return null;
    const c = rc.canonical;

    let letters: string[] = [];
    try { letters = c?.root_letters ? JSON.parse(c.root_letters) : []; }
    catch { letters = []; }
    if (!letters.length) letters = [...(c?.root_text ?? rc.root_norm)];

    // Meaning: prefer the canonical Arabic gloss; otherwise fall back to the
    // etymological core from Maqāyīs, then any source with a snippet. No
    // hardcoded text — everything traces to a real entry.
    const maqayis = rc.sources.find(s => /maqayis/.test(s.source_slug));
    const meaning = c?.meaning_core_ar
      || maqayis?.snippet
      || rc.sources.find(s => s.snippet)?.snippet
      || null;

    return {
      root: c?.root_text ?? rc.root_norm,
      letters,
      meaning,
      frequency: c?.frequency_quran ?? null,
      sourceCount: rc.sources.length,
      derivations: rc.sources.reduce((n, s) => n + (s.sections || 0), 0),
      typeLabel: this.rootTypeLabel(c?.root_type, c?.weak_pattern),
    };
  });

  // Root normal-form for the K-MAPS synthesis card's own route.
  readonly synthRoot = computed(() => {
    const rc = this.compare();
    return rc?.canonical?.root_text ?? rc?.root_norm ?? this.q();
  });

  readonly cards = computed<SourceCard[]>(() => {
    const rc = this.compare();
    if (!rc) return [];
    // Worker already returns the sources earliest-author-first.
    return rc.sources.map(s => ({
      root_norm: s.root_norm,
      source_slug: s.source_slug,
      titleAr: s.title_ar,
      byline: [s.author, this.deathLabel(s)].filter(Boolean).join(' · '),
      pageLabel: s.page_start != null ? `ص ${s.page_start}` : null,
      snippet: s.snippet,
      derivations: s.sections,
      citations: s.quran_refs,
      bilingual: !!s.bilingual,
      glyph: s.root_text || s.root_norm,
    }));
  });

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe(p => {
        const q = p.get('q') ?? '';
        const m = p.get('mode');
        const mode: Mode = (m === 'word' || m === 'fts' || m === 'root') ? m : 'root';
        this.q.set(q);
        this.draft.set(q);
        this.mode.set(mode);
        if (q) this.runSearch(q, mode);
        else this.reset();
      });
  }

  submit() {
    const q = this.draft().trim();
    if (!q) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q, mode: this.mode() },
    });
  }

  setMode(m: Mode) {
    if (m === this.mode()) return;
    this.mode.set(m);
    const q = this.q();
    if (q) this.router.navigate([], { relativeTo: this.route, queryParams: { q, mode: m } });
  }

  private reset() {
    this.compare.set(null);
    this.results.set([]);
    this.total.set(0);
    this.searched.set(false);
  }

  private runSearch(q: string, mode: Mode) {
    this.loading.set(true);
    this.searched.set(true);

    if (mode === 'root') {
      this.api.getV2RootCompare(q).pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(rc => {
        this.compare.set(rc);
        this.results.set([]);
        this.total.set(rc?.sources?.length ?? 0);
        this.loading.set(false);
      });
      return;
    }

    this.api.searchV2(q, mode, { limit: 100 }).pipe(
      catchError(() => of({ results: [] as LexV2SearchHit[], total: 0, mode, q })),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(r => {
      this.compare.set(null);
      this.results.set(r.results ?? []);
      this.total.set(r.total ?? (r.results?.length ?? 0));
      this.loading.set(false);
    });
  }

  // Dated byline fragment: «ت 502 هـ» for Hijri authors, «ت 1876 م» for
  // CE-dated authors (Lane), or the era label for living scholars. Shared with
  // the shelf so the two surfaces can't drift apart again.
  private deathLabel(s: { author_death_ah?: number | null; author_death_ce?: number | null; period: string }): string {
    return deathLabelAr(s);
  }

  private rootTypeLabel(type?: string | null, weak?: string | null): string {
    const t = type ? (ROOT_TYPE_AR[type] ?? type) : '';
    const w = weak ? (WEAK_PATTERN_AR[weak] ?? '') : '';
    return [t, w].filter(Boolean).join(' ') || '—';
  }

  // ── Flat-list helpers (word/fts modes) ────────────────────────────────────
  pageOf(h: LexV2SearchHit): number | null {
    return h.page_no ?? h.page_start ?? null;
  }
  snippetOf(h: LexV2SearchHit): string {
    return h.snippet || h.preview || '';
  }

  // ── 3D pointer-tilt (mirrors the design prototype) ────────────────────────
  onTilt(e: PointerEvent) {
    const card = e.currentTarget as HTMLElement;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const amt = 10;
    card.style.setProperty('--ry', ((px - 0.5) * amt).toFixed(2) + 'deg');
    card.style.setProperty('--rx', ((0.5 - py) * amt).toFixed(2) + 'deg');
    card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
    card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    card.style.setProperty('--lift', '1');
  }
  onTiltEnd(e: PointerEvent) {
    const card = e.currentTarget as HTMLElement;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
    card.style.setProperty('--lift', '0');
  }
}
