import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CybService } from '../data/cyb.service';
import type { CybMonitor, LayerModel, LayerModelBand } from '../data/cyb.models';

// The Cybernetics Control Monitor — the closed loop rendered live from
// /core/cyb/monitor: reference → sensor → comparator → controller → actuator →
// plant → feedback, plus gauges, the job queue, the error ledger, the tick feed,
// and (tab) the AL staging matrix. Logic-free renderer — all data from the API.
@Component({
  selector: 'km-cyb-monitor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error()) { <div class="msg err">{{ error() }}</div> }
    @else if (monitor(); as m) {
      <!-- ① the loop -->
      <div class="loop">
        <div class="chain">
          <div class="stg" style="--sc:var(--gold-d)"><span class="lbl">① Reference</span><span class="val">{{ setpoints() }}</span><span class="d">control law · {{ m.config['gate.synthesis']?.value }}</span></div>
          <span class="arr">→</span>
          <div class="stg" style="--sc:var(--study)"><span class="lbl">② Sensor</span><span class="val">{{ m.loop.sensors }}</span><span class="d">band-presence readings</span></div>
          <span class="arr">→</span>
          <div class="stg" style="--sc:var(--err)"><span class="lbl">③ Comparator</span><span class="val">{{ m.loop.disturbances }}</span><span class="d">open disturbances</span></div>
          <span class="arr">→</span>
          <div class="stg" style="--sc:var(--gold-b)"><span class="lbl">④ Controller</span><span class="val">{{ m.loop.jobs }}</span><span class="d">cyb_job queue</span></div>
          <span class="arr">→</span>
          <div class="stg" style="--sc:var(--retn)"><span class="lbl">⑤ Actuator</span><span class="val">skill</span><span class="d">kmaps-lexicon-builder</span></div>
          <span class="arr">→</span>
          <div class="stg" style="--sc:var(--content)"><span class="lbl">⑥ Plant · D1</span><span class="val">{{ m.loop.nodes }}</span><span class="d">nodes sensed</span></div>
        </div>
        <div class="fb"><span class="tag">feedback</span> ↩ {{ m.ticks.length }} ticks —
          @if (m.ticks[0]; as t) { last: <b>{{ t.id }}</b> · {{ short(t.summary) }} }
        </div>
      </div>

      <!-- KPIs -->
      <div class="kpis">
        <div class="kpi" style="--kc:var(--study)"><b>{{ m.loop.sensors }}</b><span>sensors</span></div>
        <div class="kpi" style="--kc:var(--err)"><b>{{ m.loop.disturbances }}</b><span>disturbances</span></div>
        <div class="kpi" style="--kc:var(--ready)"><b>{{ m.loop.jobs_ready }}</b><span>ready</span></div>
        <div class="kpi" style="--kc:var(--blocked)"><b>{{ m.loop.jobs_blocked }}</b><span>blocked</span></div>
        <div class="kpi" style="--kc:var(--done)"><b>{{ m.loop.jobs_done }}</b><span>done</span></div>
        <div class="kpi" style="--kc:var(--gold-b)"><b>{{ m.loop.nodes }}</b><span>nodes</span></div>
      </div>

      <!-- gauges -->
      @if (m.gauges.length) {
        <h2>Gauges</h2>
        <div class="gauges">
          @for (g of m.gauges; track g.id) {
            <div class="g"><div class="gl">{{ g.gauge_kind }}</div><div class="gv">{{ g.score }}<small>/100</small></div>
              <div class="track"><span class="fill" style="background:var(--content)" [style.width.%]="g.score"></span></div>
              <div class="sub">{{ g.node_id }}</div></div>
          }
        </div>
      }

      <div class="tabs2">
        <button [class.on]="tab()==='loop'" (click)="tab.set('loop')">Controller · jobs · errors</button>
        <button [class.on]="tab()==='matrix'" (click)="tab.set('matrix')">Carrier registry</button>
        <button [class.on]="tab()==='law'" (click)="tab.set('law')">Control law</button>
      </div>

      @if (tab()==='loop') {
        <div class="cols">
          <!-- job queue -->
          <div class="panel">
            <div class="pt">Job queue · {{ m.jobs.list.length }}</div>
            @for (j of m.jobs.list; track j.id) {
              <div class="job" [class]="j.readiness">
                <span class="dot"></span>
                <span class="jl">{{ j.op }}@if (j.source_slug) { · <span class="src">{{ j.source_slug }}</span> }@if (j.band_code) { · {{ j.band_code }} }</span>
                <span class="js">{{ j.readiness }}</span>
              </div>
            }
          </div>
          <!-- error ledger -->
          <div class="panel">
            <div class="pt">Error ledger · {{ m.disturbances.total }} open</div>
            <div class="sub2">by severity</div>
            @for (r of m.disturbances.by_severity; track r.key) {
              <div class="drow"><span>severity {{ r.key }}</span><b>{{ r.n }}</b></div>
            }
            <div class="sub2">by kind</div>
            @for (r of m.disturbances.by_kind; track r.key) {
              <div class="drow"><span>{{ r.key }}</span><b>{{ r.n }}</b></div>
            }
            <div class="pt" style="margin-top:14px">Feedback log · ticks</div>
            @for (t of m.ticks; track t.id) {
              <div class="tick"><span class="ti">{{ t.id }}</span><span>{{ short(t.summary) }}</span></div>
            }
          </div>
        </div>
      }

      @if (tab()==='matrix') {
        @if (model(); as lm) {
          <div class="scopes">
            @for (sc of lm.scopes; track sc.key) {
              <button class="sb" [class.on]="scope()===sc.key" (click)="scope.set(sc.key)">
                <span class="sbc">{{ sc.code }}</span>
                <span class="sbar">{{ sc.name_ar }}</span>
                <span class="sbn">{{ sc.name_en }}</span>
                <span class="sbm">{{ sc.layers }} bands · {{ sc.subs }} sub-layers</span>
              </button>
            }
          </div>
          @for (b of bands(lm); track b.band) {
            <div class="band">
              <div class="bandh">
                <span class="bandn">{{ b.band }}</span>
                <span class="bandk">{{ b.key }}</span>
                @if (b.name_ar) { <span class="bandar">{{ b.name_ar }}</span> }
                <span class="bandt">{{ b.name_en }}</span>
                <span class="bandc">{{ b.subs.length }} sub-layer{{ b.subs.length === 1 ? '' : 's' }}</span>
              </div>
              <div class="subs">
                @for (sl of b.subs; track sl.sub_code) {
                  <div class="sl" [attr.data-carrier]="sl.carrier_state" [attr.data-fill]="sl.fill_state">
                    <div class="slh"><span class="slc">{{ sl.sub_code }}</span><span class="sld">{{ sl.discipline }}</span></div>
                    <div class="sln">{{ sl.name_en }}</div>
                    <div class="slar">{{ sl.name_ar }}</div>
                    <div class="slt">{{ carrierLabel(sl.tables) }}</div>
                    <div class="sls">{{ sl.fill_state }} · {{ sl.carrier_state }} · {{ sl.produced_by }}</div>
                  </div>
                }
              </div>
            </div>
          }
          <p class="note">The AL carrier registry — every declared sub-layer, its discipline, and the
            table that carries it. Per-root counts are read off these carriers on the Root Dashboard;
            <code>fill_state</code> and <code>carrier_state</code> here are global facts about a table,
            not a claim about any one root.</p>
        } @else { <div class="msg">Loading the carrier registry…</div> }
      }

      @if (tab()==='law') {
        <div class="cfg">
          @for (c of configList(m); track c.key) {
            <div class="crow"><b>{{ c.key }}</b><span>{{ c.value }}</span><em>{{ c.note }}</em></div>
          }
        </div>
      }
    }
    @else { <div class="msg">Loading control monitor…</div> }
  `,
  styles: [`
    :host { display:block; }
    h2 { font-family:var(--serif); font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:var(--gold-d); margin:26px 0 12px; padding-bottom:7px; border-bottom:1px solid var(--bd); }
    .msg { color:var(--t2); padding:26px; text-align:center; } .msg.err { color:var(--err); }
    .loop { border:1px solid var(--bd-hi); border-radius:14px; background:linear-gradient(180deg,#15130d,#0b0b0b); padding:16px 15px 12px; margin-top:14px; }
    .chain { display:flex; align-items:stretch; gap:6px; flex-wrap:wrap; justify-content:center; }
    .stg { flex:1; min-width:150px; border:1px solid rgba(255,255,255,.09); border-top:3px solid var(--sc); border-radius:11px; background:#111; padding:10px 11px; }
    .stg .lbl { font-family:var(--serif); font-size:9.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--sc); display:block; }
    .stg .val { font-family:var(--serif); font-size:19px; color:var(--text); margin-top:3px; display:block; line-height:1; }
    .stg .d { font-size:10px; color:var(--t3); margin-top:4px; display:block; }
    .arr { display:flex; align-items:center; color:var(--gold-d); font-size:18px; font-weight:700; }
    @media(max-width:760px){ .arr{display:none} .stg{min-width:calc(50% - 6px)} }
    .fb { margin-top:10px; border:1px dashed rgba(107,186,255,.4); border-radius:10px; padding:8px 12px; font-size:11.5px; color:var(--t2); } .fb b { color:var(--gold-b); } .fb .tag { font-family:var(--serif); font-size:9.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--study); margin-right:8px; }
    .kpis { display:flex; gap:9px; flex-wrap:wrap; justify-content:center; margin:14px 0 4px; }
    .kpi { background:var(--s2); border:1px solid rgba(255,255,255,.07); border-radius:11px; padding:9px 15px; text-align:center; min-width:82px; }
    .kpi b { font-family:var(--serif); font-size:20px; display:block; line-height:1; color:var(--kc,var(--gold-b)); } .kpi span { font-size:9.5px; color:var(--t3); letter-spacing:.05em; text-transform:uppercase; }
    .gauges { display:grid; grid-template-columns:repeat(auto-fill,minmax(155px,1fr)); gap:10px; }
    .g { border:1px solid rgba(255,255,255,.08); border-radius:11px; background:#111; padding:11px 13px; }
    .g .gl { font-size:9.5px; letter-spacing:.05em; text-transform:uppercase; color:var(--t3); } .g .gv { font-family:var(--serif); font-size:22px; color:var(--gold-b); line-height:1; margin:4px 0 6px; } .g .gv small { font-size:11px; color:var(--t3); }
    .g .track { height:7px; border-radius:5px; background:#242424; overflow:hidden; } .g .fill { height:100%; border-radius:5px; display:block; } .g .sub { font-size:9px; color:var(--t3); margin-top:5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .tabs2 { display:flex; gap:7px; margin:22px 0 12px; flex-wrap:wrap; }
    .tabs2 button { font-size:11.5px; font-family:var(--serif); padding:7px 14px; border-radius:9px; border:1px solid var(--bd); background:#0f0f0f; color:var(--t2); cursor:pointer; }
    .tabs2 button.on { background:linear-gradient(180deg,var(--gold-b),var(--gold)); color:#2a2205; font-weight:700; border-color:var(--gold-b); }
    .cols { display:grid; grid-template-columns:1fr 1fr; gap:12px; } @media(max-width:820px){ .cols{grid-template-columns:1fr} }
    .panel { border:1px solid var(--bd); border-radius:12px; background:linear-gradient(180deg,var(--s1),#0d0d0d); padding:14px 16px; }
    .pt { font-family:var(--serif); font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--gold-d); margin-bottom:10px; }
    .job { display:flex; align-items:center; gap:10px; border-top:1px solid rgba(255,255,255,.05); padding:7px 0; font-size:12px; }
    .job .dot { width:9px; height:9px; border-radius:3px; flex:0 0 auto; background:var(--blocked); }
    .job.ready .dot { background:var(--ready); } .job.done .dot { background:var(--done); }
    .job .jl { flex:1; color:var(--t2); } .job .jl .src { color:var(--gold-b); }
    .job .js { font-size:8.5px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; padding:2px 8px; border-radius:10px; border:1px solid rgba(138,123,104,.4); color:var(--blocked); }
    .job.ready .js { color:var(--ready); border-color:var(--ready); } .job.done .js { color:var(--done); border-color:var(--done); }
    .sub2 { font-family:var(--serif); font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:var(--gold-d); margin:10px 0 6px; }
    .drow { display:flex; justify-content:space-between; font-size:11.5px; color:var(--t2); padding:4px 0; border-top:1px solid rgba(255,255,255,.05); } .drow b { color:var(--err); font-family:ui-monospace,monospace; }
    .tick { display:flex; gap:9px; padding:6px 0; border-top:1px solid rgba(255,255,255,.05); font-size:11px; color:var(--t2); line-height:1.4; }
    .tick .ti { font-family:ui-monospace,monospace; font-size:9.5px; color:var(--ready); border:1px solid rgba(77,217,168,.35); border-radius:8px; padding:1px 6px; height:fit-content; flex:0 0 auto; }
    .scopes { display:flex; gap:9px; flex-wrap:wrap; margin-bottom:16px; }
    .sb { display:flex; flex-direction:column; gap:2px; text-align:left; cursor:pointer; font-family:inherit;
      background:#0f0f0f; border:1px solid var(--bd); border-radius:12px; padding:10px 14px; color:var(--t2); }
    .sb:hover { border-color:var(--bd-hi); }
    .sb.on { border-color:var(--gold-b); background:linear-gradient(180deg,#1a1710,#0f0f0f); }
    .sbc { font-family:ui-monospace,monospace; font-size:8.5px; letter-spacing:1px; color:var(--t3); }
    .sbar { font-family:var(--ar); font-size:16px; color:var(--gold-b); }
    .sbn { font-family:var(--serif); font-size:12.5px; color:var(--text); }
    .sbm { font-family:ui-monospace,monospace; font-size:9px; color:var(--t3); }
    .band { border:1px solid var(--bd); border-radius:12px; margin-bottom:11px; overflow:hidden; }
    .bandh { display:flex; align-items:baseline; gap:9px; flex-wrap:wrap; padding:10px 14px;
      background:linear-gradient(90deg,#16150f,#0d0d0d); border-bottom:1px solid rgba(255,255,255,.05); }
    .bandn { font-family:ui-monospace,monospace; font-size:9px; color:#2a2205; background:var(--gold-b);
      border-radius:5px; padding:2px 6px; font-weight:700; }
    .bandk { font-family:ui-monospace,monospace; font-size:10px; letter-spacing:1px; color:var(--gold-b); }
    .bandar { font-family:var(--ar); font-size:15px; color:var(--t2); }
    .bandt { font-family:var(--serif); font-size:13px; color:var(--text); }
    .bandc { font-family:ui-monospace,monospace; font-size:9px; color:var(--t3); margin-left:auto; }
    .subs { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:1px; background:rgba(255,255,255,.05); }
    .sl { background:#0e0e0e; padding:10px 12px; border-top:2px solid var(--blocked); }
    .sl[data-carrier="populated"] { border-top-color:var(--ready); }
    .sl[data-carrier="partial"] { border-top-color:var(--gold-b); }
    .sl[data-fill="missing"] { border-top-color:var(--err); }
    .slh { display:flex; justify-content:space-between; gap:6px; font-family:ui-monospace,monospace; font-size:8.5px; color:var(--t3); }
    .sln { font-size:12px; color:var(--text); margin-top:4px; }
    .slar { font-family:var(--ar); font-size:14px; color:var(--gold-b); }
    .slt { font-family:ui-monospace,monospace; font-size:9px; color:var(--t2); margin-top:5px; overflow-wrap:anywhere; }
    .sls { font-family:ui-monospace,monospace; font-size:8.5px; color:var(--t3); margin-top:3px; }
    .note code { font-family:ui-monospace,monospace; color:var(--gold-b); }
    .tablewrap { overflow-x:auto; border-radius:12px; border:1px solid var(--bd); }
    table { border-collapse:separate; border-spacing:0; font-size:12px; min-width:900px; }
    th,td { border:1px solid rgba(255,255,255,.06); text-align:center; }
    th.code { font-family:ui-monospace,monospace; font-size:8.5px; color:var(--t2); padding:5px 3px; background:#101010; writing-mode:vertical-rl; transform:rotate(180deg); height:60px; }
    th.rl,td.rl { background:linear-gradient(90deg,var(--s1),#0d0d0d); padding:6px 9px; text-align:right; position:sticky; left:0; } td.rl .rar { font-family:var(--ar); font-size:17px; color:var(--gold-b); }
    td.cell { width:34px; height:28px; font-family:ui-monospace,monospace; font-size:11px; color:#0c0c0c; font-weight:700; } td.cell.z { color:#333; background:#0b0b0b; font-weight:400; }
    td.tot { background:#111; font-family:var(--serif); font-size:13px; color:var(--gold-b); }
    .note { font-size:11.5px; color:var(--t3); margin-top:10px; }
    .cfg { display:flex; flex-direction:column; gap:8px; }
    .crow { border:1px solid var(--bd); border-radius:10px; padding:10px 13px; display:grid; grid-template-columns:220px 120px 1fr; gap:12px; align-items:baseline; }
    .crow b { color:var(--gold-b); font-family:ui-monospace,monospace; font-size:12px; } .crow span { color:var(--text); font-family:ui-monospace,monospace; } .crow em { color:var(--t3); font-style:normal; font-size:11.5px; }
    @media(max-width:640px){ .crow{grid-template-columns:1fr} }
  `],
})
export class CybMonitorComponent {
  private readonly svc = inject(CybService);
  readonly monitor = signal<CybMonitor | null>(null);
  readonly model = signal<LayerModel | null>(null);
  /** Which scope of the recursion the registry tab is showing. */
  readonly scope = signal('root');
  readonly error = signal<string | null>(null);
  readonly tab = signal<'loop' | 'matrix' | 'law'>('loop');

  readonly setpoints = computed(() => {
    const c = this.monitor()?.config ?? {};
    return `${c['mastery_threshold']?.value ?? '—'}% · ${c['retention_days']?.value ?? '—'}d`;
  });

  constructor() {
    this.svc.monitor().subscribe({
      next: (m) => this.monitor.set(m),
      error: (e) => this.error.set(String(e?.message ?? e)),
    });
    this.svc.layerModel().subscribe({ next: (lm) => this.model.set(lm), error: () => {} });
  }

  short(s: string | null): string {
    if (!s) return '';
    return s.length > 140 ? s.slice(0, 140) + '…' : s;
  }

  configList(m: CybMonitor) {
    return Object.entries(m.config).map(([key, v]) => ({ key, value: v.value, note: v.note }));
  }

  bands(lm: LayerModel): LayerModelBand[] {
    return lm.layers.filter((b) => b.scope === this.scope());
  }

  /** What to print for a carrier. A slot with one table names it; the catch-all
   *  slots hold dozens, and naming only the first would read as a claim that the
   *  rest do not exist. */
  carrierLabel(tables: string[]): string {
    if (!tables.length) return 'no carrier';
    if (tables.length === 1) return tables[0];
    return `${tables.length} tables · ${tables[0]} …`;
  }
}
