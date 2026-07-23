import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CybService } from '../data/cyb.service';
import type { CybNode, Surah } from '../data/cyb.models';

// Shared top bar for the Map and the Ladder:
//   • search — a surah by number (44), name (dukhan / Ad-Dukhān) or Arabic (الدخان),
//     matched diacritic- and orthography-insensitively so any spelling lands.
//   • top active — ONE active trail, scoped to where you already are. The head is
//     the thing in build at this level; anything still active below it trails off
//     thinner; siblings in build at the same level sit on the parallel row. Every
//     chip routes to its own place, so the strip is also the fastest way back in.
type Tier = 'head' | 'trail' | 'par';

interface Chip {
  kind: 'surah' | 'passage' | 'stream' | 'root';
  ar: string; label: string; pct: number; tier: Tier;
  route: (string | number)[] | null;
}

@Component({
  selector: 'km-cyb-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bar">
      <div class="searchwrap">
        <input class="search" type="search" [value]="q()"
               (input)="q.set($any($event.target).value)"
               (keydown.enter)="jumpFirst()"
               (keydown.escape)="q.set('')"
               placeholder="Search a surah — 44 · dukhan · الدخان" />
        @if (q() && matches().length) {
          <div class="results">
            @for (s of matches(); track s.id) {
              <button class="res" (click)="openSurah(s.id)">
                <span class="rnum">{{ s.id }}</span>
                <span class="rar">{{ s.name_ar }}</span>
                <span class="ren">{{ s.name_transliteration || s.name_en }}</span>
                <span class="rmeta">{{ s.ayah_count }} āyāt</span>
                @if (surahPct(s.id); as p) { <span class="rpct">build {{ p }}%</span> }
              </button>
            }
          </div>
        } @else if (q() && !matches().length) {
          <div class="results"><div class="nores">No surah matches “{{ q() }}”.</div></div>
        }
      </div>

      @if (trail().length) {
        <div class="line">
          <span class="ll">Top active</span>
          <div class="chips">
            @for (c of trail(); track c.kind + c.label + c.ar; let i = $index) {
              @if (i > 0) { <span class="sep">›</span> }
              <button class="chip" [attr.data-tier]="c.tier" [disabled]="!c.route" (click)="go(c.route)">
                <span class="ck">{{ c.kind }}</span>
                @if (c.ar) { <span class="car">{{ c.ar }}</span> }
                @if (c.label) { <span class="cl">{{ c.label }}</span> }
                <span class="cp">{{ c.pct }}%</span>
              </button>
            }
          </div>
        </div>
      }
      @if (parallel().length) {
        <div class="line">
          <span class="ll">Parallel<span class="ln">{{ parallel().length }}</span></span>
          <div class="chips">
            @for (c of parallel(); track c.kind + c.label + c.ar) {
              <button class="chip" data-tier="par" [disabled]="!c.route" (click)="go(c.route)">
                <span class="ck">{{ c.kind }}</span>
                @if (c.ar) { <span class="car">{{ c.ar }}</span> }
                @if (c.label) { <span class="cl">{{ c.label }}</span> }
                <span class="cp">{{ c.pct }}%</span>
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display:block; }
    .bar { display:flex; flex-direction:column; gap:8px; margin:14px 0 4px; }
    .searchwrap { position:relative; }
    .search { width:100%; background:#0f0f0f; border:1px solid var(--bd); border-radius:12px; color:var(--text);
      padding:9px 14px; font-size:13px; font-family:inherit; }
    .search:focus { outline:none; border-color:var(--bd-hi); }
    .search::placeholder { color:var(--t3); }
    .results { position:absolute; z-index:20; left:0; right:0; top:calc(100% + 5px); background:#111;
      border:1px solid var(--bd-hi); border-radius:12px; overflow:hidden; box-shadow:0 12px 34px rgba(0,0,0,.6); max-height:320px; overflow-y:auto; }
    .res { display:flex; align-items:baseline; gap:9px; width:100%; text-align:left; background:none; border:none;
      border-bottom:1px solid rgba(255,255,255,.05); padding:8px 12px; cursor:pointer; color:var(--text); }
    .res:hover { background:rgba(201,168,76,.08); }
    .rnum { font-family:ui-monospace,monospace; font-size:9.5px; color:var(--t3); width:22px; }
    .rar { font-family:var(--ar); font-size:16px; color:var(--gold-b); }
    .ren { font-family:var(--serif); font-size:12.5px; }
    .rmeta { font-size:9.5px; color:var(--t3); margin-left:auto; }
    .rpct { font-size:9.5px; color:var(--content); font-family:ui-monospace,monospace; }
    .nores { padding:10px 12px; font-size:12px; color:var(--t3); font-style:italic; }

    .line { display:flex; align-items:flex-start; gap:10px; flex-wrap:wrap; }
    .ll { font-family:var(--serif); font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:var(--gold-d);
      display:inline-flex; align-items:center; gap:7px; padding-top:6px; min-width:74px; }
    .ln { font-family:ui-monospace,monospace; font-size:9px; color:var(--content); letter-spacing:0; }
    .chips { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
    .sep { color:var(--t3); font-size:12px; }
    .chip { display:inline-flex; align-items:baseline; gap:6px; background:#101010; border-radius:18px;
      cursor:pointer; font-family:inherit; border:1px solid rgba(77,217,168,.3); color:var(--t2); }
    .chip:disabled { cursor:default; opacity:.75; }
    .chip:not(:disabled):hover { border-color:var(--content); }
    /* the head carries the weight; each step down the trail gets thinner. */
    .chip[data-tier="head"]  { padding:6px 14px; font-size:13px; border-color:var(--content); background:rgba(77,217,168,.09); }
    .chip[data-tier="trail"] { padding:4px 11px; font-size:11.5px; }
    .chip[data-tier="par"]   { padding:2.5px 9px; font-size:10.5px; border-color:rgba(77,217,168,.18); color:var(--t3); }
    .ck { font-family:ui-monospace,monospace; font-size:8px; text-transform:uppercase; color:var(--t3); }
    .chip[data-tier="head"] .ck { font-size:8.5px; }
    .car { font-family:var(--ar); color:var(--gold-b); font-size:1.15em; }
    .cl { color:var(--text); }
    .chip[data-tier="par"] .cl { color:var(--t2); }
    .cp { font-family:ui-monospace,monospace; font-size:.8em; color:var(--content); }
  `],
})
export class CybTopbarComponent {
  private readonly router = inject(Router);
  private readonly svc = inject(CybService);

  /** 'map' | 'ladder' — chips route within the current view. */
  readonly view = input<'map' | 'ladder'>('map');
  readonly surahs = input<Surah[]>([]);
  /** The flattened cyb tree. */
  readonly nodes = input<CybNode[]>([]);
  /** Where the user already is — the strip never repeats what the URL says. */
  readonly surahId = input<number | null>(null);
  readonly passageNo = input<number | null>(null);
  readonly stream = input<string | null>(null);
  readonly root = input<string | null>(null);

  readonly q = signal('');
  /** ayah-range key ("44:1-9") → passage_no, so chips route precisely. */
  private readonly passageIndex = signal<Record<string, number>>({});
  private readonly indexed = new Set<number>();

  constructor() {
    // Resolve passage numbers for whichever surahs are in build. Runs whenever
    // the tree arrives or changes — the nodes input is empty on first paint.
    effect(() => {
      for (const n of this.nodes()) {
        if (n.scale !== 'surah' || n.build_pct <= 0) continue;
        const sid = Number(n.target_ref);
        if (!sid || this.indexed.has(sid)) continue;
        this.indexed.add(sid);
        this.svc.studyGrid(sid).subscribe({
          next: (g) => {
            const idx = { ...this.passageIndex() };
            for (const u of g.units ?? []) idx[`${sid}:${u.ayah_from}-${u.ayah_to}`] = u.passage_no;
            this.passageIndex.set(idx);
          },
          error: () => {},
        });
      }
    });
  }

  // ── search ────────────────────────────────────────────────────────────────
  private normEn(v: string): string {
    return (v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  private normAr(v: string): string {
    return (v ?? '')
      .replace(/[ً-ْٰـ]/g, '') // ḥarakāt + taṭwīl
      .replace(/[آأإٱ]/g, 'ا') // آ أ إ ٱ → ا
      .replace(/ى/g, 'ي')                     // ى → ي
      .replace(/ة/g, 'ه');                    // ة → ه
  }

  readonly matches = computed<Surah[]>(() => {
    const raw = this.q().trim();
    if (!raw) return [];
    const en = this.normEn(raw);
    const ar = this.normAr(raw);
    const digits = raw.replace(/\D/g, '');
    return this.surahs().filter((s) => {
      if (digits && String(s.id).startsWith(digits)) return true;
      if (en && (this.normEn(s.name_en).includes(en) || this.normEn(s.name_transliteration).includes(en))) return true;
      if (ar && this.normAr(s.name_ar).includes(ar)) return true;
      return false;
    }).slice(0, 8);
  });

  surahPct(id: number): number {
    return this.nodes().find((n) => n.scale === 'surah' && Number(n.target_ref) === id)?.build_pct ?? 0;
  }
  openSurah(id: number) { this.q.set(''); this.go([`/cybernetics/${this.view()}`, id]); }
  jumpFirst() { const m = this.matches(); if (m.length) this.openSurah(m[0].id); }

  // ── the active trail ──────────────────────────────────────────────────────
  private get base() { return `/cybernetics/${this.view()}`; }

  private inBuild(list: CybNode[]): CybNode[] {
    return list.filter((n) => n.build_pct > 0).sort((a, b) => b.build_pct - a.build_pct);
  }
  private kids(n: CybNode | undefined, scale: CybNode['scale']): CybNode[] {
    return (n?.children ?? []).filter((c) => c.scale === scale);
  }
  private descend(n: CybNode | undefined): CybNode[] {
    const out: CybNode[] = [];
    const walk = (x: CybNode) => { out.push(x); x.children.forEach(walk); };
    if (n) n.children.forEach(walk);
    return out;
  }
  /** "QR:SP:44:1-9" → "44:1-9" */
  private pkey(p: CybNode | undefined) { return (p?.target_ref ?? '').replace(/^QR:SP:/, ''); }
  private pno(p: CybNode | undefined): number | null { return this.passageIndex()[this.pkey(p)] ?? null; }
  private rootName(n: CybNode): string { return (n.target_ref ?? '').split(':').pop() ?? ''; }

  private surahNode(id: number | null): CybNode | undefined {
    if (!id) return undefined;
    return this.nodes().find((n) => n.scale === 'surah' && Number(n.target_ref) === id);
  }

  private surahChip(n: CybNode, tier: Tier): Chip {
    const sid = Number(n.target_ref);
    const s = this.surahs().find((x) => x.id === sid);
    return { kind: 'surah', ar: s?.name_ar ?? '', label: s?.name_transliteration || s?.name_en || `Surah ${sid}`,
             pct: n.build_pct, tier, route: [this.base, sid] };
  }
  private passageChip(n: CybNode, sid: number, tier: Tier): Chip {
    const p = this.pno(n);
    return { kind: 'passage', ar: '', label: this.pkey(n), pct: n.build_pct, tier,
             route: p ? [this.base, sid, p] : [this.base, sid] };
  }
  private streamChip(n: CybNode, sid: number, pno: number | null, tier: Tier): Chip {
    return { kind: 'stream', ar: '', label: n.layer ?? '', pct: n.build_pct, tier,
             route: pno ? [this.base, sid, pno, n.layer!] : null };
  }
  private rootChip(n: CybNode, sid: number, pno: number | null, tier: Tier): Chip {
    // A root's dashboard lives on the map; the ladder hands off to it.
    return { kind: 'root', ar: this.rootName(n), label: '', pct: n.build_pct, tier,
             route: pno ? ['/cybernetics/map', sid, pno, 'vocabulary', this.rootName(n)] : null };
  }

  /**
   * How far down the passage the work has actually reached: which stream-system
   * is live, and then the root inside it. The stream shown is the one that owns
   * the leading root, so the trail reads as one continuous descent.
   */
  private leafChips(p: CybNode, sid: number): Chip[] {
    const pno = this.pno(p);
    const roots = this.inBuild(this.descend(p).filter((n) => n.scale === 'piece' && n.piece_kind === 'root'));
    if (roots.length) {
      const r = roots[0];
      const owner = this.kids(p, 'stage').find((s) => this.descend(s).some((x) => x.id === r.id));
      return [
        ...(owner ? [this.streamChip(owner, sid, pno, 'trail')] : []),
        this.rootChip(r, sid, pno, 'trail'),
      ];
    }
    const stages = this.inBuild(this.kids(p, 'stage'));
    return stages.length ? [this.streamChip(stages[0], sid, pno, 'trail')] : [];
  }

  /** The head + whatever is still active below it, thinner at each step. */
  readonly trail = computed<Chip[]>(() => {
    const sid = this.surahId();
    const su = this.surahNode(sid);

    // Nothing in the URL yet — the whole Qurʾān is the scope.
    if (!sid) {
      const top = this.inBuild(this.nodes().filter((n) => n.scale === 'surah'))[0];
      if (!top) return [];
      const tsid = Number(top.target_ref);
      const out: Chip[] = [this.surahChip(top, 'head')];
      const p = this.inBuild(this.kids(top, 'passage'))[0];
      if (p) { out.push(this.passageChip(p, tsid, 'trail')); out.push(...this.leafChips(p, tsid)); }
      return out;
    }
    if (!su) return [];

    const pno = this.passageNo();
    const passages = this.inBuild(this.kids(su, 'passage'));
    // At the surah, the passage is the head and the deepest active trails off it.
    if (!pno) {
      const p = passages[0];
      if (!p) return [];
      return [this.passageChip(p, sid, 'head'), ...this.leafChips(p, sid)];
    }

    const here = passages.find((p) => this.pno(p) === pno) ?? this.kids(su, 'passage').find((p) => this.pno(p) === pno);
    if (!here) return [];
    const out: Chip[] = [this.passageChip(here, sid, 'head')];

    // Inside a stream or a root the URL already names them, so the trail just
    // confirms their readings; at the passage itself it carries on down to the
    // live stream-system and the root inside it.
    const st = this.stream();
    if (!st) return [...out, ...this.leafChips(here, sid)];
    {
      const stage = this.kids(here, 'stage').find((n) => n.layer === st);
      if (stage) out.push(this.streamChip(stage, sid, pno, 'trail'));
      const rn = this.root();
      // Standing in a stream, the trail still names the root it is working on —
      // the one the URL selected, or the leading one on this layer.
      const rNode = rn
        ? this.descend(here).find((n) => n.scale === 'piece' && n.piece_kind === 'root' && this.rootName(n) === rn)
        : this.inBuild(this.descend(stage).filter((n) => n.scale === 'piece' && n.piece_kind === 'root'))[0];
      if (rNode) out.push(this.rootChip(rNode, sid, pno, 'trail'));
    }
    return out;
  });

  /** Siblings in build at the head's own level — the genuinely parallel work. */
  readonly parallel = computed<Chip[]>(() => {
    const head = this.trail()[0];
    if (!head) return [];
    const sid = this.surahId();

    if (head.kind === 'surah') {
      return this.inBuild(this.nodes().filter((n) => n.scale === 'surah'))
        .slice(1).map((n) => this.surahChip(n, 'par'));
    }
    const su = this.surahNode(sid);
    if (!su || !sid) return [];

    const rn = this.root();
    const st = this.stream();
    const here = this.kids(su, 'passage').find((p) => this.pkey(p) === head.label);
    if (!here) return [];
    const pno = this.pno(here);

    // Deep in a root, the parallel row is its sibling roots; in a stream, the
    // sibling streams; otherwise the surah's other passages in build.
    if (rn) {
      return this.inBuild(this.descend(here).filter((n) => n.scale === 'piece' && n.piece_kind === 'root'))
        .filter((n) => this.rootName(n) !== rn).slice(0, 8)
        .map((n) => this.rootChip(n, sid, pno, 'par'));
    }
    if (st) {
      return this.inBuild(this.kids(here, 'stage')).filter((n) => n.layer !== st)
        .map((n) => this.streamChip(n, sid, pno, 'par'));
    }
    // Standing at the passage, the parallel work is its other live streams —
    // the one already on the trail is not repeated.
    if (this.passageNo()) {
      const shown = this.trail().find((c) => c.kind === 'stream')?.label;
      return this.inBuild(this.kids(here, 'stage')).filter((n) => n.layer !== shown)
        .map((n) => this.streamChip(n, sid, pno, 'par'));
    }
    return this.inBuild(this.kids(su, 'passage')).slice(1).map((p) => this.passageChip(p, sid, 'par'));
  });

  go(route: (string | number)[] | null) { if (route) this.router.navigate(route); }
}
