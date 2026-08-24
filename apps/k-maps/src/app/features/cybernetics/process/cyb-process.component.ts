import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, tap } from 'rxjs';
import { CybService } from '../data/cyb.service';
import type { StudyProcess, StudyProcessStep } from '../data/cyb.models';

// ─── The study process register ──────────────────────────────────────────────
//
// The ordered work: what each step covers, which layer and skill does it, and
// which tables it actually writes into. The last is the point — the carriers are
// derived through the same bridge the sensors read by (step → layer →
// cyb_carrier_binding → table), so this is documentation that cannot go stale.
//
// A step with a skill and no carriers is a step that cannot be built. The
// register shows that rather than describing the process as if it were whole.
@Component({
  selector: 'km-cyb-process',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './cyb-process.component.html',
  styleUrl: './cyb-process.component.scss',
})
export class CybProcessComponent {
  private readonly svc = inject(CybService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly open = signal<ReadonlySet<string>>(new Set());

  readonly processes = toSignal(
    this.svc.process().pipe(
      map((r) => r.processes ?? []),
      catchError(() => {
        this.error.set('The process register did not answer. Reload to try again.');
        return of([] as StudyProcess[]);
      }),
      tap(() => this.loading.set(false)),
    ),
    { initialValue: [] as StudyProcess[] },
  );

  readonly totals = computed(() => {
    const steps = this.processes().flatMap((p) => p.steps);
    return {
      processes: this.processes().length,
      steps: steps.length,
      buildable: steps.filter((s) => s.carriers.length > 0).length,
      unbuildable: steps.filter((s) => s.carriers.length === 0).length,
    };
  });

  toggle(uid: string): void {
    const next = new Set(this.open());
    if (!next.delete(uid)) next.add(uid);
    this.open.set(next);
  }

  isOpen(uid: string): boolean { return this.open().has(uid); }

  /** Distinct databases a step touches — the same table twice is one carrier. */
  dbsOf(step: StudyProcessStep): string[] {
    return [...new Set(step.carriers.map((c) => c.db_name).filter((d): d is string => !!d))];
  }

  skillsOf(step: StudyProcessStep): string[] {
    return [...new Set(step.layers.map((l) => l.skill_name ?? l.skill_slug).filter((s): s is string => !!s))];
  }
}
