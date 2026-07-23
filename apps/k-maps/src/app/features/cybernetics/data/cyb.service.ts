// ─── CybService — read the cybernetics control plane ─────────────────────────
// Thin data layer over BackendApiService. All endpoints are public GET.
// core → /api/core/cyb/*, al → /api/al/staging/*. Logic-free: no shaping here
// beyond unwrapping the envelope (BackendApiService does that).

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendApiService } from '../../../shared/services/backend-api.service';
import type {
  CybMonitor, CybNode, CybNodeDetail, CybJob, CybSource, CountRow,
  StagingSummary, StagingMatrix,
} from './cyb.models';

@Injectable({ providedIn: 'root' })
export class CybService {
  private readonly api = inject(BackendApiService);

  monitor(): Observable<CybMonitor> {
    return this.api.getData<CybMonitor>('core', ['cyb', 'monitor']);
  }

  tree(node?: string, lane?: string): Observable<{ roots: CybNode[] }> {
    const params: Record<string, string> = {};
    if (node) params['node'] = node;
    if (lane) params['lane'] = lane;
    return this.api.getData<{ roots: CybNode[] }>('core', ['cyb', 'tree'], { params });
  }

  node(id: string): Observable<CybNodeDetail> {
    return this.api.getData<CybNodeDetail>('core', ['cyb', 'node', id]);
  }

  jobs(): Observable<{ list: CybJob[]; by_readiness: CountRow[] }> {
    return this.api.getData<{ list: CybJob[]; by_readiness: CountRow[] }>('core', ['cyb', 'jobs']);
  }

  sources(loop?: string): Observable<{ list: CybSource[]; by_coverage: CountRow[] }> {
    const params: Record<string, string> = {};
    if (loop) params['loop'] = loop;
    return this.api.getData<{ list: CybSource[]; by_coverage: CountRow[] }>('core', ['cyb', 'sources'], { params });
  }

  stagingSummary(): Observable<StagingSummary> {
    return this.api.getData<StagingSummary>('al', ['staging', 'summary']);
  }

  stagingMatrix(): Observable<StagingMatrix> {
    return this.api.getData<StagingMatrix>('al', ['staging', 'matrix']);
  }
}
