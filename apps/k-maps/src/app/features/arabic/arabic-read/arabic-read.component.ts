import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ArabicApiService } from '../../../shared/services/arabic-api.service';

export interface Work {
  id: string; slug: string | null;
  title_ar: string | null; title_en: string | null;
  author: string | null; died: string | null;
  genre_ref: string | null; register: string | null;
  shape: 'prose' | 'diwan' | 'maqama' | 'amthal' | 'series' | 'dialogue' | 'nights' | null;
  pages: number; words: number; firstSeq: number;
  audioKey: string | null;
  series: string | null;
  seriesRef: string | null;
  seriesParent: string | null;
  trail: string | null;
  trailLevels: number | null;
  episodeOrder: number | null;
  /// The video an episode was cut from, and its number in the series.
  videoId: string | null;
  episode: number | null;
}

interface Envelope<T> { ok: boolean; data?: T; }

/// One band of the shelf, as the AR worker serves it (lib/value-labels.ts SHELF_SHAPES).
export interface ShelfShape { shape: string; en: string; ar: string; note: string; }

/// The shelf. Grouped by shape, because shape is what decides how a book is
/// read — and the reader you land in differs accordingly.
@Component({
  selector: 'km-arabic-read',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './arabic-read.component.html',
  styleUrl: './arabic-read.component.scss',
})
export class ArabicReadComponent implements OnInit {
  private router = inject(Router);
  private readonly ar = inject(ArabicApiService);

  readonly loading = signal(true);
  readonly works = signal<Work[]>([]);

  /// The shelf's bands (shape, labels, note) in reading order — served by the AR worker.
  readonly shapes = signal<ShelfShape[]>([]);

  readonly groups = computed(() => {
    const by = new Map<string, Work[]>();
    for (const w of this.works()) {
      const k = w.shape ?? 'prose';
      (by.get(k) ?? by.set(k, []).get(k)!).push(w);
    }
    return this.shapes()
      .filter((s) => by.has(s.shape))
      .map((s) => ({
        ...s,
        items: by.get(s.shape)!,
        pages: by.get(s.shape)!.reduce((n, w) => n + w.pages, 0),
      }));
  });

  /// Direction follows the script of the title, not the shelf: an English title
  /// forced right-to-left sits on the wrong edge and reads as a mistake.
  dir(t: string | null): 'rtl' | 'ltr' { return /[\u0600-\u06FF]/.test(t ?? '') ? 'rtl' : 'ltr'; }

  /// Episodes under their series. A flat list of "Episode 1" three times is
  /// three different things wearing the same name.
  /// Grouped by the parent they came from — in any band, not only series. The
  /// Bayyinah reader's sessions are prose, and flat they read as forty
  /// unrelated books called BR-07, BR-18, BR-19.
  ///
  /// Works with no parent stay loose, in one unnamed group, so a real book is
  /// never filed under a heading invented for it.
  seriesOf(items: Work[]): { name: string; under: string | null; items: Work[]; loose: boolean }[] {
    const grouped = new Map<string, Work[]>();
    const loose: Work[] = [];
    for (const w of items) {
      if (w.series) (grouped.get(w.series) ?? grouped.set(w.series, []).get(w.series)!).push(w);
      else loose.push(w);
    }
    const out = Array.from(grouped, ([name, ws]) => ({
      name,
      /// The whole chain above this group, so a sūra says whose reading it is.
      under: ws[0]?.trail?.split(' ▸ ').slice(0, -1).join(' ▸ ') || null,
      items: ws.sort((a, b) => (a.episodeOrder ?? 0) - (b.episodeOrder ?? 0)),
      loose: false,
    })).sort((a, b) => b.items.length - a.items.length);
    return loose.length ? [{ name: '', under: null, items: loose, loose: true }, ...out] : out;
  }

  readonly totalWords = computed(() => this.works().reduce((n, w) => n + (w.words ?? 0), 0));

  ngOnInit(): void {
    this.ar.get<Envelope<{ shelf: Work[]; shapes?: ShelfShape[] }>>(`ar/text/shelf`).subscribe({
      next: (r) => {
        this.shapes.set(r?.data?.shapes ?? []);
        this.works.set(r?.data?.shelf ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /// The shape picks the reader. A dīwān opened in the prose reader would be
  /// technically readable and completely wrong.
  open(w: Work): void {
    this.router.navigate(['/arabic/read', w.id, w.shape ?? 'prose', w.firstSeq ?? 1]);
  }

  /// A death year of −76 is 76 years before the hijra, and belongs in its own
  /// band rather than sorted as a negative number nobody reads that way.
  era(died: string | null): string {
    const n = Number(String(died ?? '').replace(/[^\-0-9]/g, ''));
    if (!Number.isFinite(n) || !died) return '—';
    return n < 0 ? `${Math.abs(n)} pre-hijra` : `d. ${n} AH`;
  }

  words(n: number): string {
    return n >= 1000 ? `${Math.round(n / 1000)}k words` : `${n} words`;
  }

  back(): void { this.router.navigate(['/arabic']); }
  timeline(): void { this.router.navigate(['/arabic/timeline']); }
  constellation(): void { this.router.navigate(['/arabic/roots-3d']); }
}
