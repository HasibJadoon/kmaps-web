import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

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

const PASSAGES = [
  { label: 'al-Rūm 30:2–6', surah: 30, from: 2, to: 6 },
];

@Component({
  selector: 'km-worldview-lens',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './worldview-lens.component.html',
  styleUrl: './worldview-lens.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewLensComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly passages = PASSAGES;
  readonly active = signal(PASSAGES[0]);
  readonly contrast = signal<Contrast | null>(null);
  readonly loading = signal(true);
  readonly failure = signal<string | null>(null);

  ngOnInit(): void {
    const surah = Number(this.route.snapshot.paramMap.get('surah'));
    const range = this.route.snapshot.paramMap.get('range');
    if (surah && range) {
      const [from, to] = range.split('-').map(Number);
      this.active.set({ label: `${surah}:${range}`, surah, from, to: to || from });
    }
    void this.load();
  }

  select(p: typeof PASSAGES[number]): void {
    if (p.surah === this.active().surah && p.from === this.active().from) return;
    this.active.set(p);
    void this.load();
  }

  goBack(): void { void this.router.navigate(['/worldview']); }

  note(text: string, summary: string | null): string | null {
    return meaningfulNote(text, summary);
  }

  private async load(): Promise<void> {
    const p = this.active();
    this.loading.set(true);
    this.failure.set(null);
    try {
      const res = await fetch(
        `${environment.apiBase}/wv/positions/contrast/${p.surah}/${p.from}-${p.to}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json() as { ok: boolean; data: Contrast };
      this.contrast.set(body.data ?? null);
    } catch {
      this.failure.set('The contrast could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }
}
