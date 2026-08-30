import {
  AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef,
  HostListener, ViewChild, computed, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, of, catchError } from 'rxjs';
import {
  AlDictionaryApiService, LexV2RootRow, LexV2SarfFamily, LisanReadView,
} from '../../../../shared/services/al-dictionary-api.service';
import { LexiconReaderComponent } from '../../lexicon-reader/lexicon-reader.component';
import { BookSelectorComponent } from '../../components/book-selector/book-selector.component';
import { SarfPanelComponent } from '../../components/sarf-panel/sarf-panel.component';
import { BookStripComponent } from '../../components/book-strip/book-strip.component';
import { RootJumpComponent } from '../../components/root-jump/root-jump.component';
import { LexEraPipe } from '../../data/lex-era.pipe';
import { CLASSICAL_SHELL_SLUGS, LexiconSourcesService } from '../../data/lexicon-sources.service';

export const LISAN_SLUG = 'ibn_manzur_lisan_arab';

export { CLASSICAL_SHELL_SLUGS as CLASSICAL_LEXICON_SLUGS };

const RAIL = {
  INDEX_DEFAULT:     320, INDEX_MIN:     220, INDEX_MAX:     480,
  CITATIONS_DEFAULT: 360, CITATIONS_MIN: 260, CITATIONS_MAX: 720,
  MOBILE_BREAKPOINT: 880,
};
const DUR_WIDTH = 480;
const DUR_FADE  = 320;
type Side = 'index' | 'citations';

@Component({
  selector: 'km-lexicon-shell',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    LexiconReaderComponent, BookSelectorComponent, SarfPanelComponent, BookStripComponent, RootJumpComponent, LexEraPipe,
  ],
  templateUrl: './lexicon-shell.component.html',
  styleUrl: './lexicon-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.dark]':  'darkMode()',
    '[class.fs-xs]': 'fontSize() === 0',
    '[class.fs-sm]': 'fontSize() === 1',
    '[class.fs-md]': 'fontSize() === 2',
    '[class.fs-lg]': 'fontSize() === 3',
    '[class.fs-xl]': 'fontSize() === 4',
  },
})
export class LexiconShellComponent implements AfterViewInit {
  @ViewChild('content',       { static: false }) contentRef?:       ElementRef<HTMLElement>;
  @ViewChild('indexRail',     { static: false }) indexRailRef?:     ElementRef<HTMLElement>;
  @ViewChild('citationsRail', { static: false }) citationsRailRef?: ElementRef<HTMLElement>;

  private readonly hostEl     = inject(ElementRef<HTMLElement>);
  private readonly api        = inject(AlDictionaryApiService);
  private readonly sourcesSvc = inject(LexiconSourcesService);
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeSlug  = signal<string>(LISAN_SLUG);
  readonly currentRoot = signal('');
  readonly loading     = signal(false);
  readonly view        = signal<LisanReadView | null>(null);
  readonly error       = signal<string | null>(null);

  readonly sarf = signal<LexV2SarfFamily | null>(null);

  private readonly shortTitles = signal<ReadonlyMap<string, string>>(new Map());
  readonly bookShortTitle = computed(() =>
    this.shortTitles().get(this.activeSlug()) ?? this.view()?.meta.title_ar ?? '');

  readonly rootList        = signal<LexV2RootRow[]>([]);
  readonly rootListLoading = signal(false);
  readonly rootSearch      = signal('');

  readonly filteredRoots = computed(() => {
    const q = this.rootSearch().trim();
    const all = this.rootList();
    if (!q) return all;
    return all.filter(r =>
      r.root_norm.includes(q) || (r.root_text ?? '').includes(q));
  });

  readonly rootsByLetter = computed(() => {
    const out = new Map<string, LexV2RootRow[]>();
    for (const r of this.filteredRoots()) {
      const letter = (r.root_norm ?? '?')[0] ?? '?';
      const arr = out.get(letter) ?? [];
      arr.push(r);
      out.set(letter, arr);
    }
    return [...out.entries()].sort();
  });

  readonly darkMode          = signal(true);
  readonly showIndex         = signal(true);
  readonly showCitations     = signal(true);
  readonly citationsExpanded = signal(false);
  readonly fontSize          = signal(2);
  readonly fontSizeClass     = computed(() =>
    ['fs-xs', 'fs-sm', 'fs-md', 'fs-lg', 'fs-xl'][this.fontSize()]);

  readonly entryLetters = computed(() => {
    const v = this.view();
    const raw = (v?.entry.root_text ?? this.currentRoot()).trim().replace(/\s+/g, '');
    if (raw) return raw;

    const letters = v?.canonical?.root_letters?.trim();
    if (!letters) return '';
    try {
      const arr: unknown = JSON.parse(letters);
      if (Array.isArray(arr)) return arr.join('');
    } catch {  }
    return letters.replace(/[\[\]",\s]/g, '');
  });

  readonly indexWidth     = signal(RAIL.INDEX_DEFAULT);
  readonly citationsWidth = signal(RAIL.CITATIONS_DEFAULT);

  private dragSide:   Side | null = null;
  private dragStartX = 0;
  private dragStartW = 0;

  constructor() {
    this.sourcesSvc.registry$
      .pipe(takeUntilDestroyed())
      .subscribe(reg => this.shortTitles.set(
        new Map(reg.sources.map(s => [s.slug, s.title_short_ar]))));

    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([params, query]) => {

        const book = query.get('book') ?? '';
        if (!CLASSICAL_SHELL_SLUGS.has(book)) return;

        if (book !== this.activeSlug()) {
          this.activeSlug.set(book);
          this.rootList.set([]);
        }
        if (this.rootList().length === 0) this.loadRoots();
        const root = params.get('root') ?? '';
        if (root) this.loadEntry(root);
        else if (this.rootList().length > 0)
          this.goToRoot(this.rootList()[0].root_norm);
      });
  }

  ngAfterViewInit() {
    this.setVar('index',     this.targetWidth('index'));
    this.setVar('citations', this.targetWidth('citations'));
  }

  private targetWidth(side: Side): number {
    if (side === 'index') return this.showIndex() ? this.indexWidth() : 0;
    if (!this.showCitations()) return 0;
    if (this.citationsExpanded()) return this.viewportWidth();
    return this.citationsWidth();
  }
  private viewportWidth(): number {
    return typeof window === 'undefined' ? 1280 : window.innerWidth;
  }

  private tween(side: Side) {
    const host   = this.hostEl.nativeElement;
    const target = this.targetWidth(side);
    const open   = target > 0;
    host.classList.add(`anim-${side}`);
    host.style.setProperty(`--w-${side}`, `${target}px`);
    window.setTimeout(() => {
      host.classList.remove(`anim-${side}`);
      this.repaintContent();
    }, DUR_WIDTH + 40);
    const railEl = side === 'index'
      ? this.indexRailRef?.nativeElement
      : this.citationsRailRef?.nativeElement;
    if (railEl) {
      railEl.style.transition = `opacity ${DUR_FADE}ms cubic-bezier(.45,0,.25,1)`;
      railEl.style.opacity = open ? '1' : '0';
    }
  }

  private repaintContent() {
    const el = this.contentRef?.nativeElement;
    if (!el) return;
    el.style.transform = 'translateZ(0)';
    requestAnimationFrame(() => { el.style.transform = ''; });
  }

  private setVar(side: Side, w: number) {
    const host = this.hostEl.nativeElement;
    host.classList.remove(`anim-${side}`);
    host.style.setProperty(`--w-${side}`, `${w}px`);
  }

  toggleDark()        { this.darkMode.update(v => !v); }
  toggleIndex()       { this.showIndex.update(v => !v);     this.tween('index'); }
  toggleCitations()   {
    const next = !this.showCitations();
    this.showCitations.set(next);
    if (!next) this.citationsExpanded.set(false);
    this.tween('citations');
  }
  toggleExpanded(e?: Event) {
    e?.stopPropagation(); e?.preventDefault();
    this.showCitations.set(true);
    this.citationsExpanded.update(v => !v);
    this.tween('citations');
  }
  changeFont(d: number) { this.fontSize.set(Math.max(0, Math.min(4, this.fontSize() + d))); }

  startResize(side: Side, e: PointerEvent) {
    e.preventDefault();
    this.dragSide   = side;
    this.dragStartX = e.clientX;
    this.dragStartW = side === 'index' ? this.indexWidth() : this.citationsWidth();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    (e.target as HTMLElement).classList.add('dragging');
  }
  @HostListener('window:pointermove', ['$event'])
  onResizeMove(e: PointerEvent) {
    if (!this.dragSide) return;
    const delta  = e.clientX - this.dragStartX;
    const signed = this.dragSide === 'index' ? -delta : delta;
    const next   = this.dragSide === 'index'
      ? Math.max(RAIL.INDEX_MIN,     Math.min(RAIL.INDEX_MAX,     this.dragStartW + signed))
      : Math.max(RAIL.CITATIONS_MIN, Math.min(RAIL.CITATIONS_MAX, this.dragStartW + signed));
    if (this.dragSide === 'index') this.indexWidth.set(next);
    else                            this.citationsWidth.set(next);
    this.setVar(this.dragSide, next);
  }
  @HostListener('window:pointerup')
  onResizeEnd() {
    if (!this.dragSide) return;
    document.querySelectorAll('.rail-resizer.dragging')
      .forEach(el => el.classList.remove('dragging'));
    this.dragSide = null;
  }
  @HostListener('window:resize')
  onWindowResize() {
    if (this.citationsExpanded() && this.showCitations()) {
      this.setVar('citations', this.viewportWidth());
    }
  }

  goToRoot(root_norm: string) {
    this.router.navigate(['/lexicon/root', root_norm], {
      queryParams: { book: this.activeSlug() },
    });
  }
  prevRoot() {
    const list = this.rootList();
    const idx = list.findIndex(r => r.root_norm === this.currentRoot());
    if (idx > 0) this.goToRoot(list[idx - 1].root_norm);
  }
  nextRoot() {
    const list = this.rootList();
    const idx = list.findIndex(r => r.root_norm === this.currentRoot());
    if (idx >= 0 && idx < list.length - 1) this.goToRoot(list[idx + 1].root_norm);
  }

  private loadRoots() {
    this.rootListLoading.set(true);
    this.api.getV2Roots({ source: this.activeSlug(), limit: 10000 }).pipe(
      catchError(() => of({ rows: [], total: 0, page: 1, limit: 0, has_more: false })),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(r => {
      this.rootList.set(r.rows);
      this.rootListLoading.set(false);
      if (!this.currentRoot() && r.rows.length > 0)
        this.goToRoot(r.rows[0].root_norm);
    });
  }
  private loadEntry(root_norm: string) {
    this.loading.set(true);
    this.error.set(null);
    this.currentRoot.set(root_norm);
    this.sarf.set(null);
    this.api.getClassicalRead(this.activeSlug(), root_norm).pipe(
      catchError(() => { this.error.set('تعذّر تحميل المادة'); return of(null); }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(v => {
      this.view.set(v);
      this.loading.set(false);
      queueMicrotask(() => this.contentRef?.nativeElement.scrollTo({ top: 0 }));
    });
    this.loadSarf(root_norm);
  }

  private loadSarf(root_norm: string) {
    const slug = this.activeSlug();
    this.api.getSarfFamily(slug, root_norm).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(f => {

      if (this.activeSlug() === slug && this.currentRoot() === root_norm) {
        this.sarf.set(f);
      }
    });
  }

  openAyah(surah: number, ayah: number) {
    if (!surah || !ayah) return;
    this.router.navigate(['/quran/al-quran'], {
      queryParams: { surah, startingVerse: ayah },
    });
  }

  scrollToPanelItem(panel: 'notes' | 'quran' | 'hadith' | 'poetry' | 'authorities',
                    selector: string) {
    if (!this.showCitations()) {
      this.showCitations.set(true);
      this.tween('citations');
    }
    setTimeout(() => {
      const host = this.contentRef?.nativeElement?.closest('.reader__body');
      if (!host) return;
      const det = host.querySelector<HTMLDetailsElement>(`.rail__panel--${panel}`);
      if (det && !det.open) det.open = true;
      const target = host.querySelector<HTMLElement>(selector);
      if (!target) return;
      const scroller = target.closest<HTMLElement>('.rail__scroll');
      if (scroller) {
        const tr = target.getBoundingClientRect();
        const sr = scroller.getBoundingClientRect();
        scroller.scrollTop = Math.max(0,
          scroller.scrollTop + (tr.top - sr.top) - scroller.clientHeight / 2 + tr.height / 2);
      } else target.scrollIntoView({ block: 'center' });
      target.classList.add('fn-list__item--focused');
      setTimeout(() => target.classList.remove('fn-list__item--focused'), 2400);
    }, 120);
  }

  openFootnoteInPanel(payload: { num: number }) {
    this.scrollToPanelItem('notes', `.fn-list__item[data-fn-num="${payload.num}"]`);
  }
  openAuthorityInPanel(payload: { name: string }) {
    const safe = payload.name.replace(/"/g, '\\"');
    this.scrollToPanelItem('authorities', `.auth-list__item[data-auth-name="${safe}"]`);
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    switch (e.key) {
      case 'ArrowLeft':  this.nextRoot(); e.preventDefault(); break;
      case 'ArrowRight': this.prevRoot(); e.preventDefault(); break;
      case 'j': this.contentRef?.nativeElement.scrollBy({ top: 80,  behavior: 'smooth' }); break;
      case 'k': this.contentRef?.nativeElement.scrollBy({ top: -80, behavior: 'smooth' }); break;
      case '[': this.toggleIndex(); break;
      case ']': this.toggleCitations(); break;
      case 'd': this.toggleDark(); break;
      case '+': this.changeFont(+1); break;
      case '-': this.changeFont(-1); break;
    }
  }
}
