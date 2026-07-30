import {
  Component, DestroyRef, computed, inject, signal, ChangeDetectionStrategy, OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { of, catchError } from 'rxjs';
import {
  LucideAngularModule, LUCIDE_ICONS, LucideIconProvider,
  ScrollText, BookOpen, Library, BookMarked, Hash, Sparkles, GitFork, ListTree,
  Box, Zap, Palette, Circle, Layers, ArrowRight,
  Eye, BadgeCheck, Lamp, Waves, Languages, Crown, Droplets, Boxes,
} from 'lucide-angular';
import { LexiconSpineService } from '../lexicon-spine.service';
import {
  LexSourceRegistry, LexiconSourcesService,
} from '../../../features/lexicon/data/lexicon-sources.service';
import { AlDictionaryApiService } from '../../services/al-dictionary-api.service';
import { RootDisplay, Tri, FamilyLemmaVm, FamilyGroupVm, FamilyTierVm, LensVm } from '../word-grid.types';
import { MorphWordCardComponent, MorphCardVm } from '../../../features/quran/shared/morph-word-card.component';

type Lang = 'en' | 'ar' | 'ur';

/** The icon POOL (a fixed asset). Icon NAMES arrive from qr_morph_display_* data. */
const ROOT_LUCIDE = {
  ScrollText, BookOpen, Library, BookMarked, Hash, Sparkles, GitFork, ListTree,
  Box, Zap, Palette, Circle, Layers, ArrowRight,
  Eye, BadgeCheck, Lamp, Waves, Languages, Crown, Droplets, Boxes,
};
const ROOT_ICON_KEYS = new Set(Object.keys(ROOT_LUCIDE).map(k => k.toLowerCase()));

/**
 * Root view — the UNIVERSAL lexicon spine, rendered VERBATIM from the display layer
 * (qr_morph_display_root). Trilingual (EN/AR/UR) like the morphology layer; the
 * derived family renders as the shared 3D km-morph-word-card (universal-only — no
 * occurrence context). Every icon is a lucide name carried in the data.
 */
@Component({
  selector: 'km-root',
  standalone: true,
  imports: [LucideAngularModule, RouterLink, MorphWordCardComponent],
  providers: [{
    provide: LUCIDE_ICONS, multi: true,
    useValue: new LucideIconProvider(ROOT_LUCIDE),
  }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './root.component.html',
  styleUrl: './root.component.scss',
})
export class RootComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly spine = inject(LexiconSpineService);
  private readonly sources = inject(LexiconSourcesService);
  private readonly api = inject(AlDictionaryApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly root = signal<string>(this.route.snapshot.paramMap.get('root') ?? '');
  readonly display = signal<RootDisplay | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  /** Loaded once; until it lands, lens links stay unrendered rather than wrong. */
  private readonly sourceRegistry = signal<LexSourceRegistry | null>(null);

  /**
   * Reader slugs that actually hold this root, from the lexicon index itself.
   *
   * The display layer's own `on` flag can't stand in for this, in either
   * direction: for بين, Jamharat is `on: false` yet carries seven blocks the
   * reader renders, while al-ʿUbāb is also `on: false` and genuinely has no
   * entry. Gating on `on` would hide a real book and still link a dead one, so
   * membership here is what decides whether a chip is a link.
   */
  private readonly rootBooks = signal<ReadonlySet<string> | null>(null);

  readonly lang = signal<Lang>('en');
  readonly langs: { key: Lang; label: string }[] = [
    { key: 'en', label: 'EN' }, { key: 'ar', label: 'ع' }, { key: 'ur', label: 'UR' },
  ];
  setLang(l: Lang): void { this.lang.set(l); }

  ngOnInit(): void {
    this.sources.registry$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(reg => this.sourceRegistry.set(reg));

    const r = this.root();
    if (!r) { this.loading.set(false); return; }

    this.api.getV2RootCompare(r).pipe(
      catchError(() => of(null)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(c => {
      const slugs = (c?.sources ?? []).map(
        s => (s as { source_slug?: string; slug?: string }).source_slug
          ?? (s as { slug?: string }).slug ?? '');
      // A null response means the index couldn't be reached, not that no book has
      // the root; leaving this null keeps every chip linked rather than none.
      this.rootBooks.set(c ? new Set(slugs.filter(Boolean)) : null);
    });
    this.spine.rootDisplay(r).subscribe({
      next: (d) => { this.display.set(d); this.loading.set(false); },
      error: (e) => { this.error.set(e?.status === 404 ? 'No lexicon entry yet for this root' : (e?.message ?? 'Failed to load')); this.loading.set(false); },
    });
  }

  /** Pick the active language from a trilingual field (fall back EN → AR). */
  pick(t: Tri | null | undefined): string | null {
    if (!t) return null;
    const l = this.lang();
    return (l === 'ar' ? (t.ar ?? t.en) : l === 'ur' ? (t.ur ?? t.en) : (t.en ?? t.ar)) ?? null;
  }

  /** Font stack per active language — same families as the morphology views. */
  langFont(): string {
    switch (this.lang()) {
      case 'ar': return "'AmiriQuran','UthmanicHafs',serif";
      case 'ur': return "'NotoNastaliqUrdu',serif";
      default:   return "'Poppins',system-ui,sans-serif";
    }
  }
  get isRtl(): boolean { return this.lang() !== 'en'; }

  /** An icon name outside the pool makes lucide-angular THROW mid-render and kills the
   *  page. Every data-supplied name goes through this clamp. */
  safeIcon(name: string | null | undefined, fallback = 'circle'): string {
    const key = String(name ?? '').replace(/[-_\s]/g, '').toLowerCase();
    return key && ROOT_ICON_KEYS.has(key) ? String(name) : fallback;
  }

  sectionIcon(key: string): string { return this.safeIcon(this.display()?.section_icons?.[key]); }

  /** The form-family name is the wazn itself — always Arabic (تَفْعِيل), from the master table. */
  familyName(g: FamilyGroupVm): string { return g.arabic_name ?? ''; }
  /** English descriptor kept as a gloss beside the wazn (english-primary convention). */
  familyGloss(g: FamilyGroupVm): string | null {
    return this.lang() === 'ar' ? null : (g.english_name ?? null);
  }
  /** Tier name (الثلاثي المجرّد / المزيد فيه) — Arabic always; gloss in EN/UR. */
  tierName(t: FamilyTierVm): string { return t.arabic_name ?? ''; }
  tierGloss(t: FamilyTierVm): string | null {
    const l = this.lang();
    return l === 'ar' ? null : l === 'ur' ? (t.urdu_name ?? t.english_name ?? null) : (t.english_name ?? null);
  }
  /**
   * The book the «Lexicon» link opens.
   *
   * The first lens that resolves to a real reader slug. Lens slugs come from the
   * Qurʾān worker's display layer, which names books differently from the lexicon
   * index (`ketabonline_al_jawhari_al_sihah` vs `jawhari_sihah`) and leaves three
   * of them — al-Qāmūs, al-ʿUbāb, Jamharat — with no slug at all, so each one is
   * resolved through the source registry (by title when it has no usable slug)
   * rather than linked raw. Ordering is the display layer's, which puts Maqāyīs
   * first — the etymological core — a good place to land. Once inside, the
   * reader's book strip switches books without coming back here.
   */
  readonly lexiconBook = computed<string | null>(() => {
    if (!this.sourceRegistry()) return null;
    for (const l of this.display()?.lenses ?? []) {
      const slug = this.lensBook(l);
      if (slug) return slug;
    }
    return null;
  });

  /**
   * `?book=` for one lens chip — null when the book has no entry for this root, so
   * the chip stays a plain label instead of a link onto an empty page.
   */
  lensBook(l: LensVm): string | null {
    const slug = this.sourceRegistry()?.resolve(l.slug, l.label ?? l.heading);
    if (!slug) return null;
    const have = this.rootBooks();
    if (have && !have.has(slug)) return null;
    return slug;
  }

  /** A family lemma → universal-only card VM (no context → the 3D card shows the lemma). */
  famVm(f: FamilyLemmaVm): MorphCardVm {
    const d = this.display();
    return {
      group: (f.pos ?? '').toLowerCase().includes('verb') ? 'verb' : 'noun',
      posLabel: f.pos ?? '',
      isAnchor: false,
      arc: null, rangeText: null, waznAr: null,
      rootDisplay: d?.root_display ?? null,
      rootAr: d?.root ?? null,
      lemmaAr: f.lemma_ar,
      context: null,
    };
  }
}
