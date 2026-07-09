import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { StudyReadingAyah } from '../ar-quran-study.facade';

type StudyReadingRenderAyah = StudyReadingAyah & {
  words: string[];
};

@Component({
  selector: 'app-study-reading-tab',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './study-reading-tab.component.html',
})
export class StudyReadingTabComponent {
  private static readonly WORD_SPLIT_RE = /\s+/;
  private static readonly ARABIC_DIACRITICS_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

  private _ayahs: StudyReadingAyah[] = [];

  renderAyahs: StudyReadingRenderAyah[] = [];
  hasTranslations = false;

  @Input()
  set ayahs(value: StudyReadingAyah[] | null | undefined) {
    this._ayahs = Array.isArray(value) ? value : [];
    this.renderAyahs = this._ayahs
      .map((ayah) => ({
        ...ayah,
        words: this.toWords(ayah.text),
      }))
      .filter((ayah) => ayah.words.length > 0);

    this.hasTranslations = this.renderAyahs.some((ayah) => Boolean(ayah.translation));
  }

  get ayahs(): StudyReadingAyah[] {
    return this._ayahs;
  }

  trackByAyah(_: number, ayah: StudyReadingRenderAyah): string {
    return ayah.id;
  }

  trackByWord(index: number): number {
    return index;
  }

  private toWords(value: string): string[] {
    if (!value) return [];
    const plain = this.stripArabicDiacritics(value);
    return plain
      .trim()
      .split(StudyReadingTabComponent.WORD_SPLIT_RE)
      .filter((word) => word.length > 0);
  }

  private stripArabicDiacritics(value: string): string {
    return value.replace(StudyReadingTabComponent.ARABIC_DIACRITICS_RE, '');
  }
}
