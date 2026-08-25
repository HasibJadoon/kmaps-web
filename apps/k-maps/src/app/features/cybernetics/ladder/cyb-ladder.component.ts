import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CybService } from '../data/cyb.service';
import { CybTopbarComponent } from '../shared/cyb-topbar.component';
import type { CybNode, CybNodeTree, CybLayerRow, Surah, StudyUnit, PassageRoot } from '../data/cyb.models';

// Quran Ladder — the Qurʾān as one recursion, rung by rung.
// Every rung is a viable system: a sensor that reads its own state and feeds it
// UP the recursion, so a parent is only as built as its children report:
//   Entire Qurʾān → Surah → Passage → Stream → Root
// It walks the same path as the map and takes the same route shape, so a URL in
// one view opens the same place in the other. Only the path in the URL expands.
// The stream-systems are NOT listed here. `cyb_layer` is the one taxonomy
// (GET /core/cyb/layers). This file used to carry its own list of six, which
// had already fallen three behind the registry — translation, cards and srs
// existed on the plane and could never appear in the ladder — and a layer the
// registry retires has to stop rendering. The map fixed this; the ladder is
// the copy that was left.

interface Rung {
  depth: number;
  kind: 'quran' | 'surah' | 'passage' | 'stream' | 'piece';
  ar: string; en: string; num: string;
  scope: string; reportsTo: string;
  b: number; s: number; c: number; r: number;
  open: boolean; hasKids: boolean;
  /** live = this rung's sensor is reading build; sel = it is what the URL names. */
  live: boolean; sel: boolean;
  nav: (string | number)[] | null;
  /** Leaf pieces, grouped and laid out by their nature rather than as rows. */
  blocks?: LeafBlock[];
}

interface LeafBlock { layout: 'grid' | 'seq' | 'chips'; title: string; wide?: boolean; cells: PieceCell[] }

/** One unopened sibling — a surah, a passage, a root, an expression. */
interface PieceCell {
  ar: string; label: string; sub: string; meta: string;
  /** The same four outputs a rung carries — a card is a sensor too. */
  b: number; s: number; c: number; r: number;
  sel: boolean; nav: (string | number)[] | null;
}

@Component({
  selector: 'km-cyb-ladder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CybTopbarComponent],
  template: `
    @if (error()) { <div class="msg err">{{ error() }}</div> }
    @else if (!surahs().length) { <div class="msg">Loading the Qurʾān…</div> }
    @else {
      <km-cyb-topbar view="ladder" [surahs]="surahs()" [nodes]="flatNodes()"
                     [surahId]="surahId()" [passageNo]="passageNo()"
                     [stream]="stream()" [root]="rootParam()" />
      <p class="sub">Every level is a viable system with a <b class="sn">sensor</b> and four outputs.
        Each sensor reads its own state and <b class="up">feeds it backward — up the recursion</b> —
        so a parent is only as built as its children report.</p>

      <div class="principle">
        <span class="p"><span class="dot"></span><b>{{ sensorsN() }} sensors</b>, one set per layer</span>
        <span class="p"><span class="upt">↑ feedback</span> child → parent rollup</span>
        <span class="p"><b>{{ builtSurahs() }} of 114</b> surahs instantiated</span>
      </div>

      <div class="controls">
        <button class="btn" (click)="openBuiltPath()">Open built path ⤵</button>
        <button class="btn" (click)="collapseAll()">Collapse all</button>
      </div>

      <div class="legend">
        <span><i style="background:var(--build)"></i>B build</span>
        <span><i style="background:var(--study)"></i>S study</span>
        <span><i style="background:var(--content)"></i>C content</span>
        <span><i style="background:var(--retn)"></i>R retention</span>
        <span><span class="od" style="background:var(--study)"></span>sensor per rung</span>
      </div>

      <div class="ladder">
        <div class="uprail"></div>
        <div class="upword">sensors report up ↑</div>

        @for (g of rungs(); track g.kind + g.num + g.en + g.depth) {
          <div class="rung" [style.--dx.px]="g.depth * 20">
            @if (g.depth > 0) { <div class="connector"></div> }
            <!-- A stream's leaves are laid out by what they actually are: roots
                 are many short Arabic tokens, so they read as a grid; iʿrāb
                 sentences are an ordered done/not-done run, so they read as a
                 sequence; a handful of expressions read as chips. -->
            @if (g.blocks; as blocks) {
              <div class="leaves">
                @for (bk of blocks; track bk.title) {
                  <div class="lb">
                    <div class="lt">{{ bk.title }}</div>
                    @switch (bk.layout) {
                      @case ('grid') {
                        <div class="cellgrid" [class.wide]="bk.wide">
                          @for (c of bk.cells; track c.ar + c.label + c.meta) {
                            <button class="cell" [class.live]="c.b > 0" [class.sel]="c.sel"
                                    [disabled]="!c.nav" (click)="go(c.nav)">
                              @if (c.meta) { <div class="cm">{{ c.meta }}</div> }
                              @if (c.ar) {
                                <div class="car">{{ c.ar }}</div>
                                @if (c.label) { <div class="cen">{{ c.label }}</div> }
                              } @else { <div class="cen big">{{ c.label }}</div> }
                              @if (c.sub) { <div class="csub">{{ c.sub }}</div> }
                              <div class="c4">
                                @for (o of outs(c); track o.k) {
                                  <div class="co" [class.z]="!o.v" [style.--oc]="o.col">
                                    <div class="col"><span>{{ o.k }}</span><b>{{ fmt(o.v) }}</b></div>
                                    <div class="ctk"><i [style.width.%]="bar(o.v)"></i></div>
                                  </div>
                                }
                              </div>
                            </button>
                          }
                        </div>
                      }
                      @case ('seq') {
                        <div class="seq">
                          @for (c of bk.cells; track c.label) {
                            <span class="sq" [class.done]="c.b >= 100" [class.part]="c.b > 0 && c.b < 100"
                                  [title]="c.meta">{{ c.label }}</span>
                          }
                        </div>
                      }
                      @default {
                        <div class="lchips">
                          @for (c of bk.cells; track c.ar + c.label) {
                            <button class="lchip" [class.live]="c.b > 0" [disabled]="!c.nav" (click)="go(c.nav)">
                              @if (c.ar) { <span class="lar">{{ c.ar }}</span> }
                              <span class="lk">{{ c.label }}</span>
                              <span class="lp">{{ fmt(c.b) }}%</span>
                            </button>
                          }
                        </div>
                      }
                    }
                  </div>
                }
              </div>
            } @else {
            <div class="rcard" [class.hask]="!!g.nav" [class.live]="g.live" [class.sel]="g.sel"
                 [style.--kc]="kindColor(g.kind)" [style.--kg]="kindGlow(g.kind)"
                 (click)="g.nav ? go(g.nav) : null">
              <span class="tw">{{ g.hasKids ? (g.open ? '▾' : '▸') : '·' }}</span>
              <div class="sens"><div class="sdot"></div><div class="sl">sensor</div></div>
              <div class="upa" [title]="'feeds up to ' + g.reportsTo">↑</div>
              <div class="nm">
                <div class="n1">
                  @if (g.num) { <span class="num">{{ g.num }}</span> }
                  @if (g.ar) { <span class="aa">{{ g.ar }}</span> }
                  <span class="en">{{ g.en }}</span>
                  <span class="kindb">{{ g.kind }}</span>
                  @if (g.live) { <span class="livb">active</span> }
                </div>
                @if (g.scope) { <div class="sc">{{ g.scope }}</div> }
                <div class="rep">↑ reports to {{ g.reportsTo }}</div>
              </div>
              <div class="out4">
                <div class="o" [class.z]="!g.b" style="--oc:var(--build)"><div class="ol"><span>B</span><b>{{ fmt(g.b) }}</b></div><div class="tk"><i [style.width.%]="bar(g.b)"></i></div></div>
                <div class="o" [class.z]="!g.s" style="--oc:var(--study)"><div class="ol"><span>S</span><b>{{ fmt(g.s) }}</b></div><div class="tk"><i [style.width.%]="bar(g.s)"></i></div></div>
                <div class="o" [class.z]="!g.c" style="--oc:var(--content)"><div class="ol"><span>C</span><b>{{ fmt(g.c) }}</b></div><div class="tk"><i [style.width.%]="bar(g.c)"></i></div></div>
                <div class="o" [class.z]="!g.r" style="--oc:var(--retn)"><div class="ol"><span>R</span><b>{{ fmt(g.r) }}</b></div><div class="tk"><i [style.width.%]="bar(g.r)"></i></div></div>
              </div>
            </div>
            }
          </div>
        }
      </div>

      <div class="rollnote"><b>How the rollup works.</b> When a root's sensor moves — say برك climbs after
        al-Qāmūs is mined — that reading feeds <b class="up">upward</b>: the <b>Root/Vocabulary</b> stream
        re-averages, the <b>Passage</b> re-aggregates its six streams, the <b>Surah</b> re-aggregates its
        passages, and the <b>whole Qurʾān</b> ticks up. One mined source at the leaf raises the number at every
        level above it — that is the recursion working. The same holds for all four outputs, including
        <b style="color:var(--retn)">Retention</b>, which is why an unrun SRS loop shows 0 all the way up.</div>
    }
  `,
  styles: [`
    :host { display:block; }
    .msg { color:var(--t2); padding:26px; text-align:center; } .msg.err { color:var(--err); }
    .sub { text-align:center; color:var(--t2); font-size:13px; margin:14px auto 6px; max-width:740px; line-height:1.55; }
    .sub .sn { color:var(--study); } .up { color:var(--content); }
    .principle { display:flex; gap:12px; align-items:center; justify-content:center; flex-wrap:wrap;
      border:1px dashed rgba(107,186,255,.4); border-radius:12px; padding:11px 15px; margin:14px 0 6px; font-size:12px; color:var(--t2); }
    .principle .p { display:inline-flex; align-items:center; gap:6px; }
    .principle .dot { width:11px; height:11px; border-radius:50%; background:var(--study); box-shadow:0 0 8px var(--study); }
    .principle b { color:var(--gold-b); } .principle .upt { color:var(--content); font-weight:700; }
    .controls { display:flex; gap:8px; justify-content:center; margin:12px 0 6px; flex-wrap:wrap; }
    .btn { font-size:11px; font-family:var(--serif); letter-spacing:.04em; padding:6px 14px; border-radius:9px;
      border:1px solid var(--bd); background:#0f0f0f; color:var(--t2); cursor:pointer; }
    .btn:hover { border-color:var(--bd-hi); color:var(--gold-b); }
    .legend { display:flex; gap:14px; flex-wrap:wrap; justify-content:center; margin:10px 0 16px; font-size:11px; color:var(--t3); }
    .legend span { display:inline-flex; align-items:center; gap:5px; } .legend i { width:24px; height:8px; border-radius:3px; }
    .legend .od { width:9px; height:9px; border-radius:2px; }

    .ladder { position:relative; padding-left:30px; }
    .uprail { position:absolute; left:8px; top:14px; bottom:24px; width:2px;
      background:linear-gradient(to top, rgba(77,217,168,.15), var(--content)); border-radius:2px; }
    .uprail::before { content:'▲'; position:absolute; top:-13px; left:-5px; color:var(--content); font-size:11px; }
    .upword { position:absolute; left:-6px; top:44%; transform:rotate(-90deg); transform-origin:left;
      font-family:var(--serif); font-size:9px; letter-spacing:.15em; text-transform:uppercase; color:var(--content); white-space:nowrap; }

    .rung { position:relative; margin-bottom:7px; }
    .connector { position:absolute; left:calc(-22px + var(--dx)); top:22px; width:calc(22px - var(--dx)); height:2px; background:rgba(255,255,255,.12); }
    .rcard { margin-left:var(--dx); border:1px solid rgba(255,255,255,.09); border-left:3px solid var(--kc); border-radius:11px;
      background:linear-gradient(90deg, var(--kg), #0e0e0e 80%); padding:10px 13px; display:flex; gap:12px; align-items:center; }
    .rcard.hask { cursor:pointer; } .rcard.hask:hover { border-color:var(--bd-hi); }
    /* a sensor that is reading build, and the rung the URL is standing on */
    .rcard.live { border-color:rgba(77,217,168,.28); }
    .rcard.sel { border-color:var(--bd-hi); box-shadow:0 0 0 1px rgba(201,168,76,.22) inset; }
    .livb { font-size:7.5px; font-family:ui-monospace,monospace; letter-spacing:.06em; text-transform:uppercase;
      color:var(--content); border:1px solid rgba(77,217,168,.4); border-radius:8px; padding:1px 5px; }

    /* leaf pieces — grouped by kind, each group in the shape that suits it */
    .leaves { margin-left:var(--dx); display:flex; flex-direction:column; gap:11px;
      border-left:1px dashed rgba(255,255,255,.08); padding:3px 0 3px 12px; }
    .lt { font-family:var(--serif); font-size:9.5px; letter-spacing:.11em; text-transform:uppercase;
      color:var(--gold-d); margin-bottom:6px; }
    .cellgrid { display:grid; gap:7px; grid-template-columns:repeat(auto-fill, minmax(126px, 1fr)); }
    .cellgrid.wide { grid-template-columns:repeat(auto-fill, minmax(184px, 1fr)); }
    .cellgrid.wide .cell { text-align:left; }
    .cell { background:#0e0e0e; border:1px solid rgba(255,255,255,.09); border-left:3px solid var(--study);
      border-radius:10px; padding:8px 10px 9px; text-align:center; cursor:pointer; color:var(--text); font-family:inherit; }
    .cell:disabled { cursor:default; }
    .cell:not(:disabled):hover { border-color:var(--bd-hi); }
    .cell.live { border-left-color:var(--content); }
    .cell.sel { border-color:var(--bd-hi); background:rgba(201,168,76,.09); }
    .cm { font-family:ui-monospace,monospace; font-size:8.5px; color:var(--t3); text-align:left; }
    .car { font-family:var(--ar); font-size:24px; color:var(--gold-b); line-height:1.5; }
    .cen { font-family:var(--serif); font-size:10px; color:var(--t2); }
    .cen.big { font-size:12.5px; color:var(--text); padding:8px 0; }
    .csub { font-size:9px; color:var(--t3); margin-top:2px; }
    /* a card carries the same four outputs its rung would */
    /* two by two in a narrow card, four across once there is room */
    .c4 { display:grid; grid-template-columns:repeat(2,1fr); gap:4px 8px; margin-top:8px; }
    .cellgrid.wide .c4 { grid-template-columns:repeat(4,1fr); gap:4px; }
    .col { display:flex; justify-content:space-between; align-items:baseline; font-size:7.5px; color:var(--t3);
      text-transform:uppercase; letter-spacing:.03em; }
    .col b { color:var(--oc); font-family:ui-monospace,monospace; font-size:8.5px; }
    .ctk { height:4px; border-radius:3px; background:#242424; overflow:hidden; margin-top:2px; }
    .ctk i { display:block; height:100%; background:var(--oc); }
    .co.z .ctk { background:none; border:1px dashed rgba(224,120,92,.35); }

    /* an ordered run — the sentence sequence, read left to right */
    .seq { display:flex; gap:4px; flex-wrap:wrap; }
    .sq { width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center;
      border-radius:7px; border:1px dashed rgba(255,255,255,.14); background:#0e0e0e;
      font-family:ui-monospace,monospace; font-size:10px; color:var(--t3); }
    .sq.part { border-style:solid; border-color:rgba(77,217,168,.45); color:var(--content); }
    .sq.done { border-style:solid; border-color:var(--content); background:rgba(77,217,168,.16); color:var(--content); }

    /* a handful of named things — chips */
    .lchips { display:flex; gap:6px; flex-wrap:wrap; }
    .lchip { display:inline-flex; align-items:baseline; gap:6px; background:#0e0e0e; border-radius:16px;
      border:1px solid rgba(255,255,255,.1); padding:3px 11px; color:var(--t2); font-family:inherit; cursor:pointer; }
    .lchip:disabled { cursor:default; } .lchip.live { border-color:rgba(77,217,168,.4); }
    .lar { font-family:var(--ar); font-size:15px; color:var(--gold-b); }
    .lk { font-size:9px; font-family:ui-monospace,monospace; color:var(--t3); text-transform:uppercase; }
    .lp { font-family:ui-monospace,monospace; font-size:9px; color:var(--content); }
    .tw { flex:0 0 auto; width:14px; text-align:center; color:var(--gold-d); font-size:11px; }
    .sens { flex:0 0 auto; display:flex; flex-direction:column; align-items:center; gap:3px; width:40px; }
    .sdot { width:14px; height:14px; border-radius:50%; background:var(--study); box-shadow:0 0 9px rgba(107,186,255,.7); position:relative; }
    .sdot::after { content:''; position:absolute; inset:3px; border-radius:50%; background:#0c0c0c; }
    .sl { font-size:7px; color:var(--study); letter-spacing:.05em; text-transform:uppercase; font-family:ui-monospace,monospace; }
    .upa { flex:0 0 auto; color:var(--content); font-size:15px; font-weight:700; line-height:1; }
    .nm { flex:1; min-width:0; }
    .n1 { font-family:var(--serif); font-size:14px; color:var(--text); display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; }
    .n1 .num { font-family:ui-monospace,monospace; font-size:9px; color:var(--t3); }
    .n1 .aa { font-family:var(--ar); font-size:18px; color:var(--kc); }
    .n1 .kindb { font-size:8px; font-weight:800; letter-spacing:.05em; text-transform:uppercase; padding:1px 6px;
      border-radius:8px; border:1px solid var(--kc); color:var(--kc); }
    .sc { font-size:10px; color:var(--t3); margin-top:2px; }
    .rep { font-size:9px; color:var(--content); margin-top:2px; }
    .out4 { flex:0 0 auto; display:grid; grid-template-columns:repeat(4,44px); gap:6px; }
    .ol { font-size:7.5px; color:var(--t3); text-transform:uppercase; display:flex; justify-content:space-between; }
    .ol b { color:var(--oc); font-family:ui-monospace,monospace; font-size:9px; }
    .tk { height:7px; border-radius:4px; background:#242424; overflow:hidden; margin-top:2px; } .tk i { display:block; height:100%; background:var(--oc); }
    .o.z .tk { border:1px dashed rgba(224,120,92,.45); }
    @media(max-width:720px){ .rcard { flex-wrap:wrap; } .out4 { grid-template-columns:repeat(4,1fr); width:100%; } }

    .rollnote { border:1px dashed var(--bd); border-radius:11px; padding:12px 15px; margin-top:16px;
      font-size:12.5px; color:var(--t2); line-height:1.6; } .rollnote b { color:var(--gold-b); }
  `],
})
export class CybLadderComponent {
  private readonly svc = inject(CybService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly pm = signal<ParamMap | null>(null);

  readonly surahs = signal<Surah[]>([]);
  readonly error = signal<string | null>(null);
  readonly units = signal<StudyUnit[]>([]);
  readonly verseRoots = signal<PassageRoot[]>([]);
  readonly sensorsN = signal(0);
  private readonly treeRoots = signal<CybNodeTree[]>([]);
  private readonly layerRegistry = signal<CybLayerRow[]>([]);

  readonly surahId   = computed(() => { const v = this.pm()?.get('surahId'); return v ? Number(v) : null; });
  readonly passageNo = computed(() => { const v = this.pm()?.get('passageNo'); return v ? Number(v) : null; });
  readonly stream    = computed(() => this.pm()?.get('stream') ?? null);
  readonly rootParam = computed(() => this.pm()?.get('root') ?? null);

  private readonly flat = computed<CybNodeTree[]>(() => {
    const out: CybNodeTree[] = [];
    const walk = (n: CybNodeTree) => { out.push(n); n.children.forEach(walk); };
    this.treeRoots().forEach(walk);
    return out;
  });

  readonly flatNodes = computed<CybNodeTree[]>(() => this.flat());
  readonly builtSurahs = computed(() => this.flat().filter((n) => n.scale === 'surah' && n.build_pct > 0).length);

  constructor() {
    this.route.paramMap.subscribe((pm) => {
      const prev = this.surahId();
      this.pm.set(pm);
      const sid = this.surahId();
      if (sid && sid !== prev) this.loadUnits(sid);
      if (!sid) this.units.set([]);
      if (this.stream() === 'vocabulary' && this.passageNo()) this.loadRoots();
    });

    forkJoin({ surahs: this.svc.surahs(), tree: this.svc.tree(), monitor: this.svc.monitor(),
              layers: this.svc.layers('quran') }).subscribe({
      next: ({ surahs, tree, monitor, layers }) => {
        this.layerRegistry.set(layers.layers);
        this.surahs.set(surahs.sort((a, b) => a.id - b.id));
        this.treeRoots.set(tree.roots);
        this.sensorsN.set(monitor.loop.sensors);
        const sid = this.surahId();
        if (sid && !this.units().length) this.loadUnits(sid);
        if (this.stream() === 'vocabulary' && this.passageNo()) this.loadRoots();
      },
      error: (e) => this.error.set(String(e?.message ?? e)),
    });
  }

  private loadUnits(surahId: number) {
    this.units.set([]);
    this.svc.studyGrid(surahId).subscribe({ next: (g) => this.units.set(g.units ?? []), error: () => this.units.set([]) });
  }
  private loadRoots() {
    const sid = this.surahId(); const p = this.passageNo();
    if (!sid || !p) return;
    this.verseRoots.set([]);
    this.svc.passageRoots(sid, p).subscribe({ next: (r) => this.verseRoots.set(r), error: () => this.verseRoots.set([]) });
  }

  private surahNode(id: number) { return this.flat().find((n) => n.scale === 'surah' && Number(n.target_ref) === id); }
  private passageNodeFor(u: StudyUnit) {
    const key = `${this.surahId()}:${u.ayah_from}-${u.ayah_to}`;
    return this.flat().find((n) => n.scale === 'passage' && (n.target_ref ?? '').replace(/^QR:SP:/, '') === key);
  }
  private rootNodeFor(rn: string) {
    const pieces = this.flat().filter((n) => n.scale === 'piece' && (n.target_ref ?? '').split(':').pop() === rn);
    return pieces.find((n) => n.piece_kind === 'root') ?? pieces[0];
  }

  /**
   * A stream's leaves, grouped by kind and given the shape that kind wants.
   *   • roots — 27 short Arabic tokens in āyah order → a scannable grid
   *   • iʿrāb sentences — an ordered s1…s12 run that is done or not → a sequence
   *   • expressions, nuances — a handful of named things → chips
   */
  private leafBlocks(stage: CybNodeTree, key: string, sid: number, pno: number, rootSel: string | null): LeafBlock[] {
    const blocks: LeafBlock[] = [];
    const refTail = (n: CybNode) => (n.target_ref ?? '').split(':').pop() ?? '';

    if (key === 'vocabulary') {
      // The roots come from the āyāt themselves, so every unique root shows up
      // whether or not the control plane has instantiated a node for it yet.
      const roots = this.verseRoots();
      if (roots.length) {
        blocks.push({
          layout: 'grid', title: `${roots.length} roots · in āyah order`,
          cells: roots.map((vr) => {
            const n = this.rootNodeFor(vr.root);
            return {
              ar: vr.root, label: '', sub: `${vr.lemmas} lemma${vr.lemmas > 1 ? 's' : ''}`,
              meta: `${sid}:${vr.first_ayah} · ${vr.occurrences}×`,
              ...this.four(n), sel: rootSel === vr.root,
              nav: ['/cybernetics/map', sid, pno, 'vocabulary', vr.root],
            };
          }),
        });
      }
      // Expressions and nuances live alongside the roots but are not roots.
      const others = stage.children.filter((c) => c.piece_kind && c.piece_kind !== 'root');
      for (const kind of [...new Set(others.map((c) => c.piece_kind!))]) {
        const of = others.filter((c) => c.piece_kind === kind);
        blocks.push({
          layout: 'chips', title: `${of.length} ${kind.replace(/_/g, ' ')}`,
          cells: of.map((c) => ({ ar: refTail(c), label: '', sub: '', meta: '', ...this.four(c), sel: false, nav: null })),
        });
      }
      return blocks;
    }

    const kids = stage.children;
    if (!kids.length) return blocks;

    if (kids.every((c) => c.piece_kind === 'ss_sentence')) {
      const seq = [...kids].sort((a, b) => this.seqNo(refTail(a)) - this.seqNo(refTail(b)));
      const done = seq.filter((c) => c.build_pct >= 100).length;
      blocks.push({
        layout: 'seq', title: `${seq.length} sentences · ${done} parsed`,
        cells: seq.map((c) => ({
          ar: '', label: String(this.seqNo(refTail(c))), sub: '', meta: `${refTail(c)} · build ${c.build_pct}%`,
          ...this.four(c), sel: false, nav: null,
        })),
      });
      return blocks;
    }

    blocks.push({
      layout: 'chips', title: `${kids.length} pieces`,
      cells: kids.map((c) => ({
        ar: /[؀-ۿ]/.test(refTail(c)) ? refTail(c) : '',
        label: /[؀-ۿ]/.test(refTail(c)) ? (c.piece_kind ?? '') : refTail(c),
        sub: '', meta: '', ...this.four(c), sel: false, nav: null,
      })),
    });
    return blocks;
  }

  /** The four outputs of a card, in the ladder's own order. */
  outs(c: PieceCell) {
    return [
      { k: 'B', v: c.b, col: 'var(--build)' },
      { k: 'S', v: c.s, col: 'var(--study)' },
      { k: 'C', v: c.c, col: 'var(--content)' },
      { k: 'R', v: c.r, col: 'var(--retn)' },
    ];
  }

  /** A node's four readings, or four zeros where nothing is instantiated yet. */
  /** The registry's label for a layer, falling back to the raw key so a layer
   *  the plane instantiated ahead of the registry still renders under its own
   *  name rather than vanishing. */
  private streamMeta(key: string): { ar: string; en: string; scope: string } {
    const l = this.layerRegistry().find((x) => x.layer_key === key);
    return {
      ar: l?.name_ar ?? '',
      en: l?.name_en ?? key.replace(/_/g, ' '),
      scope: l?.hint ?? 'declared by the control plane',
    };
  }

  private four(n: CybNode | undefined) {
    return { b: n?.build_pct ?? 0, s: n?.study_pct ?? 0, c: n?.content_pct ?? 0, r: n?.retention_pct ?? 0 };
  }

  /** A rung that carries grids instead of a sensor card. */
  private gridRung(depth: number, id: string, blocks: LeafBlock[]): Rung {
    return {
      depth, kind: 'piece', ar: '', en: id, num: '', scope: '', reportsTo: '',
      b: 0, s: 0, c: 0, r: 0, open: true, hasKids: false, live: false, sel: false,
      nav: null, blocks,
    };
  }

  /** "s10" → 10, so the sentence run sorts in reading order, not lexically. */
  private seqNo(ref: string): number { return Number(ref.replace(/\D/g, '')) || 0; }

  /** The ladder flattened to rungs — only the path in the URL is expanded. */
  readonly rungs = computed<Rung[]>(() => {
    const out: Rung[] = [];
    const sid = this.surahId(); const pno = this.passageNo(); const st = this.stream();
    const rootSel = this.rootParam();
    // The Qurʾān rung is the rollup over ALL 114 surahs — an un-instantiated
    // surah reports 0, so the parent cannot read higher than its children.
    const perSurah = this.surahs().map((su) => this.surahNode(su.id));

    out.push({
      depth: 0, kind: 'quran', ar: 'القرآن', en: 'Entire Qurʾān', num: '',
      scope: `114 surahs · ${this.builtSurahs()} instantiated`, reportsTo: '—',
      b: this.avg(perSurah.map((n) => n?.build_pct ?? 0)),
      s: this.avg(perSurah.map((n) => n?.study_pct ?? 0)),
      c: this.avg(perSurah.map((n) => n?.content_pct ?? 0)),
      r: this.avg(perSurah.map((n) => n?.retention_pct ?? 0)),
      open: true, hasKids: true,
      live: this.builtSurahs() > 0, sel: !sid,
      nav: sid ? ['/cybernetics/ladder'] : null,
    });

    // Unopened siblings ride as a grid — 114 surahs or 7 passages as full-width
    // rungs would bury the descent. Opening one turns it back into a rung, with
    // its sensor and its four outputs, and its own siblings fold into the grid.
    if (!sid) {
      out.push(this.gridRung(1, 'surahs', [{
        layout: 'grid', title: `114 surahs · ${this.builtSurahs()} instantiated`,
        cells: this.surahs().map((su) => {
          const n = this.surahNode(su.id);
          return {
            ar: su.name_ar, label: su.name_transliteration || su.name_en, sub: '',
            meta: `${su.id} · ${su.ayah_count} āyāt`, ...this.four(n), sel: false,
            nav: ['/cybernetics/ladder', su.id],
          };
        }),
      }]));
      return out;
    }

    for (const su of this.surahs().filter((s) => s.id === sid)) {
      const n = this.surahNode(su.id);
      const open = sid === su.id;
      out.push({
        depth: 1, kind: 'surah', ar: su.name_ar, en: su.name_transliteration || su.name_en, num: String(su.id),
        scope: `${su.ayah_count} āyāt${n ? '' : ' · not started'}`, reportsTo: 'the Qurʾān',
        b: n?.build_pct ?? 0, s: n?.study_pct ?? 0, c: n?.content_pct ?? 0, r: n?.retention_pct ?? 0,
        open, hasKids: true,
        live: (n?.build_pct ?? 0) > 0, sel: open && !pno,
        nav: open ? ['/cybernetics/ladder'] : ['/cybernetics/ladder', su.id],
      });
      if (!open) continue;

      if (!pno) {
        const us = this.units();
        if (us.length) {
          out.push(this.gridRung(2, 'passages', [{
            layout: 'grid', wide: true, title: `${us.length} study passages`,
            cells: us.map((u) => {
              const pn = this.passageNodeFor(u);
              return {
                ar: '', label: `${su.id}:${u.ayah_from}–${u.ayah_to}`, sub: u.label,
                meta: `${u.passage_no} · ${u.theme ?? ''}`, ...this.four(pn), sel: false,
                nav: ['/cybernetics/ladder', su.id, u.passage_no],
              };
            }),
          }]));
        }
        continue;
      }

      for (const u of this.units().filter((x) => x.passage_no === pno)) {
        const pn = this.passageNodeFor(u);
        const popen = pno === u.passage_no;
        out.push({
          depth: 2, kind: 'passage', ar: '', en: `${su.id}:${u.ayah_from}–${u.ayah_to} · ${u.label}`,
          num: String(u.passage_no), scope: u.theme ?? '', reportsTo: 'the Surah',
          b: pn?.build_pct ?? 0, s: pn?.study_pct ?? 0, c: pn?.content_pct ?? 0, r: pn?.retention_pct ?? 0,
          open: popen, hasKids: !!pn?.children.length,
          live: (pn?.build_pct ?? 0) > 0, sel: popen && !st,
          nav: popen ? ['/cybernetics/ladder', su.id] : ['/cybernetics/ladder', su.id, u.passage_no],
        });
        if (!popen || !pn) continue;

        if (!st) {
          out.push(this.gridRung(3, 'streams', [{
            layout: 'grid', wide: true, title: `${pn.children.length} stream-systems`,
            cells: pn.children.map((stage) => {
              const k = stage.layer ?? '';
              const m = this.streamMeta(k);
              const kids = k === 'vocabulary' || stage.children.length > 0;
              return {
                ar: m.ar, label: m.en, sub: m.scope, meta: k, ...this.four(stage), sel: false,
                nav: kids ? ['/cybernetics/ladder', su.id, u.passage_no, k] : null,
              };
            }),
          }]));
          continue;
        }

        for (const stage of pn.children.filter((c) => c.layer === st)) {
          const key = stage.layer ?? '';
          const meta = this.streamMeta(key);
          const sopen = true;
          const kids = key === 'vocabulary' || stage.children.length > 0;
          out.push({
            depth: 3, kind: 'stream', ar: meta.ar, en: meta.en, num: '',
            scope: meta.scope, reportsTo: 'the Passage',
            b: stage.build_pct, s: stage.study_pct, c: stage.content_pct, r: stage.retention_pct,
            open: sopen, hasKids: kids,
            live: stage.build_pct > 0, sel: sopen,
            nav: !kids ? null
               : sopen ? ['/cybernetics/ladder', su.id, u.passage_no]
                       : ['/cybernetics/ladder', su.id, u.passage_no, key],
          });
          if (!sopen) continue;

          const blocks = this.leafBlocks(stage, key, su.id, u.passage_no, rootSel);
          if (blocks.length) out.push(this.gridRung(4, key, blocks));
        }
      }
    }
    return out;
  });

  // Kept unrounded: the Qurʾān rung averages over all 114 surahs, so real work at
  // a leaf lands well under 1% up top — rounding it would report a built root as 0.
  private avg(v: number[]): number { return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; }

  /** Shows the smallest real reading rather than collapsing it to 0. */
  fmt(v: number): string {
    if (!v) return '0';
    if (v >= 10) return String(Math.round(v));
    if (v >= 1) return v.toFixed(1);
    return v.toFixed(2);
  }
  /** A sliver so a non-zero rollup is visible on the track too. */
  bar(v: number): number { return v > 0 ? Math.max(0.9, Math.min(100, v)) : 0; }

  go(nav: (string | number)[] | null) { if (nav) this.router.navigate(nav); }
  openBuiltPath() {
    const built = this.flat().find((n) => n.scale === 'surah' && n.build_pct > 0);
    const sid = built ? Number(built.target_ref) : 44;
    this.router.navigate(['/cybernetics/ladder', sid, 1, 'vocabulary']);
  }
  collapseAll() { this.router.navigate(['/cybernetics/ladder']); }

  kindColor(k: Rung['kind']): string {
    return k === 'quran' ? 'var(--build)' : k === 'surah' ? '#e8b45c'
         : k === 'passage' ? 'var(--build)' : k === 'stream' ? 'var(--retn)' : 'var(--study)';
  }
  kindGlow(k: Rung['kind']): string {
    return k === 'stream' ? 'rgba(197,138,217,.08)' : k === 'piece' ? 'rgba(107,186,255,.07)' : 'rgba(232,201,106,.08)';
  }
}
