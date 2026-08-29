import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

// Desktop westward-migration map (schematic equirectangular cartography).
// Directional labels keep the tight Mediterranean cluster readable.
//
// The projection, the arcs and the label placement below were always right.
// The DATA was not: four waypoints were hardcoded in this file and the
// component made no request at all, while wv_map_features held ten real
// coordinates — Rome and Jerusalem, al-Andalus, Constantinople, the Americas,
// the Barbary Coast, Egypt and London, then New York, Guantánamo and Abu
// Ghraib — every one carrying a `period_label` that matches the era axes of the
// comparison matrix. So the map and the heatmap are the same argument in two
// projections, and the map was drawing a sketch of it.
//
// It now loads the layer, and steps through the eras cumulatively: choosing
// "orientalist" shows everything up to and including that band, because the
// point of a westward imaginaire is the accumulation, not one frame of it.

type LabelDir = 'up' | 'down' | 'right' | 'left';

interface Waypoint {
  id: string; kind: 'center' | 'stop'; label: string; sub: string;
  lon: number; lat: number; order: number; year: number | null; intensity: number; dir: LabelDir;
}
interface PlacedPoint extends Waypoint {
  x: number; y: number; r: number; color: string;
  labelAnchor: 'start' | 'middle' | 'end'; labelX: number; mainY: number; subY: number;
}
interface Arc { d: string; }
interface GridLine { x1: number; y1: number; x2: number; y2: number; }

/** One row of wv_map_features. */
interface MapFeature {
  id: string;
  title: string;
  label: string | null;
  latitude: number | null;
  longitude: number | null;
  period_label: string | null;
}

const LAYER_ID = 'wv-map-arjana-westward';

/** Label direction per point, so the Mediterranean cluster stays legible.
 *  Keyed on the feature title because the table carries no placement hint —
 *  a presentation concern, kept out of the data. */
const LABEL_DIR: Record<string, LabelDir> = {
  'Christian center': 'up',
  'al-Andalus': 'down',
  'Constantinople': 'right',
  'The Americas': 'up',
  'Barbary Coast': 'down',
  'Egypt & the Nile': 'down',
  'London': 'up',
  'New York': 'left',
  'Guantanamo': 'down',
  'Abu Ghraib': 'down',   // right-anchored, its label ran off the frame
};
const VB_W = 1000, VB_H = 560, LON_MIN = -92, LON_MAX = 52, LAT_MIN = 6, LAT_MAX = 54;

@Component({
  selector: 'km-worldview-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './worldview-map.component.html',
  styleUrl: './worldview-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewMapComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly vbW = VB_W;
  readonly vbH = VB_H;

  readonly features = signal<MapFeature[]>([]);
  readonly periods = signal<string[]>([]);
  /** The era to show up to. Null means the whole span. */
  readonly activePeriod = signal<string | null>(null);
  readonly loading = signal(true);
  readonly failure = signal<string | null>(null);

  /** Features up to and including the chosen era, as waypoints. */
  private readonly waypoints = computed<Waypoint[]>(() => {
    const all = this.features().filter(f => f.latitude != null && f.longitude != null);
    const order = this.periods();
    const cut = this.activePeriod();
    const limit = cut ? order.indexOf(cut) : order.length - 1;
    return all
      .filter(f => order.indexOf(f.period_label ?? '') <= limit)
      .map((f, i) => {
        const isCentre = /cent(er|re)/i.test(f.title);
        const band = order.indexOf(f.period_label ?? '');
        return {
          id: f.id,
          kind: isCentre ? 'center' : 'stop',
          label: f.title,
          // `label` duplicates `title` on every row, so it printed the place
          // name twice. The era band is the second line worth having: it is
          // what the stepper moves through.
          sub: f.period_label ?? '',
          lon: Number(f.longitude), lat: Number(f.latitude),
          order: i,
          year: null,
          // Intensity rises with how late the era is — the imaginaire hardens
          // as it travels, which is the layer's whole claim.
          intensity: order.length > 1 ? (band / (order.length - 1)) * 3 : 0,
          dir: LABEL_DIR[f.title] ?? 'up',
        } as Waypoint;
      });
  });

  readonly points = computed<PlacedPoint[]>(() =>
    this.waypoints().map((w) => {
      const x = this.projX(w.lon), y = this.projY(w.lat);
      const r = w.kind === 'center' ? 12 : 8 + w.intensity * 1.6;
      return {
        ...w, x, y, r,
        color: w.kind === 'center' ? '#c9a84c' : this.intensityColor(w.intensity),
        ...labelPlacement(w.dir, x, y, r),
      };
    }),
  );
  /** The hub the arcs radiate from. Undefined until the layer loads, and if the
   *  data ever stops naming a centre the map draws points without arcs rather
   *  than crashing on a missing one. */
  readonly center = computed<PlacedPoint | undefined>(() => this.points().find((p) => p.kind === 'center'));
  readonly arcs = computed<Arc[]>(() => {
    const c = this.center();
    if (!c) return [];
    return this.points().filter((p) => p.kind === 'stop').sort((a, b) => a.order - b.order)
      .map((p) => ({ d: this.arcPath(c.x, c.y, p.x, p.y) }));
  });
  readonly rings = computed<number[]>(() => {
    const c = this.center();
    if (!c) return [];
    return this.points().filter((p) => p.kind === 'stop').map((p) => Math.hypot(p.x - c.x, p.y - c.y));
  });
  readonly gridLines = computed<GridLine[]>(() => {
    const lines: GridLine[] = [];
    for (let lon = -80; lon <= 40; lon += 20) lines.push({ x1: this.projX(lon), y1: 0, x2: this.projX(lon), y2: VB_H });
    for (let lat = 10; lat <= 50; lat += 10) lines.push({ x1: 0, y1: this.projY(lat), x2: VB_W, y2: this.projY(lat) });
    return lines;
  });
  readonly stops = computed(() => this.points().filter((p) => p.kind === 'stop').sort((a, b) => a.order - b.order));

  ngOnInit(): void {
    this.sourceId.set(this.route.snapshot.paramMap.get('sourceId') ?? '');
    this.unitId.set(this.route.snapshot.paramMap.get('unitId') ?? '');
    if (!this.sourceId()) { void this.router.navigate(['/worldview/library']); return; }
    void this.loadLayer();
  }

  setPeriod(period: string | null): void { this.activePeriod.set(period); }

  private async loadLayer(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await fetch(`${environment.apiBase}/wv/maps/${LAYER_ID}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json() as {
        ok: boolean;
        data: { features: MapFeature[]; periods: string[] };
      };
      this.features.set(body.data?.features ?? []);
      // The era order is derived from the features themselves rather than
      // declared anywhere — the data carries its own sequence, and a second
      // list of era names would be a second thing to keep in step.
      this.periods.set(body.data?.periods ?? []);
    } catch {
      this.failure.set('The map layer could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }

  goToGraph(): void {
    void this.router.navigate(['/worldview/library', this.sourceId(), 'graph', this.unitId()]);
  }

  private projX(lon: number): number { return ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * VB_W; }
  private projY(lat: number): number { return ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * VB_H; }
  private arcPath(x0: number, y0: number, x1: number, y1: number): string {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, bow = Math.min(110, len * 0.2);
    return `M${x0},${y0} Q${mx + nx * bow},${my + ny * bow} ${x1},${y1}`;
  }
  private intensityColor(intensity: number): string { return `rgba(196,90,58,${(0.5 + (intensity / 3) * 0.5).toFixed(2)})`; }
}

function labelPlacement(dir: LabelDir, x: number, y: number, r: number): {
  labelAnchor: 'start' | 'middle' | 'end'; labelX: number; mainY: number; subY: number;
} {
  switch (dir) {
    case 'right': return { labelAnchor: 'start',  labelX: x + r + 8, mainY: y - 2, subY: y + 12 };
    case 'left':  return { labelAnchor: 'end',    labelX: x - r - 8, mainY: y - 2, subY: y + 12 };
    case 'down':  return { labelAnchor: 'middle', labelX: x,         mainY: y + r + 18, subY: y + r + 32 };
    case 'up':
    default:      return { labelAnchor: 'middle', labelX: x,         mainY: y - r - 20, subY: y - r - 7 };
  }
}
