import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

/// A recording in the acquisition library. `playUrl` is anonymous-GET on
/// purpose: an <audio> element cannot carry a bearer token.
interface Track {
  id: string;
  object_key: string;
  title_ar: string | null;
  title_en: string | null;
  duration_sec: number | null;
  register: string | null;
  category: string | null;
  categoryAr: string | null;
  transcript_state: string;
  playUrl: string;
}

interface Envelope<T> { ok: boolean; data?: T; }

/// Listening is a different act from reading, so it gets a different screen:
/// a long ordered list you work down, and one player that stays put. No cards,
/// no grid — the unit of interest is a run of minutes, not a tile.
@Component({
  selector: 'km-arabic-listening',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './arabic-listening.component.html',
  styleUrl: './arabic-listening.component.scss',
})
export class ArabicListeningComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private readonly base = environment.apiBase;

  readonly loading = signal(true);
  readonly tracks = signal<Track[]>([]);
  readonly playing = signal<Track | null>(null);
  readonly registerFilter = signal<string>('all');

  /// Register is the axis that matters for acquisition: turāth is the classical
  /// register the whole programme is aimed at, muʿāṣira is the bridge to it.
  readonly registers = computed(() => {
    const set = new Set(this.tracks().map((t) => t.register).filter(Boolean) as string[]);
    return ['all', ...Array.from(set).sort()];
  });

  readonly visible = computed(() => {
    const f = this.registerFilter();
    return f === 'all' ? this.tracks() : this.tracks().filter((t) => t.register === f);
  });

  /// Grouped by category so a session can be chosen by kind — a dīwān is not a
  /// graded reader and should not sit in the same run.
  readonly groups = computed(() => {
    const map = new Map<string, Track[]>();
    for (const t of this.visible()) {
      const k = t.category ?? 'Other';
      (map.get(k) ?? map.set(k, []).get(k)!).push(t);
    }
    return Array.from(map, ([name, items]) => ({
      name,
      nameAr: items[0]?.categoryAr ?? null,
      items,
      minutes: Math.round(items.reduce((s, t) => s + (t.duration_sec ?? 0), 0) / 60),
    }));
  });

  readonly totalHours = computed(
    () => Math.round((this.visible().reduce((s, t) => s + (t.duration_sec ?? 0), 0) / 3600) * 10) / 10,
  );

  ngOnInit(): void {
    this.http
      .get<Envelope<{ audio: Track[] }>>(`${this.base}/ar/acq/audio?limit=500`)
      .subscribe({
        next: (res) => { this.tracks.set(res?.data?.audio ?? []); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }

  play(t: Track): void { this.playing.set(t); }

  title(t: Track): string { return t.title_ar || t.title_en || t.object_key.split('/').pop() || '—'; }

  /// Absolute, because playUrl comes back as a gateway path.
  src(t: Track): string {
    return t.playUrl.startsWith('http') ? t.playUrl : `${this.base.replace(/\/api$/, '')}${t.playUrl}`;
  }

  duration(sec: number | null): string {
    if (!sec) return '—';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  setRegister(r: string): void { this.registerFilter.set(r); }
  goBack(): void { this.router.navigate(['/arabic']); }
}
