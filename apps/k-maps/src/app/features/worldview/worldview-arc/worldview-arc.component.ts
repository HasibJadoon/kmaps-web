import { CommonModule } from '@angular/common';
import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component,
  ElementRef, OnDestroy, OnInit, inject, signal,
} from '@angular/core';
import { Router } from '@angular/router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { environment } from '../../../../environments/environment';

// ─── The arc — the corpus as a timeline ───────────────────────────────────────
//
// One band per event: the year set large in the century's colour, the claim
// beside it across a coloured rule. Read down the page, so the gaps in the
// record are as visible as the entries — this corpus jumps the 2nd to the 7th
// century and again the 9th to the 12th, and a reader should see that rather
// than infer a continuous history.
//
// Colour is by century, not per row. Cycling a palette entry by entry looks
// livelier and means nothing; keyed to the century it means a band of time, and
// two adjacent events sharing a colour is then information rather than an
// accident.

gsap.registerPlugin(ScrollTrigger);

interface ArcEvent {
  id: string;
  title: string;
  event_type: string | null;
  year: number | null;
  year_start: number | null;
  year_end: number | null;
  century: number | null;
  isBand: boolean;
  significance: string | null;
  description_md: string | null;
}

interface ArcRow extends ArcEvent {
  label: string;
  note: string | null;
  hue: string;
  firstOfCentury: boolean;
}

/** Four families, cycled across centuries in the order they appear. Taken from
 *  the shared tokens rather than invented here. */
const CENTURY_HUES = [
  'var(--km-gold, #c9a84c)',
  '#8bbf3e',
  '#4c9fc9',
  '#e0803a',
];

@Component({
  selector: 'km-worldview-arc',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './worldview-arc.component.html',
  styleUrl: './worldview-arc.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewArcComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly rows = signal<ArcRow[]>([]);
  readonly types = signal<{ key: string; count: number }[]>([]);
  readonly activeType = signal<string | null>(null);
  readonly span = signal<{ from: number; to: number } | null>(null);
  readonly undated = signal(0);
  readonly loading = signal(true);
  readonly failure = signal<string | null>(null);

  private triggers: ScrollTrigger[] = [];

  ngOnInit(): void { void this.load(); }

  ngAfterViewInit(): void { this.animate(); }

  ngOnDestroy(): void {
    this.triggers.forEach(t => t.kill());
    this.triggers = [];
  }

  goBack(): void { void this.router.navigate(['/worldview']); }

  setType(key: string | null): void {
    this.activeType.set(key);
    // The list is rebuilt, so the old triggers point at detached elements.
    this.render();
  }

  /**
   * Draw, then animate.
   *
   * The order matters and cost an invisible page to learn: the bands start at
   * `opacity: 0` in CSS so nothing flashes before the script runs, and GSAP is
   * what raises them. Scheduling that with `queueMicrotask` ran it before
   * Angular had rendered the rows at all — `querySelectorAll` found nothing,
   * every band stayed at zero, and the screen showed a masthead over an empty
   * page. On an OnPush component the view has to be flushed first.
   */
  private render(): void {
    this.cdr.detectChanges();
    this.animate();
  }

  visible(): ArcRow[] {
    const type = this.activeType();
    const rows = type ? this.rows().filter(r => r.event_type === type) : this.rows();
    // `firstOfCentury` is recomputed against the filtered list — otherwise
    // filtering hides the row that was carrying a century heading and the
    // heading vanishes with it.
    let last: number | null = null;
    return rows.map(r => {
      const first = r.century !== last;
      last = r.century;
      return { ...r, firstOfCentury: first };
    });
  }

  year(v: number | null): string {
    if (v == null) return '—';
    return v < 0 ? `${-v} BCE` : `${v}`;
  }

  ordinal(c: number | null): string {
    if (c == null) return '';
    const rem100 = c % 100;
    const suffix = rem100 >= 11 && rem100 <= 13 ? 'th'
      : ['th', 'st', 'nd', 'rd'][c % 10] ?? 'th';
    return `${c}${suffix} century`;
  }

  // ── Data ─────────────────────────────────────────────────────────────────

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await fetch(`${environment.apiBase}/wv/timeline`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json() as {
        ok: boolean;
        data: {
          events: ArcEvent[];
          span: { from: number; to: number } | null;
          facets: { eventTypes: { key: string; count: number }[] };
          undated: number;
        };
      };
      // Centuries in the order they appear, so the palette walks forward
      // through time rather than being keyed to the number itself.
      const centuries: number[] = [];
      for (const e of body.data.events) {
        if (e.century != null && !centuries.includes(e.century)) centuries.push(e.century);
      }
      let last: number | null = null;
      this.rows.set(body.data.events.map(e => {
        const first = e.century !== last;
        last = e.century;
        return {
          ...e,
          label: e.isBand && e.year_start != null && e.year_end != null
            ? `${this.year(e.year_start)}–${this.year(e.year_end)}`
            : this.year(e.year),
          note: e.significance ?? e.description_md ?? null,
          hue: CENTURY_HUES[
            Math.max(0, e.century == null ? 0 : centuries.indexOf(e.century))
            % CENTURY_HUES.length],
          firstOfCentury: first,
        };
      }));
      this.types.set(body.data.facets.eventTypes);
      this.span.set(body.data.span);
      this.undated.set(body.data.undated);
    } catch {
      this.failure.set('The timeline could not be loaded.');
    } finally {
      this.loading.set(false);
      this.render();
    }
  }

  // ── Animation ────────────────────────────────────────────────────────────

  /**
   * Each band rises and fades in as it enters, its rule drawing downward and
   * the year counting up to itself.
   *
   * Two constraints shaped this. Everything is `once: true` — a timeline that
   * re-animates every time it scrolls back past a row turns reading into a
   * light show. And it is skipped entirely under `prefers-reduced-motion`,
   * where the same content simply appears: an entrance is a nicety, and the
   * dates are the point.
   */
  private animate(): void {
    this.triggers.forEach(t => t.kill());
    this.triggers = [];

    const root = this.host.nativeElement as HTMLElement;
    const bands = Array.from(root.querySelectorAll<HTMLElement>('.arc__band'));
    if (!bands.length) return;

    // Nothing to undo under reduced motion — the settled state is what the CSS
    // already renders.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Nor if the page is not being looked at. A hidden tab throttles
    // requestAnimationFrame to about one frame a second, so an entrance that
    // starts there crawls, and a reader who switches to the tab arrives
    // mid-fade. It recovers on focus, but showing the settled page is better
    // than showing a half-played one. Animate the next time it is opened.
    if (document.hidden) {
      document.addEventListener('visibilitychange', () => this.animate(), { once: true });
      return;
    }

    for (const band of bands) {
      const rule = band.querySelector('.arc__rule');
      const yearEl = band.querySelector<HTMLElement>('.arc__year');
      const pip = band.querySelector('.arc__pip');
      const claim = band.querySelector('.arc__claim');
      const note = band.querySelector('.arc__note-sm');

      const tl = gsap.timeline({
        // `immediateRender: false` on every `from` below: without it GSAP
        // applies the start state — opacity 0 — the moment the tween is
        // created, so every row off screen is hidden from load and only the
        // ones scrolled past ever come back. The rows should sit in their
        // settled state until their own tween actually begins.
        defaults: { immediateRender: false },
        scrollTrigger: {
          trigger: band,
          start: 'top 88%',
          once: true,
        },
      });

      // `from`, not `fromTo`: the destination is whatever the stylesheet says,
      // so a tween that never runs leaves the row exactly as it should be.
      tl.from(band, { opacity: 0, y: 26, duration: 0.5, ease: 'power2.out' });

      // The claim and its note follow the year in, slightly behind, so the eye
      // lands on the date first — which is the order a timeline is read in.
      const text = [claim, note].filter(Boolean) as Element[];
      if (text.length) {
        tl.from(text, { opacity: 0, x: 12, duration: 0.4, stagger: 0.06,
                        ease: 'power2.out' }, '<0.12');
      }

      if (rule) {
        // The rule draws from the top down, which is the direction the eye is
        // already travelling.
        tl.from(rule, { scaleY: 0, transformOrigin: 'top center',
                        duration: 0.45, ease: 'power2.out' }, '<0.05');
      }

      // The year arrives whole.
      //
      // It counted up from sixty years earlier at first, which looks good and
      // is wrong: on a historical timeline the date IS the content, and a
      // count-up shows a false year for the entire length of the animation.
      // Nobody reading a timeline wants to watch 17 become 77. It slides and
      // settles instead, which reads as arrival without ever lying.
      if (yearEl) {
        tl.from(yearEl, { y: 14, opacity: 0, scale: 0.94,
                          duration: 0.5, ease: 'back.out(1.6)' }, '<0.05');
      }

      // The pip lands last and slightly overshoots, so the eye is drawn to
      // where on the rail this entry sits.
      if (pip) {
        tl.from(pip, { scale: 0, duration: 0.35, ease: 'back.out(3)' }, '<0.1');
      }
    }

    this.triggers = ScrollTrigger.getAll();
  }
}
