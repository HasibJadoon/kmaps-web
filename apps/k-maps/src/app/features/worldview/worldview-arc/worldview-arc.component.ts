import { CommonModule } from '@angular/common';
import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component,
  ElementRef, OnDestroy, OnInit, inject, signal,
} from '@angular/core';
import { Router } from '@angular/router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { environment } from '../../../../environments/environment';

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

    this.render();
  }

  private render(): void {
    this.cdr.detectChanges();
    this.animate();
  }

  visible(): ArcRow[] {
    const type = this.activeType();
    const rows = type ? this.rows().filter(r => r.event_type === type) : this.rows();

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

  private animate(): void {
    this.triggers.forEach(t => t.kill());
    this.triggers = [];

    const root = this.host.nativeElement as HTMLElement;
    const bands = Array.from(root.querySelectorAll<HTMLElement>('.arc__band'));
    if (!bands.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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

        defaults: { immediateRender: false },
        scrollTrigger: {
          trigger: band,
          start: 'top 88%',
          once: true,
        },
      });

      tl.from(band, { opacity: 0, y: 26, duration: 0.5, ease: 'power2.out' });

      const text = [claim, note].filter(Boolean) as Element[];
      if (text.length) {
        tl.from(text, { opacity: 0, x: 12, duration: 0.4, stagger: 0.06,
                        ease: 'power2.out' }, '<0.12');
      }

      if (rule) {

        tl.from(rule, { scaleY: 0, transformOrigin: 'top center',
                        duration: 0.45, ease: 'power2.out' }, '<0.05');
      }

      if (yearEl) {
        tl.from(yearEl, { y: 14, opacity: 0, scale: 0.94,
                          duration: 0.5, ease: 'back.out(1.6)' }, '<0.05');
      }

      if (pip) {
        tl.from(pip, { scale: 0, duration: 0.35, ease: 'back.out(3)' }, '<0.1');
      }
    }

    this.triggers = ScrollTrigger.getAll();
  }
}
