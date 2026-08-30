import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener,
  ViewChild, computed, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, of, catchError } from 'rxjs';
import {
  AlDictionaryApiService, LexV2SarfFamily, ScholarshipShellView, ScholarshipRootRow,
} from '../../../../shared/services/al-dictionary-api.service';
import { BookStripComponent } from '../../components/book-strip/book-strip.component';
import { SarfPanelComponent } from '../../components/sarf-panel/sarf-panel.component';

@Component({
  selector: 'km-scholarship-shell',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    BookStripComponent, SarfPanelComponent,
  ],
  templateUrl: './scholarship-shell.component.html',
  styleUrl: './scholarship-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.dark]':  'darkMode()',
    '[class.fs-sm]': 'fontSize() === 0',
    '[class.fs-md]': 'fontSize() === 1',
    '[class.fs-lg]': 'fontSize() === 2',
  },
})
export class ScholarshipShellComponent {
  @ViewChild('content')   contentRef?:   ElementRef<HTMLElement>;
  @ViewChild('indexRail') indexRailRef?: ElementRef<HTMLElement>;
  @ViewChild('metaRail')  metaRailRef?:  ElementRef<HTMLElement>;

  private readonly hostEl     = inject(ElementRef<HTMLElement>);
  private readonly api        = inject(AlDictionaryApiService);
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly slug         = signal('');
  readonly currentRoot  = signal('');
  readonly loading      = signal(false);
  readonly view         = signal<ScholarshipShellView | null>(null);
  readonly error        = signal<string | null>(null);
  readonly sarf         = signal<LexV2SarfFamily | null>(null);

  readonly rootList     = signal<ScholarshipRootRow[]>([]);
  readonly rootListLoading = signal(false);
  readonly rootSearch   = signal('');

  readonly filteredRoots = computed(() => {
    const q = this.rootSearch().trim();
    const all = this.rootList();
    if (!q) return all;
    return all.filter(r =>
      r.root_norm.includes(q) || (r.root_text ?? '').includes(q));
  });

  readonly darkMode      = signal(true);
  readonly showIndex     = signal(true);
  readonly showMeta      = signal(true);
  readonly fontSize      = signal(1);
  readonly copyState     = signal<'idle' | 'copied' | 'failed'>('idle');

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([params, query]) => {

        const book = query.get('book') ?? '';
        if (!book) return;

        if (book !== this.slug()) {
          this.slug.set(book);
          this.rootList.set([]);
          this.loadRoots(book);
        }
        const root = params.get('root') ?? '';
        if (root) this.loadEntry(book, root);
        else if (this.rootList().length > 0) {
          this.goToRoot(this.rootList()[0].root_norm);
        }
      });
  }

  private loadRoots(slug: string) {
    this.rootListLoading.set(true);
    this.api.getScholarshipRoots(slug).pipe(
      catchError(() => of({ slug, rows: [] as ScholarshipRootRow[], total: 0 })),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(r => {
      this.rootList.set(r.rows);
      this.rootListLoading.set(false);
      if (!this.currentRoot() && r.rows.length > 0) this.goToRoot(r.rows[0].root_norm);
    });
  }

  private loadEntry(slug: string, root_norm: string) {
    this.loading.set(true);
    this.error.set(null);
    this.currentRoot.set(root_norm);
    this.sarf.set(null);
    this.api.getScholarshipBySource(slug, root_norm).pipe(
      catchError(() => { this.error.set('Could not load entry'); return of(null); }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(v => {
      this.view.set(v);
      this.loading.set(false);
      queueMicrotask(() => this.contentRef?.nativeElement.scrollTo({ top: 0 }));
    });

    this.api.getSarfFamily(slug, root_norm).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(f => {
      if (this.slug() === slug && this.currentRoot() === root_norm) this.sarf.set(f);
    });
  }

  goToRoot(root_norm: string) {
    this.router.navigate(['/lexicon/root', root_norm], {
      queryParams: { book: this.slug() },
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

  toggleDark()      { this.darkMode.update(v => !v); }
  toggleIndex()     { this.showIndex.update(v => !v); }
  toggleMeta()      { this.showMeta.update(v => !v); }
  changeFont(d: number) { this.fontSize.set(Math.max(0, Math.min(2, this.fontSize() + d))); }

  bodySegments(text: string | null | undefined): {
    kind: 'text' | 'qref';
    value: string;
    surah?: number;
    ayah?: number;
  }[] {
    if (!text) return [];

    const RX = /\bQ\.?\s*(\d{1,3})\s*[:\-–]\s*(\d{1,3})\b/g;
    const out: { kind: 'text' | 'qref'; value: string; surah?: number; ayah?: number }[] = [];
    let cur = 0;
    let m: RegExpExecArray | null;
    while ((m = RX.exec(text)) != null) {
      const surah = parseInt(m[1], 10);
      const ayah  = parseInt(m[2], 10);
      if (!Number.isFinite(surah) || surah < 1 || surah > 114) continue;
      if (!Number.isFinite(ayah)  || ayah  < 1)                 continue;
      if (m.index > cur) out.push({ kind: 'text', value: text.slice(cur, m.index) });
      out.push({ kind: 'qref', value: m[0], surah, ayah });
      cur = m.index + m[0].length;
    }
    if (cur < text.length) out.push({ kind: 'text', value: text.slice(cur) });
    return out;
  }

  openAyah(surah: number, ayah: number) {
    if (!surah || !ayah) return;
    this.router.navigate(['/quran/al-quran'], {
      queryParams: { surah, startingVerse: ayah },
    });
  }

  copyEntry() {
    const v = this.view();
    if (!v || !v.source) return;
    const lines: string[] = [];
    lines.push(`${v.source.title_ar} / ${v.source.title_en}`);
    lines.push(`${v.source.author}${v.source.year ? ` (${v.source.year})` : ''}`);
    lines.push(`Root: ${v.root_norm}`);
    lines.push('');
    for (const n of v.notes) {
      lines.push(`[${n.reading_label.en}${n.page_no ? `, p. ${n.page_no}` : ''}]`);
      if (n.body_plain || n.body_md) lines.push(n.body_plain || n.body_md || '');
      lines.push('');
    }
    const text = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    this.writeClipboard(text);
  }
  private writeClipboard(text: string) {
    const finish = (s: 'copied' | 'failed') => {
      this.copyState.set(s);
      window.setTimeout(() => this.copyState.set('idle'), 1800);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => finish('copied')).catch(() => finish('failed'));
      return;
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      finish('copied');
    } catch { finish('failed'); }
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.tagName === 'INPUT' ||
        (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
    switch (e.key) {
      case 'ArrowLeft':  this.nextRoot(); e.preventDefault(); break;
      case 'ArrowRight': this.prevRoot(); e.preventDefault(); break;
      case '[': this.toggleIndex(); break;
      case ']': this.toggleMeta();  break;
      case 'd': this.toggleDark();  break;
      case '+': this.changeFont(+1); break;
      case '-': this.changeFont(-1); break;
    }
  }
}
