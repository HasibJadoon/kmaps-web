import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import {
  LucideAngularModule, LUCIDE_ICONS, LucideIconProvider,
  ScrollText, BookOpen, Library, BookMarked, Hash, Sparkles, GitFork, ListTree,
  Box, Zap, Palette, Circle,
} from 'lucide-angular';
import { LexiconSpineService } from '../lexicon-spine.service';
import { RootDisplay } from '../word-grid.types';

/**
 * Root view — the UNIVERSAL lexicon spine, rendered VERBATIM from the display layer
 * (qr_morph_display_roots). Every icon is a lucide name carried in the data
 * (lens.icon, family.pos_icon, section_icons.*); this component chooses none.
 * The registered icon set below is a fixed glyph asset (the "typeface") — names come
 * from data and fall back safely if absent.
 */
@Component({
  selector: 'km-root',
  standalone: true,
  imports: [LucideAngularModule],
  providers: [{
    provide: LUCIDE_ICONS, multi: true,
    useValue: new LucideIconProvider({
      ScrollText, BookOpen, Library, BookMarked, Hash, Sparkles, GitFork, ListTree,
      Box, Zap, Palette, Circle,
    }),
  }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './root.component.html',
  styleUrl: './root.component.scss',
})
export class RootComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly spine = inject(LexiconSpineService);

  readonly root = signal<string>(this.route.snapshot.paramMap.get('root') ?? '');
  readonly display = signal<RootDisplay | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const r = this.root();
    if (!r) { this.loading.set(false); return; }
    this.spine.rootDisplay(r).subscribe({
      next: (d) => { this.display.set(d); this.loading.set(false); },
      error: (e) => { this.error.set(e?.status === 404 ? 'No lexicon entry yet for this root' : (e?.message ?? 'Failed to load')); this.loading.set(false); },
    });
  }

  /** Section icon name from data (empty → lucide renders nothing harmful). */
  sectionIcon(key: string): string {
    return this.display()?.section_icons?.[key] ?? '';
  }
}
