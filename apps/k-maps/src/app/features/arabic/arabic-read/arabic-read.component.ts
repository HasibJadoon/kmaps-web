import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface Work {
  id: string; slug: string | null;
  title_ar: string | null; title_en: string | null;
  author: string | null; died: string | null;
  genre_ref: string | null; register: string | null;
  shape: 'prose' | 'diwan' | 'maqama' | 'amthal' | 'series' | 'dialogue' | null;
  pages: number; words: number; firstSeq: number;
  audioKey: string | null;
}

interface Envelope<T> { ok: boolean; data?: T; }

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
  private http = inject(HttpClient);
  private base = environment.apiBase;

  readonly loading = signal(true);
  readonly works = signal<Work[]>([]);

  /// Order is deliberate: stories carry a beginner furthest, poetry is the
  /// highest register, proverbs are the shortest complete thing on the shelf.
  private static readonly ORDER: Work['shape'][] =
    ['prose', 'series', 'dialogue', 'maqama', 'amthal', 'diwan'];

  static readonly META: Record<string, { en: string; ar: string; note: string }> = {
    prose:  { en: 'Stories',  ar: 'الحكايات',  note: 'Narrative adab — read for the story, not the lesson' },
    maqama: { en: 'Maqāmāt',  ar: 'المقامات',  note: 'Rhymed prose. Episodes, each a performance' },
    amthal: { en: 'Proverbs', ar: 'الأمثال',   note: 'One line, complete. The shortest whole utterance' },
    diwan:  { en: 'Dīwāns',   ar: 'الدواوين',  note: 'Poetry — two hemistichs to a line, highest register' },
    series: { en: 'Series & podcasts', ar: 'المسلسلات',
              note: 'Transcripts, read against the recording they came from' },
    dialogue: { en: 'Conversation', ar: 'الحوار',
                note: 'Spoken exchange — the register you would actually be answered in' },
  };

  readonly groups = computed(() => {
    const by = new Map<string, Work[]>();
    for (const w of this.works()) {
      const k = w.shape ?? 'prose';
      (by.get(k) ?? by.set(k, []).get(k)!).push(w);
    }
    return ArabicReadComponent.ORDER
      .filter((s) => by.has(s!))
      .map((s) => ({
        shape: s!,
        ...ArabicReadComponent.META[s!],
        items: by.get(s!)!,
        pages: by.get(s!)!.reduce((n, w) => n + w.pages, 0),
      }));
  });

  readonly totalWords = computed(() => this.works().reduce((n, w) => n + (w.words ?? 0), 0));

  ngOnInit(): void {
    this.http.get<Envelope<{ shelf: Work[] }>>(`${this.base}/ar/text/shelf`).subscribe({
      next: (r) => { this.works.set(r?.data?.shelf ?? []); this.loading.set(false); },
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
