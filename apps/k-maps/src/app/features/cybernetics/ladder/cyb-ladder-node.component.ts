import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import type { CybNode } from '../data/cyb.models';

// One rung of the Quran Ladder — a node row (sensor dot + 4 outputs) that
// recursively renders its children when expanded. Self-referential standalone
// component (imports itself) → arbitrary tree depth, logic-free.
@Component({
  selector: 'km-cyb-ladder-node',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CybLadderNodeComponent],
  template: `
    @if (node(); as n) {
      <div class="node" [class.hask]="n.children.length" [style.padding-left.px]="depth() * 20 + 6"
           (click)="toggle($event, n)">
        <span class="tw">{{ n.children.length ? (open() ? '▾' : '▸') : '·' }}</span>
        <span class="sens" [style.--kc]="axisColor(n)"></span>
        <span class="kd" [style.background]="scaleColor(n)"></span>
        <span class="nm">
          <span class="aa">{{ label(n) }}</span>
          <span class="meta">{{ n.piece_kind ?? n.layer ?? n.scale }}@if (n.target_ref) { · {{ n.target_ref }} }</span>
        </span>
        <span class="out">
          <span class="o" style="--oc:var(--build)"><i [style.width.%]="n.build_pct"></i><b>{{ n.build_pct || '' }}</b></span>
          <span class="o" style="--oc:var(--study)"><i [style.width.%]="n.study_pct"></i></span>
          <span class="o" style="--oc:var(--content)"><i [style.width.%]="n.content_pct"></i></span>
          <span class="o" style="--oc:var(--retn)"><i [style.width.%]="n.retention_pct"></i></span>
        </span>
      </div>
      @if (open()) {
        @for (c of n.children; track c.id) {
          <km-cyb-ladder-node [node]="c" [depth]="depth() + 1" />
        }
      }
    }
  `,
  styles: [`
    :host { display:block; }
    .node { display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:8px; min-height:32px; }
    .node.hask { cursor:pointer; } .node.hask:hover { background:rgba(255,255,255,.02); }
    .tw { flex:0 0 auto; width:15px; text-align:center; color:var(--gold-d); font-size:11px; }
    .sens { flex:0 0 auto; width:9px; height:9px; border-radius:50%; background:var(--kc,var(--study)); box-shadow:0 0 6px rgba(107,186,255,.4); }
    .kd { flex:0 0 auto; width:3px; height:20px; border-radius:2px; }
    .nm { flex:1; min-width:0; display:flex; align-items:baseline; gap:7px; overflow:hidden; }
    .nm .aa { font-family:var(--ar); font-size:16px; color:var(--gold-b); flex:0 0 auto; }
    .nm .meta { font-size:9px; color:var(--t3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .out { flex:0 0 auto; display:grid; grid-template-columns:repeat(4,34px); gap:5px; }
    .out .o { height:7px; border-radius:4px; background:#242424; overflow:hidden; position:relative; }
    .out .o i { position:absolute; inset:0; border-radius:4px; background:var(--oc); }
    .out .o b { position:absolute; right:2px; top:-13px; font-size:8px; font-family:ui-monospace,monospace; color:var(--oc); }
    @media(max-width:600px){ .out{grid-template-columns:repeat(4,20px)} .out .o b{display:none} }
  `],
})
export class CybLadderNodeComponent {
  readonly node = input.required<CybNode>();
  readonly depth = input<number>(0);
  readonly open = signal(false);

  toggle(ev: Event, n: CybNode) {
    if (!n.children.length) return;
    ev.stopPropagation();
    this.open.update((v) => !v);
  }

  label(n: CybNode): string {
    if (n.scale === 'surah') return `Surah ${n.target_ref}`;
    if (n.piece_kind === 'root' && n.target_ref) return n.target_ref.split(':').pop() ?? n.id;
    if (n.layer) return n.layer;
    return n.target_ref ?? n.id;
  }
  axisColor(n: CybNode): string {
    if (n.retention_pct > 0) return 'var(--retn)';
    if (n.content_pct > 0) return 'var(--content)';
    if (n.study_pct > 0) return 'var(--study)';
    return 'var(--build)';
  }
  scaleColor(n: CybNode): string {
    switch (n.scale) {
      case 'surah': return 'var(--gold-b)';
      case 'passage': return 'var(--gold)';
      case 'stage': return 'var(--retn)';
      case 'piece': return 'var(--study)';
      default: return 'var(--gold-d)';
    }
  }
}
