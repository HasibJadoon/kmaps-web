import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener,
  computed, input, output, signal, viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface RootJumpItem {
  root_norm: string;
  root_text?: string | null;
  page_start?: number | null;
}

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

  readonly cursor = signal(0);

  readonly matches = computed<RootJumpItem[]>(() => {
    const q = this.query().trim();
    const all = this.roots();

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

      default: break;
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocPointerDown(e: PointerEvent) {
    if (!this.open()) return;
    const host = (e.target as HTMLElement)?.closest('km-root-jump');
    if (!host) this.close();
  }
}
