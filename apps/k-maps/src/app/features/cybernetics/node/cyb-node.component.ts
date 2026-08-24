import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap, tap, forkJoin } from 'rxjs';
import { CybService } from '../data/cyb.service';
import {
  CybCardComponent, CybReadingCardComponent, CybCarrierCardComponent,
} from '../shared/cyb-cards.component';
import type { CybNode, CybNodeDetail, CybReading, CarrierRows } from '../data/cyb.models';

// ─── The evidence behind one node ────────────────────────────────────────────
//
// Every other screen in the plane shows a percentage. This one shows what the
// percentage is made of, for any node in any lane — a root, a passage, an
// episode stage — because the bridge answers the same three questions about all
// of them: what does it read, what do the carriers bound to it hold, and what
// is queued against it.
//
// It exists because those three endpoints were on the contract and nothing on
// the web called them, so a number had no way to be checked. A node whose
// reading is unmeasured says so here rather than presenting a stored intention
// as a measurement.

const AXIS_ORDER = ['build', 'study', 'content', 'retention'];

@Component({
  selector: 'km-cyb-node',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, CybCardComponent, CybReadingCardComponent, CybCarrierCardComponent],
  templateUrl: './cyb-node.component.html',
  styleUrl: './cyb-node.component.scss',
})
export class CybNodeComponent {
  private readonly svc = inject(CybService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  /** Which layer's carriers are shown. null = whatever the node declares. */
  readonly layer = signal<string | null>(null);

  readonly nodeId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('id') ?? '')),
    { initialValue: '' },
  );

  private readonly bundle = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('id') ?? ''),
      tap(() => { this.loading.set(true); this.error.set(null); }),
      switchMap((id) =>
        // The three reads are independent and each is allowed to fail on its
        // own: a carrier that errors should not hide the node's reading, which
        // is the thing the reader came for.
        forkJoin({
          detail: this.svc.node(id).pipe(catchError(() => of(null))),
          readings: this.svc.readings(id).pipe(
            map((r) => r.readings ?? []), catchError(() => of([] as CybReading[]))),
          rows: this.svc.rows(id).pipe(
            map((r) => r.carriers ?? []), catchError(() => of([] as CarrierRows[]))),
        }),
      ),
      tap((b) => {
        this.loading.set(false);
        if (!b.detail) this.error.set('This node could not be read from the control plane.');
      }),
      catchError(() => {
        this.loading.set(false);
        this.error.set('The control plane did not answer.');
        return of(null);
      }),
    ),
    { initialValue: null as { detail: CybNodeDetail | null; readings: CybReading[]; rows: CarrierRows[] } | null },
  );

  readonly detail   = computed(() => this.bundle()?.detail ?? null);
  readonly node     = computed(() => this.detail()?.node ?? null);
  readonly children = computed(() => this.detail()?.children ?? []);
  readonly jobs     = computed(() => this.detail()?.jobs ?? []);
  readonly sensors  = computed(() => this.detail()?.sensors ?? []);
  readonly carriers = computed(() => this.bundle()?.rows ?? []);

  readonly readings = computed(() =>
    [...(this.bundle()?.readings ?? [])].sort(
      (a, b) => AXIS_ORDER.indexOf(a.axis) - AXIS_ORDER.indexOf(b.axis)),
  );

  /** How much of the node's own report is actually measured — the headline the
   *  rest of the plane never states. */
  readonly evidence = computed(() => {
    const r = this.readings();
    return {
      axes: r.length,
      measured: r.filter((x) => x.measured).length,
      stale: r.filter((x) => x.stale).length,
      sensors: r.reduce((n, x) => n + x.sensors, 0),
      read: r.reduce((n, x) => n + x.read_sensors, 0),
    };
  });

  readonly carrierTotals = computed(() => {
    const c = this.carriers();
    return {
      tables: c.length,
      bound: c.filter((x) => x.total > 0).length,
      rows: c.reduce((n, x) => n + x.total, 0),
    };
  });

  readonly jobTotals = computed(() => {
    const j = this.jobs();
    return {
      total: j.length,
      ready: j.filter((x) => x.readiness === 'ready').length,
      blocked: j.filter((x) => x.readiness === 'blocked').length,
      done: j.filter((x) => x.readiness === 'done').length,
    };
  });

  open(id: string): void {
    this.router.navigate(['/cybernetics/node', id]);
  }

  back(): void {
    const n = this.node();
    if (n?.parent_id) this.open(n.parent_id);
    else this.router.navigate(['/cybernetics/monitor']);
  }

  /** A node in the content lane has an episode screen; one in the Qurʾān lane
   *  has the map. Offer whichever actually exists for this node. */
  laneHome(n: CybNode): { label: string; path: unknown[] } {
    return n.lane === 'content'
      ? { label: 'Episodes', path: ['/cybernetics/episodes'] }
      : { label: 'Quran Map', path: ['/cybernetics/map'] };
  }

  goLaneHome(): void {
    const n = this.node();
    if (n) this.router.navigate(this.laneHome(n).path as string[]);
  }
}
