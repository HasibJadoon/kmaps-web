import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy,
  computed, effect, inject, signal, viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap, type Observable } from 'rxjs';

import { DeckService } from '../../data/deck.service';
import { DeckMotionService } from '../../data/deck-motion.service';
import type { Flip } from 'gsap/Flip';
import { SlideViewComponent } from './slide-view/slide-view.component';
import {
  DECK_LANG_LABEL, DECK_LANG_MODES, type Deck, type DeckLangMode, type DeckTheme,
} from '../../domain/deck.models';

/** Either a deck, or the reason there isn't one. Named so toSignal can infer
 * a single state type rather than a union of two shapes. */
interface DeckState {
  deck: Deck | null;
  error: string | null;
}

const LANG_KEY = 'km.deck.lang';
const SWIPE_THRESHOLD = 45;

@Component({
  selector: 'km-deck-player',
  standalone: true,
  imports: [SlideViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './deck-player.component.html',
  styleUrl: './deck-player.component.scss',
})
export class DeckPlayerComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly decks = inject(DeckService);
  private readonly motion = inject(DeckMotionService);
  private readonly host = inject(ElementRef<HTMLElement>);

  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');

  protected readonly slug = toSignal(this.route.paramMap.pipe(map((p) => p.get('slug') ?? '')), {
    initialValue: '',
  });

  private readonly loaded = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('slug') ?? ''),
      switchMap((slug): Observable<DeckState> =>
        slug
          ? this.decks.get(slug).pipe(
              map((deck): DeckState => ({ deck, error: null })),
              catchError((): Observable<DeckState> =>
                of({ deck: null, error: `Could not load “${slug}”.` })),
            )
          : of<DeckState>({ deck: null, error: 'No deck requested.' }),
      ),
    ),
    { initialValue: { deck: null, error: null } as DeckState },
  );

  protected readonly deck = computed(() => this.loaded().deck);
  protected readonly error = computed(() => this.loaded().error);

  protected readonly index = signal(0);
  protected readonly lang = signal<DeckLangMode>(this.restoreLang());
  protected readonly langLabel = computed(() => DECK_LANG_LABEL[this.lang()]);

  protected readonly slide = computed(() => this.deck()?.slides[this.index()] ?? null);
  protected readonly total = computed(() => this.deck()?.slides.length ?? 0);
  protected readonly progress = computed(() =>
    this.total() ? ((this.index() + 1) / this.total()) * 100 : 0,
  );
  protected readonly crumb = computed(
    () => this.deck()?.collection?.path.map((p) => p.title).join(' › ') ?? '',
  );

  /** Which way the last move went — the lines enter from that side. */
  private forward = true;
  private opened = false;
  private touchX: number | null = null;

  constructor() {
    this.host.nativeElement.addEventListener('kmaps:ayah', this.onAyah);

    // Theme is scoped to this host, never :root. A deck restyles itself, not
    // the app around it (contract §4).
    effect(() => {
      const theme = this.deck()?.theme;
      if (theme) this.applyTheme(theme);
    });

    // Open on the slide the URL asks for, once the deck is known — once only.
    // Re-running this would fight the user's own navigation.
    effect(() => {
      const deck = this.deck();
      if (!deck || this.opened) return;
      this.opened = true;
      const asked = Number(this.route.snapshot.queryParamMap.get('slide') ?? '1');
      const start = Number.isFinite(asked) ? Math.trunc(asked) - 1 : 0;
      this.index.set(Math.max(0, Math.min(deck.slides.length - 1, start)));
      this.play(null, true);
    });
  }

  /**
   * Animate the slide in. Deliberately called from the navigation methods
   * rather than from an effect: an effect runs during change detection, before
   * the new slide is in the DOM, so the tween would set its from-state on
   * elements that are about to be replaced and then freeze there.
   *
   * `state` is the chrome geometry captured *before* the swap, so the kicker
   * and source line travel instead of fading (contract §6).
   */
  private play(state: Flip.FlipState | null, forward: boolean): void {
    requestAnimationFrame(() => {
      const el = this.stage()?.nativeElement;
      if (el) this.motion.enter(el, state, forward);
    });
  }

  ngOnDestroy(): void {
    this.motion.kill();
    this.host.nativeElement.removeEventListener('kmaps:ayah', this.onAyah);
  }

  // --- navigation, contract §5 ---------------------------------------------

  protected go(delta: number): void {
    const total = this.total();
    if (!total) return;
    const next = Math.max(0, Math.min(total - 1, this.index() + delta));
    if (next === this.index()) return;
    const state = this.motion.captureChrome(this.stage()?.nativeElement ?? null);
    this.forward = delta > 0;
    this.index.set(next);
    this.syncUrl(next);
    this.play(state, this.forward);
  }

  protected jump(to: number): void {
    const state = this.motion.captureChrome(this.stage()?.nativeElement ?? null);
    this.forward = to > this.index();
    this.index.set(Math.max(0, Math.min(this.total() - 1, to)));
    this.syncUrl(this.index());
    this.play(state, this.forward);
  }

  protected cycleLang(): void {
    const next = DECK_LANG_MODES[(DECK_LANG_MODES.indexOf(this.lang()) + 1) % DECK_LANG_MODES.length];
    this.lang.set(next);
    try { localStorage.setItem(LANG_KEY, next); } catch { /* private mode */ }
  }

  /** RTL: left advances. */
  @HostListener('window:keydown', ['$event'])
  protected onKey(event: KeyboardEvent): void {
    if (!this.deck()) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    switch (event.key) {
      case 'ArrowLeft':  this.go(1); break;
      case 'ArrowRight': this.go(-1); break;
      case 'Home':       this.jump(0); break;
      case 'End':        this.jump(this.total() - 1); break;
      default:
        if (event.key.toLowerCase() === 'l') this.cycleLang();
        else return;
    }
    event.preventDefault();
  }

  /** Click the left half to advance; the bar is not a navigation surface. */
  protected onStageClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.deck-bar') || target.closest('.deck-ref')) return;
    this.go(event.clientX < window.innerWidth / 2 ? 1 : -1);
  }

  protected onTouchStart(event: TouchEvent): void {
    this.touchX = event.touches[0]?.clientX ?? null;
  }

  protected onTouchEnd(event: TouchEvent): void {
    if (this.touchX === null) return;
    const dx = (event.changedTouches[0]?.clientX ?? this.touchX) - this.touchX;
    if (Math.abs(dx) > SWIPE_THRESHOLD) this.go(dx > 0 ? -1 : 1);
    this.touchX = null;
  }

  /**
   * A pill raises a ref; the host decides what to open. Attached natively
   * rather than with @HostListener because Angular's host parser reads the
   * colon in "kmaps:ayah" as a global event target.
   */
  private readonly onAyah = (event: Event): void => {
    const ref = (event as CustomEvent<{ ref: string }>).detail?.ref;
    if (!ref) return;
    const [surah, ayah] = ref.split(':');
    void this.router.navigate(['/quran', surah, (ayah ?? '').split('-')[0]]);
  };

  // --- internals ------------------------------------------------------------

  private syncUrl(index: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { slide: index + 1 },
      replaceUrl: true,
    });
  }

  private applyTheme(theme: DeckTheme): void {
    const el = this.host.nativeElement as HTMLElement;
    for (const [key, value] of Object.entries(theme)) {
      if (value) el.style.setProperty(`--deck-${key.replace(/_/g, '-')}`, value);
    }
  }

  private restoreLang(): DeckLangMode {
    try {
      const saved = localStorage.getItem(LANG_KEY) as DeckLangMode | null;
      if (saved && DECK_LANG_MODES.includes(saved)) return saved;
    } catch { /* private mode */ }
    return 'both';
  }
}
