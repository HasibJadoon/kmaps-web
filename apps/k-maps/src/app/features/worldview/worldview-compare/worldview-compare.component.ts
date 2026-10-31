import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import gsap from 'gsap';
import { WorldviewApiService } from '../../../shared/services/worldview/worldview-api.service';
import { KmDatePipe } from '../../../shared/pipes/km-date.pipe';


interface WvComparison {
  id: string;
  slug?: string;
  title?: string;
  comparison_type?: string;
  description_md?: string;
  created_at?: string;
  updated_at?: string;
}

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
  imports: [KmDatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './worldview-compare.component.html',
  styleUrl: './worldview-compare.component.scss',
})
export class WorldviewCompareComponent implements OnInit, AfterViewInit {
  private readonly wv = inject(WorldviewApiService);
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

  }

  setActiveTab(tab: WvTab): void {
    this.activeTab.set(tab);
  }

  getCellIntensity(tabId: string, rowId: string): number | null {
    const raw = this.getCellContent(tabId, rowId).trim();
    if (!/^[0-3]$/.test(raw)) return null;
    return Number(raw);
  }

  readonly intensitySteps = [1, 2, 3];

  getCellContent(tabId: number | string, rowId: number | string): string {
    const d = this.detail();
    if (!d) return '';
    const cell = d.cells.find(c => c.axis_id === tabId && c.row_id === rowId);
    return cell?.cell_text ?? '';
  }


  private async loadComparisons(): Promise<void> {
    this.loading.set(true);
    this.failure.set(null);
    try {
      this.comparisons.set(await this.wv.comparisons<WvComparison>(20));
    } catch {

      this.failure.set('The comparisons could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDetail(id: number | string): Promise<void> {
    this.detailLoading.set(true);
    try {
      const body = { data: await this.wv.comparison<WvComparison & { axes: WvTab[]; rows: WvRow[]; cells: WvCell[] }>(id) };
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
