// ─── CybService — read the cybernetics control plane ─────────────────────────
// Thin data layer over BackendApiService. All endpoints are public GET.
// core → /api/core/cyb/*, al → /api/al/staging/*. Logic-free: no shaping here
// beyond unwrapping the envelope (BackendApiService does that).

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendApiService } from '../../../shared/services/backend-api.service';
import type {
  CybMonitor, CybNode, CybNodeDetail, CybJob, CybSource, CountRow,
  StagingSummary, StagingMatrix, Surah, StudyGrid, RootDetail, PassageRoot,
  CybReading, CarrierRows, CarrierBandRows, StudyProcess, CybLayer,
  CmDocument, TeachingVariant,
} from './cyb.models';

@Injectable({ providedIn: 'root' })
export class CybService {
  private readonly api = inject(BackendApiService);

  monitor(): Observable<CybMonitor> {
    return this.api.getData<CybMonitor>('core', ['cyb', 'monitor']);
  }

  /** All 114 surahs from the QR corpus — the Qurʾān-centric map spine. */
  surahs(): Observable<Surah[]> {
    return this.api.getData<Surah[]>('qr', ['surahs']);
  }

  /** The UNIQUE roots occurring in a passage's āyāt — the vocabulary spine. */
  passageRoots(surahId: number, passageNo: number): Observable<PassageRoot[]> {
    return this.api.getData<PassageRoot[]>('qr', ['study', 'surahs', surahId, 'passages', passageNo, 'roots']);
  }

  /** The Surah Study grid — real study passages (units) + step availability. */
  studyGrid(surahId: number): Observable<StudyGrid> {
    return this.api.getData<StudyGrid>('qr', ['study', 'surahs', surahId]);
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

  /** Deep drill for one root: its staged claims, memlets, and questions. */
  rootDetail(root: string): Observable<RootDetail> {
    return this.api.getData<RootDetail>('al', ['staging', 'root', root]);
  }

  // ── The bridge ─────────────────────────────────────────────────────────────
  // km_core holds the control plane; the work lives in the domain databases and
  // is reachable only through the binding. These five were on the contract and
  // consumed by iOS, but the web read none of them — so a node's percentage was
  // shown with no way to see the rows behind it.

  /** One node's reading per axis — pct, and whether a sensor measured it. */
  readings(nodeId: string): Observable<{ node_id: string; readings: CybReading[] }> {
    return this.api.getData<{ node_id: string; readings: CybReading[] }>(
      'core', ['cyb', 'reading', nodeId]);
  }

  /** What the carriers bound to this node's layer actually hold. */
  rows(nodeId: string, layer?: string): Observable<{ node_id: string; layer: string | null; carriers: CarrierRows[] }> {
    const params: Record<string, string> = {};
    if (layer) params['layer'] = layer;
    return this.api.getData<{ node_id: string; layer: string | null; carriers: CarrierRows[] }>(
      'core', ['cyb', 'rows', nodeId], { params });
  }

  /**
   * The second hop. A passage node reaches carriers keyed on the passage;
   * anything keyed on a part of it — a sentence, a tree — needs the part named,
   * so this is asked for one scope at a time rather than on open.
   */
  scope(scopeType: string, scopeId: string, layer?: string): Observable<{ carriers: CarrierBandRows[] }> {
    const params: Record<string, string> = {};
    if (layer) params['layer'] = layer;
    return this.api.getData<{ carriers: CarrierBandRows[] }>(
      'core', ['cyb', 'scope', scopeType, scopeId], { params });
  }

  /** The registered study process — the ordered work, and who does it. */
  process(domain?: string): Observable<{ processes: StudyProcess[] }> {
    const params: Record<string, string> = {};
    if (domain) params['domain'] = domain;
    return this.api.getData<{ processes: StudyProcess[] }>('core', ['cyb', 'process'], { params });
  }

  /** The layer registry — the one taxonomy, not a copy per client. */
  layers(domain?: string): Observable<{ layers: CybLayer[] }> {
    const params: Record<string, string> = {};
    if (domain) params['domain'] = domain;
    return this.api.getData<{ layers: CybLayer[] }>('core', ['cyb', 'layers'], { params });
  }

  // ── The doc lane ───────────────────────────────────────────────────────────
  // An episode stage names a document and, when it teaches, a set of variants.
  // Both live outside km_core, so the reader fetches them from their owners.

  document(docId: string): Observable<CmDocument> {
    return this.api.getData<CmDocument>('cm', ['documents', docId]);
  }

  /** The variants an episode stage names, in one read rather than one per id. */
  teachingVariants(ids: string[]): Observable<{ variants: TeachingVariant[] }> {
    return this.api.getData<{ variants: TeachingVariant[] }>(
      'ar', ['teaching-variants'], { params: { ids: ids.join(',') } });
  }

  /** Every variant written for one grammar node, across audiences. */
  teachingVariantsForNode(nodeId: string): Observable<{ variants: TeachingVariant[] }> {
    return this.api.getData<{ variants: TeachingVariant[] }>(
      'ar', ['teaching-variants'], { params: { node: nodeId } });
  }
}
