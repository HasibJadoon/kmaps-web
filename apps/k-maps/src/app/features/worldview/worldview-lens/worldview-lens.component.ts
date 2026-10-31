import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WorldviewApiService } from '../../../shared/services/worldview/worldview-api.service';

interface ContrastPair {
  claim_id: string;
  claim: string;
  claim_summary: string | null;
  counter_id: string;
  counter: string;
  counter_summary: string | null;
}

export function meaningfulNote(text: string, note: string | null): string | null {
  if (!note) return null;
  const norm = (v: string) => v.trim().replace(/\s+/g, ' ').replace(/[.,;]+$/, '').toLowerCase();
  return norm(note) === norm(text) ? null : note;
}

interface Contrast {
  surah: number;
  ayahFrom: number;
  ayahTo: number;
  scopeRef: string;
  pairs: ContrastPair[];
  sides: { claim: string; counter: string };
}

/** A passage with a contrast built, as the WV worker lists it (GET /wv/positions/contrast). */
export interface LensPassage {
  surah: number;
  from: number;
  to: number;
  label: string;
}

@Component({
  selector: 'km-worldview-lens',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './worldview-lens.component.html',
  styleUrl: './worldview-lens.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewLensComponent implements OnInit {
  private readonly wv = inject(WorldviewApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly passages = signal<LensPassage[]>([]);
  readonly active = signal<LensPassage | null>(null);
  private loadSeq = 0;
  readonly contrast = signal<Contrast | null>(null);
  readonly loading = signal(true);
  readonly failure = signal<string | null>(null);

  ngOnInit(): void {
    const surah = Number(this.route.snapshot.paramMap.get('surah'));
    const range = this.route.snapshot.paramMap.get('range');
    if (surah && range) {
      const [from, to] = range.split('-').map(Number);
      this.active.set({ label: `${surah}:${range}`, surah, from, to: to || from });
      void this.load();
    }
    void this.loadPassages();
  }

  select(p: LensPassage): void {
    const cur = this.active();
    if (cur && p.surah === cur.surah && p.from === cur.from) return;
    this.active.set(p);
    void this.load();
  }

  goBack(): void { void this.router.navigate(['/worldview']); }

  note(text: string, summary: string | null): string | null {
    return meaningfulNote(text, summary);
  }

  isActive(p: LensPassage): boolean {
    const cur = this.active();
    return !!cur && p.surah === cur.surah && p.from === cur.from;
  }

  private async loadPassages(): Promise<void> {
    try {
      const list = await this.wv.contrastPassages<LensPassage>();
      this.passages.set(list);
      if (!this.active() && list.length) {
        this.active.set(list[0]);
        void this.load();
      } else if (!this.active()) {
        this.loading.set(false);
      }
    } catch {
      if (!this.active()) {
        this.failure.set('The passages could not be loaded.');
        this.loading.set(false);
      }
    }
  }

  private async load(): Promise<void> {
    const p = this.active();
    if (!p) return;
    const seq = ++this.loadSeq;
    this.loading.set(true);
    this.failure.set(null);
    try {
      const c = await this.wv.contrast<Contrast>(p.surah, p.from, p.to);
      if (seq === this.loadSeq) this.contrast.set(c);
    } catch {
      if (seq === this.loadSeq) this.failure.set('The contrast could not be loaded.');
    } finally {
      if (seq === this.loadSeq) this.loading.set(false);
    }
  }
}
