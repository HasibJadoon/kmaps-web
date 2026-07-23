import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CybService } from '../data/cyb.service';
import type { CybNode } from '../data/cyb.models';

// Quran Map — tap-to-drill the live cyb_node tree: Qurʾān → Surah → Passage →
// Stage/stream → Root/piece. Breadcrumb navigates the path. Each node carries
// the 4 outputs (build/study/content/retention). Data from /core/cyb/tree.
@Component({
  selector: 'km-cyb-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error()) { <div class="msg err">{{ error() }}</div> }
    @else if (roots().length) {
      <div class="crumbs">
        <button class="crumb" (click)="reset()">القرآن · Qurʾān</button>
        @for (n of path(); track n.id; let i = $index) {
          <span class="csep">›</span>
          <button class="crumb" [class.cur]="i === path().length - 1" (click)="popTo(i)">{{ label(n) }}</button>
        }
      </div>

      <div class="vh">{{ level() }}</div>

      <div class="grid">
        @for (n of current(); track n.id) {
          <button class="cell" [class.leaf]="!n.children.length" (click)="drill(n)">
            <div class="top"><span class="num">{{ scaleLabel(n) }}</span>
              @if (n.children.length) { <span class="kids">{{ n.children.length }} ›</span> }</div>
            <div class="nar">{{ label(n) }}</div>
            <div class="ref">{{ n.target_ref || n.id }}</div>
            <div class="o4">
              <span class="o" style="--oc:var(--build)"><i [style.width.%]="n.build_pct"></i></span>
              <span class="o" style="--oc:var(--study)"><i [style.width.%]="n.study_pct"></i></span>
              <span class="o" style="--oc:var(--content)"><i [style.width.%]="n.content_pct"></i></span>
              <span class="o" style="--oc:var(--retn)"><i [style.width.%]="n.retention_pct"></i></span>
            </div>
            <div class="o4l"><span>B {{ n.build_pct }}</span><span>S {{ n.study_pct }}</span><span>C {{ n.content_pct }}</span><span>R {{ n.retention_pct }}</span></div>
          </button>
        } @empty {
          <div class="msg">Leaf node — no further breakdown staged yet.</div>
        }
      </div>
    }
    @else { <div class="msg">Loading map…</div> }
  `,
  styles: [`
    :host { display:block; }
    .msg { color:var(--t2); padding:26px; text-align:center; } .msg.err { color:var(--err); }
    .crumbs { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:16px 0 14px; }
    .crumb { color:var(--gold-b); font-family:var(--serif); border:1px solid var(--bd); border-radius:16px; padding:4px 12px; background:#0f0f0f; cursor:pointer; font-size:12px; }
    .crumb:hover { border-color:var(--bd-hi); } .crumb.cur { color:#2a2205; background:linear-gradient(180deg,var(--gold-b),var(--gold)); border-color:var(--gold-b); font-weight:700; }
    .csep { color:var(--gold-d); font-weight:700; }
    .vh { font-family:var(--serif); font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--gold-d); margin:0 0 12px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:8px; }
    .cell { text-align:left; border:1px solid rgba(255,255,255,.08); border-radius:9px; background:linear-gradient(160deg,#151515,#0d0d0d); padding:9px 10px; cursor:pointer; color:var(--text); }
    .cell:hover { border-color:var(--bd-hi); transform:translateY(-2px); } .cell.leaf { cursor:default; opacity:.9; }
    .top { display:flex; justify-content:space-between; align-items:center; }
    .num { font-family:ui-monospace,monospace; font-size:8.5px; color:var(--t3); text-transform:uppercase; }
    .kids { font-size:9px; color:var(--gold-d); }
    .nar { font-family:var(--ar); font-size:18px; color:var(--gold-b); margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .ref { font-size:8.5px; color:var(--t3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .o4 { display:grid; grid-template-columns:repeat(4,1fr); gap:4px; margin-top:8px; }
    .o { height:6px; border-radius:4px; background:#242424; overflow:hidden; } .o i { display:block; height:100%; background:var(--oc); }
    .o4l { display:grid; grid-template-columns:repeat(4,1fr); gap:4px; margin-top:3px; font-size:7.5px; color:var(--t3); } .o4l span { text-align:left; }
  `],
})
export class CybMapComponent {
  private readonly svc = inject(CybService);
  readonly roots = signal<CybNode[]>([]);
  readonly error = signal<string | null>(null);
  readonly path = signal<CybNode[]>([]);

  // The children to show: the last node in the path, or the top-level forest.
  readonly current = computed<CybNode[]>(() => {
    const p = this.path();
    return p.length ? p[p.length - 1].children : this.roots();
  });

  readonly level = computed(() => {
    const p = this.path();
    if (!p.length) return `Entire corpus · ${this.roots().length} top-level nodes`;
    const n = p[p.length - 1];
    return `${this.label(n)} · ${n.children.length} children`;
  });

  constructor() {
    this.svc.tree().subscribe({
      next: (r) => this.roots.set(r.roots),
      error: (e) => this.error.set(String(e?.message ?? e)),
    });
  }

  drill(n: CybNode) {
    if (n.children.length) this.path.update((p) => [...p, n]);
  }
  popTo(i: number) { this.path.update((p) => p.slice(0, i + 1)); }
  reset() { this.path.set([]); }

  label(n: CybNode): string {
    const meta = this.metaName(n);
    if (meta) return meta;
    if (n.scale === 'surah') return `Surah ${n.target_ref}`;
    if (n.piece_kind === 'root' && n.target_ref) return n.target_ref.split(':').pop() ?? n.id;
    if (n.layer) return n.layer;
    return n.target_ref ?? n.id;
  }
  scaleLabel(n: CybNode): string {
    return n.piece_kind ?? n.layer ?? n.scale;
  }
  private metaName(n: CybNode): string | null {
    try {
      const m = JSON.parse(n.meta_json || '{}');
      return m.title_en || m.name_en || m.label || null;
    } catch { return null; }
  }
}
