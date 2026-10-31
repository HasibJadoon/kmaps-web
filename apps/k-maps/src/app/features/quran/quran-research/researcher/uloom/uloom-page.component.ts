import {
  Component, OnInit, inject, signal, computed,
  ElementRef, ViewChild, AfterViewInit, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';
import { QuranResearchApiService } from '../../../../../shared/services/quran/quran-research-api.service';
import { QuranApiService } from '../../../../../shared/services/quran/quran-api.service';
import type {
  QrIraabDisplaySource,
  QrIraabGroupDisplayPayload,
  QrIraabDisplayBlock,
  QrMenuSurah,
} from '../../../../../shared/models/quran/qr.models';
import { DisplayBlockComponent } from '../../../../../shared/components/display-block/display-block.component';
import { RefsPanelComponent } from '../../../../../shared/components/refs-panel/refs-panel.component';
import { IraabAnalysisPanelComponent } from '../../../../../shared/components/iraab-analysis-panel/iraab-analysis-panel.component';
import { QuranStateService } from '../../../../../shared/services/quran/quran-state.service';

interface SourceSection {
  source: QrIraabDisplaySource;
  groups: SectionGroup[];
}

export interface SectionGroup {
  key: string;
  label_ar: string;
  label_en: string;
  heading_block: QrIraabDisplayBlock | null;
  children: QrIraabDisplayBlock[];

  order: number;
}

/** The QR worker keys, labels and orders each block's section (section_key …). */
function sectionOf(b: QrIraabDisplayBlock): string {
  return b.section_key ?? b.block_subtype ?? b.block_type;
}

function groupBlocksBySection(blocks: QrIraabDisplayBlock[]): SectionGroup[] {
  const byKey = new Map<string, SectionGroup>();

  const ensure = (key: string, b: QrIraabDisplayBlock): SectionGroup => {
    if (byKey.has(key)) return byKey.get(key)!;
    const g: SectionGroup = {
      key, label_ar: b.section_label_ar ?? key, label_en: b.section_label ?? key, order: b.section_order ?? 99,
      heading_block: null, children: [],
    };
    byKey.set(key, g);
    return g;
  };

  for (const b of blocks) {
    const key = sectionOf(b);
    const g = ensure(key, b);
    if (b.block_type === 'heading') g.heading_block = b;
    else g.children.push(b);
  }

  for (const g of byKey.values()) {
    g.children.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }

  return [...byKey.values()].sort((a, b) => a.order - b.order);
}

@Component({
  selector: 'km-uloom-page',
  standalone: true,
  imports: [CommonModule, DisplayBlockComponent, RefsPanelComponent, IraabAnalysisPanelComponent],
  templateUrl: './uloom-page.component.html',
  styleUrl: './uloom-page.component.scss',
})
export class UloomPageComponent implements OnInit, AfterViewInit {
  private readonly quranState = inject(QuranStateService);
  @ViewChild('grid')    grid?: ElementRef<HTMLElement>;
  @ViewChild('reader')  reader?: ElementRef<HTMLElement>;

  readonly showRail   = signal(true);

  readonly darkMode   = signal(true);

  readonly fontSize   = signal(1);
  readonly fontSizeClass = computed(() => ['fs-sm', 'fs-md', 'fs-lg'][this.fontSize()]);

  private readonly RAIL_W = 300;

  toggleRail(): void {
    const willShow = !this.showRail();
    this.showRail.set(willShow);
    const host = this.reader?.nativeElement;
    if (!host) return;
    const target = willShow ? this.RAIL_W : 0;
    gsap.to(host, {
      '--w-rail': `${target}px`,
      duration: 0.48,
      ease: 'expo.out',
    });
  }

  toggleDark(): void { this.darkMode.update(v => !v); }
  changeFont(d: number): void { this.fontSize.set(Math.max(0, Math.min(2, this.fontSize() + d))); }

  private readonly api      = inject(QuranResearchApiService);
  private readonly quranApi = inject(QuranApiService);

  readonly sources        = signal<QrIraabDisplaySource[]>([]);
  readonly loading        = signal(true);
  readonly searchTerm     = signal('');
  readonly selectedSource = signal<QrIraabDisplaySource | null>(null);

  readonly surahMenu     = signal<QrMenuSurah[]>([]);
  readonly selectedSurah = signal<number>(1);
  readonly selectedAyah  = signal<number>(1);

  readonly surahPickerOpen = signal(false);

  readonly surahFilter     = signal('');

  readonly goToInput       = signal('');

  readonly filteredSurahs = computed(() => {
    const q = this.surahFilter().trim().toLowerCase();
    const list = this.surahMenu();
    if (!q) return list;
    return list.filter(s =>
      String(s.id) === q ||
      String(s.id).startsWith(q) ||
      (s.name_ar ?? '').toLowerCase().includes(q) ||
      (s.name_en ?? '').toLowerCase().includes(q) ||
      (s.name_transliteration ?? '').toLowerCase().includes(q),
    );
  });

  openSurahPicker(): void {
    this.surahFilter.set('');
    this.surahPickerOpen.set(true);
  }
  closeSurahPicker(): void { this.surahPickerOpen.set(false); }
  pickSurah(id: number): void {
    this.setSurah(id);
    this.closeSurahPicker();
  }

  onAyahInput(value: string): void {
    const n = parseInt(value, 10);
    if (Number.isFinite(n)) this.setAyah(n);
  }

  submitGoTo(): void {
    const raw = this.goToInput().trim();
    if (!raw) return;
    const m = raw.match(/^(\d{1,3})\s*[:\s]\s*(\d{1,3})$/);
    if (!m) return;
    const s = parseInt(m[1], 10);
    const a = parseInt(m[2], 10);
    if (!this.quranState.isSurahNo(s)) return;
    this.setSurah(s);

    queueMicrotask(() => this.setAyah(a));
    this.goToInput.set('');
  }

  readonly payload         = signal<QrIraabGroupDisplayPayload | null>(null);
  readonly payloadLoading  = signal(false);
  readonly payloadError    = signal<string | null>(null);

  readonly filteredSources = computed(() => {
    const q = this.searchTerm().toLowerCase().trim();
    if (!q) return this.sources();
    return this.sources().filter(s =>
      `${s.book_title_ar ?? ''} ${s.book_title_en ?? ''} ${s.author_name_ar ?? ''} ${s.author_name_en ?? ''}`.toLowerCase().includes(q),
    );
  });

  readonly currentSurahMeta = computed<QrMenuSurah | null>(
    () => this.surahMenu().find(s => s.id === this.selectedSurah()) ?? null,
  );

  readonly ayahCount = computed(() => this.currentSurahMeta()?.ayah_count ?? 1);

  readonly sections = computed<SourceSection[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const filter = this.selectedSource()?.source_slug;
    const bySource = new Map<string, QrIraabDisplayBlock[]>();
    for (const b of p.blocks) {
      if (filter && b.source_slug !== filter) continue;
      if (!bySource.has(b.source_slug)) bySource.set(b.source_slug, []);
      bySource.get(b.source_slug)!.push(b);
    }
    return p.sources
      .filter(s => bySource.has(s.source_slug))
      .map(s => ({
        source: s,
        groups: groupBlocksBySection(bySource.get(s.source_slug) ?? []),
      }));
  });

  readonly collapsed = signal<Set<string>>(new Set());

  isCollapsed(sourceSlug: string, sectionKey: string): boolean {
    return this.collapsed().has(`${sourceSlug}|${sectionKey}`);
  }
  toggleSection(sourceSlug: string, sectionKey: string): void {
    this.collapsed.update(set => {
      const next = new Set(set);
      const k = `${sourceSlug}|${sectionKey}`;
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  readonly groupHeader = computed(() => {
    const p = this.payload();
    if (!p) return '';
    return p.ayah_keys.length > 1
      ? `سورة ${p.surah_no} • مجموعة ${p.ayah_group_key}`
      : `سورة ${p.surah_no} • آية ${p.ayah_no}`;
  });

  constructor() {

    effect(() => {
      const src = this.selectedSource();
      const surah = this.selectedSurah();
      const ayah  = this.selectedAyah();
      if (!src) return;
      this.loadPayload(surah, ayah);
    });
  }

  ngOnInit(): void {

    this.api.getIraabDisplaySources().subscribe({
      next: res => { this.sources.set(res.sources); this.loading.set(false); },
      error: () => this.loading.set(false),
    });

    this.quranApi.getMenu().subscribe({
      next: res => { if (res?.data?.surahs) this.surahMenu.set(res.data.surahs); },
    });
  }

  ngAfterViewInit(): void {
    this.animateGrid();

    const host = this.reader?.nativeElement;
    if (host) host.style.setProperty('--w-rail', (this.showRail() ? this.RAIL_W : 0) + 'px');
  }

  setSearch(value: string): void { this.searchTerm.set(value); }

  selectSource(src: QrIraabDisplaySource): void {
    this.selectedSource.set(src);
    this.selectedSurah.set(1);
    this.selectedAyah.set(1);
    this.payload.set(null);
  }

  closeSource(): void {
    this.selectedSource.set(null);
    this.payload.set(null);
  }

  setSurah(surah: number): void {
    this.selectedSurah.set(surah);
    this.selectedAyah.set(1);
  }

  setAyah(ayah: number): void {
    const max = this.ayahCount();
    this.selectedAyah.set(Math.max(1, Math.min(max, ayah)));
  }

  prevAyah(): void { this.setAyah(this.selectedAyah() - 1); }
  nextAyah(): void { this.setAyah(this.selectedAyah() + 1); }

  private loadPayload(surah: number, ayah: number): void {
    this.payloadLoading.set(true);
    this.payloadError.set(null);
    const slug = this.selectedSource()?.source_slug;
    this.api.getIraabDisplay(surah, ayah, slug ? { source_slug: slug } : {}).subscribe({
      next: p => { this.payload.set(p); this.payloadLoading.set(false); },
      error: e => {
        this.payload.set(null);
        this.payloadError.set(e?.message ?? 'لا توجد بيانات للآية المطلوبة');
        this.payloadLoading.set(false);
      },
    });
  }

  private animateGrid(): void {
    const cards = Array.from(
      this.grid?.nativeElement.querySelectorAll<HTMLElement>('.source-card') ?? [],
    );
    if (!cards.length) return;
    gsap.fromTo(
      cards,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.38, stagger: 0.05, ease: 'power3.out', delay: 0.08, clearProps: 'transform' },
    );
  }
}
