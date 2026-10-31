import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import gsap from 'gsap';
import { QuranStateService } from '../../../../shared/services/quran/quran-state.service';
import { HomePlaneButtonComponent } from '../../../../shared/components/home-plane-button/home-plane-button.component';
import { SurahActionsComponent } from '../card/surah-actions/surah-actions.component';
import { SurahCardComponent } from '../card/surah-card/surah-card.component';

import { PressableDirective } from '../../../../shared/directives/pressable.directive';
@Component({
  selector: 'km-quran-surahs',
  standalone: true,
  imports: [PressableDirective, FormsModule, TitleCasePipe, SurahActionsComponent, HomePlaneButtonComponent, SurahCardComponent],
  templateUrl: './surah-index.component.html',
  styleUrl: './surah-index.component.scss',
})
export class SurahIndexComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  readonly quranState = inject(QuranStateService);

  @ViewChild('cardsContainer') cardsContainer!: ElementRef<HTMLElement>;

  searchQuery = signal('');
  typeFilter = signal<'all' | 'makki' | 'madani'>('all');
  viewMode = signal<'grid' | 'list'>('grid');

  filteredSurahs = computed(() => {
    const t = this.typeFilter();

    const tokens = this.searchQuery()
      .trim()
      .split(/\s+/)
      .filter((tok) => tok.length > 0);

    return this.quranState.surahs().filter((s) => {
      if (tokens.length > 0) {

        const name = normalizeLatin(s.transliteratedName);
        const eng = normalizeLatin(s.englishName ?? '');
        const slug = normalizeLatin(s.slug ?? '');
        const ar = normalizeArabic(s.arabicName ?? '');
        const num = String(s.surahNumber);

        const matchesSearch = tokens.every((tok) => {
          const latin = normalizeLatin(tok);
          const arabic = normalizeArabic(tok);
          return (
            (latin.length > 0 &&
              (name.includes(latin) ||
                eng.includes(latin) ||
                slug.includes(latin))) ||
            (arabic.length > 0 && ar.includes(arabic)) ||
            num === tok ||
            num.includes(tok)
          );
        });
        if (!matchesSearch) return false;
      }

      return t === 'all' || s.revelationType === t;
    });
  });

  ngOnInit(): void {
    this.quranState.load();
  }

  ngAfterViewInit(): void {
    this.animateCards();
  }

  animateCards(): void {
    const cards = this.cardsContainer?.nativeElement?.querySelectorAll(
      '.surah-card, .surah-row'
    );
    if (cards && cards.length) {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.025, ease: 'power2.out' }
      );
    }
  }

  setSearch(value: string): void { this.searchQuery.set(value); }
  setTypeFilter(value: 'all' | 'makki' | 'madani'): void { this.typeFilter.set(value); }
  setViewMode(mode: 'grid' | 'list'): void { this.viewMode.set(mode); }

  navigateToSurah(surahNumber: number): void {
    this.router.navigate(['/quran', 'surahs', surahNumber]);
  }

  back(): void {
    this.router.navigate(['/quran']);
  }
}

function normalizeLatin(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeArabic(value: string): string {
  return value
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}
