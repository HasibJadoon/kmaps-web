import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CybService } from '../data/cyb.service';
import type { CybNode, Surah } from '../data/cyb.models';

// Shared top bar for the Map and the Ladder:
//   • search — a surah by number (44), name (dukhan / Ad-Dukhān) or Arabic (الدخان),
//     matched diacritic- and orthography-insensitively so any spelling lands.
//   • active now — every node currently in build, in parallel: surahs, passages,
//     streams and roots, each jumping straight to its own place in this view.
interface ActiveChip {
  label: string; ar: string; pct: number; kind: string; route: (string | number)[];
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

      @if (actives().length) {
        <div class="actives">
          <span class="al">Active now<span class="an">{{ actives().length }} in parallel</span></span>
          <div class="chips">
            @for (a of actives(); track a.kind + a.label) {
              <button class="chip" [attr.data-kind]="a.kind" (click)="go(a.route)">
                <span class="ck">{{ a.kind }}</span>
                @if (a.ar) { <span class="car">{{ a.ar }}</span> }
                <span class="cl">{{ a.label }}</span>
                <span class="cp">{{ a.pct }}%</span>
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display:block; }
    .bar { display:flex; flex-direction:column; gap:10px; margin:14px 0 4px; }
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

    .actives { display:flex; align-items:flex-start; gap:10px; flex-wrap:wrap; }
    .al { font-family:var(--serif); font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:var(--gold-d);
      display:inline-flex; align-items:center; gap:7px; padding-top:5px; }
    .an { font-family:ui-monospace,monospace; font-size:9px; color:var(--content); letter-spacing:0; text-transform:none; }
    .chips { display:flex; gap:6px; flex-wrap:wrap; }
    .chip { display:inline-flex; align-items:baseline; gap:6px; background:#101010; border:1px solid rgba(77,217,168,.3);
      border-radius:18px; padding:4px 11px; cursor:pointer; color:var(--t2); font-size:11.5px; font-family:inherit; }
    .chip:hover { border-color:var(--content); }
    .ck { font-family:ui-monospace,monospace; font-size:8px; text-transform:uppercase; color:var(--t3); }
    .car { font-family:var(--ar); font-size:14px; color:var(--gold-b); }
    .cl { color:var(--text); }
    .cp { font-family:ui-monospace,monospace; font-size:9.5px; color:var(--content); }
  `],
})
export class CybTopbarComponent {
  private readonly router = inject(Router);
  private readonly svc = inject(CybService);

  /** 'map' | 'ladder' — chips and results route within the current view. */
  readonly view = input<'map' | 'ladder'>('map');
  readonly surahs = input<Surah[]>([]);
  /** The flattened cyb tree. */
  readonly nodes = input<CybNode[]>([]);

  readonly q = signal('');
  /** ayah-range key ("1-9") → passage_no, so active chips route precisely. */
  private readonly passageIndex = signal<Record<string, number>>({});
  private indexedFor = new Set<number>();

  constructor() {
    // Resolve passage numbers for whichever surahs are in build, so a passage or
    // root chip can jump to its exact route rather than only to the surah.
    setTimeout(() => this.indexActiveSurahs());
  }

  private indexActiveSurahs() {
    for (const n of this.nodes()) {
      if (n.scale !== 'surah' || n.build_pct <= 0) continue;
      const sid = Number(n.target_ref);
      if (!sid || this.indexedFor.has(sid)) continue;
      this.indexedFor.add(sid);
      this.svc.studyGrid(sid).subscribe({
        next: (g) => {
          const idx = { ...this.passageIndex() };
          for (const u of g.units ?? []) idx[`${sid}:${u.ayah_from}-${u.ayah_to}`] = u.passage_no;
          this.passageIndex.set(idx);
        },
        error: () => {},
      });
    }
  }

  // ── search ────────────────────────────────────────────────────────────────
  private normEn(v: string): string {
    return (v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  private normAr(v: string): string {
    return (v ?? '')
      .replace(/[ً-ْٰـ]/g, '')   // ḥarakāt + taṭwīl
      .replace(/[آأإٱ]/g, 'ا') // آ أ إ ٱ → ا
      .replace(/ى/g, 'ي')                   // ى → ي
      .replace(/ة/g, 'ه');                  // ة → ه
  }

  readonly matches = computed<Surah[]>(() => {
    const raw = this.q().trim();
    if (!raw) return [];
    const en = this.normEn(raw);
    const ar = this.normAr(raw);
    const digits = raw.replace(/\D/g, '');
    return this.surahs().filter((s) => {
      if (digits && String(s.id) === digits) return true;
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

  // ── active now (parallel) ─────────────────────────────────────────────────
  private byId(id: string | null): CybNode | undefined {
    return id ? this.nodes().find((n) => n.id === id) : undefined;
  }
  /** Walk up to the passage this node belongs to. */
  private passageOf(n: CybNode): CybNode | undefined {
    let cur: CybNode | undefined = n;
    for (let i = 0; i < 5 && cur; i++) {
      if (cur.scale === 'passage') return cur;
      cur = this.byId(cur.parent_id);
    }
    return undefined;
  }
  /** "QR:SP:44:1-9" → { surah: 44, key: "44:1-9" } */
  private passageRef(p: CybNode | undefined) {
    const key = (p?.target_ref ?? '').replace(/^QR:SP:/, '');
    const surah = Number(key.split(':')[0]);
    return { key, surah: Number.isFinite(surah) ? surah : null };
  }

  readonly actives = computed<ActiveChip[]>(() => {
    const v = this.view();
    const out: ActiveChip[] = [];
    const idx = this.passageIndex();
    const base = `/cybernetics/${v}`;

    for (const n of this.nodes()) {
      if (n.build_pct <= 0) continue;

      if (n.scale === 'surah') {
        const sid = Number(n.target_ref);
        const s = this.surahs().find((x) => x.id === sid);
        out.push({ kind: 'surah', ar: s?.name_ar ?? '', label: s?.name_transliteration || s?.name_en || `Surah ${sid}`,
                   pct: n.build_pct, route: [base, sid] });
      } else if (n.scale === 'passage') {
        const { key, surah } = this.passageRef(n);
        const pno = idx[key];
        if (!surah) continue;
        out.push({ kind: 'passage', ar: '', label: key, pct: n.build_pct,
                   route: pno ? [base, surah, pno] : [base, surah] });
      } else if (n.scale === 'stage') {
        const p = this.passageOf(n); const { key, surah } = this.passageRef(p);
        const pno = idx[key];
        if (!surah || !n.layer) continue;
        out.push({ kind: 'stream', ar: '', label: n.layer, pct: n.build_pct,
                   route: pno ? [base, surah, pno, n.layer] : [base, surah] });
      }
    }

    // The strongest roots in build, so parallel root work is visible too.
    const roots = this.nodes()
      .filter((n) => n.scale === 'piece' && n.piece_kind === 'root' && n.build_pct > 0)
      .sort((a, b) => b.build_pct - a.build_pct)
      .slice(0, 5);
    for (const n of roots) {
      const p = this.passageOf(n); const { key, surah } = this.passageRef(p);
      const pno = idx[key];
      const rn = (n.target_ref ?? '').split(':').pop() ?? '';
      if (!surah || !rn) continue;
      out.push({ kind: 'root', ar: rn, label: '', pct: n.build_pct,
                 route: pno ? ['/cybernetics/map', surah, pno, 'vocabulary', rn] : [base, surah] });
    }
    return out;
  });

  go(route: (string | number)[]) { this.router.navigate(route); }
}
