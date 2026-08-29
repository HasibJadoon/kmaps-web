import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import gsap from 'gsap';
import { environment } from '../../../../environments/environment';

// The worldview API is reached through the gateway like everything else.
// This used to be `https://k-maps.com` — the Pages origin, not the backend —
// and without the `/api` prefix the gateway requires, so every request 404'd
// into a `catch {}` that swallowed it. The screen has therefore looked built
// and shown an empty list since the day it was written.
const WV_API = `${environment.apiBase}/wv`;

interface WvComparison {
  id: string;
  slug?: string;
  title?: string;
  comparison_type?: string;
  description_md?: string;
  created_at?: string;
  updated_at?: string;
}

/** A column. The worker calls these axes; the component's "tab" is the same
 *  thing under an older name, kept so the template does not have to change. */
interface WvTab {
  id: string;
  axis_label?: string;
  axis_description?: string;
  sort_order?: number;
}

interface WvRow {
  id: string;
  row_label?: string;
  entity_type?: string;
  entity_id?: string;
  sort_order?: number;
}

interface WvCell {
  id: string;
  row_id: string;
  axis_id: string;
  /** For the era × trope matrix this is an intensity digit, "0"–"3", and
   *  `stance` repeats it as "intensity-N". It is a heatmap, not prose. */
  cell_text?: string;
  stance?: string;
  tension_note?: string;
}

interface ComparisonDetail {
  comparison: WvComparison;
  tabs: WvTab[];
  rows: WvRow[];
  cells: WvCell[];
}

@Component({
  selector: 'km-worldview-compare',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './worldview-compare.component.html',
  styleUrl: './worldview-compare.component.scss',
})
export class WorldviewCompareComponent implements OnInit, AfterViewInit {
  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;

  readonly loading = signal(true);
  readonly detailLoading = signal(false);
  readonly comparisons = signal<WvComparison[]>([]);
  readonly detailView = signal(false);
  readonly detail = signal<ComparisonDetail | null>(null);
  readonly failure = signal<string | null>(null);
  readonly activeTab = signal<WvTab | null>(null);

  ngOnInit(): void {
    void this.loadComparisons();
  }

  ngAfterViewInit(): void {
    gsap.fromTo(
      this.pageRef.nativeElement,
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: 'power2.out' }
    );
  }

  openDetail(comp: WvComparison): void {
    this.detailView.set(true);
    this.detail.set(null);
    this.activeTab.set(null);
    void this.loadDetail(comp.id);
  }

  exitDetail(): void {
    this.detailView.set(false);
    this.detail.set(null);
    this.activeTab.set(null);
  }

  newComparison(): void {
    // Placeholder: would open a creation modal/form
  }

  setActiveTab(tab: WvTab): void {
    this.activeTab.set(tab);
  }

  getCellContent(tabId: number | string, rowId: number | string): string {
    const d = this.detail();
    if (!d) return '';
    const cell = d.cells.find(c => c.axis_id === tabId && c.row_id === rowId);
    return cell?.cell_text ?? '';
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  }

  private async loadComparisons(): Promise<void> {
    this.loading.set(true);
    this.failure.set(null);
    try {
      const res = await fetch(`${WV_API}/comparisons?limit=20`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json() as { ok: boolean; data: WvComparison[] };
      this.comparisons.set(Array.isArray(body.data) ? body.data : []);
    } catch {
      // A failed fetch must read as a failure. Swallowing it is what let this
      // screen render an empty list for its whole life without anyone noticing.
      this.failure.set('The comparisons could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDetail(id: number | string): Promise<void> {
    this.detailLoading.set(true);
    try {
      const res = await fetch(`${WV_API}/comparisons/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json() as {
        ok: boolean;
        data: WvComparison & { axes: WvTab[]; rows: WvRow[]; cells: WvCell[] };
      };
      {
        const d: ComparisonDetail = {
          comparison: body.data,
          tabs: body.data.axes ?? [],
          rows: body.data.rows ?? [],
          cells: body.data.cells ?? [],
        };
        this.detail.set(d);
        if (d.tabs.length > 0) {
          this.activeTab.set(d.tabs[0]);
        }
      }
    } catch {
      this.failure.set('That comparison could not be loaded.');
    } finally {
      this.detailLoading.set(false);
    }
  }
}
