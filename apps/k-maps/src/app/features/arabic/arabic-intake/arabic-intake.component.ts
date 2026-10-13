import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

/// Everything on this screen — words, strand/level/status names, colours, counts —
/// comes from GET /ar/intake (workers/arabic/src/routes/intake.ts). The component
/// only renders it and sends the user's choices back.
interface Word { label: string; labelAr: string | null; detail: string | null; icon: string | null; }
interface Badge { key: string; label: string; labelAr: string | null; icon: string | null; color: string | null; }
interface Option extends Badge { detail: string | null; }
interface Strand extends Option { counts: { total: number; live: number; logged: number }; }
interface Item {
  id: string; kind: string; url: string; title: string; titleEn: string | null; channel: string | null;
  subtitle: string | null; subtitleAr: string | null; seq: number | null; durationSec: number | null;
  priority: number; note: string | null; childCount: number; liveCount: number;
  strand: Badge; level: Badge; status: Badge; register: Badge; acqRefId: string | null; sent: boolean; createdAt: string;
}
interface Intake {
  words: Record<string, Word>; strands: Strand[]; levels: Option[]; statuses: Option[]; registers: Option[];
  next: Item[]; items: Item[];
}
interface Detail { words: Record<string, Word>; item: Item; children: Item[]; }
type FormKey = 'url' | 'note' | 'strand' | 'level' | 'priority' | 'register';
interface Envelope<T> { ok: boolean; data?: T; error?: { code: string; message: string }; }

@Component({
  selector: 'km-arabic-intake',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './arabic-intake.component.html',
  styleUrl: './arabic-intake.component.scss',
})
export class ArabicIntakeComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/ar/intake`;

  readonly loading = signal(true);
  readonly data = signal<Intake | null>(null);
  readonly error = signal<string | null>(null);

  // filters
  readonly strand = signal('');
  readonly level = signal('');
  readonly status = signal('');
  readonly q = signal('');

  // log form
  readonly form = signal({ url: '', note: '', strand: '', level: '', priority: '', register: '' });
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  // opened item
  readonly openId = signal<string | null>(null);
  readonly detail = signal<Detail | null>(null);
  readonly detailLoading = signal(false);
  readonly patchError = signal<string | null>(null);

  readonly priorities = [1, 2, 3, 4, 5];

  ngOnInit(): void { this.load(); }

  load(): void {
    let params = new HttpParams();
    for (const [k, v] of [['strand', this.strand()], ['level', this.level()], ['status', this.status()], ['q', this.q().trim()]])
      if (v) params = params.set(k, v);
    this.loading.set(true);
    this.http.get<Envelope<Intake>>(this.base, { params }).subscribe({
      next: (res) => { this.data.set(res?.data ?? null); this.error.set(null); this.loading.set(false); },
      error: (e: HttpErrorResponse) => { this.error.set(this.message(e)); this.loading.set(false); },
    });
  }

  w(key: string): Word | null { return this.data()?.words?.[key] ?? null; }

  setStrand(k: string): void { this.strand.set(this.strand() === k ? '' : k); this.load(); }
  setLevel(k: string): void { this.level.set(k); this.load(); }
  setStatus(k: string): void { this.status.set(k); this.load(); }
  search(): void { this.load(); }

  patchForm(k: FormKey, v: string): void { this.form.update((f) => ({ ...f, [k]: v })); }

  save(): void {
    const f = this.form();
    if (!f.url.trim() || this.saving()) return;
    const body: Record<string, unknown> = { url: f.url.trim() };
    if (f.note.trim()) body['note'] = f.note.trim();
    if (f.strand) body['strand'] = f.strand;
    if (f.level) body['level'] = f.level;
    if (f.register) body['register'] = f.register;
    if (f.priority) body['priority'] = Number(f.priority);
    this.saving.set(true);
    this.formError.set(null);
    this.http.post<Envelope<Item>>(this.base, body).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.update((x) => ({ ...x, url: '', note: '' }));
        this.load();
      },
      error: (e: HttpErrorResponse) => { this.saving.set(false); this.formError.set(this.message(e)); },
    });
  }

  open(it: Item): void {
    if (this.openId() === it.id) { this.openId.set(null); this.detail.set(null); return; }
    this.openId.set(it.id);
    this.detail.set(null);
    this.patchError.set(null);
    this.detailLoading.set(true);
    this.http.get<Envelope<Detail>>(`${this.base}/${encodeURIComponent(it.id)}`).subscribe({
      next: (res) => { this.detail.set(res?.data ?? null); this.detailLoading.set(false); },
      error: (e: HttpErrorResponse) => { this.patchError.set(this.message(e)); this.detailLoading.set(false); },
    });
  }

  change(it: Item, field: 'status' | 'strand' | 'level' | 'priority', value: string): void {
    const body = { [field]: field === 'priority' ? Number(value) : value };
    this.patchError.set(null);
    this.http.patch<Envelope<Item>>(`${this.base}/${encodeURIComponent(it.id)}`, body).subscribe({
      next: (res) => {
        const fresh = res?.data;
        if (fresh) this.detail.update((d) => (d && d.item.id === fresh.id ? { ...d, item: fresh } : d));
        this.load();
      },
      error: (e: HttpErrorResponse) => this.patchError.set(this.message(e)),
    });
  }

  /// The worker's own error text (e.g. the 409 duplicate message) is the user-facing text.
  private message(e: HttpErrorResponse): string {
    return (e.error as Envelope<unknown> | null)?.error?.message ?? e.message;
  }

  duration(sec: number | null): string {
    if (!sec) return '';
    const m = Math.floor(sec / 60), s = Math.round(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  goBack(): void { this.router.navigate(['/arabic']); }
}
