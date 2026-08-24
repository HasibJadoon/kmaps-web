import {
  ChangeDetectionStrategy, Component, computed, inject, signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { CybService } from '../data/cyb.service';
import type {
  CybNode, CybReading, CmDocument, TeachingVariant, EpisodeMeta,
} from '../data/cyb.models';

// ─── The doc lane — episode management ───────────────────────────────────────
//
// An episode is not a new kind of thing, and this screen does not invent one.
// It is a cyb_node of scale 'unit' in lane 'content': its children are the
// stages it passes through (outline → teaching → script → edit → record →
// publish), and every stage points at a cm_documents row through target_ref.
//
// That is what "Teaching and Document" means here, and why one screen serves
// both. The stage is the management — how far the work has got, measured the
// same way every other node in the control plane is measured. The document is
// the work. A teaching stage additionally names the ar_teaching_variant rows it
// retells, which hang off the same ar_grammar_node the Arabic TOC walks, so an
// episode reaches its grammar without restating it.

interface StageView {
  node: CybNode;
  layer: string;
  docRef: string | null;
  meta: EpisodeMeta;
  variantIds: string[];
}

interface EpisodeView {
  node: CybNode;
  meta: EpisodeMeta;
  stages: StageView[];
  docRef: string | null;
}

interface SeriesView {
  node: CybNode;
  meta: EpisodeMeta;
  episodes: EpisodeView[];
}

/** Stage order is editorial, not alphabetical — a script is written before it
 *  is recorded, and the lane should read in the order the work happens. */
const STAGE_ORDER = ['outline', 'kid', 'peer', 'teaching', 'script', 'edit', 'record', 'publish'];

function parseMeta(raw: string | null | undefined): EpisodeMeta {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? parsed as EpisodeMeta : {};
  } catch {
    // A malformed meta_json is a data problem, not a reason to blank the page.
    return {};
  }
}

@Component({
  selector: 'km-cyb-episodes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  templateUrl: './cyb-episodes.component.html',
  styleUrl: './cyb-episodes.component.scss',
})
export class CybEpisodesComponent {
  private readonly svc = inject(CybService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private readonly forest = toSignal(
    this.svc.tree(undefined, 'content').pipe(
      map((r) => r.roots ?? []),
      catchError(() => {
        this.error.set('The content lane did not answer. Reload to try again.');
        return of([] as CybNode[]);
      }),
      tap(() => this.loading.set(false)),
    ),
    { initialValue: [] as CybNode[] },
  );

  /** series → episodes → stages, in editorial order. */
  readonly series = computed<SeriesView[]>(() => {
    const out: SeriesView[] = [];
    for (const root of this.forest()) {
      // The lane root is the doc space itself; the programmes are under it, and
      // a programme may also arrive at the top when the tree is asked narrowly.
      const candidates = root.scale === 'programme' ? [root] : (root.children ?? []);
      for (const prog of candidates) {
        if (prog.scale !== 'programme') continue;
        out.push({
          node: prog,
          meta: parseMeta(prog.meta_json),
          episodes: (prog.children ?? [])
            .filter((e) => e.scale === 'unit')
            .map((e) => this.toEpisode(e)),
        });
      }
    }
    return out;
  });

  private toEpisode(node: CybNode): EpisodeView {
    const stages = (node.children ?? [])
      .filter((s) => s.scale === 'stage')
      .map<StageView>((s) => {
        const meta = parseMeta(s.meta_json);
        return {
          node: s,
          layer: s.layer ?? '—',
          docRef: s.target_ref,
          meta,
          variantIds: meta.teaching_variants ?? [],
        };
      })
      .sort((a, b) => {
        const ia = STAGE_ORDER.indexOf(a.layer);
        const ib = STAGE_ORDER.indexOf(b.layer);
        // A layer the order does not know still has to appear — after the known
        // ones, in its own name's order, rather than silently at the front.
        if (ia === -1 && ib === -1) return a.layer.localeCompare(b.layer);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
    return { node, meta: parseMeta(node.meta_json), stages, docRef: node.target_ref };
  }

  readonly totals = computed(() => {
    const eps = this.series().flatMap((s) => s.episodes);
    const stages = eps.flatMap((e) => e.stages);
    return {
      series: this.series().length,
      episodes: eps.length,
      stages: stages.length,
      started: stages.filter((s) => s.node.build_pct > 0).length,
      teaching: stages.filter((s) => s.variantIds.length > 0).length,
    };
  });

  // ── Selection ──────────────────────────────────────────────────────────────
  // Opening a stage is a second read, not part of the lane load: the document
  // body and the teaching variants are large, and the lane is a list.

  readonly selected = signal<StageView | null>(null);
  readonly detailLoading = signal(false);
  readonly doc = signal<CmDocument | null>(null);
  readonly variants = signal<TeachingVariant[]>([]);
  readonly readings = signal<CybReading[]>([]);
  readonly detailError = signal<string | null>(null);

  select(stage: StageView): void {
    if (this.selected()?.node.id === stage.node.id) {
      this.selected.set(null);
      return;
    }
    this.selected.set(stage);
    this.doc.set(null);
    this.variants.set([]);
    this.readings.set([]);
    this.detailError.set(null);
    this.detailLoading.set(true);

    // Three independent reads across three databases — km_core for the reading,
    // km_content for the document, km_arabic for the teaching. Each is allowed
    // to fail on its own: a missing document should not hide the reading.
    this.svc.readings(stage.node.id).subscribe({
      next: (r) => this.readings.set(r.readings ?? []),
      error: () => this.readings.set([]),
    });

    if (stage.docRef) {
      this.svc.document(stage.docRef).subscribe({
        next: (d) => { this.doc.set(d); this.detailLoading.set(false); },
        error: () => {
          this.detailError.set(`Document ${stage.docRef} could not be read.`);
          this.detailLoading.set(false);
        },
      });
    } else {
      this.detailLoading.set(false);
    }

    if (stage.variantIds.length) {
      this.svc.teachingVariants(stage.variantIds).subscribe({
        next: (r) => this.variants.set(r.variants ?? []),
        error: () => this.variants.set([]),
      });
    }
  }

  isSelected(stage: StageView): boolean {
    return this.selected()?.node.id === stage.node.id;
  }

  // ── Presentation helpers ───────────────────────────────────────────────────

  /** The four axes, in the order the rest of the control plane shows them. */
  axisOrder(readings: CybReading[]): CybReading[] {
    const order = ['build', 'study', 'content', 'retention'];
    return [...readings].sort((a, b) => order.indexOf(a.axis) - order.indexOf(b.axis));
  }

  stageLabel(layer: string): string {
    const m: Record<string, string> = {
      outline: 'Outline', kid: 'Teaching — kid', peer: 'Teaching — peer',
      teaching: 'Teaching', script: 'Script', edit: 'Edit',
      record: 'Record', publish: 'Publish',
    };
    return m[layer] ?? layer;
  }

  /** Empty / seeded / drafting read as a progression, so the bar has a colour
   *  that means something rather than one ramp for every state. */
  stateTier(node: CybNode): 'empty' | 'seeded' | 'working' | 'done' {
    if (node.build_pct >= 100) return 'done';
    if (node.build_pct >= 25) return 'working';
    if (node.build_pct > 0) return 'seeded';
    return 'empty';
  }

  passageOf(meta: EpisodeMeta, node: CybNode): string {
    return meta.stack?.ss ?? node.target_ref ?? '';
  }

  /** The grammar node an episode's stack names — the same id the Arabic TOC
   *  uses, so the two surfaces agree on what is being taught. */
  grammarNode(ep: EpisodeView): string | null {
    return ep.meta.stack?.grammar_node ?? null;
  }

  openGrammarNode(id: string): void {
    this.router.navigate(['/arabic/topic', id]);
  }

  trackNode = (_: number, n: { node: CybNode }) => n.node.id;
}
