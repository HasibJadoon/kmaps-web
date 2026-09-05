import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { DeckLangMode, DeckSlide, DeckVerseRef } from '../../../domain/deck.models';
import type { GlossedLine } from '../../../domain/slide-lines';
import {
  arabicDigits, baytLines, glossedLines, noteSegments, quranRefIndex, splitColumns, splitStem, tableRows,
} from '../../../domain/slide-lines';

/**
 * The eleven cases. This component is a renderer and nothing else: every
 * decision it makes comes off the row, and every structural rule it applies is
 * a pure function from ../domain/slide-lines. Contract §3.
 */
@Component({
  selector: 'km-deck-slide',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './slide-view.component.html',
  styleUrl: './slide-view.component.scss',
  host: {
    '[class]': 'hostClass()',
    '[attr.dir]': '"rtl"',
  },
})
export class SlideViewComponent {
  readonly slide = input.required<DeckSlide>();
  readonly lang = input<DeckLangMode>('both');

  protected readonly hostClass = computed(() => {
    const s = this.slide();
    return `deck-slide deck-slide--${s.layout}` + (s.accent ? ` deck-slide--accent-${s.accent}` : '');
  });

  protected readonly lines = computed(() => glossedLines(this.slide()));

  /**
   * The Keynote frame: a title band across the top, then the content. Which
   * line is the title depends on the layout — the first line for most, the
   * stem for split, the first plain line for shahid, none for the layouts
   * whose lines are all content (transform, examples, bayt, title).
   */
  private readonly headlineIndex = computed<number>(() => {
    const s = this.slide();
    switch (s.layout) {
      case 'title': case 'transform': case 'examples': case 'bayt': return -1;
      case 'shahid': return glossedLines(s).findIndex((l) => !l.isQuran && !l.isTaqdir);
      default: return s.lines_ar.length ? 0 : -1;
    }
  });

  protected readonly headline = computed<GlossedLine | null>(() => {
    const i = this.headlineIndex();
    return i < 0 ? null : this.lines()[i] ?? null;
  });

  /** Everything the band did not take, with its original index kept. */
  protected readonly body = computed(() => {
    const head = this.headlineIndex();
    return this.lines()
      .map((line, index) => ({ line, index }))
      .filter((x) => x.index !== head);
  });

  /** table: head rows go to the band; only real rows stay in the grid. */
  protected readonly bodyRows = computed(() => tableRows(this.slide()).filter((r) => !r.head));
  protected readonly stem = computed(() => splitStem(this.slide()));
  protected readonly columns = computed(() => splitColumns(this.slide()));
  protected readonly rows = computed(() => tableRows(this.slide()));
  protected readonly bayt = computed(() => baytLines(this.slide()));

  protected readonly notes = computed(() =>
    this.slide().notes_en.map((n) => ({ raw: n, segments: noteSegments(n) })),
  );

  /** `ar` hides the glosses; `en` keeps both but lets English lead visually. */
  protected readonly showGloss = computed(() => this.lang() !== 'ar');
  protected readonly showNotes = computed(() => this.lang() !== 'ar');

  private readonly refIndex = computed(() => quranRefIndex(this.slide()));

  /** The verse ref a Qurʾānic line wears as its tag, if the deck supplied one. */
  protected refFor(lineIndex: number): DeckVerseRef | null {
    const k = this.refIndex().get(lineIndex);
    return k === undefined ? null : this.slide().verse_refs[k] ?? null;
  }

  /** Refs not already worn by a card — rendered as pills at the foot. */
  protected readonly looseRefs = computed(() => {
    const worn = this.refIndex().size;
    return this.slide().verse_refs.slice(worn);
  });

  protected digits(n: number): string { return arabicDigits(n); }

  /**
   * A pill does not navigate. It raises the ref and lets the host decide what
   * to open, so this renderer knows nothing about the Quran feature.
   */
  protected onRef(event: Event, ref: DeckVerseRef): void {
    event.preventDefault();
    (event.target as HTMLElement).dispatchEvent(
      new CustomEvent('kmaps:ayah', { detail: { ref: ref.ref }, bubbles: true }),
    );
  }
}
