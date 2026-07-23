import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CybService } from '../data/cyb.service';
import type { CybNode, Surah, StudyUnit } from '../data/cyb.models';

// Quran Map — Qurʾān-centric. Mirrors the Surah Study module
// (Qurʾān → Surah → Study passages → Steps/streams → Roots) with the
// cybernetics build/study/content/retention overlaid at every level.
//   L1  entire Qurʾān · 114 surahs (qr/surahs) + cyb surah build
//   L2  a surah's study passages (qr/study/surahs/:id) + cyb passage build
//   L3+ a passage's streams → roots (the live cyb_node tree for built passages)
// Passages open the real Study module; built passages drill the cyb tree.
@Component({
  selector: 'km-cyb-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (error()) { <div class="msg err">{{ error() }}</div> }
    @else {
      <!-- breadcrumb -->
      <div class="crumbs">
        <button class="crumb" [class.cur]="view()==='surahs'" (click)="toSurahs()">القرآن · Qurʾān</button>
        @if (surah(); as s) {
          <span class="csep">›</span>
          <button class="crumb" [class.cur]="view()==='passages'" (click)="toPassages()">{{ s.name_en }} <span class="aa">{{ s.name_ar }}</span></button>
        }
        @for (n of path(); track n.id; let i = $index) {
          <span class="csep">›</span>
          <button class="crumb" [class.cur]="i === path().length - 1" (click)="popTo(i)">{{ nodeLabel(n) }}</button>
        }
      </div>

      <!-- ══ L1 · 114 surahs ══ -->
      @if (view()==='surahs') {
        @if (surahs().length) {
          <div class="vh"><span>Entire Qurʾān · 114 surahs</span><span class="h">{{ activeCount() }} active · tap to open</span></div>
          <div class="grid">
            @for (s of surahs(); track s.id) {
              @let node = surahNode(s.id);
              <button class="cell" [class.active]="node && node.build_pct > 0" (click)="openSurah(s)">
                <div class="top"><span class="num">{{ s.id }}</span>
                  <span class="rt" [class.makki]="s.revelation_type==='makki'" [class.madani]="s.revelation_type==='madani'"></span></div>
                <div class="nar">{{ s.name_ar }}</div>
                <div class="nen">{{ s.name_transliteration || s.name_en }}</div>
                <div class="ay">{{ s.ayah_count }} āyāt</div>
                <div class="pbar"><div class="pf" [style.width.%]="node?.build_pct || 0"></div></div>
                <div class="pl">{{ node && node.build_pct > 0 ? 'build ' + node.build_pct + '%' : 'not started' }}</div>
              </button>
            }
          </div>
        } @else { <div class="msg">Loading the Qurʾān…</div> }
      }

      <!-- ══ L2 · a surah's study passages ══ -->
      @else if (view()==='passages') {
        @if (loadingPassages()) { <div class="msg">Loading passages…</div> }
        @else if (units().length) {
          <div class="vh"><span>{{ surah()?.name_en }} · study passages</span><span class="h">{{ units().length }} passages · tap to open</span></div>
          <div class="list">
            @for (u of units(); track u.passage_id) {
              @let pnode = passageNode(u);
              <div class="lc" [style.--lc]="pnode && pnode.build_pct > 0 ? 'var(--content)' : 'var(--gold-d)'">
                <div class="lct"><span class="en">{{ u.passage_no }}. {{ u.label }}</span><span class="no">{{ surah()?.id }}:{{ u.ayah_from }}–{{ u.ayah_to }}</span></div>
                @if (u.theme) { <div class="lcd">{{ u.theme }}</div> }
                <div class="steps">
                  <span class="step" [class.on]="u.reading.has">reading</span>
                  <span class="step" [class.on]="u.vocabulary.total > 0">vocab {{ u.vocabulary.total || '' }}</span>
                  <span class="step" [class.on]="u.sentence_structure.has">iʿrāb</span>
                  <span class="step" [class.on]="u.passage_structure.has">naẓm</span>
                  <span class="step" [class.on]="u.expressions.has">idioms</span>
                </div>
                @if (pnode && pnode.build_pct > 0) {
                  <div class="pbuild">
                    <span class="o" style="--oc:var(--build)"><i [style.width.%]="pnode.build_pct"></i></span>
                    <span class="pl2">build {{ pnode.build_pct }}% · study {{ pnode.study_pct }}%</span>
                  </div>
                }
                <div class="lcact">
                  @if (pnode && pnode.children.length) {
                    <button class="drillbtn" (click)="drillPassage(pnode)">streams · roots ›</button>
                  }
                  <a class="studylink" [routerLink]="['/quran/surahs', surah()?.id, 'study', u.passage_no]">Open in Study ›</a>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="msg">
            {{ surah()?.name_en }} — no study passages defined yet.
            <a class="studylink" [routerLink]="['/quran/surahs', surah()?.id, 'study']">Open the surah in Study ›</a>
          </div>
        }
      }

      <!-- ══ L3+ · cyb tree drill (streams → roots → pieces) ══ -->
      @else if (view()==='drill') {
        <div class="vh"><span>{{ drillTitle() }}</span><span class="h">4 outputs · B·S·C·R per node</span></div>
        <div class="grid">
          @for (n of current(); track n.id) {
            <button class="cell" [class.leaf]="!n.children.length" (click)="drill(n)">
              <div class="top"><span class="num">{{ n.piece_kind ?? n.layer ?? n.scale }}</span>
                @if (n.children.length) { <span class="kids">{{ n.children.length }} ›</span> }</div>
              <div class="nar">{{ nodeLabel(n) }}</div>
              <div class="o4">
                <span class="o" style="--oc:var(--build)"><i [style.width.%]="n.build_pct"></i></span>
                <span class="o" style="--oc:var(--study)"><i [style.width.%]="n.study_pct"></i></span>
                <span class="o" style="--oc:var(--content)"><i [style.width.%]="n.content_pct"></i></span>
                <span class="o" style="--oc:var(--retn)"><i [style.width.%]="n.retention_pct"></i></span>
              </div>
              <div class="o4l"><span>B {{ n.build_pct }}</span><span>S {{ n.study_pct }}</span><span>C {{ n.content_pct }}</span><span>R {{ n.retention_pct }}</span></div>
            </button>
          } @empty { <div class="msg">Leaf node — no further breakdown staged yet.</div> }
        </div>
      }
    }
  `,
  styles: [`
    :host { display:block; }
    .msg { color:var(--t2); padding:26px; text-align:center; } .msg.err { color:var(--err); }
    .crumbs { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:16px 0 14px; }
    .crumb { color:var(--gold-b); font-family:var(--serif); border:1px solid var(--bd); border-radius:16px; padding:4px 12px; background:#0f0f0f; cursor:pointer; font-size:12px; }
    .crumb .aa { font-family:var(--ar); margin-left:3px; }
    .crumb:hover { border-color:var(--bd-hi); } .crumb.cur { color:#2a2205; background:linear-gradient(180deg,var(--gold-b),var(--gold)); border-color:var(--gold-b); font-weight:700; }
    .csep { color:var(--gold-d); font-weight:700; }
    .vh { font-family:var(--serif); font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--gold-d); margin:0 0 12px; display:flex; justify-content:space-between; align-items:baseline; }
    .vh .h { font-size:10px; color:var(--t3); font-family:ui-monospace,monospace; letter-spacing:0; text-transform:none; }

    /* surah grid */
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:7px; }
    .cell { text-align:left; border:1px solid rgba(255,255,255,.08); border-radius:9px; background:linear-gradient(160deg,#151515,#0d0d0d); padding:7px 8px 8px; cursor:pointer; color:var(--text); }
    .cell:hover { border-color:var(--bd-hi); transform:translateY(-2px); } .cell.leaf { cursor:default; }
    .cell.active { border-color:var(--content); box-shadow:0 0 0 1px var(--content); }
    .top { display:flex; justify-content:space-between; align-items:center; }
    .num { font-family:ui-monospace,monospace; font-size:8.5px; color:var(--t3); text-transform:uppercase; }
    .kids { font-size:9px; color:var(--gold-d); }
    .rt { width:7px; height:7px; border-radius:50%; } .rt.makki { background:#e8b45c; } .rt.madani { background:#6bbaff; }
    .nar { font-family:var(--ar); font-size:18px; color:var(--gold-b); line-height:1.15; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .nen { font-size:9px; color:var(--t2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .ay { font-size:7.5px; color:var(--t3); }
    .pbar { height:5px; border-radius:3px; background:#222; overflow:hidden; margin-top:6px; } .pf { height:100%; background:var(--content); }
    .pl { font-size:7.5px; margin-top:2px; font-family:ui-monospace,monospace; color:var(--t3); }
    .cell.active .pl { color:var(--content); }
    .o4 { display:grid; grid-template-columns:repeat(4,1fr); gap:4px; margin-top:8px; }
    .o { height:6px; border-radius:4px; background:#242424; overflow:hidden; } .o i { display:block; height:100%; background:var(--oc); }
    .o4l { display:grid; grid-template-columns:repeat(4,1fr); gap:4px; margin-top:3px; font-size:7.5px; color:var(--t3); }

    /* passage list */
    .list { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:9px; }
    .lc { border:1px solid rgba(255,255,255,.09); border-left:3px solid var(--lc,var(--gold-d)); border-radius:11px; background:linear-gradient(90deg,#161616,#0d0d0d); padding:11px 13px; }
    .lct { display:flex; align-items:baseline; gap:8px; } .lct .en { font-family:var(--serif); font-size:14px; color:var(--text); } .lct .no { margin-left:auto; font-size:9px; color:var(--t3); font-family:ui-monospace,monospace; }
    .lcd { font-size:10.5px; color:var(--t3); margin-top:3px; }
    .steps { display:flex; flex-wrap:wrap; gap:4px; margin-top:8px; }
    .step { font-size:8.5px; font-family:ui-monospace,monospace; border:1px solid rgba(255,255,255,.1); border-radius:7px; padding:2px 6px; color:var(--t3); }
    .step.on { color:var(--content); border-color:rgba(77,217,168,.4); }
    .pbuild { display:flex; align-items:center; gap:8px; margin-top:8px; } .pbuild .o { flex:1; height:6px; border-radius:4px; background:#242424; overflow:hidden; } .pbuild .o i { display:block; height:100%; background:var(--oc); } .pl2 { font-size:8.5px; color:var(--t3); font-family:ui-monospace,monospace; }
    .lcact { display:flex; gap:12px; align-items:center; margin-top:9px; }
    .drillbtn { background:none; border:none; color:var(--content); font-size:11px; cursor:pointer; padding:0; font-family:var(--serif); }
    .studylink { color:var(--gold-b); font-size:11px; text-decoration:none; font-family:var(--serif); } .studylink:hover { text-decoration:underline; }
  `],
})
export class CybMapComponent {
  private readonly svc = inject(CybService);

  readonly surahs = signal<Surah[]>([]);
  readonly error = signal<string | null>(null);
  private readonly treeRoots = signal<CybNode[]>([]);

  readonly view = signal<'surahs' | 'passages' | 'drill'>('surahs');
  readonly surah = signal<Surah | null>(null);
  readonly units = signal<StudyUnit[]>([]);
  readonly loadingPassages = signal(false);
  readonly path = signal<CybNode[]>([]);

  // Flattened cyb node lookups (only ~54 nodes).
  private readonly flat = computed<CybNode[]>(() => {
    const out: CybNode[] = [];
    const walk = (n: CybNode) => { out.push(n); n.children.forEach(walk); };
    this.treeRoots().forEach(walk);
    return out;
  });

  readonly activeCount = computed(() =>
    this.flat().filter((n) => n.scale === 'surah' && n.build_pct > 0).length);

  readonly current = computed<CybNode[]>(() => {
    const p = this.path();
    return p.length ? p[p.length - 1].children : [];
  });

  readonly drillTitle = computed(() => {
    const p = this.path();
    if (!p.length) return '';
    const n = p[p.length - 1];
    return `${this.nodeLabel(n)} · ${n.children.length} children`;
  });

  constructor() {
    forkJoin({ surahs: this.svc.surahs(), tree: this.svc.tree() }).subscribe({
      next: ({ surahs, tree }) => {
        this.surahs.set(surahs.sort((a, b) => a.id - b.id));
        this.treeRoots.set(tree.roots);
      },
      error: (e) => this.error.set(String(e?.message ?? e)),
    });
  }

  // ── cyb overlays ──
  surahNode(id: number): CybNode | undefined {
    return this.flat().find((n) => n.scale === 'surah' && Number(n.target_ref) === id);
  }
  passageNode(u: StudyUnit): CybNode | undefined {
    const s = this.surah()?.id;
    const key = `${s}:${u.ayah_from}-${u.ayah_to}`;
    return this.flat().find(
      (n) => n.scale === 'passage' && (n.target_ref ?? '').replace(/^QR:SP:/, '') === key,
    );
  }

  // ── navigation ──
  openSurah(s: Surah) {
    this.surah.set(s);
    this.units.set([]);
    this.path.set([]);
    this.view.set('passages');
    this.loadingPassages.set(true);
    this.svc.studyGrid(s.id).subscribe({
      next: (g) => { this.units.set(g.units ?? []); this.loadingPassages.set(false); },
      error: () => { this.units.set([]); this.loadingPassages.set(false); },
    });
  }
  drillPassage(pnode: CybNode) { this.path.set([pnode]); this.view.set('drill'); }
  drill(n: CybNode) { if (n.children.length) this.path.update((p) => [...p, n]); }
  popTo(i: number) {
    if (i === 0) { this.view.set('drill'); }
    this.path.update((p) => p.slice(0, i + 1));
  }
  toSurahs() { this.view.set('surahs'); this.surah.set(null); this.path.set([]); }
  toPassages() { this.view.set('passages'); this.path.set([]); }

  nodeLabel(n: CybNode): string {
    if (n.piece_kind === 'root' && n.target_ref) return n.target_ref.split(':').pop() ?? n.id;
    if (n.scale === 'passage') return (n.target_ref ?? '').replace(/^QR:SP:/, '');
    if (n.layer) return n.layer;
    return n.target_ref ?? n.id;
  }
}
