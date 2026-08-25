// ─── A whole display spec, rendered ──────────────────────────────────────────
//
// Sections in the order the worker sent them, each with the band's own colour
// and glyph from the registry. No sorting, no filtering, no deriving here: the
// spec arrives in the order it should be read.
//
// Sections holding nothing are drawn, not skipped. For a typical root most of
// them are empty or unknown — identity and phonology cover the whole corpus,
// sense arcs cover fifty-three roots — and a screen that quietly omits them
// tells the reader the root has fewer layers than it has.

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CybDsBlockComponent } from './cyb-ds-block.component';
import type { DisplaySpec, DsReading } from '@kmaps/contracts/ds';

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

    <div class="sections">
      @for (sec of s.sections; track sec.code) {
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
  `,
  styleUrl: './cyb-ds-spec.component.scss',
})
export class CybDsSpecComponent {
  readonly spec = input.required<DisplaySpec>();

  /** Axes the plane has actually measured — used by callers that want a
   *  headline number rather than the full strip. */
  readonly measured = computed<DsReading[]>(() =>
    (this.spec().plane?.readings ?? []).filter((r) => r.measured));
}
