import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BackendApiService } from '../../../shared/services/backend-api.service';
import type {
  CybMonitor, CybNodeDetail, CybJob, CybSource, CountRow,
  StagingSummary, Surah, StudyGrid, RootDetail, PassageRoot,
  CybLayerRow, CybDomain, LayerModel, RootFillCell, RootCarrierRows, CybNodeTree,
  NodeCarrierRows, NodeReading, RootGloss, RootSenseBundle,
} from './cyb.models';

@Injectable({ providedIn: 'root' })
export class CybService {
  private readonly api = inject(BackendApiService);

  monitor(): Observable<CybMonitor> {
    return this.api.getData<CybMonitor>('core', ['cyb', 'monitor']);
  }

  surahs(): Observable<Surah[]> {
    return this.api.getData<Surah[]>('qr', ['surahs']);
  }

  passageRoots(surahId: number, passageNo: number): Observable<PassageRoot[]> {
    return this.api.getData<PassageRoot[]>('qr', ['study', 'surahs', surahId, 'passages', passageNo, 'roots']);
  }

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

  domains(): Observable<{ domains: CybDomain[] }> {
    return this.api.getData<{ domains: CybDomain[] }>('core', ['cyb', 'domains']);
  }

  layers(domain = 'quran'): Observable<{ layers: CybLayerRow[] }> {
    return this.api.getData<{ layers: CybLayerRow[] }>('core', ['cyb', 'layers'], {
      params: { domain },
    });
  }

  nodeRows(nodeId: string, layer?: string): Observable<{ carriers: NodeCarrierRows[] }> {
    const params: Record<string, string> = {};
    if (layer) params['layer'] = layer;
    return this.api.getData<{ carriers: NodeCarrierRows[] }>('core', ['cyb', 'rows', nodeId], { params });
  }

  readings(nodeId: string): Observable<{ node_id: string; readings: NodeReading[] }> {
    return this.api.getData<{ node_id: string; readings: NodeReading[] }>(
      'core', ['cyb', 'reading', nodeId]);
  }

  registrySummary(): Observable<StagingSummary> {
    return this.api.getData<StagingSummary>('al', ['registry', 'summary']);
  }

  layerModel(): Observable<LayerModel> {
    return this.api.getData<LayerModel>('al', ['registry', 'layer-model']);
  }

  rootFillScope(root: string, scope: string): Observable<{ root_fill: RootFillCell[] }> {
    return this.api.getData<{ root_fill: RootFillCell[] }>(
      'al', ['registry', 'root', root, 'fill', 'scope', scope]);
  }

  rootFillBand(root: string, band: string): Observable<{ root_fill: RootFillCell[] }> {
    return this.api.getData<{ root_fill: RootFillCell[] }>(
      'al', ['registry', 'root', root, 'fill', band]);
  }

  rootRows(root: string, subCode: string): Observable<{ carriers: RootCarrierRows[] }> {
    return this.api.getData<{ carriers: RootCarrierRows[] }>(
      'al', ['registry', 'root', root, 'rows', subCode]);
  }

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

  rootGlosses(roots: string[]): Observable<{ roots: RootGloss[] }> {
    return this.api.getData<{ roots: RootGloss[] }>('al', ['roots', 'glosses'], {
      params: { roots: roots.join(',') },
    });
  }

  rootSenses(root: string): Observable<RootSenseBundle> {
    return this.api.getData<RootSenseBundle>('al', ['roots', root, 'senses']);
  }

  rootDetail(root: string): Observable<RootDetail> {
    return this.api.getData<RootDetail>('al', ['registry', 'root', root]);
  }
}
