import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import {
  ArabicCurriculumApiService,
  ArDiscipline,
} from '../../../shared/services/arabic-curriculum-api.service';

/**
 * The Linguistics hub: the three domains of the Arabic sciences.
 *
 * This page used to guess at its own content — two tabs reading /ar/grammar and
 * /ar/balagha, the second of which is not an endpoint, so the Balagha tab was
 * permanently empty and the third tab said "coming soon". The three domains are
 * now rows in ar_discipline, each with its course and its live counts, so the
 * page states what the database actually holds.
 */
@Component({
  selector: 'km-arabic-linguistics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './arabic-linguistics.component.html',
  styleUrl: './arabic-linguistics.component.scss',
})
export class ArabicLinguisticsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly api = inject(ArabicCurriculumApiService);

  readonly disciplines = signal<ArDiscipline[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly skeletons = [1, 2, 3];

  readonly totals = computed(() => {
    const d = this.disciplines();
    return {
      modules: d.reduce((n, x) => n + x.counts.modules, 0),
      topics:  d.reduce((n, x) => n + x.counts.topics, 0),
      sources: d.reduce((n, x) => n + x.counts.sources, 0),
      hours:   Math.round(d.reduce((n, x) => n + x.counts.minutes, 0) / 60),
    };
  });

  ngOnInit(): void {
    this.api.getDisciplines().subscribe({
      next: (res) => {
        this.disciplines.set(res.disciplines ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not reach the curriculum. Try again in a moment.');
        this.loading.set(false);
      },
    });
  }

  back(): void {
    this.router.navigate(['/arabic']);
  }
}
