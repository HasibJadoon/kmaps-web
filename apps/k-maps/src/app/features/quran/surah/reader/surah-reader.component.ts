import {
  Component,
  OnInit,
  AfterViewInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import gsap from 'gsap';
import { QuranAyah, AyahsSurah, TranslationPassage } from '../../../../shared/models/quran/quran.models';
import { mapQrPassagesToResponse, mapQrReaderToAyahsResponse } from '../../../../shared/services/quran/quran-api.mapper';
import { QuranApiService } from '../../../../shared/services/quran/quran-api.service';
import { DocContextService } from '../../../docs/services/doc-context.service';

export type ViewMode = 'verse' | 'arabic' | 'translation';

const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

@Component({
  selector: 'km-quran-text',
  standalone: true,
  imports: [RouterLink, NgClass],
  templateUrl: './surah-reader.component.html',
  styleUrl: './surah-reader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurahReaderComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly qrApi = inject(QuranApiService);
  private readonly docCtx = inject(DocContextService);

  @ViewChild('contentEl') contentEl!: ElementRef<HTMLElement>;

  readonly bismillah = BISMILLAH;

  getVerseMarkFrame(): string {
    return '\u06DD';
  }

  getVerseMarkDigits(ayah: QuranAyah): string {
    return (ayah.verse_mark ?? '').replace(/^\u06DD/, '');
  }

  getVerseMark(ayah: QuranAyah): string {
    return ayah.verse_mark ?? '';
  }

  verseMarker(_n: number): string {
    return '';
  }

  surahId = signal<number>(1);
  surahInfo = signal<AyahsSurah | null>(null);
  ayahs = signal<QuranAyah[]>([]);
  passages = signal<TranslationPassage[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  viewMode = signal<ViewMode>('arabic');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 1;
    this.surahId.set(id);
    this.loadAyahs(id);
  }

  ngAfterViewInit(): void {
    const header = this.contentEl?.nativeElement?.querySelector('.page-header');
    if (header) {
      gsap.fromTo(
        header,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      );
    }
  }

  setView(mode: ViewMode): void {
    this.viewMode.set(mode);
    this.animateContent();
  }

  retry(): void {
    this.loadAyahs(this.surahId());
  }

  get shouldShowBismillah(): boolean {

    return this.surahId() !== 9;
  }

  get ayahsByPage(): { page: number; ayahs: QuranAyah[] }[] {
    const map = new Map<number, QuranAyah[]>();
    for (const ayah of this.ayahs()) {
      const p = ayah.page_number ?? 0;
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(ayah);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([page, ayahs]) => ({ page, ayahs }));
  }

  onWordClick(_word: string, _ayah: QuranAyah): void {}

  newDoc(): void {
    this.docCtx.openNewDocWithContext(`quran/${this.surahId()}`);
  }

  getAyahBody(ayah: QuranAyah): string {
    return (ayah.text_uthmani_clean ?? ayah.text_uthmani ?? ayah.text ?? '').trimEnd();
  }

  getAyahMarker(ayah: QuranAyah): string {
    return ayah.verse_mark ?? '';
  }

  getWords(ayah: QuranAyah): string[] {

    const src = ayah.text_uthmani_clean ?? ayah.text_uthmani ?? ayah.text ?? '';
    return src.split(/\s+/).filter(w => w.length > 0);
  }

  toArabicIndic(n: number): string {
    return n.toString().replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
  }

  private loadAyahs(surah: number): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      reader: this.qrApi.getSurahReader(surah),
      passages: this.qrApi.getSurahPassages(surah).pipe(
        catchError(() => of({ ok: true, data: [] } as any))
      ),
    }).subscribe({
      next: ({ reader, passages }) => {
        const res = mapQrReaderToAyahsResponse(reader, mapQrPassagesToResponse(passages.data));
        this.surahInfo.set(res.surah ?? null);
        this.ayahs.set(res.results ?? res.verses ?? []);
        this.passages.set(res.translation_passages ?? []);
        this.loading.set(false);
        this.animateContent();
      },
      error: (err: Error) => {
        this.error.set(err?.message ?? 'Failed to load ayahs');
        this.loading.set(false);
      },
    });
  }

  private animateContent(): void {

    setTimeout(() => {
      if (!this.contentEl?.nativeElement) return;
      const el = this.contentEl.nativeElement;
      const mode = this.viewMode();

      if (mode === 'arabic') {

        const wrap = el.querySelector('.mushaf-wrap');
        if (wrap) {
          gsap.fromTo(wrap, { opacity: 0, y: 14 }, {
            opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', clearProps: 'transform',
          });
        }

        const breaks = el.querySelectorAll<HTMLElement>('.page-break');
        breaks.forEach((pb, i) => {
          const lines = pb.querySelectorAll<HTMLElement>('.page-break__line');
          const badge = pb.querySelector<HTMLElement>('.page-break__num');
          const delay = 0.3 + i * 0.08;

          gsap.fromTo(pb, { opacity: 0 }, { opacity: 1, duration: 0.01, delay });
          lines.forEach(line => {
            gsap.fromTo(line,
              { scaleX: 0, opacity: 0 },
              { scaleX: 1, opacity: 1, duration: 0.7, delay, ease: 'power3.out', clearProps: 'transform' }
            );
          });
          if (badge) {
            gsap.fromTo(badge,
              { opacity: 0, scale: 0.6 },
              { opacity: 0.75, scale: 1, duration: 0.45, delay: delay + 0.15, ease: 'back.out(1.7)', clearProps: 'transform' }
            );
          }
        });
      } else {
        const selectors: Record<ViewMode, string> = {
          verse: '.vrow',
          arabic: '.mushaf-wrap',
          translation: '.t-row',
        };
        const targets = el.querySelectorAll(selectors[mode]);
        if (!targets.length) return;
        gsap.fromTo(
          targets,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.48, stagger: 0.038, ease: 'power2.out', clearProps: 'transform' }
        );

        const breaks = el.querySelectorAll<HTMLElement>('.page-break');
        breaks.forEach((pb, i) => {
          const lines = pb.querySelectorAll<HTMLElement>('.page-break__line');
          const badge = pb.querySelector<HTMLElement>('.page-break__num');
          const delay = 0.4 + i * 0.06;
          gsap.fromTo(pb, { opacity: 0 }, { opacity: 1, duration: 0.01, delay });
          lines.forEach(line => {
            gsap.fromTo(line,
              { scaleX: 0, opacity: 0 },
              { scaleX: 1, opacity: 1, duration: 0.6, delay, ease: 'power3.out', clearProps: 'transform' }
            );
          });
          if (badge) {
            gsap.fromTo(badge,
              { opacity: 0, scale: 0.6 },
              { opacity: 0.75, scale: 1, duration: 0.4, delay: delay + 0.15, ease: 'back.out(1.7)', clearProps: 'transform' }
            );
          }
        });
      }
    }, 16);
  }

  back(): void {
    this.router.navigate(['/quran', 'surahs']);
  }
}
