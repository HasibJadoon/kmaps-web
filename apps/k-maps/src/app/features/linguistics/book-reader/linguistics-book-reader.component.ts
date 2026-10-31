import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subscription, catchError, distinctUntilChanged, map, switchMap, tap } from 'rxjs';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';
import {
  LinguisticsApiService, GramBab, GramBookMeta, GramPage, GramSearchHit,
} from '../../../shared/services/linguistics-api.service';

interface FlatBab {
  id: string; title_ar: string; depth: number;
  volume_no: number | null; page_start: number | null;
  /// > 0 when this heading has its own headings still to be fetched.
  kids?: number;
  open?: boolean;
}

@Component({
  selector: 'km-linguistics-book-reader',
  standalone: true,
  imports: [BackButtonComponent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rd" [class.fs-sm]="fs()==='sm'" [class.fs-lg]="fs()==='lg'" [attr.data-disc]="book()?.genre">
      <header class="rd__top">
        <km-back-button route="/linguistics" label="Linguistics" />
        <div lang="ar" class="rd__id" dir="rtl">
          <div class="rd__title">{{ book()?.title_ar }}</div>
          <div class="rd__author">{{ book()?.author_name }}@if (book()?.author_death_ah) { · ت {{ book()?.author_death_ah }}هـ}</div>
        </div>
        <div class="rd__tools">
          <button (click)="setFs('sm')" [class.on]="fs()==='sm'" title="Smaller">A−</button>
          <button (click)="setFs('md')" [class.on]="fs()==='md'" title="Default">A</button>
          <button (click)="setFs('lg')" [class.on]="fs()==='lg'" title="Larger">A＋</button>
        </div>
      </header>

      <div class="rd__body">
        <aside class="rd__rail" [class.open]="railOpen()">
          <div class="rd__rail-head">الأبواب <span>{{ lazySpine() ? levelCount() : flat().length }}</span></div>

          <div class="rd__find">
            <input lang="ar" #qbox dir="rtl" [value]="q()" placeholder="ابحث في الكتاب…"
                   (input)="q.set(qbox.value)" (keydown.enter)="runSearch()"
                   aria-label="Search this book" />
            @if (q()) { <button class="rd__find-x" (click)="clearSearch(); qbox.value=''" title="Clear">×</button> }
            <button class="rd__find-go" (click)="runSearch()" [disabled]="q().trim().length < 2">بحث</button>
          </div>

          @if (searching()) { <div class="rd__find-note">…</div> }
          @else if (searched()) {
            <div class="rd__find-note">{{ hits().length }} نتيجة</div>
            <nav class="rd__hits">
              @for (h of hits(); track h.id) {
                <button lang="ar" class="hit" (click)="openHit(h)" dir="rtl">
                  <span class="hit__s">@for (seg of segs(h.snippet); track $index) {@if (seg.hit) {<mark>{{ seg.t }}</mark>} @else {{{ seg.t }}}}</span>
                  <span class="hit__p">{{ h.volume_no ? 'ج'+h.volume_no+'/' : '' }}{{ h.page_no }}</span>
                </button>
              }
              @if (hits().length === 0) { <div class="rd__find-note">لا نتائج</div> }
            </nav>
          }
          @else {
          <nav class="rd__tree">
            <button class="tw all" [class.active]="!activeBab()" (click)="showAll()">كل الكتاب · Full text</button>
            @for (n of flat(); track n.id) {
              <button lang="ar" class="tw" [class.active]="activeBab()===n.id" [style.--d]="n.depth"
                      [class.lead]="n.depth===0" (click)="openBab(n)" dir="rtl">
                @if (n.kids) { <span class="tw__k">{{ n.open ? '−' : '+' }}</span> }
                <span class="tw__t">{{ n.title_ar }}</span>
                @if (n.page_start) { <span class="tw__p">{{ n.volume_no ? 'ج'+n.volume_no+'/' : '' }}{{ n.page_start }}</span> }
              </button>
            }
            @if (lazySpine() && flat().length < levelCount()) {
              <button lang="ar" class="tw more" (click)="moreSpine()" [disabled]="loadingSpine()" dir="rtl">
                {{ loadingSpine() ? '…' : 'المزيد — ' + (levelCount() - flat().length) }}
              </button>
            }
          </nav>
          }
        </aside>

        <button class="rd__rail-toggle" (click)="railOpen.set(!railOpen())">☰ الأبواب</button>

        <main class="rd__main">
          @if (activeTitle()) { <div lang="ar" class="rd__crumb" dir="rtl">{{ activeTitle() }}</div> }
          @if (loading()) { <div class="rd__state">Loading…</div> }
          @for (p of pages(); track p.id) {
            <article class="pg">
              <div class="pg__marker">{{ p.volume_no ? 'ج'+p.volume_no+' · ' : '' }}ص {{ p.page_no }}</div>
              <div lang="ar" class="pg__text" dir="rtl">
                @for (ln of lines(p.text_ar); track $index) { <p>{{ ln }}</p> }
              </div>
              @if (p.footnotes_ar) {
                <div lang="ar" class="pg__fn" dir="rtl">
                  @for (ln of lines(p.footnotes_ar); track $index) { <p>{{ ln }}</p> }
                </div>
              }
            </article>
          }
          @if (!loading() && pages().length===0) { <div class="rd__state">No pages.</div> }
          @if (hasMore()) {
            <button class="rd__more" (click)="loadMore()" [disabled]="loadingMore()">
              {{ loadingMore() ? '…' : 'المزيد · Load more' }} ({{ shown() | number }} / {{ total() | number }})
            </button>
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host{ --bg:#16150f; --paper:#201e17; --ink:#ece3c9; --ink-soft:#a99f82; --rule:#39352a;
      --gold:#c9a84c; --sf:#5bbf95; --nh:#d8b657; --bl:#d98a8a; --accent:var(--nh);
      display:block; min-height:100vh; color:var(--ink);
      background:radial-gradient(120% 70% at 85% -10%, rgba(201,168,76,.08), transparent 55%), var(--bg);
      font-family:'Poppins',system-ui,sans-serif; }
    [data-disc=sarf]{ --accent:var(--sf); } [data-disc=nahw]{ --accent:var(--nh); } [data-disc=balagha]{ --accent:var(--bl); }
    /* km-back-button is position:fixed, so it is OUT OF FLOW and the flex row
       reserves no space for it — the title was painting on top of the button
       (button 16→152px, title starting at 20px). Reserve its width explicitly. */
    .rd__top{ position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:16px;
      padding:12px 20px 12px calc(16px + 136px + 20px);
      background:rgba(22,21,15,.92); backdrop-filter:blur(8px); border-bottom:1px solid var(--rule); }
    .rd__id{ min-width:0; flex:1; }
    .rd__title, .rd__author{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .rd__title{ font-family:var(--km-font-arabic-ui); font-size:22px; color:var(--ink); line-height:1.2; unicode-bidi:plaintext; }
    .rd__author{ font-family:var(--km-font-arabic-ui); font-size:14px; color:var(--ink-soft); unicode-bidi:plaintext; }
    .rd__tools{ margin-inline-start:auto; display:flex; gap:4px; }
    .rd__tools button{ background:var(--paper); border:1px solid var(--rule); color:var(--ink-soft); border-radius:8px;
      width:34px; height:32px; cursor:pointer; font-family:'Cinzel',serif; }
    .rd__tools button.on{ color:var(--accent); border-color:var(--accent); }
    /* RTL book -> the أبواب rail sits on the RIGHT. Everything here uses logical
       properties (border-inline-end, inset-inline-start), so direction:rtl flips
       the rail, its rule and the mobile drawer together. */
    .rd__body{ display:grid; grid-template-columns:320px 1fr; gap:0; direction:rtl; }
    .rd__rail{ border-inline-end:1px solid var(--rule); height:calc(100vh - 57px); position:sticky; top:57px; overflow:auto; padding:14px 10px 40px; }
    .rd__rail-head{ font-family:'Cinzel',serif; letter-spacing:.1em; text-transform:uppercase; font-size:11px;
      color:var(--ink-soft); padding:6px 8px 10px; display:flex; justify-content:space-between; }
    .rd__rail-head span{ color:var(--accent); }
    .rd__tree{ display:flex; flex-direction:column; gap:1px; }
    .tw{ text-align:start; background:none; border:0; color:var(--ink-soft); cursor:pointer;
      padding:6px 8px 6px calc(8px + var(--d,0) * 14px); border-radius:7px; display:flex; gap:8px; align-items:baseline;
      font-family:var(--km-font-arabic-ui); font-size:16px; line-height:1.4; }
    .tw:hover{ background:rgba(201,168,76,.08); color:var(--ink); }
    .tw.active{ background:color-mix(in srgb, var(--accent) 16%, transparent); color:var(--ink); }
    .tw.lead{ color:var(--ink); font-weight:600; }
    .tw.all{ font-family:'Cinzel',serif; font-size:12px; letter-spacing:.06em; color:var(--accent); margin-bottom:6px; }
    .tw__t{ flex:1; } .tw__p{ font-size:11px; color:var(--ink-soft); font-family:'Poppins',sans-serif; }
    .rd__rail-toggle{ display:none; }
    .rd__find{ display:flex; gap:6px; padding:0 8px 10px; }
    .rd__find input{ flex:1; min-width:0; background:var(--paper); border:1px solid var(--rule); border-radius:8px;
      color:var(--ink); padding:7px 10px; font-family:var(--km-font-arabic-ui); font-size:15px; }
    .rd__find input:focus{ outline:none; border-color:var(--accent); }
    .rd__find-go{ background:var(--paper); border:1px solid var(--rule); border-radius:8px; color:var(--ink-soft);
      padding:0 10px; cursor:pointer; font-family:var(--km-font-arabic-ui); font-size:14px; }
    .rd__find-go:disabled{ opacity:.45; cursor:default; }
    .rd__find-go:not(:disabled):hover{ border-color:var(--accent); color:var(--accent); }
    .rd__find-x{ background:none; border:0; color:var(--ink-soft); cursor:pointer; font-size:18px; line-height:1; padding:0 2px; }
    .rd__find-note{ padding:2px 10px 8px; font-size:11px; color:var(--ink-soft); font-family:'Cinzel',serif; letter-spacing:.06em; }
    .rd__hits{ display:flex; flex-direction:column; gap:2px; }
    .hit{ text-align:start; background:none; border:0; border-radius:7px; cursor:pointer; padding:7px 8px;
      display:flex; flex-direction:column; gap:3px; color:var(--ink-soft); font-family:var(--km-font-arabic-ui); font-size:15px; line-height:1.5; }
    .hit:hover{ background:rgba(201,168,76,.08); color:var(--ink); }
    .hit__s mark{ background:color-mix(in srgb, var(--accent) 30%, transparent); color:var(--ink); border-radius:3px; }
    .hit__p{ font-size:11px; color:var(--ink-soft); font-family:'Poppins',sans-serif; }
    /* Centred, but wide enough that the page is not mostly gutter: 820px inside a
       1360px track idled ~270px a side. */
    .rd__main{ padding:26px clamp(16px,3vw,44px) 100px; max-width:1100px; margin-inline:auto; width:100%; }
    .rd__crumb{ font-family:var(--km-font-arabic-ui); font-size:20px; color:var(--accent); padding-bottom:14px; margin-bottom:18px; border-bottom:1px solid var(--rule); }
    .rd__state{ padding:40px 0; color:var(--ink-soft); text-align:center; }
    .pg{ margin-bottom:30px; }
    .pg__marker{ font-family:'Cinzel',serif; font-size:11px; letter-spacing:.08em; color:var(--accent); opacity:.85; margin-bottom:8px; }
    .pg__text{ font-family:var(--km-font-arabic-ui); font-size:var(--fs,22px); line-height:2.05; color:var(--ink); unicode-bidi:plaintext; }
    .pg__text p{ margin:0 0 6px; text-align:justify; }
    .pg__fn{ margin-top:14px; padding-top:12px; border-top:1px dashed var(--rule); font-family:var(--km-font-arabic-ui);
      font-size:calc(var(--fs,22px) * .74); line-height:1.85; color:var(--ink-soft); unicode-bidi:plaintext; }
    .pg__fn p{ margin:0 0 3px; }
    .fs-sm{ --fs:19px; } .fs-lg{ --fs:26px; }
    .rd__more{ display:block; width:100%; margin-top:10px; padding:12px; background:var(--paper); border:1px solid var(--rule);
      border-radius:10px; color:var(--ink); cursor:pointer; font-family:'Cinzel',serif; letter-spacing:.05em; }
    .rd__more:hover{ border-color:var(--accent); color:var(--accent); }
    @media (max-width:860px){
      .rd__body{ grid-template-columns:1fr; }
      .rd__rail{ position:fixed; inset-block:57px 0; inset-inline:auto 0; width:min(84vw,340px);
        background:var(--paper); z-index:8;
        transform:translateX(102%); transition:transform .2s ease; }
      .rd__rail.open{ transform:none; }
      .rd__rail-toggle{ display:inline-block; position:fixed; bottom:18px; inset-inline-start:18px; z-index:9;
        background:var(--accent); color:#16150f; border:0; border-radius:999px; padding:11px 18px; font-weight:600; cursor:pointer; }
    }
  `],
})
export class LinguisticsBookReaderComponent {
  private readonly api = inject(LinguisticsApiService);
  private readonly route = inject(ActivatedRoute);

  readonly book = signal<GramBookMeta | null>(null);
  readonly flat = signal<FlatBab[]>([]);
  readonly pages = signal<GramPage[]>([]);
  readonly activeBab = signal<string | null>(null);
  readonly total = signal(0);
  readonly pageNum = signal(1);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly railOpen = signal(false);
  readonly fs = signal<'sm' | 'md' | 'lg'>('md');
  readonly q = signal('');
  /// Long books hand over their contents a level at a time.
  readonly lazySpine = signal(false);
  readonly levelCount = signal(0);
  readonly loadingSpine = signal(false);
  readonly hits = signal<GramSearchHit[]>([]);
  readonly searching = signal(false);
  readonly searched = signal(false);

  readonly shown = computed(() => this.pages().length);
  readonly hasMore = computed(() => this.shown() < this.total());
  readonly activeTitle = computed(() => this.flat().find(f => f.id === this.activeBab())?.title_ar ?? '');

  private slug = '';
  private pagesSub?: Subscription;

  constructor() {
    // switchMap: a newer book cancels the older request, so a slow response for the
    // previous slug can never overwrite the book now open.
    this.route.paramMap.pipe(
      map(p => p.get('slug') ?? ''),
      distinctUntilChanged(),
      tap(slug => { this.slug = slug; this.pagesSub?.unsubscribe(); this.loading.set(true); }),
      switchMap(slug => this.api.getBook(slug).pipe(
        catchError(() => { this.loading.set(false); return EMPTY; }),
      )),
      takeUntilDestroyed(),
    ).subscribe(r => {
      this.book.set(r.book);
      this.lazySpine.set(!!r.lazy);
      this.levelCount.set(r.level_count ?? r.bab_count);
      this.flat.set(r.lazy ? this.level(r.spine) : this.flatten(r.spine));
      this.showAll();
    });
  }

  /// One level, as it came: no walking into children that were not sent.
  private level(spine: GramBab[]): FlatBab[] {
    return spine.map(n => ({
      id: n.id, title_ar: n.title_ar, depth: n.depth,
      volume_no: n.volume_no, page_start: n.page_start, kids: n.child_count ?? 0,
    }));
  }

  /// The rest of a long contents page, on request.
  moreSpine(): void {
    if (this.loadingSpine()) return;
    this.loadingSpine.set(true);
    this.api.getBook(this.slug, { offset: this.flat().length }).subscribe({
      next: (r) => {
        this.flat.update(list => [...list, ...this.level(r.spine)]);
        this.loadingSpine.set(false);
      },
      error: () => this.loadingSpine.set(false),
    });
  }

  /// A heading with headings of its own: fetch them once, then just fold.
  expand(n: FlatBab): void {
    if (!n.kids) return;
    const list = this.flat();
    const at = list.findIndex(x => x.id === n.id);
    if (n.open) {
      this.flat.set(list.filter((x, i) => i <= at || x.depth <= n.depth));
      n.open = false;
      return;
    }
    this.api.getBook(this.slug, { parent: n.id }).subscribe({
      next: (r) => {
        const kids = this.level(r.spine).map(k => ({ ...k, depth: n.depth + 1 }));
        this.flat.set([...list.slice(0, at + 1), ...kids, ...list.slice(at + 1)]);
        n.open = true;
      },
    });
  }

  private flatten(spine: GramBab[]): FlatBab[] {
    const out: FlatBab[] = [];
    const walk = (n: GramBab) => {
      out.push({ id: n.id, title_ar: n.title_ar, depth: n.depth, volume_no: n.volume_no, page_start: n.page_start });
      n.children?.forEach(walk);
    };
    spine.forEach(walk);
    return out;
  }

  showAll(): void { this.activeBab.set(null); this.fetchPages(true); }
  openBab(n: FlatBab): void {
    // A heading that holds other headings opens them; a heading that holds text
    // opens the text.
    if (n.kids) { this.expand(n); return; }
    this.activeBab.set(n.id); this.railOpen.set(false); this.fetchPages(true);
  }

  private fetchPages(reset: boolean): void {
    if (reset) { this.pageNum.set(1); this.pages.set([]); this.loading.set(true); this.pagesSub?.unsubscribe(); }
    this.pagesSub = this.api.getPages(this.slug, { bab: this.activeBab() ?? undefined, page: this.pageNum(), limit: 20 }).subscribe({
      next: (r) => {
        this.pages.update(cur => reset ? r.pages : [...cur, ...r.pages]);
        this.total.set(r.total);
        this.loading.set(false); this.loadingMore.set(false);
        window.scrollTo({ top: reset ? 0 : window.scrollY });
      },
      error: () => { this.loading.set(false); this.loadingMore.set(false); },
    });
  }

  runSearch(): void {
    const term = this.q().trim();
    if (term.length < 2) return;
    this.searching.set(true);
    this.api.search(term, { source: this.slug, limit: 50 }).subscribe({
      next: (r) => { this.hits.set(r.results); this.searching.set(false); this.searched.set(true); },
      error: () => { this.hits.set([]); this.searching.set(false); this.searched.set(true); },
    });
  }

  clearSearch(): void { this.q.set(''); this.hits.set([]); this.searched.set(false); }

  openHit(h: GramSearchHit): void {
    const n = this.flat().find(f => f.id === h.bab_id);
    if (n) this.openBab(n); else this.showAll();
    this.railOpen.set(false);
  }

  segs(snippet: string): { t: string; hit: boolean }[] {
    return (snippet ?? '').split(/‹mark›|‹\/mark›/)
      .map((t, i) => ({ t, hit: i % 2 === 1 }))
      .filter(s => s.t.length > 0);
  }

  loadMore(): void { this.loadingMore.set(true); this.pageNum.update(n => n + 1); this.fetchPages(false); }
  setFs(v: 'sm' | 'md' | 'lg'): void { this.fs.set(v); }
  lines(text: string): string[] { return text.split(/[\r\n]+/).map(s => s.trim()).filter(Boolean); }
}
