import {
  Component, Input, OnChanges, SimpleChanges, signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { StudyLessonResponse, AyahVm, AyahWordToken } from '../../../../../../../shared/services/quran/quran-surah.service';

const DIACRITICS_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g;

const END_MARKER_RE = /[\u06DD\u06DE][\u0660-\u0669]*/g;

const ARABIC_INDIC_ONLY_RE = /^[\u0660-\u0669]+$/;

@Component({
  selector: 'km-study-reading-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './study-reading-step.component.html',
  styleUrl: './study-reading-step.component.scss',
})
export class StudyReadingStepComponent implements OnChanges {
  @Input({ required: true }) lesson!: StudyLessonResponse;

  showDiacritics = signal(false);
  orderedAyahs: AyahVm[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if ('lesson' in changes) {
      this.orderedAyahs = [...(this.lesson?.ayahs ?? [])]
        .sort((left, right) => left.ayah - right.ayah);
    }
  }

  hasWordTokens(ayah: AyahVm): boolean {
    return Array.isArray(ayah.words) && ayah.words.length > 0;
  }

  wordTokens(ayah: AyahVm): AyahWordToken[] {
    return (ayah.words ?? []).filter(w => {
      if (w.char_type === 'end') return false;
      const display = (w.text || w.simple || '').replace(END_MARKER_RE, '').trim();
      if (!display) return false;
      if (ARABIC_INDIC_ONLY_RE.test(display)) return false;
      return true;
    });
  }

  wordText(word: AyahWordToken): string {
    const raw = (this.showDiacritics() ? word.text : word.simple) ?? '';
    return raw.replace(END_MARKER_RE, '').trim();
  }

  splitWords(ayah: AyahVm): string[] {
    let src = (ayah.text ?? '').replace(END_MARKER_RE, '');
    if (!this.showDiacritics()) {
      src = ayah.text_simple
        ? ayah.text_simple.replace(END_MARKER_RE, '')
        : src.replace(DIACRITICS_RE, '');
    }
    return src
      .split(/\s+/)
      .filter(w => w.length > 0)
      .filter(w => !ARABIC_INDIC_ONLY_RE.test(w));
  }

  toArabicIndic(n: number): string {
    return n.toString().replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
  }

  verseMark(ayahNo: number): string {
    return this.toArabicIndic(ayahNo);
  }
}
