import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap, catchError, of, tap } from 'rxjs';
import {
  ArabicCurriculumApiService,
  ArNodeDetail,
} from '../../../shared/services/arabic-curriculum-api.service';

/**
 * One topic of the table of contents: where it sits in the hierarchy, what
 * falls under it, which module teaches it, and which sources say what about it.
 *
 * The breadcrumb is the point of the page. A masʾala like "أدلة بقائها على
 * التنكير" means nothing on its own; read as
 * majrūrāt → iḍāfa → lafẓiyya → this, it is a specific argument in a specific
 * chapter, and the sources listed underneath are where that argument is made.
 */
@Component({
  selector: 'km-arabic-topic',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './arabic-topic.component.html',
  styleUrl: './arabic-topic.component.scss',
})
export class ArabicTopicComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ArabicCurriculumApiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private readonly data = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('id') ?? ''),
      tap(() => { this.loading.set(true); this.error.set(null); }),
      switchMap((id) =>
        this.api.getNode(id).pipe(
          catchError(() => {
            this.error.set(`No such topic: "${id}".`);
            return of(null);
          }),
        ),
      ),
      tap(() => this.loading.set(false)),
    ),
    { initialValue: null as ArNodeDetail | null },
  );

  readonly node      = computed(() => this.data()?.node ?? null);
  readonly ancestors = computed(() => this.data()?.ancestors ?? []);
  readonly children  = computed(() => this.data()?.node.children ?? []);
  readonly sources   = computed(() => this.data()?.sources ?? []);
  readonly unit      = computed(() => this.data()?.unit ?? null);

  /** The discipline slug the crumb links back to. GN:KLM nodes are shared
      between naḥw and ṣarf, so the row's own discipline column decides. */
  readonly disciplineSlug = computed(() => {
    const code = this.node()?.discipline ?? '';
    return ({ NH: 'nahw', SF: 'sarf', BL: 'balagha' } as Record<string, string>)[code] ?? '';
  });

  unitField(key: string): string | null {
    const u = this.unit();
    const v = u?.[key];
    return v === undefined || v === null ? null : String(v);
  }

  kindLabel(kind: string): string {
    const m: Record<string, string> = {
      fann: 'فنّ', qism: 'قسم', bab: 'باب', fasl: 'فصل', masala: 'مسألة',
    };
    return m[kind] ?? kind;
  }

  /** A YouTube link that starts at the cited moment rather than at 0:00. */
  sourceHref(s: { url: string | null; timestamp_s: number | null }): string | null {
    if (!s.url) return null;
    if (!s.timestamp_s) return s.url;
    const sep = s.url.includes('?') ? '&' : '?';
    return `${s.url}${sep}t=${s.timestamp_s}`;
  }

  stamp(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
}
