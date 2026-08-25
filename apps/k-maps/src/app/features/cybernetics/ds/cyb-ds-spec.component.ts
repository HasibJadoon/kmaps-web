// ─── A whole display spec, rendered ──────────────────────────────────────────
//
// Grouped into the reader's chapters — what it is, what it means, who says so —
// because that is the shape of the information, not `00-CORE` and `12-ASL`.
// Those registry codes are exactly right for a build plan and exactly wrong for
// someone trying to understand a word, so they stay on the section, small,
// where a builder can still find the carrier.
//
// No sorting, no filtering, no deriving here: the spec already arrives in the
// order it should be read, chapters and all.
//
// Sections holding nothing are drawn, not skipped. For a typical root most of
// them are empty or unknown — identity and phonology cover the whole corpus,
// sense arcs cover fifty-three roots — and a screen that quietly omits them
// tells the reader the root has fewer layers than it has.

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CybDsBlockComponent } from './cyb-ds-block.component';
import type { DisplaySpec, DsReading, DsSection } from '@kmaps/contracts/ds';

@Component({
  selector: 'km-ds-spec',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CybDsBlockComponent],
  template: `
    @let s = spec();

    <header class="subject">
      <span class="mark" [class.ar]="s.subject.display.script === 'ar'">{{ s.subject.display.text }}</span>
      <div class="meta">
        <div class="ref">{{ s.subject.ref }} <em>· {{ s.subject.kind }}</em></div>
        <div class="counts">
          <b class="filled">{{ s.summary.filled }}</b> filled
          · <b>{{ s.summary.empty }}</b> empty
          · <b class="unknown">{{ s.summary.unknown }}</b> unknown
          · {{ s.summary.rows }} rows
        </div>
      </div>

      @if (s.plane?.readings?.length) {
        <div class="axes">
          @for (r of s.plane!.readings; track r.axis) {
            <div class="axis" [class.unmeasured]="!r.measured">
              <span class="al">{{ r.axis }}
                <!-- The number is not the claim; the flag is. An axis nobody
                     has read shows a dash, never 0%. -->
                <b>{{ r.measured ? r.pct + '%' : '—' }}</b>
              </span>
              <span class="at" [class.none]="!r.measured">
                <i [style.width.%]="r.measured ? r.pct : 0"></i>
              </span>
              <span class="an">
                {{ r.measured ? r.read_sensors + ' of ' + r.sensors + ' sensors read'
                              : 'no sensor has read this' }}
                @if (r.stale) { · stale }
              </span>
            </div>
          }
        </div>
      }
    </header>

    @for (ch of s.chapters; track ch.key) {
      <div class="chapter">
        <div class="ch">
          <h2>{{ ch.title }}</h2>
          @if (ch.title_ar) { <span class="ar char">{{ ch.title_ar }}</span> }
          <!-- The question this chapter answers, in the reader's words. -->
          <p class="q">{{ ch.question }}</p>
        </div>

        <div class="sections">
          @for (sec of sectionsIn(ch.key); track sec.code) {
        <section class="sec" [attr.data-state]="sec.state"
                 [style.--accent]="sec.accent || 'var(--rule-strong)'">
          <div class="sh">
            @if (sec.icon) { <span class="icon">{{ sec.icon }}</span> }
            <span class="code">{{ sec.code }}</span>
            <span class="title">{{ sec.title }}</span>
            @if (sec.title_ar) { <span class="ar tar">{{ sec.title_ar }}</span> }
            <span class="state" [attr.data-state]="sec.state">{{ sec.state }}</span>
            @if (sec.total_rows) { <span class="rows">{{ sec.total_rows }}</span> }
          </div>

          <div class="blocks">
            @for (b of sec.blocks; track $index) {
              <km-ds-block [block]="b" />
            }
          </div>

          @if (sec.carriers.length) {
            <div class="carriers">
              @for (c of sec.carriers; track c) { <span>{{ c }}</span> }
            </div>
          }
        </section>
          }
        </div>
      </div>
    }
  `,
  styleUrl: './cyb-ds-spec.component.scss',
})
export class CybDsSpecComponent {
  readonly spec = input.required<DisplaySpec>();

  /** The sections of one chapter, in the order they arrived. Grouping only —
   *  the spec decided which chapter each belongs to and what order they go in. */
  sectionsIn(key: string): DsSection[] {
    return this.spec().sections.filter((s) => s.chapter === key);
  }

  /** Axes the plane has actually measured — used by callers that want a
   *  headline number rather than the full strip. */
  readonly measured = computed<DsReading[]>(() =>
    (this.spec().plane?.readings ?? []).filter((r) => r.measured));
}
