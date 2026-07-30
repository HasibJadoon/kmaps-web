// ─── Root jump ──────────────────────────────────────────────────────────────
//
// The root stepper and the root search in one control: the arrows walk to the
// neighbouring root, and the root itself is a field you can type into to go
// straight to any other one. Previously the arrows were the only way to move
// from the toolbar and the search lived in the index rail, so reaching a distant
// root meant opening the rail and scrolling a list of several thousand.
//
// Shared by every reader shell rather than copied into each, which is also why it
// takes a minimal row shape: the classical, Lane and Mufradāt shells index roots
// as `LexV2RootRow` and the scholarship shell as `ScholarshipRootRow`.

import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener,
  computed, input, output, signal, viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/** The least a row needs for this control to list and pick it. */
export interface RootJumpItem {
  root_norm: string;
  root_text?: string | null;
  page_start?: number | null;
}

/** Enough matches to scan, few enough to render on a 9,000-root index. */
const MAX_MATCHES = 60;

@Component({
  selector: 'km-root-jump',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './root-jump.component.html',
  styleUrl: './root-jump.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RootJumpComponent {
  readonly root  = input<string>('');
  readonly roots = input<readonly RootJumpItem[]>([]);

  readonly prevRoot = output<void>();
  readonly nextRoot = output<void>();
  readonly pickRoot = output<string>();

  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  readonly open  = signal(false);
  readonly query = signal('');
  /** Keyboard cursor within the match list. */
  readonly cursor = signal(0);

  readonly matches = computed<RootJumpItem[]>(() => {
    const q = this.query().trim();
    const all = this.roots();
    // With no query the list is a jumping-off point, not a filter: show the
    // roots around where the reader already is.
    if (!q) {
      const i = all.findIndex(r => r.root_norm === this.root());
      const from = i < 0 ? 0 : Math.max(0, i - 2);
      return all.slice(from, from + MAX_MATCHES);
    }
    const out: RootJumpItem[] = [];
    for (const r of all) {
      if (r.root_norm.includes(q) || (r.root_text ?? '').includes(q)) {
        out.push(r);
        if (out.length >= MAX_MATCHES) break;
      }
    }
    return out;
  });

  readonly hasRoots = computed(() => this.roots().length > 0);

  openField() {
    if (!this.hasRoots()) return;
    this.open.set(true);
    this.query.set('');
    this.cursor.set(0);
    // The input only exists once `open` has rendered it.
    setTimeout(() => this.field()?.nativeElement.focus(), 0);
  }

  close() {
    this.open.set(false);
    this.query.set('');
    this.cursor.set(0);
  }

  onQuery(v: string) {
    this.query.set(v);
    this.cursor.set(0);
  }

  choose(root_norm: string) {
    this.close();
    if (root_norm && root_norm !== this.root()) this.pickRoot.emit(root_norm);
  }

  onKey(e: KeyboardEvent) {
    const list = this.matches();
    switch (e.key) {
      case 'Escape':    this.close(); e.stopPropagation(); break;
      case 'ArrowDown': this.cursor.set(Math.min(this.cursor() + 1, list.length - 1)); e.preventDefault(); break;
      case 'ArrowUp':   this.cursor.set(Math.max(this.cursor() - 1, 0)); e.preventDefault(); break;
      case 'Enter': {
        const hit = list[this.cursor()] ?? list[0];
        if (hit) this.choose(hit.root_norm);
        e.preventDefault();
        break;
      }
      // Left/right arrows belong to the text cursor while the field is open, so
      // they are deliberately not bound to prev/next here.
      default: break;
    }
  }

  /** A click anywhere else dismisses the list without picking. */
  @HostListener('document:pointerdown', ['$event'])
  onDocPointerDown(e: PointerEvent) {
    if (!this.open()) return;
    const host = (e.target as HTMLElement)?.closest('km-root-jump');
    if (!host) this.close();
  }
}
