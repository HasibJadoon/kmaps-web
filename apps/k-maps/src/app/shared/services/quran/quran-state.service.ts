import { Injectable, computed, inject, signal } from '@angular/core';
import { QuranApiService } from './quran-api.service';
import { QuranSurahListItemDto } from '../../models/quran/quran.models';
import { mapQrMenuSurahToListItem } from './quran-api.mapper';

@Injectable({ providedIn: 'root' })
export class QuranStateService {
  private readonly qrApi = inject(QuranApiService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly surahs = signal<QuranSurahListItemDto[]>([]);

  /** How many sūras the QR worker's list holds; null until it has loaded. */
  readonly surahCount = computed(() => this.surahs().length || null);

  /** Whether n is a sūra number. Before the list loads only the lower bound is
   *  checked — the QR worker rejects anything out of range anyway. */
  isSurahNo(n: number): boolean {
    if (!Number.isInteger(n) || n < 1) return false;
    const count = this.surahCount();
    return count == null || n <= count;
  }

  /** n clamped into the sūra range the worker reports (lower bound only until loaded). */
  clampSurah(n: number): number {
    const v = Number.isFinite(n) ? Math.max(1, Math.trunc(n)) : 1;
    const count = this.surahCount();
    return count == null ? v : Math.min(count, v);
  }

  load(): void {
    if (this.surahs().length > 0) return;
    this.loading.set(true);
    this.error.set(null);
    this.qrApi.getMenu().subscribe({
      next: (res) => {
        this.surahs.set(res.data.surahs.map(mapQrMenuSurahToListItem));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load surahs');
        this.loading.set(false);
      },
    });
  }
}
