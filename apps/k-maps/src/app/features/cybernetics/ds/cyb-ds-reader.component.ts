// ─── The desktop root reader ─────────────────────────────────────────────────
//
// Design 1b + 1c: a sticky chapter rail on the left, one wide reading column,
// and the whole root on ONE page — every layer, every lemma, every card.
//
// The Almaany move is the stacking. Almaany shows a word as a run of cards, one
// per book, each in the book's own voice, and you read down them; you are never
// asked to click through to find out what al-Jawharī said. That is the shape
// here too, with the section standing where the book stands.
//
// What it does NOT copy is Almaany's chrome. The priority is the classical
// setting — Amiri for Arabic, generous leading, the gold-on-dark manuscript
// palette this app already uses for the Lexicon reader — so the page reads like
// a printed muʿjam rather than a web dictionary.
//
// Everything here is chrome. The order of the chapters, which sections are in
// them, what is muted and what is lit, how many rows were held back: all of it
// arrived decided from the worker. If you want to sort something in this file,
// the sort belongs in the ds.

import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CybDsBlockComponent } from './cyb-ds-block.component';
import type { DisplaySpec, DsSection } from '@kmaps/contracts/ds';

interface ChapterView {
  key: string;
  title: string;
  title_ar?: string;
  question: string;
  sections: DsSection[];
  /** Held rows across the chapter — what a reader would otherwise not know. */
  rows: number;
}

@Component({
  selector: 'km-ds-reader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CybDsBlockComponent],
  template: `
    @let s = spec();

    <div class="reader">
      <!-- ── the rail ────────────────────────────────────────────────────── -->
      <nav class="rail">
        <div class="rl">Reading</div>
        <div class="rsubj">
          <span class="ar">{{ s.subject.display.text }}</span>
          <em>{{ s.subject.kind }}</em>
        </div>

        <div class="rcounts">
          <span class="filled">{{ s.summary.filled }} filled</span>
          <span>{{ s.summary.empty }} empty</span>
          <span class="unknown">{{ s.summary.unknown }} unread</span>
          <span>{{ s.summary.rows }} rows</span>
        </div>

        @for (ch of chapters(); track ch.key) {
          <a class="rch" [href]="'#ch-' + ch.key">
            <span class="rct">{{ ch.title }}</span>
            @if (ch.title_ar) { <span class="ar rca">{{ ch.title_ar }}</span> }
            <span class="rcodes">
              @for (sec of ch.sections; track sec.code) {
                <em [attr.data-state]="sec.state">{{ sec.code }}</em>
              }
            </span>
          </a>
        }

        <!-- The three states, named. A reader who does not know that "unread"
             is not "empty" will read every dim section as an absence. -->
        <div class="legend">
          <span data-state="filled">filled</span>
          <span data-state="empty">empty · measured zero</span>
          <span data-state="unknown">unread · no carrier bound</span>
        </div>
      </nav>

      <!-- ── the reading column ──────────────────────────────────────────── -->
      <main class="col">
        <header class="hero">
          <span class="ar mark">{{ s.subject.display.text }}</span>
          <div class="hmeta">
            <div class="href">{{ s.subject.ref }} <em>· {{ s.subject.kind }}</em></div>
            @if (s.plane?.readings?.length) {
              <div class="axes">
                @for (r of s.plane!.readings; track r.axis) {
                  <span class="axis" [class.unmeasured]="!r.measured">
                    {{ r.axis }}
                    <!-- The flag is the claim, not the number: an axis nobody
                         has read shows a dash, never 0%. -->
                    <b>{{ r.measured ? r.pct + '%' : '—' }}</b>
                  </span>
                }
              </div>
            }
          </div>
        </header>

        @for (ch of chapters(); track ch.key) {
          <section class="chapter" [id]="'ch-' + ch.key">
            <div class="chd">
              <h2>{{ ch.title }}</h2>
              @if (ch.title_ar) { <span class="ar cha">{{ ch.title_ar }}</span> }
              <p class="q">{{ ch.question }}</p>
            </div>

            <!-- One card per section, stacked and read downward. -->
            @for (sec of ch.sections; track sec.code) {
              <article class="sec" [attr.data-state]="sec.state"
                       [style.--accent]="sec.accent || 'var(--rule-strong)'">
                <div class="sh">
                  @if (sec.icon) { <span class="icon">{{ sec.icon }}</span> }
                  <span class="title">{{ sec.title }}</span>
                  @if (sec.title_ar) { <span class="ar tar">{{ sec.title_ar }}</span> }
                  <span class="code">{{ sec.code }}</span>
                  <span class="state" [attr.data-state]="sec.state">{{ stateLabel(sec) }}</span>
                </div>

                <div class="blocks">
                  @for (b of sec.blocks; track $index) {
                    <km-ds-block [block]="b" />
                  }
                </div>

                @if (sec.carriers.length) {
                  <!-- Naming the tables is how a reader goes and checks. -->
                  <div class="carriers">
                    @for (c of sec.carriers; track c) { <span>{{ c }}</span> }
                  </div>
                }
              </article>
            }
          </section>
        }
      </main>
    </div>
  `,
  styleUrl: './cyb-ds-reader.component.scss',
})
export class CybDsReaderComponent {
  readonly spec = input.required<DisplaySpec>();

  /** Chapters with their sections attached. Grouping only — the spec decided
   *  the order, which chapter each section is in, and what is in each. */
  readonly chapters = computed<ChapterView[]>(() => {
    const s = this.spec();
    return s.chapters.map((c) => {
      const sections = s.sections.filter((x) => x.chapter === c.key);
      return {
        key: c.key,
        title: c.title,
        title_ar: c.title_ar,
        question: c.question,
        sections,
        rows: sections.reduce((a, x) => a + x.total_rows, 0),
      };
    });
  });

  /** `unread` rather than `unknown`: the reader's word for "nobody looked". */
  stateLabel(sec: DsSection): string {
    if (sec.state === 'filled') return `${sec.total_rows} rows`;
    return sec.state === 'unknown' ? 'unread' : 'empty';
  }
}
