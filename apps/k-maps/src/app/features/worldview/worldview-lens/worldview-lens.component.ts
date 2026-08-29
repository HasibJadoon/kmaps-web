import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

// ─── The Quranic lens ─────────────────────────────────────────────────────────
//
// One passage, two readings, set against each other line by line. Neither is
// summarised away: each is stated in full, because a contrast the reader cannot
// disagree with is decoration.
//
// The pairing is the content, and it does not come from grouping positions by
// concept. Doing that yields twenty-four one-sided columns and no argument at
// all, because the two sides share no concept — Islam's and secular
// naturalism's concept sets are disjoint. It comes from the graph's `rebuts`
// edges, which still hold the pairing that was lost when the positions were
// lifted out of it. `/wv/positions/contrast` reads it from where it survives.

interface ContrastPair {
  claim_id: string;
  claim: string;
  claim_summary: string | null;
  counter_id: string;
  counter: string;
  counter_summary: string | null;
}

/** The graph stores `summary` equal to `title` on these nodes, so rendering
 *  both prints the same sentence twice. Show the note only when it says
 *  something the reading does not. */
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

/** Where the contrast corpus actually has something to show. Listed rather than
 *  offered as a free surah picker, because a picker that returns nothing for
 *  113 of 114 surahs teaches the reader that the feature is broken. */
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
