import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ArabicApiService } from '../../../shared/services/arabic-api.service';
import type { Work } from '../arabic-read/arabic-read.component';

interface Envelope<T> { ok: boolean; data?: T; }
interface ReadingState { workId: string; status: string; progressSeq: number | null; }

/// One series: its episodes in order, and how far through them you are.
export interface Series {
  id: string;
  name: string;
  under: string | null;
  isSeries: boolean;
  hasVideo: boolean;
  episodes: Work[];
  seen: number;
  next: Work | null;
}

/// Series.
///
/// A series is watched, not read: the video runs and the script runs under it.
/// So this shelf is laid out as seasons — which series, how many episodes, how
/// far you are, which one is next — with podcasts and clips below, heard the
/// same way but with no picture.
@Component({
  selector: 'km-arabic-series',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './arabic-series.component.html',
  styleUrl: './arabic-series.component.scss',
})
export class ArabicSeriesComponent implements OnInit {
  private router = inject(Router);
  private readonly ar = inject(ArabicApiService);

  readonly loading = signal(true);
  readonly works = signal<Work[]>([]);
  readonly states = signal<Map<string, ReadingState>>(new Map());
  /// The series opened on this screen; null shows the shelf.
  readonly open = signal<Series | null>(null);

  readonly all = computed<Series[]>(() => {
    const by = new Map<string, Work[]>();
    for (const w of this.works()) {
      if (w.shape !== 'series') continue;
      const k = w.seriesRef ?? w.series ?? w.id;
      (by.get(k) ?? by.set(k, []).get(k)!).push(w);
    }
    const st = this.states();
    return Array.from(by, ([id, eps]) => {
      eps.sort((a, b) => (a.episode ?? a.episodeOrder ?? 0) - (b.episode ?? b.episodeOrder ?? 0));
      const seen = eps.filter((e) => st.get(e.id)?.status === 'read').length;
      return {
        id, name: eps[0].series ?? eps[0].title_ar ?? id, under: eps[0].seriesParent,
        isSeries: eps[0].seriesParent === 'مسلسلات',
        hasVideo: eps.some((e) => !!e.videoId),
        episodes: eps, seen,
        next: eps.find((e) => st.get(e.id)?.status !== 'read') ?? null,
      };
    }).sort((a, b) => b.episodes.length - a.episodes.length);
  });

  readonly series = computed(() => this.all().filter((s) => s.isSeries));
  readonly heard = computed(() => this.all().filter((s) => !s.isSeries));
  /// Where you left off, said once at the top.
  readonly resume = computed(() => this.series().find((s) => s.seen > 0 && s.next) ?? null);

  ngOnInit(): void {
    this.ar.get<Envelope<{ shelf: Work[] }>>(`ar/text/shelf`).subscribe({
      next: (r) => { this.works.set(r?.data?.shelf ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    // Signed out answers 401; the shelf then shows nothing as seen, which is true.
    this.ar.get<Envelope<{ states: ReadingState[] }>>(`ar/reading/state`).subscribe({
      next: (r) => this.states.set(new Map((r?.data?.states ?? []).map((s) => [s.workId, s]))),
      error: () => {},
    });
  }

  dir(t: string | null): 'rtl' | 'ltr' { return /[؀-ۿ]/.test(t ?? '') ? 'rtl' : 'ltr'; }
  seen(w: Work): boolean { return this.states().get(w.id)?.status === 'read'; }
  at(w: Work): number | null {
    const p = this.states().get(w.id)?.progressSeq ?? null;
    return p && p > (w.firstSeq ?? 1) && !this.seen(w) ? p : null;
  }
  pct(s: Series): number { return s.episodes.length ? Math.round((100 * s.seen) / s.episodes.length) : 0; }
  count(list: Series[]): number { return list.reduce((n, s) => n + s.episodes.length, 0); }

  show(s: Series): void { this.open.set(s); window.scrollTo({ top: 0 }); }
  shelf(): void { this.open.set(null); }
  play(w: Work): void {
    this.router.navigate(['/arabic/read', w.id, 'series', w.firstSeq ?? 1]);
  }
  back(): void { this.router.navigate(['/arabic']); }
}
