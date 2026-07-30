import {
  Component, ElementRef, OnInit, ViewChild, computed, inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs/operators';
import gsap from 'gsap';
import { QuranStateService } from '../../../../shared/services/quran/quran-state.service';

interface ResearchTab {
  id: string;
  labelAr: string;
  icon: string;
  routePath: string;
}

@Component({
  selector: 'km-quran-researcher-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './quran-researcher-shell.component.html',
  styleUrl: './quran-researcher-shell.component.scss',
})
export class QuranResearcherShellComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly quranState = inject(QuranStateService);

  @ViewChild('pageSlot') pageSlot?: ElementRef<HTMLElement>;

  // ── Muṣḥaf navigation ──────────────────────────────────────────────────────
  //
  // These controls live in the header but the reader is a routed child, so they
  // talk to it through the URL: the header writes the query params and the reader
  // reacts to them. That keeps one source of truth and makes every position the
  // reader lands on a shareable link.

  private readonly params = toSignal(this.route.queryParamMap, { initialValue: null });

  readonly currentSurah = computed(() => {
    const n = Number(this.params()?.get('surah'));
    return Number.isFinite(n) && n > 0 ? n : 1;
  });
  readonly currentVerse = computed(() => {
    const n = Number(this.params()?.get('startingVerse'));
    return Number.isFinite(n) && n > 0 ? n : 1;
  });
  readonly currentPage = computed(() => {
    const n = Number(this.params()?.get('page'));
    return Number.isFinite(n) && n > 0 ? n : null;
  });

  readonly verseCount = computed(() =>
    this.quranState.surahs().find(s => s.surahNumber === this.currentSurah())?.ayahCount ?? 286);

  /**
   * Only shown on the muṣḥaf tab — the other tabs don't read these params.
   *
   * Derived from a navigation signal rather than reading `router.url` inside the
   * computed: `router.url` is a plain getter, so a computed over it never
   * re-evaluates and the control would stay stuck in whatever state it had when
   * the shell was first rendered.
   */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly showMushafNav = computed(() => this.currentUrl().includes('/quran/al-quran'));

  ngOnInit(): void { this.quranState.load(); }

  goToSurah(raw: string): void {
    const surah = this.clamp(Number(raw), 1, 114);
    // A new surah starts at its first āyah rather than keeping the old number,
    // which would land on an āyah the surah may not even have.
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { surah, startingVerse: 1, page: null },
      queryParamsHandling: 'merge',
    });
  }

  goToVerse(raw: string): void {
    const verse = this.clamp(Number(raw), 1, this.verseCount());
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { surah: this.currentSurah(), startingVerse: verse, page: null },
      queryParamsHandling: 'merge',
    });
  }

  goToPage(raw: string): void {
    const page = this.clamp(Number(raw), 1, 604);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page, surah: null, startingVerse: null },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Accept a reference typed into the search box: `44:3`, `44 3`, `44.3`, or a
   * bare `44` for the start of a surah. Arabic-Indic digits are folded so a
   * reference can be typed on an Arabic keyboard.
   */
  onSearchSubmit(raw: string): void {
    const text = raw.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
                    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
                    .trim();
    const ref = /^(\d{1,3})\s*(?:[:.\-\s]\s*(\d{1,3}))?$/.exec(text);
    if (!ref) return;                       // not a reference — leave for text search

    const surah = this.clamp(Number(ref[1]), 1, 114);
    const verse = ref[2] ? Number(ref[2]) : 1;
    void this.router.navigate(['/quran/al-quran'], {
      queryParams: { surah, startingVerse: verse, page: null },
    });
  }

  private clamp(n: number, lo: number, hi: number): number {
    if (!Number.isFinite(n)) return lo;
    return Math.min(Math.max(lo, Math.trunc(n)), hi);
  }

  readonly tabs: ResearchTab[] = [
    { id: 'tafseer', labelAr: 'تفسير',   icon: '◫', routePath: 'tafseer' },
    { id: 'uloom',   labelAr: 'علوم',    icon: '⧉', routePath: 'uloom'   },
    { id: 'lexicon', labelAr: 'معاجم',   icon: 'ع', routePath: 'lexicon' },
    { id: 'notes',   labelAr: 'ملاحظات', icon: '✎', routePath: 'notes'   },
  ];

  goHome(): void {
    this.router.navigateByUrl('/home');
  }

  onRouteActivate(): void {
    const el = this.pageSlot?.nativeElement;
    if (!el) return;
    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { opacity: 0, y: 32 },
      { opacity: 1, y: 0, duration: 0.48, ease: 'expo.out', clearProps: 'transform' },
    );
  }
}
