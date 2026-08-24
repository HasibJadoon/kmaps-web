import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArTocNode } from '../../../shared/services/arabic-curriculum-api.service';

/**
 * One row of the table of contents, rendering its own children.
 *
 * The tree is five levels deep in naḥw, so a recursive component is the honest
 * shape — a flattened list would have to carry indent depth as data and would
 * lose the "collapse this bāb" behaviour that makes a long fihris readable.
 *
 * Each row owns its open state rather than reading a shared set: expanding a
 * bāb is a local decision, and keeping it local means no id bookkeeping and no
 * re-render of siblings.
 */
@Component({
  selector: 'km-toc-node',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <li class="tn" [class.tn--open]="open()">
      <div class="tn__row" [style.padding-inline-start.rem]="indent()">
        @if (node().children.length) {
          <button
            class="tn__twist"
            type="button"
            [attr.aria-expanded]="open()"
            [attr.aria-label]="(open() ? 'Collapse ' : 'Expand ') + (node().name_en ?? node().name_ar)"
            (click)="toggle()"
          >&#9656;</button>
        } @else {
          <span class="tn__twist tn__twist--leaf" aria-hidden="true">&middot;</span>
        }

        <a class="tn__link" [routerLink]="['/arabic/topic', node().id]">
          <span class="tn__ar" dir="rtl">{{ node().name_ar }}</span>
          @if (node().name_en) {
            <span class="tn__en">{{ node().name_en }}</span>
          }
        </a>

        <span class="tn__meta">
          <span class="tn__kind" [attr.data-kind]="node().node_type">{{ kindLabel() }}</span>
          @if (node().source_count) {
            <span class="tn__srcs" [title]="node().source_count + ' sources'">
              {{ node().source_count }}&#8202;&#9679;
            </span>
          }
          @if (node().children.length) {
            <span class="tn__count">{{ node().children.length }}</span>
          }
        </span>
      </div>

      @if (open() && node().children.length) {
        <ul class="tn__kids">
          @for (child of node().children; track child.id) {
            <km-toc-node [node]="child" [level]="level() + 1" [openTo]="openTo()" />
          }
        </ul>
      }
    </li>
  `,
  styleUrl: './toc-node.component.scss',
})
export class TocNodeComponent {
  readonly node = input.required<ArTocNode>();
  /** Depth within the rendered tree — not the node's own depth in D1, which
      counts from the fann root and would over-indent a module's subtree. */
  readonly level = input(0);
  /** Levels open on first paint. Deeper rows start collapsed. */
  readonly openTo = input(0);

  /** null while the row still follows `openTo`; a boolean once someone clicks. */
  private readonly toggled = signal<boolean | null>(null);
  readonly open = computed(() => this.toggled() ?? this.level() < this.openTo());

  toggle(): void {
    this.toggled.set(!this.open());
  }

  readonly indent = computed(() => 0.5 + this.level() * 1.15);

  private static readonly KINDS: Record<string, string> = {
    fann: 'فنّ', qism: 'قسم', bab: 'باب', fasl: 'فصل', masala: 'مسألة',
  };
  readonly kindLabel = computed(
    () => TocNodeComponent.KINDS[this.node().node_type] ?? this.node().node_type,
  );
}
