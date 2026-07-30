import {
  ChangeDetectionStrategy, Component, computed, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';
import { MufradatShellComponent, MUFRADAT_SLUG } from '../shells/mufradat/mufradat-shell.component';
import { LexiconShellComponent } from '../shells/lexicon/lexicon-shell.component';
import { LaneShellComponent, LANE_SLUG } from '../shells/lane/lane-shell.component';
import { ScholarshipShellComponent } from '../shells/scholarship/scholarship-shell.component';
import { RootComponent } from '../../../shared/quran-lexicon/root/root.component';
import { CLASSICAL_SHELL_SLUGS } from '../data/lexicon-sources.service';

/**
 * Root-centric lexicon reader. The URL puts the ROOT in the path and the BOOK
 * in a query param — /lexicon/root/:root?book=<slug>. The book selector swaps
 * ?book while keeping the same root. Each shell (Mufradat, classical Lisan +
 * friends, Lane, scholarship) reads root from the path and book from ?book.
 *
 * With no ?book the path falls back to the morphology root view (RootComponent,
 * root → words grid), preserving existing /lexicon/root/:root links.
 */
@Component({
  selector: 'km-lexicon-root-reader',
  standalone: true,
  imports: [
    CommonModule,
    MufradatShellComponent, LexiconShellComponent,
    LaneShellComponent, ScholarshipShellComponent,
    RootComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (book(); as b) {
      @if (isMufradat()) { <km-mufradat-shell /> }
      @else if (isClassical()) { <km-lexicon-shell /> }
      @else if (isLane()) { <km-lane-shell /> }
      @else { <km-scholarship-shell /> }
    } @else {
      <km-root />
    }
  `,
})
export class LexiconRootReaderComponent {
  private readonly route = inject(ActivatedRoute);

  readonly root = signal('');
  readonly book = signal('');

  readonly isMufradat  = computed(() => this.book() === MUFRADAT_SLUG);
  readonly isLane      = computed(() => this.book() === LANE_SLUG);
  // Any other book the backend has registered a `/read/` composer for. Books
  // without one (Sinai's key terms, the five-lens synthesis) fall to the
  // scholarship shell, which reads a different endpoint entirely.
  readonly isClassical = computed(() => CLASSICAL_SHELL_SLUGS.has(this.book()));

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([params, query]) => {
        this.root.set(params.get('root') ?? '');
        this.book.set(query.get('book') ?? '');
      });
  }
}
