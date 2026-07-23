import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CybService } from '../data/cyb.service';
import type { CybNode } from '../data/cyb.models';
import { CybLadderNodeComponent } from './cyb-ladder-node.component';

// Quran Ladder — the whole recursion tree as one collapsible outline. The
// Qurʾān-lane roots are wrapped under a synthetic "Entire Qurʾān" node; the
// language + worldview domain roots sit beside it. Every node = a sensor + the
// four outputs (B·S·C·R). Data from /core/cyb/tree.
@Component({
  selector: 'km-cyb-ladder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CybLadderNodeComponent],
  template: `
    @if (error()) { <div class="msg err">{{ error() }}</div> }
    @else if (forest().length) {
      <div class="legend">
        <span><i style="background:var(--build)"></i>build</span>
        <span><i style="background:var(--study)"></i>study</span>
        <span><i style="background:var(--content)"></i>content</span>
        <span><i style="background:var(--retn)"></i>retention</span>
        <span class="hint">▸ tap a rung to expand · sensor + 4 outputs per node</span>
      </div>
      <div class="tree">
        @for (n of forest(); track n.id) {
          <km-cyb-ladder-node [node]="n" [depth]="0" />
        }
      </div>
    }
    @else { <div class="msg">Loading ladder…</div> }
  `,
  styles: [`
    :host { display:block; }
    .msg { color:var(--t2); padding:26px; text-align:center; } .msg.err { color:var(--err); }
    .legend { display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin:16px 0 12px; font-size:10.5px; color:var(--t3); }
    .legend span { display:inline-flex; align-items:center; gap:4px; } .legend i { width:24px; height:8px; border-radius:3px; display:inline-block; }
    .legend .hint { margin-left:auto; }
    .tree { border:1px solid var(--bd); border-radius:12px; background:linear-gradient(180deg,#121212,#0b0b0b); padding:8px 6px; }
  `],
})
export class CybLadderComponent {
  private readonly svc = inject(CybService);
  readonly roots = signal<CybNode[]>([]);
  readonly error = signal<string | null>(null);

  // Wrap the Qurʾān-lane top nodes under a synthetic "Entire Qurʾān" root; keep
  // the other domains (language, worldview) as siblings.
  readonly forest = computed<CybNode[]>(() => {
    const rs = this.roots();
    if (!rs.length) return [];
    const quran = rs.filter((n) => n.lane === 'quran');
    const others = rs.filter((n) => n.lane !== 'quran');
    if (!quran.length) return rs;
    const synthetic: CybNode = {
      id: 'CYB:quran', domain: 'quran', lane: 'quran', parent_id: null, scale: 'domain',
      target_kind: null, target_ref: 'القرآن', layer: null, piece_kind: null,
      build_state: '', build_pct: this.avg(quran, 'build_pct'),
      study_state: '', study_pct: this.avg(quran, 'study_pct'),
      content_state: '', content_pct: this.avg(quran, 'content_pct'),
      retention_state: '', retention_pct: this.avg(quran, 'retention_pct'),
      priority: 0, meta_json: '{"title_en":"Entire Qurʾān"}', updated_at: '', children: quran,
    };
    return [synthetic, ...others];
  });

  constructor() {
    this.svc.tree().subscribe({
      next: (r) => this.roots.set(r.roots),
      error: (e) => this.error.set(String(e?.message ?? e)),
    });
  }

  private avg(nodes: CybNode[], key: 'build_pct' | 'study_pct' | 'content_pct' | 'retention_pct'): number {
    if (!nodes.length) return 0;
    return Math.round(nodes.reduce((a, n) => a + n[key], 0) / nodes.length);
  }
}
