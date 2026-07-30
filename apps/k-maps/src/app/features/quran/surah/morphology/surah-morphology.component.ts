import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { QuranApiService } from '../../../../shared/services/quran/quran-api.service';
import { QrMorphWord } from '../../../../shared/models/quran/qr.models';
import { QuranPageShellComponent } from '../../shared/quran-page-shell.component';
import { MorphWordCardComponent, MorphCardVm } from '../../shared/morph-word-card.component';

export type MorphFilter = 'all' | 'noun' | 'verb';

/** Content words of one ayah, in reading order — the by-verse arrangement. */
interface AyahGroup { ayah: number; ref: string; words: QrMorphWord[]; }

/**
 * Surah Morphology — rich word-card grid, arranged by verse.
 *
 * A logic-free renderer: every card is painted straight from the shaped payload
 * returned by GET /qr/surahs/:id/morphology. All shaping (lemma headline, gloss,
 * derived type, wazn, sense list, spaced root, filter buckets) happens in the
 * quran worker; this component only groups by ayah, filters, and paints.
 */
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

  /** Live tallies for the filter chips. */
  readonly count = computed(() => {
    const w = this.allWords();
    return {
      all:  w.length,
      noun: w.filter(x => x.group === 'noun').length,
      verb: w.filter(x => x.group === 'verb').length,
    };
  });

  /** Cards arranged by verse: one group per ayah, in reading order. */
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

  /** Map a shaped word row onto the shared card view-model. */
  toVm(w: QrMorphWord): MorphCardVm {
    return {
      group: w.group,
      posLabel: w.pos_en || (w.group === 'verb' ? 'Verb' : 'Noun'),
      isAnchor: w.is_anchor,
      arc: w.sense_arc_en,
      rangeText: w.sense_range_en || w.gloss_en,
      // verbs carry their pattern as the form/family chip → no redundant header wazn
      waznAr: w.group === 'verb' ? null : w.wazn_ar,
      rootDisplay: w.root_display,
      rootAr: w.root_ar,
      lemmaAr: w.lemma_ar ?? w.surface_ar,
      // morphology step = occurrence context → the contextual band
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

  /** Open the full word-study view (Morph Display Layer) for this word. */
  open(w: QrMorphWord): void {
    this.router.navigate(['/quran/surahs', this.surahId(), 'morphology', 'word', w.ayah, w.word_index]);
  }

  /**
   * Open the lexicon on this word's root.
   *
   * Goes to the real lexicon (`/lexicon/root/:root`), which lands on the root's
   * own page — gloss, Qurʾānic frequency, derived family, and a snippet per book
   * with a way into each — rather than the researcher tab's separate root panel.
   * From there a book opens the full reader with its ṣarf family.
   *
   * The root is sent as typed apart from stripping the display spacing: folding
   * spellings onto the stored form is the worker's job (`lib/root_query.ts`), not
   * a second implementation per caller.
   */
  openRoot(root: string | null, event?: Event): void {
    event?.stopPropagation();
    const r = (root ?? '').replace(/\s+/g, '').trim();
    if (!r) return;
    this.router.navigate(['/lexicon/root', r]);
  }

  back(): void { this.router.navigate(['/quran/surahs', this.surahId(), 'linguistics']); }
}
