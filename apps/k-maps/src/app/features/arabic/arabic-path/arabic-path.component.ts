import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ArabicApiService } from '../../../shared/services/arabic-api.service';

/// Everything on this screen — words, lane and state names, colours, counts — comes from
/// GET /ar/learn/path (workers/arabic/src/routes/learn-path.ts). The component only renders
/// it and sends the learner's start / close / reopen back. Icons are SF Symbol names, which
/// the web cannot draw, so they are not shown; colours carry the meaning.
interface Word { label: string; labelAr: string | null; detail: string | null; icon: string | null; }
interface Badge { key: string; label: string; labelAr: string | null; icon: string | null; color: string | null; }
interface Lane extends Badge { detail: string | null; total: number; done: number; }
interface Step {
  id: string; step: number; title: string; url: string; episodes: number; level: string;
  lane: Badge; state: Badge; graded: boolean; units: number; passed: number;
  gradedLine: Word | null; lockedWhy: Word | null; startedAt: boolean; doneAt: string | null;
}
interface Path {
  title: Word; today: Word & { steps: Step[] };
  progress: { done: number; total: number; percent: number; label: string; labelAr: string | null };
  pass: number; graded: Word; lanes: Lane[]; states: Badge[];
  actions: { start: Word; close: Word; reopen: Word; practice: Word };
  steps: Step[];
}
type Move = 'started' | 'done' | 'reset';
interface Envelope<T> { ok: boolean; data?: T; error?: { code: string; message: string }; }

@Component({
  selector: 'km-arabic-path',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './arabic-path.component.html',
  styleUrl: './arabic-path.component.scss',
})
export class ArabicPathComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly ar = inject(ArabicApiService);
  private readonly base = 'ar/learn/path';

  readonly loading = signal(true);
  readonly data = signal<Path | null>(null);
  readonly error = signal<string | null>(null);

  readonly lane = signal('');
  readonly openId = signal<string | null>(null);
  readonly busy = signal<string | null>(null);
  readonly stepError = signal<{ id: string; message: string } | null>(null);

  readonly steps = computed(() => {
    const d = this.data(), l = this.lane();
    if (!d) return [];
    return [...d.steps].filter((s) => !l || s.lane.key === l).sort((a, b) => a.step - b.step);
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.ar.get<Envelope<Path>>(this.base).subscribe({
      next: (res) => { this.data.set(res?.data ?? null); this.error.set(null); this.loading.set(false); },
      error: (e: HttpErrorResponse) => { this.error.set(this.message(e)); this.loading.set(false); },
    });
  }

  setLane(k: string): void { this.lane.set(this.lane() === k ? '' : k); }

  toggle(s: Step): void {
    this.openId.set(this.openId() === s.id ? null : s.id);
    this.stepError.set(null);
  }

  /// Start, close or reopen a step. A graded step refuses to close (409) until its checks pass;
  /// the worker's message is shown under the step.
  move(s: Step, state: Move): void {
    if (this.busy()) return;
    this.busy.set(s.id);
    this.stepError.set(null);
    this.ar.post<Envelope<Step>>(`${this.base}/${encodeURIComponent(s.id)}`, { state }).subscribe({
      next: () => { this.busy.set(null); this.load(); },
      error: (e: HttpErrorResponse) => { this.busy.set(null); this.stepError.set({ id: s.id, message: this.message(e) }); },
    });
  }

  errorFor(s: Step): string | null {
    const e = this.stepError();
    return e && e.id === s.id ? e.message : null;
  }

  /// The worker's own error text is the user-facing text.
  private message(e: HttpErrorResponse): string {
    return (e.error as Envelope<unknown> | null)?.error?.message ?? e.message;
  }

  goBack(): void { this.router.navigate(['/arabic']); }
}
