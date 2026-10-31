import {
  Component, ChangeDetectionStrategy, AfterViewInit,
  inject, signal, computed, OnInit
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';
import { HubCardComponent } from '../hub-card/hub-card.component';
import { HubPanelComponent } from '../hub-panel/hub-panel.component';
import { HubPanelService } from '../hub-panel.service';
import { HubCard } from '../models/hub.models';
import { QURAN_CARDS } from '../cards/quran.cards';
import { ARABIC_CARDS } from '../cards/arabic.cards';
import { WORLDVIEW_CARDS } from '../cards/worldview.cards';
import { WORKSPACE_CARDS } from '../cards/workspace.cards';

const CARD_MAP: Record<string, HubCard[]> = {
  quran: QURAN_CARDS,
  arabic: ARABIC_CARDS,
  worldview: WORLDVIEW_CARDS,
  workspace: WORKSPACE_CARDS,
};

const SECTION_META: Record<string, { title: string; subtitle: string; glyph: string; tag: string }> = {
  quran:     { title: 'Quran',     subtitle: 'Scripture Management',      glyph: '☽', tag: 'SCRIPTURE' },
  arabic:    { title: 'Arabic',    subtitle: 'Language & Linguistics',     glyph: 'ع', tag: 'LANGUAGE' },
  worldview: { title: 'Worldview', subtitle: 'Knowledge & Research',       glyph: '◎', tag: 'KNOWLEDGE' },
  workspace: { title: 'Workspace', subtitle: 'Collaboration & Projects',   glyph: '⊞', tag: 'EXECUTION' },
};

@Component({
  selector: 'km-hub-section',
  standalone: true,
  imports: [CommonModule, HubCardComponent, HubPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hub-section.component.html',
  styleUrl: './hub-section.component.scss'
})
export class HubSectionComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly panel = inject(HubPanelService);

  readonly section = signal<string>('');
  // No worker serves per-card hub counts yet (the old fetch('/hub/counts') hit the page
  // origin and never returned data), so cards render without a count.
  readonly counts = signal<Record<string, number>>({});

  readonly cards = computed(() => CARD_MAP[this.section()] ?? []);
  readonly meta = computed(() => SECTION_META[this.section()]);

  ngOnInit(): void {
    const s = this.route.snapshot.data['section'] as string;
    this.section.set(s);
  }

  ngAfterViewInit(): void {
    gsap.fromTo('.hs__header',
      { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: .6, ease: 'power3.out' }
    );
    gsap.fromTo('km-hub-card',
      { opacity: 0, y: 28, scale: .95 },
      { opacity: 1, y: 0, scale: 1, duration: .5, stagger: .07, ease: 'power3.out', clearProps: 'transform', delay: .2 }
    );
  }


  openCard(card: HubCard): void {
    this.router.navigate([card.route], { relativeTo: this.route });
  }

  goBack(): void {
    this.router.navigate(['/hub']);
  }
}
