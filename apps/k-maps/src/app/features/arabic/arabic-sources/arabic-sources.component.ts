import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ArabicCurriculumApiService,
  ArSource,
  ArSourceGroup,
} from '../../../shared/services/arabic-curriculum-api.service';

/**
 * The Sources card: every matn, sharḥ, commentary and lecture the three
 * courses lean on, in one place.
 *
 * Sources were previously reachable only sideways — you had to already be on a
 * topic that happened to cite one, which meant a book cited by nothing was
 * invisible even though it was registered. This page reads ar_learning_source
 * itself, so the shelf is the shelf; the citation count next to each entry says
 * how far into the TOC it actually reaches, and zero is shown rather than
 * hidden.
 */
@Component({
  selector: 'km-arabic-sources',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './arabic-sources.component.html',
  styleUrl: './arabic-sources.component.scss',
})
export class ArabicSourcesComponent {
  private readonly api = inject(ArabicCurriculumApiService);

  readonly groups = signal<ArSourceGroup[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  /** 'all' or a source_kind — books and lectures read very differently. */
  readonly kindFilter = signal<string>('all');
  readonly skeletons = [1, 2, 3, 4, 5, 6];

  readonly kinds = computed(() => {
    const set = new Set<string>();
    for (const g of this.groups()) for (const s of g.sources) set.add(s.source_kind);
    return ['all', ...[...set].sort()];
  });

  readonly visible = computed<ArSourceGroup[]>(() => {
    const k = this.kindFilter();
    if (k === 'all') return this.groups();
    return this.groups()
      .map((g) => ({ ...g, sources: g.sources.filter((s) => s.source_kind === k) }))
      .filter((g) => g.sources.length > 0);
  });

  readonly total = computed(() =>
    this.groups().reduce((n, g) => n + g.sources.length, 0),
  );

  constructor() {
    this.api.getSources().subscribe({
      next: (res) => { this.groups.set(res.groups ?? []); this.loading.set(false); },
      error: () => {
        this.error.set('Could not load the sources. Try again in a moment.');
        this.loading.set(false);
      },
    });
  }

  setKind(k: string): void { this.kindFilter.set(k); }

  /** How the shelf labels an entry's standing. */
  authorityLabel(a: string): string {
    const m: Record<string, string> = {
      classical: 'Classical',
      matn: 'Matn',
      primary_modern: 'Modern reference',
      pedagogical: 'Teaching',
      secondary: 'Secondary',
    };
    return m[a] ?? a;
  }

  kindLabel(k: string): string {
    const m: Record<string, string> = {
      all: 'All', book: 'Books', video: 'Lectures',
      article: 'Articles', matn: 'Mutūn',
    };
    return m[k] ?? k;
  }

  kindIcon(k: string): string {
    const m: Record<string, string> = {
      book: '\u{1F4D6}', matn: '\u{1F4DC}', video: '▶', article: '\u{1F4C4}',
    };
    return m[k] ?? '\u{1F4C1}';
  }

  displayTitle(s: ArSource): string {
    return s.title_ar || s.title_en || s.id;
  }

  displayAuthor(s: ArSource): string {
    return s.author_ar || s.author_en || '';
  }
}
