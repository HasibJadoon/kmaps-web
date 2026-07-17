import {
  ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, catchError, of } from 'rxjs';
import {
  AlDictionaryApiService, AlDictSource, ScholarshipSource,
} from '../../../shared/services/al-dictionary-api.service';

// One dictionary rendered as a 3D volume on the shelf. Classical lexica measure
// "جذرًا" (roots); academic readings measure "قراءة". Spine thickness scales with
// the entry count so the shelf reads at a glance.
interface Book3D {
  kind:       'lexicon' | 'scholarship';
  slug:       string;
  ar:         string;
  latin:      string;
  author:     string;
  era:        string;
  count:      number;
  countLabel: string;
  unit:       string;
  genre:      string;
  accent:     string;
  accentDeep: string;
  thick:      number;
  badge:      string;
  bilingual:  boolean;
  kicker:     string;
}

// Genre → [accent, deep-accent]. Classical lexica keep the house gold; each
// academic genre gets its own hue so the kind is recognisable at a glance.
const ACCENTS: Record<string, [string, string]> = {
  modern_critical_dictionary: ['#92bee1', '#38566b'],
  qur_anic_hermeneutic:       ['#a9d28a', '#4a6538'],
  etymological:               ['#d68a4a', '#6b4423'],
  comparative_semitic:        ['#b6c98a', '#5a6b3d'],
  epigraphic:                 ['#b6c98a', '#5a6b3d'],
};
const ACCENT_DEFAULT: [string, string] = ['#c9a84c', '#6f5320'];

// Machine period → Arabic era label (mirrors the lexicon search page). Falls
// back to the raw value so an unmapped period still shows something.
const ERA_AR: Record<string, string> = {
  classical:       'كلاسيكي',
  early_classical: 'كلاسيكي مبكر',
  late_classical:  'كلاسيكي متأخر',
};

// Spine-thickness envelope (px). sqrt keeps the thinnest volumes legible.
const THICK_MIN = 24;
const THICK_SPAN = 48;

const REST_TILT = 22;   // resting yaw (negated for the RTL shelf lean)
const NAV_DELAY = 1650; // let the cover finish swinging before we route

@Component({
  selector: 'km-lexicon-books',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './lexicon-books.component.html',
  styleUrl: './lexicon-books.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconBooksComponent {
  private readonly api        = inject(AlDictionaryApiService);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly books   = signal<Book3D[]>([]);
  readonly loading = signal(true);

  // Resting tilt (bound as CSS vars; pointer handlers override live).
  readonly restX = 7;
  readonly restY = -REST_TILT;

  // ── Opened-book overlay state ──────────────────────────────────────────────
  readonly sel  = signal<Book3D | null>(null);
  readonly open = signal(false);

  readonly backdrop  = computed(() => (this.open() ? 0.86 : 0));
  readonly scale     = computed(() => (this.open() ? 1 : 0.92));
  readonly coverDeg  = computed(() => (this.open() ? -158 : 0));
  readonly coverFade = computed(() => (this.open() ? 0 : 1));
  readonly pageIn    = computed(() => (this.open() ? 1 : 0));

  private navTimer?: ReturnType<typeof setTimeout>;
  private closeTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.navTimer);
      clearTimeout(this.closeTimer);
    });

    forkJoin({
      lex: this.api.getSources().pipe(
        catchError(() => of({ sources: [] as AlDictSource[], total: 0 })),
      ),
      sch: this.api.getScholarshipSources().pipe(
        catchError(() => of({ sources: [] as ScholarshipSource[], total: 0 })),
      ),
    }).pipe(takeUntilDestroyed()).subscribe(({ lex, sch }) => {
      // Sort each kind heaviest-first, then classical lexica ahead of readings.
      const lexico = [...lex.sources].sort((a, b) => b.roots - a.roots);
      const schol  = [...sch.sources].filter(s => !!s.slug).sort((a, b) => b.count - a.count);

      const max = Math.max(
        1,
        ...lexico.map(s => s.roots),
        ...schol.map(s => s.count),
      );

      const books: Book3D[] = [];
      for (const s of lexico) books.push(this.lexBook(s, max));
      for (const s of schol)  books.push(this.schBook(s, max));

      this.books.set(books);
      this.loading.set(false);
    });
  }

  // ── Card builders ──────────────────────────────────────────────────────────
  private lexBook(s: AlDictSource, max: number): Book3D {
    const [accent, accentDeep] = ACCENT_DEFAULT;
    // `bilingual` is present on the worker payload for Lane; tolerate its
    // absence from the typed shape rather than hardcoding a slug.
    const bilingual = !!((s as { bilingual?: boolean; is_bilingual?: boolean }).bilingual
      ?? (s as { is_bilingual?: boolean }).is_bilingual);
    return {
      kind: 'lexicon',
      slug: s.slug,
      ar: s.title_ar,
      latin: s.title_en ?? '',
      author: s.author,
      era: ERA_AR[s.period] ?? s.period,
      count: s.roots,
      countLabel: s.roots.toLocaleString('en-US'),
      unit: 'جذرًا',
      genre: 'classical',
      accent, accentDeep,
      thick: this.thicknessOf(s.roots, max),
      badge: '',
      bilingual,
      kicker: 'معجم',
    };
  }

  private schBook(s: ScholarshipSource, max: number): Book3D {
    const [accent, accentDeep] = ACCENTS[s.genre] ?? ACCENT_DEFAULT;
    return {
      kind: 'scholarship',
      slug: s.slug!,
      ar: s.title_ar,
      latin: s.title_en ?? '',
      author: s.year ? `${s.author} · ${s.year}` : s.author,
      era: s.genre_label?.ar ?? '',
      count: s.count,
      countLabel: s.count.toLocaleString('en-US'),
      unit: 'قراءة',
      genre: s.genre,
      accent, accentDeep,
      thick: this.thicknessOf(s.count, max),
      badge: 'أكاديمي',
      bilingual: false,
      kicker: 'قراءة أكاديميّة',
    };
  }

  private thicknessOf(count: number, max: number): number {
    return Math.round(THICK_MIN + Math.sqrt(Math.max(0, count) / max) * THICK_SPAN);
  }

  // ── Open / close the routed overlay ────────────────────────────────────────
  openBook(b: Book3D) {
    clearTimeout(this.navTimer);
    clearTimeout(this.closeTimer);
    this.sel.set(b);
    this.open.set(false);
    // Two frames so the closed pose paints before the swing transition starts.
    requestAnimationFrame(() => requestAnimationFrame(() => this.open.set(true)));
    // Route through the book redirect, which resolves this book's real first
    // root, once the cover has swung open.
    this.navTimer = setTimeout(() => {
      this.router.navigate(['/lexicon/books', b.slug]);
    }, NAV_DELAY);
  }

  closeBook() {
    clearTimeout(this.navTimer);
    clearTimeout(this.closeTimer);
    this.open.set(false);
    this.closeTimer = setTimeout(() => { if (!this.open()) this.sel.set(null); }, 420);
  }

  stop(e: Event) { e.stopPropagation(); }

  // ── Pointer-tilt (mirrors the design prototype; styles only, no CD) ─────────
  onTilt(e: PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', (this.restY + (px - 0.5) * 16).toFixed(2) + 'deg');
    el.style.setProperty('--rx', (this.restX + (0.5 - py) * 12).toFixed(2) + 'deg');
    el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
    el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    el.style.setProperty('--lift', '1');
  }

  onTiltEnd(e: PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    el.style.setProperty('--ry', this.restY + 'deg');
    el.style.setProperty('--rx', this.restX + 'deg');
    el.style.setProperty('--lift', '0');
  }
}
