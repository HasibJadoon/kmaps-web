import {
  Component,
  OnInit,
  AfterViewInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { ArabicApiService } from '../../../shared/services/arabic-api.service';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';
import { StatusPillComponent } from '../../../shared/components/status-pill/status-pill.component';

import { PressableDirective } from '../../../shared/directives/pressable.directive';
interface ContainerMeta {
  title_ar?: string;
  level?: string;
  author?: string;
  description?: string;
}

interface ArContainer {
  id: string;
  container_type: string;
  /** English label for container_type, served by the AR worker. */
  container_type_label?: string | null;
  container_key: string;
  title: string;
  meta?: ContainerMeta | null;
}

@Component({
  selector: 'km-arabic-library',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PressableDirective, CommonModule, StatusPillComponent],
  templateUrl: './arabic-library.component.html',
  styleUrl: './arabic-library.component.scss',
})
export class ArabicLibraryComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  private readonly ar = inject(ArabicApiService);
  private cdr = inject(ChangeDetectorRef);

  containers = signal<ArContainer[]>([]);
  loading = signal(true);
  activeTypeFilter = signal<string>('all');
  groupByType = signal(false);

  readonly skeletons = [1, 2, 3, 4, 5, 6, 7, 8];

  private readonly nonQuranContainers = computed(() =>
    this.containers().filter(c => c.container_type !== 'quran')
  );

  readonly containerTypes = computed(() => {
    const types = new Set(this.nonQuranContainers().map(c => c.container_type));
    return ['all', ...Array.from(types)];
  });

  readonly filteredContainers = computed(() => {
    const f = this.activeTypeFilter();
    return f === 'all'
      ? this.nonQuranContainers()
      : this.nonQuranContainers().filter(c => c.container_type === f);
  });

  readonly groupedContainers = computed(() => {
    if (!this.groupByType()) return null;
    const groups: Record<string, ArContainer[]> = {};
    for (const c of this.filteredContainers()) {
      (groups[c.container_type] ??= []).push(c);
    }
    return groups;
  });

  readonly objectKeys = Object.keys;

  ngOnInit(): void {
    this.ar.get<any>(`ar/containers?limit=100`).subscribe({
      next: (res) => {
        if (res?.ok) this.containers.set(res.data ?? res.results ?? []);
        this.loading.set(false);
        this.cdr.markForCheck();
        setTimeout(() => {
          gsap.fromTo('.c-card',
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.4, stagger: 0.055, ease: 'power2.out' }
          );
        });
      },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  ngAfterViewInit(): void {
    gsap.fromTo('.lib-page', { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
  }

  openContainer(c: ArContainer): void {
    this.router.navigate(['/arabic/library', c.id]);
  }

  containerAr(c: ArContainer): string {
    return c.meta?.title_ar ?? '';
  }

  typeIcon(t: string): string {
    const m: Record<string, string> = {
      book: '📖', literature: '📖', story: '📖', poetry: '✒', classical: '📜',
      podcast: '🎙', podcast_episode: '🎙', video: '▶', video_series: '▶',
    };
    return m[t] ?? '📁';
  }

  /** The AR worker labels each container's type; chips and group heads reuse a row's label. */
  private readonly typeLabels = computed(() => {
    const labels = new Map<string, string>();
    for (const c of this.containers()) {
      if (c.container_type_label && !labels.has(c.container_type)) labels.set(c.container_type, c.container_type_label);
    }
    return labels;
  });

  typeLabel(t: string): string {
    return this.typeLabels().get(t) ?? t;
  }

  typeColor(t: string): string {
    const m: Record<string, string> = {
      book: 'gold', literature: 'gold', story: 'gold', poetry: 'purple',
      classical: 'ember', podcast: 'sage', podcast_episode: 'sage',
      video: 'blue', video_series: 'blue',
    };
    return m[t] ?? '';
  }

  levelColor(l?: string): string {
    const m: Record<string, string> = { A1: 'sage', A2: 'sage', B1: 'gold', B2: 'amber', C1: 'ember', C2: 'ember' };
    return l ? (m[l] ?? '') : '';
  }

  back(): void {
    this.router.navigate(['/arabic']);
  }
}
