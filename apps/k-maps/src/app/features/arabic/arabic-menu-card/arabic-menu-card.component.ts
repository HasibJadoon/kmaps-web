import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface ArabicFeature {
  icon: string;
  title: string;
  arabicTitle: string;
  description: string;
  route: string;
  gated?: boolean;
}

/// What the acquisition layer holds. `awaitingReview` is a queue length, not an
/// achievement, and is shown as one.
interface AcqStats {
  works: number;
  audio: number;
  audioHours: number;
  captures: number;
  awaitingReview: number;
  items: number;
  itemsLinked: number;
}

@Component({
  selector: 'km-arabic-menu-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './arabic-menu-card.component.html',
  styleUrl: './arabic-menu-card.component.scss',
})
export class ArabicMenuCardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBase;

  /// `gated` marks a door that needs a session. Saying so on the tile is kinder
  /// than letting someone open an empty screen and conclude there is no data.
  readonly features: ArabicFeature[] = [
    { icon: 'ق', title: 'Read', arabicTitle: 'القراءة',
      description: 'Stories, maqāmāt, proverbs, dīwāns — tap any word', route: '/arabic/read' },
    { icon: '▶', title: 'Series', arabicTitle: 'المسلسلات',
      description: 'Watch with the script running under the video', route: '/arabic/series' },
    { icon: '♪', title: 'Listening', arabicTitle: 'الاستماع',
      description: 'Readers, stories, dīwāns — recorded', route: '/arabic/listening' },
    { icon: '⇣', title: 'Intake', arabicTitle: 'الوارد',
      description: 'Log fuṣḥā sources and work them toward tafsīr', route: '/arabic/intake', gated: true },
    { icon: '↻', title: 'Capture review', arabicTitle: 'المراجعة',
      description: 'Machine-read Arabic awaiting a human', route: '/arabic/review' },
    { icon: 'ك', title: 'Content Library', arabicTitle: 'المكتبة',
      description: 'Books, poetry, podcasts', route: '/arabic/library', gated: true },
    { icon: 'ن', title: 'Linguistics', arabicTitle: 'اللغويات',
      description: 'Grammar & rhetoric', route: '/arabic/linguistics', gated: true },
    { icon: 'م', title: 'Domains', arabicTitle: 'المجالات',
      description: 'Context vocabulary', route: '/arabic/domains', gated: true },
  ];

  /// Signals, not plain fields: this component is OnPush, and a value assigned
  /// inside an HTTP callback never reaches the template otherwise.
  readonly acq = signal<AcqStats | null>(null);

  ngOnInit(): void {
    this.http.get<{ ok: boolean; data?: { stats: AcqStats } }>(`${this.apiBase}/ar/acq/stats`)
      .subscribe({
        next: (res) => this.acq.set(res?.data?.stats ?? null),
        error: () => this.acq.set(null),
      });
  }
}
