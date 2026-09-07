import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import type { Work } from '../arabic-read/arabic-read.component';

interface Envelope<T> { ok: boolean; data?: T; }

/// The shelf laid on its true axis. Reading order and chronology are different
/// questions, and the second one is invisible on a grid: that Imruʾ al-Qays and
/// al-Jāḥiẓ are three centuries apart is the fact a learner most needs.
@Component({
  selector: 'km-arabic-timeline',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './arabic-timeline.component.html',
  styleUrl: './arabic-timeline.component.scss',
})
export class ArabicTimelineComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private base = environment.apiBase;

  readonly loading = signal(true);
  readonly works = signal<Work[]>([]);
  readonly hover = signal<string | null>(null);

  private year(w: Work): number {
    const n = Number(String(w.died ?? '').replace(/[^\-0-9]/g, ''));
    return Number.isFinite(n) ? n : 9999;
  }

  /// Bands the tradition itself uses, not even centuries — the jāhiliyya is a
  /// period, not a hundred years, and the Abbasid centre of gravity is 3rd–4th.
  private static readonly ERAS = [
    { key: 'jahili',  en: 'Pre-Islamic',  ar: 'الجاهلية',  from: -200, to: 0 },
    { key: 'early',   en: 'Early Islam',  ar: 'صدر الإسلام', from: 1,  to: 132 },
    { key: 'abbasid', en: 'Abbasid',      ar: 'العباسي',   from: 133, to: 447 },
    { key: 'later',   en: 'Later',        ar: 'المتأخر',   from: 448, to: 1500 },
  ];

  readonly eras = computed(() => {
    const ws = this.works().filter((w) => this.year(w) !== 9999);
    return ArabicTimelineComponent.ERAS.map((e) => ({
      ...e,
      items: ws.filter((w) => this.year(w) >= e.from && this.year(w) <= e.to)
               .sort((a, b) => this.year(a) - this.year(b)),
    })).filter((e) => e.items.length);
  });

  /// Position along the era's own span, so a band with three authors in twenty
  /// years does not collapse them onto one point.
  pos(w: Work, from: number, to: number): number {
    const span = Math.max(1, to - from);
    return Math.min(96, Math.max(2, ((this.year(w) - from) / span) * 96));
  }

  ngOnInit(): void {
    this.http.get<Envelope<{ shelf: Work[] }>>(`${this.base}/ar/text/shelf`).subscribe({
      next: (r) => { this.works.set(r?.data?.shelf ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  label(w: Work): string {
    const n = this.year(w);
    return n < 0 ? `${Math.abs(n)} pre-hijra` : `${n} AH`;
  }

  open(w: Work): void {
    this.router.navigate(['/arabic/read', w.id, w.shape ?? 'prose', w.firstSeq ?? 1]);
  }
  back(): void { this.router.navigate(['/arabic/read']); }
}
