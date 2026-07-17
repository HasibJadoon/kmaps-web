import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';
import {
  LinguisticsApiService, GramBab, GramBookMeta, GramPage,
} from '../../../shared/services/linguistics-api.service';

interface FlatBab { id: string; title_ar: string; depth: number; volume_no: number | null; page_start: number | null; }

@Component({
  selector: 'km-linguistics-book-reader',
  standalone: true,
  imports: [BackButtonComponent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rd" [class.fs-sm]="fs()==='sm'" [class.fs-lg]="fs()==='lg'" [attr.data-disc]="book()?.genre">
      <header class="rd__top">
        <km-back-button route="/linguistics" label="Linguistics" />
        <div class="rd__id" dir="rtl">
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
          <div class="rd__rail-head">الأبواب <span>{{ flat().length }}</span></div>
          <nav class="rd__tree">
            <button class="tw all" [class.active]="!activeBab()" (click)="showAll()">كل الكتاب · Full text</button>
            @for (n of flat(); track n.id) {
              <button class="tw" [class.active]="activeBab()===n.id" [style.--d]="n.depth"
                      [class.lead]="n.depth===0" (click)="openBab(n)" dir="rtl">
                <span class="tw__t">{{ n.title_ar }}</span>
                @if (n.page_start) { <span class="tw__p">{{ n.volume_no ? 'ج'+n.volume_no+'/' : '' }}{{ n.page_start }}</span> }
              </button>
            }
          </nav>
        </aside>

        <button class="rd__rail-toggle" (click)="railOpen.set(!railOpen())">☰ الأبواب</button>

        <main class="rd__main">
          @if (activeTitle()) { <div class="rd__crumb" dir="rtl">{{ activeTitle() }}</div> }
          @if (loading()) { <div class="rd__state">Loading…</div> }
          @for (p of pages(); track p.id) {
            <article class="pg">
              <div class="pg__marker">{{ p.volume_no ? 'ج'+p.volume_no+' · ' : '' }}ص {{ p.page_no }}</div>
              <div class="pg__text" dir="rtl">
                @for (ln of lines(p.text_ar); track $index) { <p>{{ ln }}</p> }
              </div>
              @if (p.footnotes_ar) {
                <div class="pg__fn" dir="rtl">
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
    .rd__top{ position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:16px;
      padding:12px 20px; background:rgba(22,21,15,.92); backdrop-filter:blur(8px); border-bottom:1px solid var(--rule); }
    .rd__id{ min-width:0; }
    .rd__title{ font-family:'Amiri','Scheherazade New',serif; font-size:22px; color:var(--ink); line-height:1.2; unicode-bidi:plaintext; }
    .rd__author{ font-family:'Amiri',serif; font-size:14px; color:var(--ink-soft); unicode-bidi:plaintext; }
    .rd__tools{ margin-inline-start:auto; display:flex; gap:4px; }
    .rd__tools button{ background:var(--paper); border:1px solid var(--rule); color:var(--ink-soft); border-radius:8px;
      width:34px; height:32px; cursor:pointer; font-family:'Cinzel',serif; }
    .rd__tools button.on{ color:var(--accent); border-color:var(--accent); }
    .rd__body{ display:grid; grid-template-columns:320px 1fr; gap:0; }
    .rd__rail{ border-inline-end:1px solid var(--rule); height:calc(100vh - 57px); position:sticky; top:57px; overflow:auto; padding:14px 10px 40px; }
    .rd__rail-head{ font-family:'Cinzel',serif; letter-spacing:.1em; text-transform:uppercase; font-size:11px;
      color:var(--ink-soft); padding:6px 8px 10px; display:flex; justify-content:space-between; }
    .rd__rail-head span{ color:var(--accent); }
    .rd__tree{ display:flex; flex-direction:column; gap:1px; }
    .tw{ text-align:start; background:none; border:0; color:var(--ink-soft); cursor:pointer;
      padding:6px 8px 6px calc(8px + var(--d,0) * 14px); border-radius:7px; display:flex; gap:8px; align-items:baseline;
      font-family:'Amiri','Scheherazade New',serif; font-size:16px; line-height:1.4; }
    .tw:hover{ background:rgba(201,168,76,.08); color:var(--ink); }
    .tw.active{ background:color-mix(in srgb, var(--accent) 16%, transparent); color:var(--ink); }
    .tw.lead{ color:var(--ink); font-weight:600; }
    .tw.all{ font-family:'Cinzel',serif; font-size:12px; letter-spacing:.06em; color:var(--accent); margin-bottom:6px; }
    .tw__t{ flex:1; } .tw__p{ font-size:11px; color:var(--ink-soft); font-family:'Poppins',sans-serif; }
    .rd__rail-toggle{ display:none; }
    .rd__main{ padding:26px clamp(16px,4vw,60px) 100px; max-width:820px; }
    .rd__crumb{ font-family:'Amiri',serif; font-size:20px; color:var(--accent); padding-bottom:14px; margin-bottom:18px; border-bottom:1px solid var(--rule); }
    .rd__state{ padding:40px 0; color:var(--ink-soft); text-align:center; }
    .pg{ margin-bottom:30px; }
    .pg__marker{ font-family:'Cinzel',serif; font-size:11px; letter-spacing:.08em; color:var(--accent); opacity:.85; margin-bottom:8px; }
    .pg__text{ font-family:'Amiri','Scheherazade New',serif; font-size:var(--fs,22px); line-height:2.05; color:var(--ink); unicode-bidi:plaintext; }
    .pg__text p{ margin:0 0 6px; text-align:justify; }
    .pg__fn{ margin-top:14px; padding-top:12px; border-top:1px dashed var(--rule); font-family:'Amiri',serif;
      font-size:calc(var(--fs,22px) * .74); line-height:1.85; color:var(--ink-soft); unicode-bidi:plaintext; }
    .pg__fn p{ margin:0 0 3px; }
    .fs-sm{ --fs:19px; } .fs-lg{ --fs:26px; }
    .rd__more{ display:block; width:100%; margin-top:10px; padding:12px; background:var(--paper); border:1px solid var(--rule);
      border-radius:10px; color:var(--ink); cursor:pointer; font-family:'Cinzel',serif; letter-spacing:.05em; }
    .rd__more:hover{ border-color:var(--accent); color:var(--accent); }
    @media (max-width:860px){
      .rd__body{ grid-template-columns:1fr; }
      .rd__rail{ position:fixed; inset:57px auto 0 0; width:min(84vw,340px); background:var(--paper); z-index:8;
        transform:translateX(-102%); transition:transform .2s ease; }
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

  readonly shown = computed(() => this.pages().length);
  readonly hasMore = computed(() => this.shown() < this.total());
  readonly activeTitle = computed(() => this.flat().find(f => f.id === this.activeBab())?.title_ar ?? '');

  private slug = '';

  constructor() {
    this.route.paramMap.subscribe(p => {
      this.slug = p.get('slug') ?? '';
      this.loadBook();
    });
  }

  private loadBook(): void {
    this.loading.set(true);
    this.api.getBook(this.slug).subscribe({
      next: (r) => {
        this.book.set(r.book);
        this.flat.set(this.flatten(r.spine));
        this.showAll();
      },
      error: () => this.loading.set(false),
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
  openBab(n: FlatBab): void { this.activeBab.set(n.id); this.railOpen.set(false); this.fetchPages(true); }

  private fetchPages(reset: boolean): void {
    if (reset) { this.pageNum.set(1); this.pages.set([]); this.loading.set(true); }
    this.api.getPages(this.slug, { bab: this.activeBab() ?? undefined, page: this.pageNum(), limit: 20 }).subscribe({
      next: (r) => {
        this.pages.update(cur => reset ? r.pages : [...cur, ...r.pages]);
        this.total.set(r.total);
        this.loading.set(false); this.loadingMore.set(false);
        window.scrollTo({ top: reset ? 0 : window.scrollY });
      },
      error: () => { this.loading.set(false); this.loadingMore.set(false); },
    });
  }

  loadMore(): void { this.loadingMore.set(true); this.pageNum.update(n => n + 1); this.fetchPages(false); }
  setFs(v: 'sm' | 'md' | 'lg'): void { this.fs.set(v); }
  lines(text: string): string[] { return text.split(/[\r\n]+/).map(s => s.trim()).filter(Boolean); }
}
