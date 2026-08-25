import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CybService } from '../data/cyb.service';
import { CYB_AXES } from '../data/cyb.models';
import type { CybAxis, CybDomain, CybMonitor, CybNode, CybJob } from '../data/cyb.models';

// ─── The Cybernetics dashboard — the console's front page ────────────────────
//
// One screen answering three questions: where is the loop, what are the modules
// doing, and what is queued for the actuator. Everything on it is a live read:
//
//   • the modules              ← cyb_domain (GET /core/cyb/domains)
//   • each module's B·S·C·R    ← cyb_node   (GET /core/cyb/tree), rolled up
//   • the loop and the queue   ← the monitor snapshot
//
// The four module cards are NOT a list this component keeps. `cyb_domain` is
// the registry — its slug, colour, Arabic name, hint and unit_kind all come
// from D1, so retiring a module or adding one is a row, not a deploy.

/** A module's reading on one axis. Unmeasured is not zero — see `rollup`. */
interface AxisReading {
  axis: CybAxis;
  pct: number;
  measured: boolean;
  /** How many nodes were actually read on this axis. */
  nodes: number;
}

interface ModuleCard {
  domain: CybDomain;
  /** The nodes the rollup averaged — the module's own top-level work. */
  tops: number;
  readings: AxisReading[];
  jobsReady: number;
  jobsBlocked: number;
  /** Where the card goes. Only the Qurʾān has a map; the rest open the ladder. */
  route: string[];
  routeHint: string;
}

@Component({
  selector: 'km-cyb-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (error()) { <div class="msg err">{{ error() }}</div> }
    @else if (!monitor() || !modules().length) { <div class="msg">Loading the console…</div> }
    @else if (monitor(); as m) {

      <!-- ── the console head ── -->
      <div class="head">
        <div class="mark">⟳</div>
        <div class="hmid">
          <div class="httl"><span class="hname">CYBERNETICS</span><span class="har">علم التحكم</span></div>
          <div class="hsub">Project-management console — build, sense, compare, respond across
            {{ modules().length }} modules</div>
        </div>
        <div class="hright">
          <span class="badge">VIEW · MONITOR · PM</span>
          <span class="act">actuator: <b>Claude</b> · read-only plane</span>
        </div>
      </div>

      <!-- ── ① the control loop ── -->
      <div class="sech"><span>THE CONTROL LOOP</span>
        <span class="sh">
          @if (lastTick(); as t) { last tick {{ t }} } @else { no tick recorded }
        </span>
      </div>
      <div class="loop">
        <div class="stg" style="--sc:var(--build)">
          <div class="sl">01 · BUILD</div>
          <div class="sd">mine carriers</div>
          @if (corpusBuild().measured) {
            <div class="track"><i [style.width.%]="barWidth(corpusBuild().pct)" style="background:var(--build)"></i></div>
            <div class="sv"><b>{{ fmt(corpusBuild().pct) }}%</b> over {{ corpusBuild().nodes }} nodes</div>
          } @else {
            <div class="sv unm">not measured</div>
          }
        </div>
        <span class="arr">→</span>
        <div class="stg" style="--sc:var(--study)">
          <div class="sl">02 · SENSE</div>
          <div class="sd">read state</div>
          <div class="track"><i [style.width.%]="barWidth(sensedPct(m))" style="background:var(--study)"></i></div>
          <div class="sv"><b>{{ sensorsRead(m) }}</b> of {{ m.loop.sensors }} sensors carry a reading</div>
        </div>
        <span class="arr">→</span>
        <div class="stg" style="--sc:var(--err)">
          <div class="sl">03 · COMPARE</div>
          <div class="sd">gap vs setpoint</div>
          <div class="sv big">{{ m.loop.disturbances }}<span class="u">open disturbances</span></div>
          <div class="sev">
            @for (r of m.disturbances.by_severity; track r.key) {
              <span class="sevb" [attr.data-sev]="r.key" title="severity {{ r.key }}">S{{ r.key }} {{ r.n }}</span>
            }
          </div>
        </div>
        <span class="arr">→</span>
        <div class="stg respond" style="--sc:var(--retn)">
          <div class="sl">04 · RESPOND</div>
          <div class="sd">queue → Claude</div>
          <div class="sv big">{{ m.loop.jobs_ready }}<span class="u">jobs ready</span></div>
          <div class="jq">
            <span class="jb ready">{{ m.loop.jobs_ready }} ready</span>
            <span class="jb blocked">{{ m.loop.jobs_blocked }} blocked</span>
            <span class="jb done">{{ m.loop.jobs_done }} done</span>
          </div>
        </div>
      </div>

      <!-- ── ② the modules ── -->
      <div class="sech"><span>MODULES</span><span class="sh">{{ modules().length }} live · from cyb_domain</span></div>
      <div class="legend">
        @for (a of axes; track a) { <span><i [style.background]="axisColor(a)"></i>{{ axisTag(a) }} {{ axisLabel(a) }}</span> }
      </div>
      <div class="mods">
        @for (mod of modules(); track mod.domain.slug) {
          <a class="mod" [routerLink]="mod.route" [style.--mc]="mod.domain.color_hex || 'var(--gold-b)'">
            <div class="modh">
              <div class="modi">{{ initial(mod.domain) }}</div>
              <div class="modt">
                <div class="modn"><span class="men">{{ mod.domain.name_en }}</span><span class="mar">{{ mod.domain.name_ar }}</span></div>
                <div class="modd">{{ mod.domain.hint }}</div>
              </div>
              <span class="modb">{{ mod.tops }} {{ mod.domain.unit_kind }}{{ mod.tops === 1 ? '' : 's' }}</span>
            </div>
            <div class="bscr">
              @for (r of mod.readings; track r.axis) {
                <div class="ax">
                  <div class="axl"><span>{{ axisTag(r.axis) }}</span>
                    <b [style.color]="r.measured ? axisColor(r.axis) : 'var(--t3)'">
                      {{ r.measured ? fmt(r.pct) : '—' }}</b></div>
                  <div class="track" [class.unm]="!r.measured">
                    @if (r.measured) { <i [style.width.%]="barWidth(r.pct)" [style.background]="axisColor(r.axis)"></i> }
                  </div>
                </div>
              }
            </div>
            <div class="modf">
              <span class="mfl">
                @if (mod.jobsReady) { <b class="rd">{{ mod.jobsReady }} ready</b> }
                @if (mod.jobsReady && mod.jobsBlocked) { · }
                @if (mod.jobsBlocked) { {{ mod.jobsBlocked }} blocked }
                @if (!mod.jobsReady && !mod.jobsBlocked) { nothing queued }
                · {{ mod.domain.content_db }}
              </span>
              <span class="mfg">{{ mod.routeHint }} ›</span>
            </div>
          </a>
        }
      </div>

      <!-- ── ③ what is actually queued ── -->
      <div class="sech"><span>NEXT WORK · THE READY QUEUE</span>
        <span class="sh">{{ readyJobs(m).length }} ready · actuator runs them, this console only watches</span></div>
      @if (readyJobs(m).length) {
        <div class="work">
          @for (j of readyJobs(m).slice(0, 9); track j.id) {
            <div class="wc" [style.--wc]="jobColor(j)">
              <div class="wk">{{ j.op }}@if (j.band_code) { · {{ j.band_code }} }</div>
              <div class="wt">{{ jobTitle(j) }}</div>
              <div class="wm">
                @if (j.source_slug) { <span class="wsrc">{{ j.source_slug }}</span> · }
                {{ j.skill || j.actuator }}
              </div>
            </div>
          }
        </div>
        @if (readyJobs(m).length > 9) {
          <p class="more">{{ readyJobs(m).length - 9 }} more ready jobs —
            <a routerLink="../monitor">open the Control Monitor</a> for the whole queue.</p>
        }
      } @else {
        <div class="empty">Nothing is ready. {{ m.loop.jobs_blocked }} jobs are blocked on a dependency.</div>
      }

      <!-- ── ④ the feedback path ── -->
      @if (m.ticks.length) {
        <div class="sech"><span>FEEDBACK</span><span class="sh">↺ {{ m.ticks.length }} ticks</span></div>
        <div class="ticks">
          @for (t of m.ticks.slice(0, 4); track t.id) {
            <div class="tk">
              <span class="tid">{{ t.id }}</span>
              <span class="tsum">{{ short(t.summary) }}</span>
              <span class="tn">sensed {{ t.sensed ?? '—' }} · drifts {{ t.drifts ?? '—' }} · corrected {{ t.corrected ?? '—' }}</span>
            </div>
          }
        </div>
      }
    }
  `,
  styles: [`
    :host { display:block; }
    .msg { color:var(--t2); padding:30px; text-align:center; } .msg.err { color:var(--err); }
    .empty { color:var(--t3); font-size:12.5px; padding:16px; border:1px dashed var(--bd); border-radius:12px; }

    /* head */
    .head { display:flex; align-items:flex-start; gap:14px; margin:18px 0 6px; }
    .mark { width:44px; height:44px; border-radius:12px; flex:0 0 auto; display:flex; align-items:center; justify-content:center;
      font-size:22px; color:#0a0a0b; background:radial-gradient(circle at 34% 28%,#f2d987,#c9a84c 55%,#8a6e2a); }
    .hmid { flex:1; min-width:0; }
    .httl { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; }
    .hname { font-family:ui-monospace,Menlo,monospace; font-size:19px; font-weight:600; letter-spacing:2px; color:var(--text); }
    .har { font-family:var(--ar); font-size:16px; color:var(--t2); }
    .hsub { font-size:12px; color:var(--t2); margin-top:2px; }
    .hright { display:flex; flex-direction:column; gap:6px; align-items:flex-end; text-align:right; }
    .badge { font-family:ui-monospace,monospace; font-size:9px; letter-spacing:1px; font-weight:600;
      color:#2a2205; background:var(--gold-b); padding:4px 9px; border-radius:5px; white-space:nowrap; }
    .act { font-family:ui-monospace,monospace; font-size:9px; color:var(--t3); } .act b { color:var(--retn); font-weight:600; }
    @media(max-width:700px){ .hright{ align-items:flex-start; text-align:left; } .head{ flex-wrap:wrap; } }

    /* section heading */
    .sech { display:flex; justify-content:space-between; align-items:baseline; gap:12px; flex-wrap:wrap;
      font-family:ui-monospace,monospace; font-size:10px; letter-spacing:1.6px; font-weight:600; color:var(--gold-b);
      padding-bottom:8px; border-bottom:1px solid var(--bd); margin:26px 0 14px; }
    .sech .sh { color:var(--t3); font-weight:400; letter-spacing:.5px; }

    /* loop */
    .loop { display:flex; align-items:stretch; gap:8px; }
    .arr { display:flex; align-items:center; color:var(--t3); font-size:14px; }
    .stg { flex:1; min-width:0; background:#131318; border:1px solid rgba(255,255,255,.07); border-radius:11px; padding:13px 15px; }
    .stg.respond { border-color:rgba(197,138,217,.3); }
    .sl { font-family:ui-monospace,monospace; font-size:9px; letter-spacing:1px; color:var(--sc); font-weight:600; }
    .sd { font-size:11px; color:var(--t2); margin:3px 0 9px; }
    .track { height:5px; border-radius:3px; background:#26262b; overflow:hidden; }
    .track.unm { border:1px dashed rgba(224,120,92,.35); background:transparent; box-sizing:border-box; }
    .track i { display:block; height:100%; border-radius:3px; }
    .sv { font-family:ui-monospace,monospace; font-size:9.5px; color:var(--t3); margin-top:6px; }
    .sv b { color:var(--text); font-size:12px; } .sv.unm { color:var(--t3); font-style:italic; }
    .sv.big { font-size:9px; margin-top:0; display:flex; align-items:baseline; gap:6px;
      font-size:22px; font-weight:700; color:var(--text); }
    .sv.big .u { font-family:ui-monospace,monospace; font-size:9px; font-weight:400; color:var(--t3); }
    .sev { display:flex; gap:5px; flex-wrap:wrap; margin-top:7px; }
    .sevb { font-family:ui-monospace,monospace; font-size:8.5px; padding:2px 6px; border-radius:9px;
      border:1px solid rgba(224,120,92,.3); color:var(--t2); }
    .sevb[data-sev="4"] { border-color:var(--err); color:var(--err); }
    .jq { display:flex; gap:5px; flex-wrap:wrap; margin-top:7px; }
    .jb { font-family:ui-monospace,monospace; font-size:8.5px; padding:2px 6px; border-radius:9px; border:1px solid rgba(255,255,255,.1); color:var(--t3); }
    .jb.ready { color:var(--ready); border-color:rgba(77,217,168,.4); }
    .jb.done { color:var(--done); border-color:rgba(107,186,255,.3); }
    @media(max-width:880px){ .loop{flex-wrap:wrap} .arr{display:none} .stg{min-width:calc(50% - 4px)} }

    /* modules */
    .legend { display:flex; gap:14px; flex-wrap:wrap; font-family:ui-monospace,monospace; font-size:9px; color:var(--t3); margin:-4px 0 14px; }
    .legend i { display:inline-block; width:8px; height:8px; border-radius:2px; margin-right:5px; vertical-align:middle; }
    .mods { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    @media(max-width:820px){ .mods{grid-template-columns:1fr} }
    .mod { display:flex; flex-direction:column; gap:13px; text-decoration:none; color:inherit;
      background:linear-gradient(#17171c,#111114); border:1px solid rgba(255,255,255,.09); border-radius:14px; padding:17px; }
    .mod:hover { border-color:var(--mc); }
    .modh { display:flex; gap:12px; align-items:center; }
    .modi { width:46px; height:46px; border-radius:13px; flex:0 0 auto; display:flex; align-items:center; justify-content:center;
      font-family:var(--ar); font-size:22px; color:#0a0a0b; background:var(--mc); }
    .modt { flex:1; min-width:0; }
    .modn { display:flex; gap:7px; align-items:baseline; flex-wrap:wrap; }
    .men { font-size:15px; font-weight:600; color:var(--text); }
    .mar { font-family:var(--ar); font-size:13px; color:var(--t2); }
    .modd { font-size:11px; color:var(--t2); margin-top:1px; }
    .modb { font-family:ui-monospace,monospace; font-size:8px; letter-spacing:.8px; color:var(--mc);
      border:1px solid var(--mc); padding:3px 7px; border-radius:20px; white-space:nowrap; flex:0 0 auto; }
    .bscr { display:flex; gap:8px; }
    .ax { flex:1; min-width:0; }
    .axl { display:flex; justify-content:space-between; font-family:ui-monospace,monospace; font-size:8px; color:var(--t3); margin-bottom:3px; }
    .modf { display:flex; justify-content:space-between; align-items:center; gap:10px;
      border-top:1px solid rgba(255,255,255,.06); padding-top:10px; font-family:ui-monospace,monospace; font-size:10px; color:var(--t3); }
    .mfl b.rd { color:var(--ready); } .mfg { color:var(--mc); white-space:nowrap; }

    /* ready queue */
    .work { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:12px; }
    .wc { background:#131318; border:1px solid rgba(255,255,255,.07); border-left:2px solid var(--wc); border-radius:11px; padding:13px 14px; }
    .wk { font-family:ui-monospace,monospace; font-size:9px; letter-spacing:1px; color:var(--wc); margin-bottom:6px; }
    .wt { font-size:13px; color:var(--text); font-weight:500; overflow-wrap:anywhere; }
    .wm { font-family:ui-monospace,monospace; font-size:9.5px; color:var(--t3); margin-top:5px; overflow-wrap:anywhere; }
    .wsrc { color:var(--gold-b); }
    .more { font-size:11.5px; color:var(--t3); margin-top:12px; }

    /* ticks */
    .ticks { display:flex; flex-direction:column; gap:8px; }
    .tk { display:grid; grid-template-columns:auto 1fr auto; gap:10px; align-items:baseline;
      border:1px solid var(--bd); border-radius:10px; padding:9px 12px; }
    @media(max-width:760px){ .tk{grid-template-columns:1fr} }
    .tid { font-family:ui-monospace,monospace; font-size:9px; color:var(--ready);
      border:1px solid rgba(77,217,168,.35); border-radius:8px; padding:1px 6px; }
    .tsum { font-size:11.5px; color:var(--t2); line-height:1.45; }
    .tn { font-family:ui-monospace,monospace; font-size:9px; color:var(--t3); white-space:nowrap; }
  `],
})
export class CybDashboardComponent {
  private readonly svc = inject(CybService);
  private readonly router = inject(Router);

  readonly axes = CYB_AXES;
  readonly monitor = signal<CybMonitor | null>(null);
  readonly domains = signal<CybDomain[]>([]);
  readonly nodes = signal<CybNode[]>([]);
  readonly error = signal<string | null>(null);

  constructor() {
    forkJoin({
      monitor: this.svc.monitor(),
      domains: this.svc.domains(),
      tree: this.svc.tree(),
    }).subscribe({
      next: ({ monitor, domains, tree }) => {
        this.monitor.set(monitor);
        this.domains.set(domains.domains);
        this.nodes.set(flatten(tree.roots));
      },
      error: (e) => this.error.set(String(e?.message ?? e)),
    });
  }

  /** One card per registered module, each rolled up over its own top-level work. */
  readonly modules = computed<ModuleCard[]>(() => {
    const all = this.nodes();
    const jobs = this.monitor()?.jobs.list ?? [];
    const byId = new Map(all.map((n) => [n.id, n]));

    return this.domains().map((domain) => {
      const mine = all.filter((n) => n.domain === domain.slug);
      // The module's own top-level work: a node whose parent is outside the
      // module (or absent). Averaging every descendant would let 1,642 leaf
      // roots outvote the two surahs that actually carry the reading.
      const tops = mine.filter((n) => {
        const parent = n.parent_id ? byId.get(n.parent_id) : undefined;
        return !parent || parent.domain !== domain.slug;
      });
      const pool = tops.length ? tops : mine;
      const ids = new Set(mine.map((n) => n.id));
      const mineJobs = jobs.filter((j) => ids.has(j.node_id));

      return {
        domain,
        tops: pool.length,
        readings: CYB_AXES.map((axis) => rollup(pool, axis)),
        jobsReady: mineJobs.filter((j) => j.readiness === 'ready').length,
        jobsBlocked: mineJobs.filter((j) => j.readiness === 'blocked').length,
        route: domain.slug === 'quran' ? ['/cybernetics', 'map'] : ['/cybernetics', 'ladder'],
        routeHint: domain.slug === 'quran' ? 'open the map' : 'open in the ladder',
      };
    });
  });

  /** The whole plane's build: the mean over every module's top-level work. */
  readonly corpusBuild = computed<AxisReading>(() =>
    rollup(this.modules().flatMap((m) => this.nodesFor(m)), 'build'));

  readonly lastTick = computed(() => this.monitor()?.ticks[0]?.ran_at?.replace('T', ' ').replace('Z', '') ?? null);

  private nodesFor(card: ModuleCard): CybNode[] {
    const byId = new Map(this.nodes().map((n) => [n.id, n]));
    const mine = this.nodes().filter((n) => n.domain === card.domain.slug);
    const tops = mine.filter((n) => {
      const parent = n.parent_id ? byId.get(n.parent_id) : undefined;
      return !parent || parent.domain !== card.domain.slug;
    });
    return tops.length ? tops : mine;
  }

  // ── the monitor's own numbers ──
  /** Sensors whose state is anything but the untouched default. */
  sensorsRead(m: CybMonitor): number {
    return m.sensors.by_state
      .filter((r) => r.key !== 'empty' && r.key !== 'none' && r.key !== 'unmeasured')
      .reduce((a, r) => a + r.n, 0);
  }
  sensedPct(m: CybMonitor): number {
    return m.loop.sensors ? (this.sensorsRead(m) / m.loop.sensors) * 100 : 0;
  }
  readyJobs(m: CybMonitor): CybJob[] { return m.jobs.list.filter((j) => j.readiness === 'ready'); }

  /** A job's title: the node it stands on, read from the typed ref in its id. */
  jobTitle(j: CybJob): string {
    const tail = j.node_id.split(':').slice(-2).join(' · ');
    return tail || j.node_id;
  }
  jobColor(j: CybJob): string {
    switch (j.op) {
      case 'mine': return 'var(--build)';
      case 'sense': return 'var(--study)';
      case 'compile': case 'promote': return 'var(--content)';
      default: return 'var(--retn)';
    }
  }

  // ── labels ──
  axisTag(a: CybAxis): string { return a[0].toUpperCase(); }
  axisLabel(a: CybAxis): string { return a[0].toUpperCase() + a.slice(1); }
  axisColor(a: CybAxis): string {
    return a === 'build' ? 'var(--build)' : a === 'study' ? 'var(--study)'
         : a === 'content' ? 'var(--content)' : 'var(--retn)';
  }
  /** The module's glyph, taken from its Arabic name.
   *
   *  The first letter alone is not one: three of the four registered names open
   *  with the definite article, so القرآن, العربية and الوثائق all rendered as
   *  a bare ا and the tiles were told apart only by colour. Dropping the ال
   *  gives ق · ع · و, and رؤية العالم keeps its ر. */
  initial(d: CybDomain): string {
    const name = (d.name_ar || d.name_en).trim();
    const bare = name.startsWith('ال') && name.length > 2 ? name.slice(2) : name;
    return bare.charAt(0);
  }

  /** Shows the smallest real reading rather than collapsing it to "0". A leaf's
   *  work rolled over 1,642 roots lands well under 1% at the top. */
  fmt(v: number): string {
    if (v <= 0) return '0';
    if (v >= 10) return String(Math.round(v));
    return v >= 1 ? v.toFixed(1) : v.toFixed(2);
  }
  /** A sliver, so a non-zero rollup is still visible on the track. */
  barWidth(v: number): number { return v > 0 ? Math.min(100, Math.max(0.9, v)) : 0; }

  short(s: string | null): string {
    if (!s) return '';
    return s.length > 130 ? s.slice(0, 130) + '…' : s;
  }
}

/** Every node in the forest, depth-first — the lookup spine for the rollups. */
function flatten(roots: CybNode[]): CybNode[] {
  const out: CybNode[] = [];
  const walk = (n: CybNode) => { out.push(n); (n.children ?? []).forEach(walk); };
  roots.forEach(walk);
  return out;
}

/**
 * The mean over the nodes measured on THIS axis.
 *
 * Per axis, because the plane measures per axis: a module with 7,763 build
 * sensors and 21 retention ones is measured on build and *unknown* on
 * retention — not zero on both. Averaging unmeasured nodes in as zero drags
 * every headline down; dropping whole nodes instead would let one measured
 * axis vouch for three unmeasured ones. So each axis averages only the nodes
 * measured on that axis, and reads unmeasured when none was.
 */
function rollup(nodes: CybNode[], axis: CybAxis): AxisReading {
  const measured = nodes.filter((n) => axisMeasured(n, axis));
  if (!measured.length) return { axis, pct: 0, measured: false, nodes: 0 };
  const sum = measured.reduce((a, n) => a + axisPct(n, axis), 0);
  return { axis, pct: sum / measured.length, measured: true, nodes: measured.length };
}

function axisMeasured(n: CybNode, axis: CybAxis): boolean {
  const flag = axis === 'build' ? n.build_measured
    : axis === 'study' ? n.study_measured
    : axis === 'content' ? n.content_measured
    : n.retention_measured;
  return flag === 1;
}

function axisPct(n: CybNode, axis: CybAxis): number {
  return axis === 'build' ? n.build_pct
    : axis === 'study' ? n.study_pct
    : axis === 'content' ? n.content_pct
    : n.retention_pct;
}
