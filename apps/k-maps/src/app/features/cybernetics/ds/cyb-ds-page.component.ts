import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BackendApiService } from '../../../shared/services/backend-api.service';
import { CybDsSpecComponent } from './cyb-ds-spec.component';
import { CybDsReaderComponent } from './cyb-ds-reader.component';
import { normaliseSpec } from '@kmaps/contracts/ds';
import type { DisplaySpec, DsForm } from '@kmaps/contracts/ds';

@Component({
  selector: 'km-cyb-ds-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CybDsSpecComponent, CybDsReaderComponent, RouterLink],
  template: `
    <div class="bar">
      <a class="back" routerLink="/cybernetics/map">‹ Quran Map</a>
      <span class="sep"></span>
      <div class="forms">
        @for (f of forms; track f) {
          <button [class.on]="form() === f" (click)="setForm(f)">{{ f }}</button>
        }
      </div>
    </div>

    @if (error(); as e) {
      <p class="msg err">{{ e }}</p>
    } @else if (spec(); as s) {
      <!-- The desktop form gets the reader: chapter rail, one wide column, the
           whole root stacked down one page. The mobile form gets the plain
           renderer, because a sticky rail on a phone is a lie about how much
           screen there is. Both draw the same spec. -->
      @if (form() === 'desktop') {
        <km-ds-reader [spec]="s" />
      } @else {
        <km-ds-spec [spec]="s" />
      }
    } @else {
      <p class="msg">Reading {{ root() }}…</p>
    }
  `,
  styles: [`
    :host { display:block; padding:16px 0 80px; }
    .bar { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
    .back { color:var(--ink-soft); font-size:.82rem; text-decoration:none;
      padding:7px 12px; border-radius:9px; }
    .back:hover { background:var(--paper-2); color:var(--ink); }
    .sep { flex:1; }
    .forms { display:flex; gap:4px; padding:3px; border-radius:9px;
      background:var(--paper); border:1px solid var(--rule); }
    .forms button { font-family:ui-monospace,monospace; font-size:10px;
      padding:5px 12px; border:0; border-radius:6px; cursor:pointer;
      background:transparent; color:var(--t3); }
    .forms button.on { color:var(--bg);
      background:linear-gradient(180deg,var(--gold-b),var(--gold)); }
    .msg { padding:40px; text-align:center; color:var(--t3); font-size:13px; }
    .msg.err { color:var(--err); }
  `],
})
export class CybDsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(BackendApiService);

  readonly forms: DsForm[] = ['desktop', 'mobile'];
  readonly form = signal<DsForm>('desktop');
  readonly spec = signal<DisplaySpec | null>(null);
  readonly error = signal<string | null>(null);
  readonly root = computed(() => this.route.snapshot.paramMap.get('root') ?? '');

  constructor() {
    this.route.paramMap.subscribe(() => this.load());
  }

  setForm(f: DsForm) {
    if (this.form() === f) return;
    this.form.set(f);
    this.load();
  }

  private load() {
    const root = this.root();
    if (!root) return;
    this.spec.set(null);
    this.error.set(null);
    this.api
      .getData<DisplaySpec>('core', ['ds', 'root', root], { params: { form: this.form() } })
      .subscribe({

        next: (s) => this.spec.set(normaliseSpec(s)),

        error: (e) =>
          this.error.set(
            `Could not read the display spec for ${root}. ` +
            `If /core/ds is not deployed yet this is expected. (${String(e?.message ?? e)})`,
          ),
      });
  }
}
