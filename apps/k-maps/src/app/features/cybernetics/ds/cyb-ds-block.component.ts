// ─── One block of a display spec, rendered ───────────────────────────────────
//
// Logic-free by construction. Every ordering, join, title choice, weight and
// count was decided by the worker; this decides layout, chrome and fonts and
// nothing else. If you find yourself wanting to sort something here, the sort
// belongs in the spec — that is the whole point of the exercise.
//
// The switch is exhaustive over the vocabulary, which is what lets it narrow
// without a cast in sight. Forward compatibility is handled one layer out: the
// page runs every spec through `normaliseSpec`, which turns a kind this build
// has never heard of into a note that says so. By the time a block reaches
// here it is always one this renderer can draw — and a reader never meets a
// blank section, which is the failure this design exists to avoid.

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { DsBlock, DsText } from '@kmaps/contracts/ds';

@Component({
  selector: 'km-ds-block',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  template: `
    @let b = block();

    @if (b.title || b.hint) {
      <div class="bh">
        @if (b.title) { <span class="t">{{ b.title }}</span> }
        @if (b.hint) { <span class="h">{{ b.hint }}</span> }
      </div>
    }

    @switch (b.kind) {

      @case ('hero') {
        <div class="hero">
          <div class="mark" [class.ar]="b.mark.script === 'ar'">{{ b.mark.text }}</div>
          @if (b.ar) { <p class="ar rtl">{{ b.ar.text }}</p> }
          @if (b.en) { <p class="en">{{ b.en.text }}</p> }
          @if (b.ur) { <p class="ar rtl ur">{{ b.ur.text }}</p> }
          @if (b.facts?.length) {
            <div class="facts">
              @for (f of b.facts; track f.label) {
                <span class="fact"><i>{{ f.label }}</i> {{ f.value.text }}</span>
              }
            </div>
          }
        </div>
      }

      @case ('grid') {
        <!-- A root's radicals are a right-to-left sequence: the fāʾ is the
             RIGHTMOST cell, not the leftmost. Laid out ltr, كتب reads ك-ت-ب
             across the page, which is the root backwards. -->
        <div class="grid" [class.rtl]="isArabicGrid(b.cells)">
          @for (c of b.cells; track c.id) {
            <div class="cell" [class.muted]="c.muted" [class.hi]="c.highlighted">
              <span class="cmark" [class.ar]="c.mark.script === 'ar'">{{ c.mark.text }}</span>
              @if (c.caption) { <span class="ccap">{{ c.caption }}</span> }
              @if (c.footnote) { <span class="cfoot">{{ c.footnote }}</span> }
            </div>
          }
        </div>
        <ng-container *ngTemplateOutlet="more; context: { $implicit: b.overflow_count }" />
      }

      @case ('chain') {
        @if (b.summary) { <p class="ar rtl summary">{{ b.summary.text }}</p> }
        <ol class="chain">
          @for (n of b.nodes; track n.id; let i = $index) {
            <li [class.terminal]="n.terminal" [class.unresolved]="n.unresolved">
              <span class="ord">{{ i + 1 }}</span>
              <div class="nbody">
                <span class="ntitle" [class.ar]="n.title.script === 'ar'">{{ n.title.text }}</span>
                @if (n.subtitle) { <span class="nsub">{{ n.subtitle }}</span> }
                @if (n.detail) { <span class="ndet">{{ n.detail }}</span> }
              </div>
            </li>
          }
        </ol>
      }

      @case ('bars') {
        <div class="bars">
          @for (r of b.bars; track r.id) {
            <div class="bar">
              <div class="blabel">
                <span [class.ar]="r.label.script === 'ar'">{{ r.label.text }}</span>
                @if (r.sublabel) { <em>{{ r.sublabel }}</em> }
                @if (r.note) { <small>{{ r.note }}</small> }
              </div>
              <span class="bval">{{ r.value }}</span>
              <!-- A zero is "nothing yet", not a very small bar. -->
              <span class="track" [class.none]="r.fraction === 0">
                <i [style.width.%]="r.fraction * 100"></i>
              </span>
            </div>
          }
        </div>
        <ng-container *ngTemplateOutlet="more; context: { $implicit: b.overflow_count }" />
      }

      @case ('card_list') {
        <div class="records">
          @for (r of b.records; track r.id) {
            <ng-container *ngTemplateOutlet="record; context: { $implicit: r }" />
          }
        </div>
        <ng-container *ngTemplateOutlet="more; context: { $implicit: b.overflow_count }" />
      }

      @case ('ledger') {
        <div class="records ledger">
          @for (r of b.records; track r.id) {
            <ng-container *ngTemplateOutlet="record; context: { $implicit: r }" />
          }
        </div>
        <ng-container *ngTemplateOutlet="more; context: { $implicit: b.overflow_count }" />
      }

      @case ('pills') {
        <div class="pills">
          @for (p of b.pills; track p.id) {
            <span class="pill" [class.muted]="p.muted"
                  [class.ar]="p.label.script === 'ar'">{{ p.label.text }}</span>
          }
        </div>
        <ng-container *ngTemplateOutlet="more; context: { $implicit: b.overflow_count }" />
      }

      @case ('pairs') {
        <dl class="pairs">
          @for (p of b.pairs; track p.id) {
            <dt>{{ p.label.text }}</dt>
            <dd [class.ar]="p.value.script === 'ar'">{{ p.value.text }}</dd>
          }
        </dl>
      }

      @case ('prose_blocks') {
        <div class="prose">
          @for (p of b.blocks; track p.id) {
            <div class="pb" [attr.data-role]="p.role" [style.--depth]="p.depth">
              <span [class.ar]="p.text.script === 'ar'" [class.rtl]="p.text.script !== 'latin'">{{ p.text.text }}</span>
              @if (p.translation) { <span class="ptr">{{ p.translation.text }}</span> }
            </div>
          }
        </div>
        <ng-container *ngTemplateOutlet="more; context: { $implicit: b.overflow_count }" />
      }

      @case ('table') {
        <div class="tw">
          <table>
            <thead><tr>@for (c of b.columns; track c) { <th>{{ c }}</th> }</tr></thead>
            <tbody>
              @for (row of b.rows; track $index) {
                <tr>@for (cell of row; track $index) {
                  <td [class.nul]="cell === null">{{ cell ?? '—' }}</td>
                }</tr>
              }
            </tbody>
          </table>
        </div>
        @if (b.null_columns?.length) {
          <p class="nulls">NULL for every row read, and so carrying nothing here:
            @for (c of b.null_columns; track c) { <span class="mono">{{ c }}</span> }
          </p>
        }
        <ng-container *ngTemplateOutlet="more; context: { $implicit: b.overflow_count }" />
      }

      @case ('note') {
        <p class="note" [attr.data-kind]="b.note_kind">{{ b.text }}</p>
      }

    }

    <ng-template #record let-r>
      <article class="rec">
        @if (r.badges?.length) {
          <div class="badges">
            @for (x of r.badges; track x.label + x.value) {
              <span class="badge" [attr.data-tone]="x.tone">
                @if (x.label) { <i>{{ x.label }}</i> } {{ x.value }}
              </span>
            }
          </div>
        }
        @if (r.ar) { <p class="ar rtl">{{ r.ar.text }}</p> }
        @if (r.en) { <p class="en">{{ r.en.text }}</p> }
        @if (r.ur) { <p class="ar rtl ur">{{ r.ur.text }}</p> }
        @if (r.facts?.length) {
          <div class="facts">
            @for (f of r.facts; track f.label) {
              <span class="fact"><i>{{ f.label }}</i> {{ f.value.text }}</span>
            }
          </div>
        }
        @if (r.provenance; as p) {
          <div class="prov" [class.synth]="p.is_synthesis">
            <span class="src">{{ p.source }}</span>
            @if (p.is_synthesis) { <span class="tag">synthesis</span> }
            @else if (p.ref) { <span class="ref">{{ p.ref }}</span> }
            @if (p.confidence) { <span class="conf">{{ p.confidence }}</span> }
          </div>
        }
      </article>
    </ng-template>

    <!-- Never truncate silently: a reader who cannot see the rest must at
         least know there is a rest. -->
    <ng-template #more let-n>
      @if (n && n > 0) { <p class="more">+{{ n }} more not shown</p> }
    </ng-template>
  `,
  styleUrl: './cyb-ds-block.component.scss',
})
export class CybDsBlockComponent {
  /** Whether a grid's marks are Arabic, and so must run right to left. */
  isArabicGrid(cells: { mark: { script: string } }[]): boolean {
    return cells.length > 0 && cells.every((c) => c.mark.script === 'ar');
  }

  readonly block = input.required<DsBlock>();
  /** The script a run of text is in — the client's only job is picking a face. */
  protected isArabic(x: DsText | undefined): boolean { return x?.script === 'ar'; }
}
