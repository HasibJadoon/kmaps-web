import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap, catchError, of, tap } from 'rxjs';
import {
  ArabicCurriculumApiService,
  ArCurriculum,
  ArTocModule,
  ArTocNode,
} from '../../../shared/services/arabic-curriculum-api.service';
import { TocNodeComponent } from './toc-node.component';

/**
 * One domain's whole table of contents: course → modules in teaching order →
 * the classical subtree each module opens into, down to the masʾala.
 *
 * The page holds two trees because km_arabic holds two, and neither is a
 * restatement of the other. The modules are what a learner is taught and in
 * what order; the reference tree below them is the part of the discipline the
 * course does not teach but the sources still cover. Collapsing them into one
 * list would make the second look like an omission from the first.
 */
@Component({
  selector: 'km-arabic-toc',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DecimalPipe, TocNodeComponent],
  templateUrl: './arabic-toc.component.html',
  styleUrl: './arabic-toc.component.scss',
})
export class ArabicTocComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ArabicCurriculumApiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  /** Which modules are expanded. Modules are collapsed by default: 39 modules
      with their subtrees open at once is a wall, not a contents page. */
  private readonly openModules = signal<ReadonlySet<string>>(new Set());
  readonly showReference = signal(false);

  private readonly data = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('discipline') ?? ''),
      tap(() => { this.loading.set(true); this.error.set(null); }),
      switchMap((slug) =>
        this.api.getCurriculum(slug).pipe(
          catchError(() => {
            this.error.set(`No such discipline: "${slug}".`);
            return of(null);
          }),
        ),
      ),
      tap(() => this.loading.set(false)),
    ),
    { initialValue: null as ArCurriculum | null },
  );

  readonly discipline = computed(() => this.data()?.discipline ?? null);
  readonly course     = computed(() => this.data()?.course ?? null);
  readonly modules    = computed(() => this.data()?.modules ?? []);
  readonly reference  = computed(() => this.data()?.unassigned ?? []);

  /** Totals read off the tree, not off a count column that could drift. */
  readonly totals = computed(() => {
    const mods = this.modules();
    return {
      modules: mods.length,
      topics:  mods.reduce((n, m) => n + countNodes(m.topics), 0),
      lessons: mods.reduce((n, m) => n + m.lessons.length, 0),
      minutes: mods.reduce((n, m) => n + (m.estimated_mins ?? 0), 0),
      sources: mods.reduce((n, m) => n + sumSources(m.topics), 0),
    };
  });

  isOpen(id: string): boolean {
    return this.openModules().has(id);
  }

  toggleModule(id: string): void {
    const next = new Set(this.openModules());
    if (!next.delete(id)) next.add(id);
    this.openModules.set(next);
  }

  expandAll(): void {
    this.openModules.set(new Set(this.modules().map((m) => m.id)));
  }

  collapseAll(): void {
    this.openModules.set(new Set());
  }

  topicCount(m: ArTocModule): number {
    return countNodes(m.topics);
  }
}

function countNodes(nodes: ArTocNode[]): number {
  let n = 0;
  for (const node of nodes) n += 1 + countNodes(node.children);
  return n;
}

function sumSources(nodes: ArTocNode[]): number {
  let n = 0;
  for (const node of nodes) n += node.source_count + sumSources(node.children);
  return n;
}
