// ─── CybService — read the cybernetics control plane ─────────────────────────
// Thin data layer over BackendApiService. All endpoints are public GET.
// core → /api/core/cyb/*, al → /api/al/registry/*. Logic-free: no shaping here
// beyond unwrapping the envelope (BackendApiService does that).
//
// The AL calls used to go to /al/staging/*. That contract was dropped with
// `ar_ling_stg_claim` on 2026-08-21 — every one of them had been 404'ing since,
// which is why the Root Dashboard's layer strip rendered empty. The registry
// routes replace them, and the per-root reading is now a live count off the
// carrier rather than a stored claim count.

import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BackendApiService } from '../../../shared/services/backend-api.service';
import type {
  CybMonitor, CybNode, CybNodeDetail, CybJob, CybSource, CountRow,
  StagingSummary, StagingMatrix, Surah, StudyGrid, RootDetail, PassageRoot,
  CybLayerRow, CybDomain, LayerModel, RootFillCell, RootCarrierRows, CybNodeTree,
  NodeCarrierRows, NodeReading, RootGloss, RootSenseBundle,
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

  tree(node?: string, lane?: string): Observable<{ roots: CybNodeTree[] }> {
    const params: Record<string, string> = {};
    if (node) params['node'] = node;
    if (lane) params['lane'] = lane;
    return this.api.getData<{ roots: CybNodeTree[] }>('core', ['cyb', 'tree'], { params });
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

  /** The module registry — the domains the console watches. The dashboard's
   *  module cards are these rows; the app keeps no list of its own. */
  domains(): Observable<{ domains: CybDomain[] }> {
    return this.api.getData<{ domains: CybDomain[] }>('core', ['cyb', 'domains']);
  }

  /** The layer registry — the ONE taxonomy of stream-systems. The map used to
   *  carry its own list of six; this is the list. */
  layers(domain = 'quran'): Observable<{ layers: CybLayerRow[] }> {
    return this.api.getData<{ layers: CybLayerRow[] }>('core', ['cyb', 'layers'], {
      params: { domain },
    });
  }

  /** What the carriers hold for this node's layer — the work itself, not the
   *  control plane's own child nodes. */
  nodeRows(nodeId: string, layer?: string): Observable<{ carriers: NodeCarrierRows[] }> {
    const params: Record<string, string> = {};
    if (layer) params['layer'] = layer;
    return this.api.getData<{ carriers: NodeCarrierRows[] }>('core', ['cyb', 'rows', nodeId], { params });
  }

  /** `v_cyb_node_reading` — the one definition of a reading, per axis. */
  readings(nodeId: string): Observable<{ node_id: string; readings: NodeReading[] }> {
    return this.api.getData<{ node_id: string; readings: NodeReading[] }>(
      'core', ['cyb', 'reading', nodeId]);
  }

  registrySummary(): Observable<StagingSummary> {
    return this.api.getData<StagingSummary>('al', ['registry', 'summary']);
  }

  /** The scope → band → sub-layer registry behind the Root Dashboard. */
  layerModel(): Observable<LayerModel> {
    return this.api.getData<LayerModel>('al', ['registry', 'layer-model']);
  }

  /** Live per-root carrier counts for one whole scope (root · lemma · word).
   *  Per scope, not per band: the band list shows every band at once, so
   *  fetching band by band would leave most of them unread. */
  rootFillScope(root: string, scope: string): Observable<{ root_fill: RootFillCell[] }> {
    return this.api.getData<{ root_fill: RootFillCell[] }>(
      'al', ['registry', 'root', root, 'fill', 'scope', scope]);
  }

  /** Live per-root carrier counts for a single band. */
  rootFillBand(root: string, band: string): Observable<{ root_fill: RootFillCell[] }> {
    return this.api.getData<{ root_fill: RootFillCell[] }>(
      'al', ['registry', 'root', root, 'fill', band]);
  }

  /** What a sub-layer's carrier actually holds for this root. */
  rootRows(root: string, subCode: string): Observable<{ carriers: RootCarrierRows[] }> {
    return this.api.getData<{ carriers: RootCarrierRows[] }>(
      'al', ['registry', 'root', root, 'rows', subCode]);
  }

  /**
   * EVERY sub-layer's rows for this root — what the dashboard shows without
   * making the reader click a layer at a time.
   *
   * Prefers the one-call scope read. That route is newer than the deployed
   * worker, so when it is not there yet this falls back to reading the
   * sub-layers the caller already knows hold rows, in parallel. Same shape
   * either way; the fallback is just slower.
   */
  rootRowsScope(root: string, scope: string, knownSubs: string[], per = 6):
      Observable<RootCarrierRows[]> {
    return this.api
      .getData<{ carriers: RootCarrierRows[] }>('al', ['registry', 'root', root, 'rows'], {
        params: { scope, per: String(per) },
      })
      .pipe(
        map((r) => r.carriers),
        catchError(() => {
          if (!knownSubs.length) return of([] as RootCarrierRows[]);
          return forkJoin(
            knownSubs.map((sub) =>
              this.rootRows(root, sub).pipe(
                map((r) => r.carriers),
                catchError(() => of([] as RootCarrierRows[])),
              )),
          ).pipe(map((lists) => lists.flat()));
        }),
      );
  }

  /** The identity cards of many roots in one read — what the root grid needs to
   *  gloss its tiles. The Quran worker names a passage's roots; only DB_AL can
   *  say what they mean, so the grid asks for all of them at once. */
  rootGlosses(roots: string[]): Observable<{ roots: RootGloss[] }> {
    return this.api.getData<{ roots: RootGloss[] }>('al', ['roots', 'glosses'], {
      params: { roots: roots.join(',') },
    });
  }

  /** The 360° sense layer for one root: its senses, the arcs between them, and
   *  the attestations behind both. One call, because a claim without who said
   *  it is not a claim. */
  rootSenses(root: string): Observable<RootSenseBundle> {
    return this.api.getData<RootSenseBundle>('al', ['roots', root, 'senses']);
  }

  /** Deep drill for one root: its memlets, question bank, media and registry. */
  rootDetail(root: string): Observable<RootDetail> {
    return this.api.getData<RootDetail>('al', ['registry', 'root', root]);
  }
}
