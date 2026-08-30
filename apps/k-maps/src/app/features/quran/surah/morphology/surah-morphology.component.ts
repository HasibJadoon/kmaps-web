import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { QuranApiService } from '../../../../shared/services/quran/quran-api.service';
import { QrMorphWord } from '../../../../shared/models/quran/qr.models';
import { QuranPageShellComponent } from '../../shared/quran-page-shell.component';
import { MorphWordCardComponent, MorphCardVm } from '../../shared/morph-word-card.component';

export type MorphFilter = 'all' | 'noun' | 'verb';

interface AyahGroup { ayah: number; ref: string; words: QrMorphWord[]; }

@Component({
  selector: 'km-surah-morphology',
  standalone: true,
  imports: [QuranPageShellComponent, MorphWordCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-morphology.component.html',
  styleUrl: './surah-morphology.component.scss',
})
export class SurahMorphologyComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private qrApi  = inject(QuranApiService);

  surahId  = signal(0);
  allWords = signal<QrMorphWord[]>([]);
  filter   = signal<MorphFilter>('all');
  loading  = signal(true);
  error    = signal<string | null>(null);

  readonly filters: { id: MorphFilter; label: string }[] = [
    { id: 'all',  label: 'All' },
    { id: 'noun', label: 'Nouns' },
    { id: 'verb', label: 'Verbs' },
  ];

  readonly visible = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.allWords() : this.allWords().filter(w => w.group === f);
  });

  readonly count = computed(() => {
    const w = this.allWords();
    return {
      all:  w.length,
      noun: w.filter(x => x.group === 'noun').length,
      verb: w.filter(x => x.group === 'verb').length,
    };
  });

  readonly groups = computed<AyahGroup[]>(() => {
    const map = new Map<number, QrMorphWord[]>();
    for (const w of this.visible()) {
      if (!map.has(w.ayah)) map.set(w.ayah, []);
      map.get(w.ayah)!.push(w);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([ayah, words]) => ({ ayah, ref: `${this.surahId()}:${ayah}`, words }));
  });

  toVm(w: QrMorphWord): MorphCardVm {
    return {
      group: w.group,
      posLabel: w.pos_en || (w.group === 'verb' ? 'Verb' : 'Noun'),
      isAnchor: w.is_anchor,
      arc: w.sense_arc_en,
      rangeText: w.sense_range_en || w.gloss_en,

      waznAr: w.group === 'verb' ? null : w.wazn_ar,
      rootDisplay: w.root_display,
      rootAr: w.root_ar,
      lemmaAr: w.lemma_ar ?? w.surface_ar,

      context: { ref: w.ref, surfaceAr: w.surface_ar, feats: w.feats ?? [] },
    };
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);

    this.qrApi.getSurahMorphology(id).subscribe({
      next: (res) => {
        this.allWords.set(res?.data?.words ?? []);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.message ?? 'Failed to load morphology');
        this.loading.set(false);
      },
    });
  }

  setFilter(f: MorphFilter): void { this.filter.set(f); }

  open(w: QrMorphWord): void {
    this.router.navigate(['/quran/surahs', this.surahId(), 'morphology', 'word', w.ayah, w.word_index]);
  }

  openRoot(root: string | null, event?: Event): void {
    event?.stopPropagation();
    const r = (root ?? '').replace(/\s+/g, '').trim();
    if (!r) return;
    this.router.navigate(['/lexicon/root', r]);
  }

  back(): void { this.router.navigate(['/quran/surahs', this.surahId(), 'linguistics']); }
}
