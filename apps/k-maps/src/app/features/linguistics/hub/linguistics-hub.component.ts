import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';
import { LinguisticsApiService, GramGroup } from '../../../shared/services/linguistics-api.service';

@Component({
  selector: 'km-linguistics-hub',
  standalone: true,
  imports: [RouterLink, BackButtonComponent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lh">
      <header class="lh__top">
        <km-back-button route="/home" label="Home" />
        <form class="lh__search" (submit)="runSearch($event)">
          <span class="lh__search-ic">⌕</span>
          <input #q type="search" placeholder="ابحث في النصوص… — search the corpus"
                 aria-label="Search grammar corpus" />
        </form>
      </header>

      <div class="lh__hero">
        <div class="lh__eyebrow">علوم العربية · Classical Arabic Sciences</div>
        <h1 class="lh__title">Linguistics</h1>
        <p class="lh__sub">Verbatim primary texts of <b>ṣarf</b>, <b>naḥw</b> &amp; <b>balāgha</b>
          — {{ totalBooks() }} authority books, page-anchored and fully searchable.</p>
      </div>

      @if (loading()) {
        <div class="lh__state">Loading the library…</div>
      } @else if (error()) {
        <div class="lh__state lh__state--err">{{ error() }}</div>
      } @else {
        @for (g of groups(); track g.discipline) {
          <section class="lh__disc" [attr.data-disc]="g.discipline">
            <div class="lh__disc-head">
              <span class="lh__disc-ar">{{ g.label.ar }}</span>
              <span class="lh__disc-en">{{ g.label.en }}</span>
              <span class="lh__disc-meta">{{ g.book_count }} books · {{ g.page_count | number }} pages</span>
            </div>
            <div class="lh__grid">
              @for (b of g.books; track b.slug) {
                <a class="bk" [routerLink]="['/linguistics/book', b.slug]">
                  <div class="bk__spine"></div>
                  <div class="bk__body">
                    <div class="bk__title" dir="rtl">{{ b.title_ar }}</div>
                    <div class="bk__author" dir="rtl">{{ b.author }}@if (b.death_ah) {<span class="bk__death"> · ت {{ b.death_ah }}هـ</span>}</div>
                    <div class="bk__stats">
                      <span>{{ b.bab_count | number }} أبواب</span>
                      <span>{{ b.page_count | number }} ص</span>
                      @if (b.volumes && b.volumes > 1) {<span>{{ b.volumes }} مج</span>}
                    </div>
                  </div>
                  <span class="bk__go">‹</span>
                </a>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: [`
    :host{ --lh-bg:#16150f; --lh-paper:#201e17; --lh-ink:#ece3c9; --lh-ink-soft:#a99f82;
      --lh-rule:#39352a; --gold:#c9a84c; --gold-hi:#e8c96a;
      --sf:#5bbf95; --nh:#d8b657; --bl:#d98a8a;
      display:block; min-height:100vh; color:var(--lh-ink);
      background:radial-gradient(120% 80% at 82% -10%, rgba(201,168,76,.10), transparent 60%), var(--lh-bg);
      font-family:'Poppins',system-ui,sans-serif; }
    .lh{ max-width:1080px; margin:0 auto; padding:20px 22px 80px; }
    .lh__top{ display:flex; align-items:center; gap:16px; }
    .lh__search{ flex:1; display:flex; align-items:center; gap:8px; background:var(--lh-paper);
      border:1px solid var(--lh-rule); border-radius:999px; padding:8px 16px; max-width:440px; margin-inline-start:auto; }
    .lh__search-ic{ color:var(--gold); font-size:18px; }
    .lh__search input{ flex:1; background:none; border:0; color:var(--lh-ink); font-size:14px; outline:none; }
    .lh__search input::placeholder{ color:var(--lh-ink-soft); }
    .lh__hero{ padding:34px 0 26px; border-bottom:1px solid var(--lh-rule); margin-bottom:26px; }
    .lh__eyebrow{ font-family:'Amiri','Scheherazade New',serif; color:var(--gold); letter-spacing:.04em; font-size:15px; }
    .lh__title{ font-family:'Cinzel',serif; font-size:clamp(30px,5vw,46px); margin:6px 0 8px; color:var(--gold-hi);
      font-weight:600; letter-spacing:.02em; }
    .lh__sub{ color:var(--lh-ink-soft); max-width:640px; line-height:1.6; margin:0; }
    .lh__sub b{ color:var(--lh-ink); font-weight:600; }
    .lh__state{ padding:60px 0; text-align:center; color:var(--lh-ink-soft); }
    .lh__state--err{ color:var(--bl); }
    .lh__disc{ margin:34px 0; }
    .lh__disc-head{ display:flex; align-items:baseline; gap:12px; padding-bottom:10px; margin-bottom:16px;
      border-bottom:1px solid var(--lh-rule); }
    .lh__disc-ar{ font-family:'Amiri','Scheherazade New',serif; font-size:26px;
      color:var(--accent); }
    .lh__disc[data-disc=SF]{ --accent:var(--sf); } .lh__disc[data-disc=NH]{ --accent:var(--nh); } .lh__disc[data-disc=BL]{ --accent:var(--bl); }
    .lh__disc-en{ font-family:'Cinzel',serif; text-transform:uppercase; letter-spacing:.14em; font-size:12px; color:var(--lh-ink-soft); }
    .lh__disc-meta{ margin-inline-start:auto; font-size:12px; color:var(--lh-ink-soft); }
    .lh__grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
    .bk{ position:relative; display:flex; gap:0; text-decoration:none; color:inherit; background:var(--lh-paper);
      border:1px solid var(--lh-rule); border-radius:12px; overflow:hidden; transition:transform .16s ease, border-color .16s ease, box-shadow .16s ease; }
    .bk:hover{ transform:translateY(-2px); border-color:var(--accent); box-shadow:0 8px 26px rgba(0,0,0,.35); }
    .bk__spine{ width:6px; background:linear-gradient(var(--accent), color-mix(in srgb, var(--accent) 55%, #000)); flex:0 0 6px; }
    .bk__body{ padding:14px 16px; flex:1; min-width:0; }
    .bk__title{ font-family:'Amiri','Scheherazade New',serif; font-size:21px; line-height:1.35; color:var(--lh-ink);
      unicode-bidi:plaintext; }
    .bk__author{ font-family:'Amiri','Scheherazade New',serif; font-size:15px; color:var(--lh-ink-soft); margin-top:3px; unicode-bidi:plaintext; }
    .bk__death{ opacity:.85; }
    .bk__stats{ display:flex; gap:12px; margin-top:10px; font-family:'Amiri',serif; font-size:13px; color:var(--accent); }
    .bk__go{ align-self:center; padding-inline:12px; color:var(--lh-ink-soft); font-size:22px; transition:color .16s ease; }
    .bk:hover .bk__go{ color:var(--accent); }
  `],
})
export class LinguisticsHubComponent {
  private readonly api = inject(LinguisticsApiService);
  private readonly router = inject(Router);

  readonly groups = signal<GramGroup[]>([]);
  readonly totalBooks = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.api.getBooks().subscribe({
      next: (r) => { this.groups.set(r.groups.filter(g => g.books.length)); this.totalBooks.set(r.total_books); this.loading.set(false); },
      error: () => { this.error.set('Could not load the corpus.'); this.loading.set(false); },
    });
  }

  runSearch(ev: Event): void {
    ev.preventDefault();
    const input = (ev.target as HTMLFormElement).querySelector('input') as HTMLInputElement;
    const q = input.value.trim();
    if (q.length >= 2) this.router.navigate(['/linguistics/search'], { queryParams: { q } });
  }
}
