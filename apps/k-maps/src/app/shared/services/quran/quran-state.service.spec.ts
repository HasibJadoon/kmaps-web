import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QuranStateService } from './quran-state.service';
import type { QuranSurahListItemDto } from '../../models/quran/quran.models';

describe('QuranStateService sūra range', () => {
  let state: QuranStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    state = TestBed.inject(QuranStateService);
  });

  it('checks only the lower bound before the list has loaded', () => {
    expect(state.surahCount()).toBeNull();
    expect(state.isSurahNo(0)).toBe(false);
    expect(state.isSurahNo(500)).toBe(true);
    expect(state.clampSurah(-3)).toBe(1);
    expect(state.clampSurah(500)).toBe(500);
  });

  it('uses the count the QR worker reported once loaded', () => {
    state.surahs.set(Array.from({ length: 7 }, (_, i) => ({ surahNumber: i + 1 }) as QuranSurahListItemDto));
    expect(state.surahCount()).toBe(7);
    expect(state.isSurahNo(7)).toBe(true);
    expect(state.isSurahNo(8)).toBe(false);
    expect(state.isSurahNo(2.5)).toBe(false);
    expect(state.clampSurah(99)).toBe(7);
    expect(state.clampSurah(Number.NaN)).toBe(1);
  });
});
