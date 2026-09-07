import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

/// A capture is a photograph that was read by machine and by nobody else. The
/// Arabic in it is tesseract's guess, and until a person says otherwise it must
/// not reach a card.
interface Capture {
  id: string;
  channel: string;
  origin: string;
  media_ref: string;
  raw_text: string;
  register: string | null;
  status: string;
  bucket: string | null;
  lines: number | null;
  engine: string | null;
  items: number;
}

interface Envelope<T> { ok: boolean; data?: T; error?: unknown; }

@Component({
  selector: 'km-arabic-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './arabic-review.component.html',
  styleUrl: './arabic-review.component.scss',
})
export class ArabicReviewComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private readonly base = environment.apiBase;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly captures = signal<Capture[]>([]);
  readonly index = signal(0);
  readonly draft = signal('');
  readonly done = signal(0);

  readonly current = computed(() => this.captures()[this.index()] ?? null);
  readonly remaining = computed(() => Math.max(this.captures().length - this.index(), 0));
  readonly dirty = computed(() => {
    const c = this.current();
    return !!c && this.draft() !== c.raw_text;
  });

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.http
      .get<Envelope<{ captures: Capture[] }>>(`${this.base}/ar/acq/review?limit=50`)
      .subscribe({
        next: (res) => {
          const rows = res?.data?.captures ?? [];
          this.captures.set(rows);
          this.index.set(0);
          this.draft.set(rows[0]?.raw_text ?? '');
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  /// Accept what is on screen. If the text was edited it is saved with it —
  /// correcting and accepting are one action, because they are one decision.
  accept(): void { this.settle('reviewed'); }

  /// Not usable: unreadable, or nothing worth keeping. Recorded, not deleted.
  discard(): void { this.settle('discarded'); }

  private settle(status: 'reviewed' | 'discarded'): void {
    const c = this.current();
    if (!c || this.saving()) return;
    this.saving.set(true);

    const body: Record<string, unknown> = { status };
    if (this.dirty()) body['rawText'] = this.draft();

    this.http.patch<Envelope<unknown>>(`${this.base}/ar/acq/captures/${c.id}`, body).subscribe({
      next: () => { this.done.update((n) => n + 1); this.advance(); },
      // A failed save must not look like a success: stay on the capture.
      error: () => this.saving.set(false),
    });
  }

  skip(): void { this.advance(); }

  private advance(): void {
    this.saving.set(false);
    const next = this.index() + 1;
    if (next >= this.captures().length) { this.load(); return; }
    this.index.set(next);
    this.draft.set(this.captures()[next]?.raw_text ?? '');
  }

  onDraft(value: string): void { this.draft.set(value); }

  /// The photographs deliberately live on disk and are never uploaded, so there
  /// is nothing to show — only the path, for when the original must be opened.
  get filename(): string {
    const ref = this.current()?.media_ref ?? '';
    return ref.split('/').pop() ?? ref;
  }

  goBack(): void { this.router.navigate(['/arabic']); }
}
