import { DestroyRef, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';
import { LinguisticsApiService, GramSearchHit, Discipline } from '../../../shared/services/linguistics-api.service';
import { LatestRequest } from '../../../shared/utils/latest-request';

interface Seg { t: string; hit: boolean; }

@Component({
  selector: 'km-linguistics-search',
  standalone: true,
  imports: [RouterLink, BackButtonComponent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sr">
      <header class="sr__top">
        <km-back-button route="/linguistics" label="Linguistics" />
        <form class="sr__box" (submit)="submit($event)">
          <span class="sr__ic">⌕</span>
          <input #q type="search" [value]="query()" placeholder="ابحث… — search ṣarf · naḥw · balāgha" aria-label="Search" />
        </form>
      </header>

      <div class="sr__filters">
        <button [class.on]="!disc()" (click)="setDisc(null)">All</button>
        <button class="sf" [class.on]="disc()==='SF'" (click)="setDisc('SF')">الصرف</button>
        <button class="nh" [class.on]="disc()==='NH'" (click)="setDisc('NH')">النحو</button>
        <button class="bl" [class.on]="disc()==='BL'" (click)="setDisc('BL')">البلاغة</button>
      </div>

      @if (loading()) { <div class="sr__state">Searching…</div> }
      @else if (query() && !results().length) { <div class="sr__state">No matches for “{{ query() }}”.</div> }
      @else if (results().length) {
        <div class="sr__count">{{ results().length | number }} passages · “{{ query() }}”</div>
        <div class="sr__list">
          @for (r of results(); track r.id) {
            <a class="hit" [attr.data-disc]="r.discipline" [routerLink]="['/linguistics/book', r.source_slug]">
              <div class="hit__meta">
                <span class="hit__disc">{{ r.discipline_label.ar }}</span>
                <span lang="ar" class="hit__book" dir="rtl">{{ r.title_ar }}</span>
                <span class="hit__page">{{ r.volume_no ? 'ج'+r.volume_no+' · ' : '' }}ص {{ r.page_no }}</span>
              </div>
              <div lang="ar" class="hit__snip" dir="rtl">
                @for (s of parse(r.snippet); track $index) {
                  @if (s.hit) { <mark>{{ s.t }}</mark> } @else { <span>{{ s.t }}</span> }
                }
              </div>
            </a>
          }
        </div>
      } @else {
        <div class="sr__hint">Search the full text of all 21,319 pages across ṣarf, naḥw &amp; balāgha.</div>
      }
    </div>
  `,
  styles: [`
    :host{ --bg:#16150f; --paper:#201e17; --ink:#ece3c9; --ink-soft:#a99f82; --rule:#39352a;
      --gold:#c9a84c; --sf:#5bbf95; --nh:#d8b657; --bl:#d98a8a;
      display:block; min-height:100vh; color:var(--ink);
      background:radial-gradient(120% 70% at 85% -10%, rgba(201,168,76,.08), transparent 55%), var(--bg);
      font-family:'Poppins',system-ui,sans-serif; }
    .sr{ max-width:820px; margin:0 auto; padding:16px 22px 80px; }
    .sr__top{ display:flex; align-items:center; gap:16px; }
    .sr__box{ flex:1; display:flex; align-items:center; gap:8px; background:var(--paper); border:1px solid var(--rule);
      border-radius:999px; padding:10px 18px; }
    .sr__ic{ color:var(--gold); font-size:18px; }
    .sr__box input{ flex:1; background:none; border:0; color:var(--ink); font-size:15px; outline:none; }
    .sr__box input::placeholder{ color:var(--ink-soft); }
    .sr__filters{ display:flex; gap:8px; margin:18px 0 6px; flex-wrap:wrap; }
    .sr__filters button{ background:var(--paper); border:1px solid var(--rule); color:var(--ink-soft); border-radius:999px;
      padding:6px 16px; cursor:pointer; font-family:var(--km-font-arabic-ui); font-size:15px; }
    .sr__filters button.on{ color:#16150f; background:var(--gold); border-color:var(--gold); }
    .sr__filters .sf.on{ background:var(--sf); border-color:var(--sf); } .sr__filters .nh.on{ background:var(--nh); border-color:var(--nh); } .sr__filters .bl.on{ background:var(--bl); border-color:var(--bl); }
    .sr__state,.sr__hint{ padding:44px 0; text-align:center; color:var(--ink-soft); }
    .sr__count{ font-family:'Cinzel',serif; font-size:12px; letter-spacing:.05em; color:var(--ink-soft); margin:16px 0 12px; }
    .sr__list{ display:flex; flex-direction:column; gap:10px; }
    .hit{ display:block; text-decoration:none; color:inherit; background:var(--paper); border:1px solid var(--rule);
      border-inline-start:3px solid var(--accent,var(--gold)); border-radius:10px; padding:14px 16px; transition:border-color .16s ease, transform .12s ease; }
    .hit[data-disc=SF]{ --accent:var(--sf); } .hit[data-disc=NH]{ --accent:var(--nh); } .hit[data-disc=BL]{ --accent:var(--bl); }
    .hit:hover{ transform:translateY(-1px); border-color:var(--accent); }
    .hit__meta{ display:flex; gap:10px; align-items:baseline; font-size:12px; color:var(--ink-soft); margin-bottom:6px; }
    .hit__disc{ font-family:var(--km-font-arabic-ui); font-size:15px; color:var(--accent); }
    .hit__book{ font-family:var(--km-font-arabic-ui); font-size:15px; color:var(--ink); unicode-bidi:plaintext; }
    .hit__page{ margin-inline-start:auto; font-family:'Cinzel',serif; }
    .hit__snip{ font-family:var(--km-font-arabic-ui); font-size:19px; line-height:1.9; color:var(--ink-soft); unicode-bidi:plaintext; }
    .hit__snip mark{ background:color-mix(in srgb, var(--accent) 30%, transparent); color:var(--ink); border-radius:3px; padding:0 2px; }
  `],
})
export class LinguisticsSearchComponent {
  private readonly latest = new LatestRequest(inject(DestroyRef));
  private readonly api = inject(LinguisticsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly query = signal('');
  readonly disc = signal<Discipline | null>(null);
  readonly results = signal<GramSearchHit[]>([]);
  readonly loading = signal(false);

  constructor() {
    this.route.queryParamMap.subscribe(p => {
      const q = p.get('q') ?? '';
      this.query.set(q);
      if (q.length >= 2) this.run();
    });
  }

  submit(ev: Event): void {
    ev.preventDefault();
    const input = (ev.target as HTMLFormElement).querySelector('input') as HTMLInputElement;
    const q = input.value.trim();
    if (q.length >= 2) this.router.navigate([], { queryParams: { q }, queryParamsHandling: 'merge' });
  }

  setDisc(d: Discipline | null): void { this.disc.set(d); if (this.query().length >= 2) this.run(); }

  private run(): void {
    this.loading.set(true);
    this.latest.run('search', this.api.search(this.query(), { discipline: this.disc() ?? undefined, limit: 40 }), {
      next: (r) => { this.results.set(r.results); this.loading.set(false); },
      error: () => { this.results.set([]); this.loading.set(false); },
    });
  }

  parse(snippet: string): Seg[] {
    const out: Seg[] = [];
    const re = /‹mark›(.*?)‹\/mark›/g;
    let last = 0, m: RegExpExecArray | null;
    while ((m = re.exec(snippet))) {
      if (m.index > last) out.push({ t: snippet.slice(last, m.index), hit: false });
      out.push({ t: m[1], hit: true });
      last = re.lastIndex;
    }
    if (last < snippet.length) out.push({ t: snippet.slice(last), hit: false });
    return out;
  }
}
