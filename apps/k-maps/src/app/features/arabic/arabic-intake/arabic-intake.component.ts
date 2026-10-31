import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { ArabicApiService } from '../../../shared/services/arabic-api.service';

/// Everything on this screen — words, strand/level/status names, colours, counts —
/// comes from GET /ar/intake (workers/arabic/src/routes/intake.ts). The component
/// only renders it and sends the user's choices back.
interface Word { label: string; labelAr: string | null; detail: string | null; icon: string | null; }
interface Badge { key: string; label: string; labelAr: string | null; icon: string | null; color: string | null; }
interface Option extends Badge { detail: string | null; }
interface Strand extends Option { counts: { total: number; queued: number; logged: number }; countLine: string | null; countLineAr: string | null; }
/// One domain's place for an item: routed there (`on`), and how far that domain's pipeline has taken it.
interface DomainState { domain: Badge; on: boolean; stage: Badge | null; targetRef: string | null; }
interface Stage extends Option { count?: number; }
interface Pipeline { domain: Option; stages: Stage[]; }
interface Item {
  id: string; kind: string; url: string; title: string; titleEn: string | null; channel: string | null;
  subtitle: string | null; subtitleAr: string | null; seq: number | null; durationSec: number | null;
  priority: number; note: string | null; childCount: number; liveCount: number;
  strand: Badge; level: Badge; status: Badge; register: Badge; form: Badge; domains: DomainState[]; wvSourceRef: string | null; acqRefId: string | null; sent: boolean; createdAt: string;
}
interface Intake {
  words: Record<string, Word>; strands: Strand[]; levels: Option[]; statuses: Option[]; registers: Option[]; forms: Option[]; domains: Option[]; pipelines: Pipeline[];
  next: Item[]; items: Item[];
}
interface Detail { words: Record<string, Word>; pipelines: Pipeline[]; item: Item; children: Item[]; }
type FormKey = 'url' | 'note' | 'strand' | 'level' | 'priority' | 'register' | 'form';
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
  private readonly ar = inject(ArabicApiService);
  private readonly base = 'ar/intake';

  readonly loading = signal(true);
  readonly data = signal<Intake | null>(null);
  readonly error = signal<string | null>(null);

  // filters
  readonly strand = signal('');
  readonly level = signal('');
  readonly status = signal('');
  readonly formF = signal('');
  readonly domainF = signal('');
  readonly q = signal('');

  // log form
  readonly form = signal({ url: '', note: '', strand: '', level: '', priority: '', register: '', form: '' });
  /// domains the new item is routed to; empty until the user picks (the worker then defaults it)
  readonly formDomains = signal<string[]>([]);
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
    for (const [k, v] of [['strand', this.strand()], ['level', this.level()], ['status', this.status()], ['form', this.formF()], ['domain', this.domainF()], ['q', this.q().trim()]])
      if (v) params = params.set(k, v);
    this.loading.set(true);
    this.ar.get<Envelope<Intake>>(this.base, { params }).subscribe({
      next: (res) => { this.data.set(res?.data ?? null); this.error.set(null); this.loading.set(false); },
      error: (e: HttpErrorResponse) => { this.error.set(this.message(e)); this.loading.set(false); },
    });
  }

  w(key: string): Word | null { return this.data()?.words?.[key] ?? null; }

  setStrand(k: string): void { this.strand.set(this.strand() === k ? '' : k); this.load(); }
  setLevel(k: string): void { this.level.set(k); this.load(); }
  setStatus(k: string): void { this.status.set(k); this.load(); }
  setFormFilter(k: string): void { this.formF.set(k); this.load(); }
  setDomain(k: string): void { this.domainF.set(this.domainF() === k ? '' : k); this.load(); }
  search(): void { this.load(); }

  patchForm(k: FormKey, v: string): void { this.form.update((f) => ({ ...f, [k]: v })); }

  toggleFormDomain(k: string): void {
    this.formDomains.update((ds) => (ds.includes(k) ? ds.filter((x) => x !== k) : [...ds, k]));
  }

  save(): void {
    const f = this.form();
    if (!f.url.trim() || this.saving()) return;
    const body: Record<string, unknown> = { url: f.url.trim() };
    if (f.note.trim()) body['note'] = f.note.trim();
    if (f.strand) body['strand'] = f.strand;
    if (f.level) body['level'] = f.level;
    if (f.register) body['register'] = f.register;
    if (f.form) body['form'] = f.form;
    if (this.formDomains().length) body['domains'] = this.formDomains();
    if (f.priority) body['priority'] = Number(f.priority);
    this.saving.set(true);
    this.formError.set(null);
    this.ar.post<Envelope<Item>>(this.base, body).subscribe({
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
    this.patchError.set(null);
    this.fetchDetail(it.id);
  }

  /// (Re)load the opened item. Clearing first re-renders the controls, so a refused change
  /// (409/400) snaps the checkboxes and selects back to what the server holds.
  private fetchDetail(id: string): void {
    this.detail.set(null);
    this.detailLoading.set(true);
    this.ar.get<Envelope<Detail>>(`${this.base}/${encodeURIComponent(id)}`).subscribe({
      next: (res) => { if (this.openId() === id) this.detail.set(res?.data ?? null); this.detailLoading.set(false); },
      error: (e: HttpErrorResponse) => { this.patchError.set(this.message(e)); this.detailLoading.set(false); },
    });
  }

  change(it: Item, field: 'status' | 'strand' | 'level' | 'priority' | 'form', value: string): void {
    this.patch(it, { [field]: field === 'priority' ? Number(value) : value });
  }

  /// Route the item to / away from one domain; the worker refuses (409) un-routing a domain that has started.
  toggleDomain(it: Item, key: string): void {
    const on = it.domains.filter((x) => x.on).map((x) => x.domain.key);
    this.patch(it, { domains: on.includes(key) ? on.filter((k) => k !== key) : [...on, key] });
  }

  /// Move the item to a stage in one domain's own pipeline.
  setStage(it: Item, domain: string, stage: string): void {
    this.patch(it, { stage: { domain, stage } });
  }

  /// The stages a domain's pipeline offers (from the detail's `pipelines`).
  stagesFor(dt: Detail, domain: string): Stage[] {
    return dt.pipelines.find((p) => p.domain.key === domain)?.stages ?? [];
  }

  private patch(it: Item, body: Record<string, unknown>): void {
    this.patchError.set(null);
    this.ar.patch<Envelope<Item>>(`${this.base}/${encodeURIComponent(it.id)}`, body).subscribe({
      next: (res) => {
        const fresh = res?.data;
        if (fresh) this.detail.update((d) => (d && d.item.id === fresh.id ? { ...d, item: fresh } : d));
        this.load();
      },
      error: (e: HttpErrorResponse) => { this.patchError.set(this.message(e)); this.fetchDetail(it.id); },
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
