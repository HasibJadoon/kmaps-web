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
