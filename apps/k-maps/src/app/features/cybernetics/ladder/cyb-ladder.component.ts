import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CybService } from '../data/cyb.service';
import { CybTopbarComponent } from '../shared/cyb-topbar.component';
import type { CybNode, Surah, StudyUnit, PassageRoot } from '../data/cyb.models';

// Quran Ladder — the Qurʾān as one recursion, rung by rung.
// Every rung is a viable system: a sensor that reads its own state and feeds it
// UP the recursion, so a parent is only as built as its children report:
//   Entire Qurʾān → Surah → Passage → Stream → Root
// It walks the same path as the map and takes the same route shape, so a URL in
// one view opens the same place in the other. Only the path in the URL expands.
const STREAMS: Record<string, { ar: string; en: string; scope: string }> = {
  vocabulary: { ar: 'المفردات', en: 'Root / Vocabulary', scope: 'itself recurses Root → Lemma → Word' },
  reading:    { ar: 'القراءة',  en: 'Reading', scope: 'tilāwa · tajwīd · muṣḥaf layout' },
  ss:         { ar: 'الإعراب',  en: 'Sentence Structure', scope: 'dependency tree · balāgha' },
  structure:  { ar: 'النظم',    en: 'Passage Structure', scope: 'coherence · munāsaba' },
  tafsir:     { ar: 'التفسير',  en: 'Tafsīr', scope: 'key-points by lens' },
  worldview:  { ar: 'رؤية العالم', en: 'Worldview · WVS', scope: 'ʿaqīda · ethics · picture of reality' },
};

interface Rung {
  depth: number;
  kind: 'quran' | 'surah' | 'passage' | 'stream' | 'piece';
  ar: string; en: string; num: string;
  scope: string; reportsTo: string;
  b: number; s: number; c: number; r: number;
  open: boolean; hasKids: boolean;
  nav: (string | number)[] | null;
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
            <div class="rcard" [class.hask]="!!g.nav" [style.--kc]="kindColor(g.kind)" [style.--kg]="kindGlow(g.kind)"
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
  private readonly treeRoots = signal<CybNode[]>([]);

  readonly surahId   = computed(() => { const v = this.pm()?.get('surahId'); return v ? Number(v) : null; });
  readonly passageNo = computed(() => { const v = this.pm()?.get('passageNo'); return v ? Number(v) : null; });
  readonly stream    = computed(() => this.pm()?.get('stream') ?? null);
  readonly rootParam = computed(() => this.pm()?.get('root') ?? null);

  private readonly flat = computed<CybNode[]>(() => {
    const out: CybNode[] = [];
    const walk = (n: CybNode) => { out.push(n); n.children.forEach(walk); };
    this.treeRoots().forEach(walk);
    return out;
  });

  readonly flatNodes = computed<CybNode[]>(() => this.flat());
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

    forkJoin({ surahs: this.svc.surahs(), tree: this.svc.tree(), monitor: this.svc.monitor() }).subscribe({
      next: ({ surahs, tree, monitor }) => {
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

  /** The ladder flattened to rungs — only the path in the URL is expanded. */
  readonly rungs = computed<Rung[]>(() => {
    const out: Rung[] = [];
    const sid = this.surahId(); const pno = this.passageNo(); const st = this.stream();
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
      open: true, hasKids: true, nav: null,
    });

    for (const su of this.surahs()) {
      const n = this.surahNode(su.id);
      const open = sid === su.id;
      out.push({
        depth: 1, kind: 'surah', ar: su.name_ar, en: su.name_transliteration || su.name_en, num: String(su.id),
        scope: `${su.ayah_count} āyāt${n ? '' : ' · not started'}`, reportsTo: 'the Qurʾān',
        b: n?.build_pct ?? 0, s: n?.study_pct ?? 0, c: n?.content_pct ?? 0, r: n?.retention_pct ?? 0,
        open, hasKids: true,
        nav: open ? ['/cybernetics/ladder'] : ['/cybernetics/ladder', su.id],
      });
      if (!open) continue;

      for (const u of this.units()) {
        const pn = this.passageNodeFor(u);
        const popen = pno === u.passage_no;
        out.push({
          depth: 2, kind: 'passage', ar: '', en: `${su.id}:${u.ayah_from}–${u.ayah_to} · ${u.label}`,
          num: String(u.passage_no), scope: u.theme ?? '', reportsTo: 'the Surah',
          b: pn?.build_pct ?? 0, s: pn?.study_pct ?? 0, c: pn?.content_pct ?? 0, r: pn?.retention_pct ?? 0,
          open: popen, hasKids: !!pn?.children.length,
          nav: popen ? ['/cybernetics/ladder', su.id] : ['/cybernetics/ladder', su.id, u.passage_no],
        });
        if (!popen || !pn) continue;

        for (const stage of pn.children) {
          const key = stage.layer ?? '';
          const meta = STREAMS[key] ?? { ar: '', en: key, scope: '' };
          const sopen = st === key;
          const kids = key === 'vocabulary' || stage.children.length > 0;
          out.push({
            depth: 3, kind: 'stream', ar: meta.ar, en: meta.en, num: '',
            scope: meta.scope, reportsTo: 'the Passage',
            b: stage.build_pct, s: stage.study_pct, c: stage.content_pct, r: stage.retention_pct,
            open: sopen, hasKids: kids,
            nav: !kids ? null
               : sopen ? ['/cybernetics/ladder', su.id, u.passage_no]
                       : ['/cybernetics/ladder', su.id, u.passage_no, key],
          });
          if (!sopen) continue;

          if (key === 'vocabulary') {
            for (const vr of this.verseRoots()) {
              const rn = this.rootNodeFor(vr.root);
              out.push({
                depth: 4, kind: 'piece', ar: vr.root, en: `${su.id}:${vr.first_ayah} · ${vr.occurrences}×`, num: '',
                scope: `${vr.lemmas} lemma${vr.lemmas > 1 ? 's' : ''}`, reportsTo: 'Root / Vocabulary',
                b: rn?.build_pct ?? 0, s: rn?.study_pct ?? 0, c: rn?.content_pct ?? 0, r: rn?.retention_pct ?? 0,
                open: false, hasKids: false,
                nav: ['/cybernetics/map', su.id, u.passage_no, 'vocabulary', vr.root],
              });
            }
          } else {
            for (const piece of stage.children) {
              out.push({
                depth: 4, kind: 'piece', ar: (piece.target_ref ?? '').split(':').pop() ?? '',
                en: piece.piece_kind ?? '', num: '', scope: '', reportsTo: meta.en,
                b: piece.build_pct, s: piece.study_pct, c: piece.content_pct, r: piece.retention_pct,
                open: false, hasKids: false, nav: null,
              });
            }
          }
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

  go(nav: (string | number)[]) { this.router.navigate(nav); }
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
