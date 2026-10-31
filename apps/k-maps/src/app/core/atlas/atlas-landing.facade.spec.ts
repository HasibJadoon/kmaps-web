import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AtlasLandingFacade } from './atlas-landing.facade';
import { AtlasGraphData, LandingAtlas } from './atlas.models';
import { environment } from '../../../environments/environment';

const URL = `${environment.apiBase.replace(/\/+$/, '')}/wv/landing-atlas`;

const graph: AtlasGraphData = {
  schema_version: 1,
  graph_id: 'wv_world_001',
  meta: { title: 'T', description: 'D', layout_mode: 'force', zoom_mode: 'smooth', default_view: 'world' },
  clusters: [
    { id: 'cl_b', label: 'B', order: 2, color: '#00ff00', world_x: 10, world_y: 20, radius: 50 },
    { id: 'cl_a', label: 'A', order: 1, color: '#ff0000', world_x: -10, world_y: -20, radius: 50 },
  ],
  nodes: [
    { id: 'a1', kind: 'concept', cluster_id: 'cl_a', label: 'Alpha', size: 20, zoom_level: 1, importance: 9 },
    { id: 'a2', kind: 'claim', cluster_id: 'cl_a', label: 'Alpha claim', size: 10, zoom_level: 2, importance: 5 },
    { id: 'b1', kind: 'concept', cluster_id: 'cl_b', label: 'Beta', size: 20, zoom_level: 1, importance: 8 },
  ],
  edges: [
    { id: 'e1', source: 'a1', target: 'a2', type: 'supports', strength: 0.5 },
    { id: 'e2', source: 'a1', target: 'b1', type: 'contrasts', strength: 0.3 },
  ],
  zoom_views: [
    { id: 'world', label: 'World', x: 0, y: 0, k: 1, show_kinds: ['concept'], label_min_importance: 5 },
  ],
};

const atlas: LandingAtlas = { graph, layers: [], eras: [], scene: null };

describe('AtlasLandingFacade', () => {
  let facade: AtlasLandingFacade;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    facade = TestBed.inject(AtlasLandingFacade);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the atlas from the worldview worker, once', async () => {
    const first = facade.loadAtlas();
    const second = facade.loadGraphData();
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('GET');
    req.flush({ ok: true, data: atlas });

    expect(await first).toEqual(atlas);
    expect(await second).toEqual(graph);
    // served from the kept promise: no second request
    expect(await facade.loadGraphData()).toEqual(graph);
    http.expectNone(URL);
  });

  it('forgets a failed load so the next call tries again', async () => {
    const failed = facade.loadAtlas();
    http.expectOne(URL).flush('down', { status: 503, statusText: 'Unavailable' });
    await expect(failed).rejects.toBeTruthy();

    const retry = facade.loadAtlas();
    http.expectOne(URL).flush({ ok: true, data: atlas });
    expect((await retry).graph.graph_id).toBe('wv_world_001');
  });

  it('rejects an answer the worker marks as not ok', async () => {
    const p = facade.loadAtlas();
    http.expectOne(URL).flush({ ok: false, data: null, error: { message: 'Landing atlas not found' } });
    await expect(p).rejects.toThrow('Landing atlas not found');
  });

  it('builds lookups and an adjacency map from the graph', () => {
    const { clusterMap, zoomViews, linksByNode } = facade.createLookups(graph);
    expect(clusterMap.get('cl_a')?.label).toBe('A');
    expect(zoomViews.has('world')).toBe(true);
    expect([...(linksByNode.get('a1') ?? [])].sort()).toEqual(['a2', 'b1']);
    expect([...(linksByNode.get('b1') ?? [])]).toEqual(['a1']);
  });

  it('tours clusters in order, top concept then top claim', () => {
    expect(facade.buildAutoTourSequence(graph)).toEqual([
      { kind: 'world' },
      { kind: 'cluster', clusterId: 'cl_a' },
      { kind: 'concept', clusterId: 'cl_a', nodeId: 'a1' },
      { kind: 'claim', clusterId: 'cl_a', nodeId: 'a2' },
      { kind: 'cluster', clusterId: 'cl_b' },
      { kind: 'concept', clusterId: 'cl_b', nodeId: 'b1' },
      { kind: 'world' },
    ]);
  });

  it('places a simulation node at its cluster plus its hint', () => {
    const { clusterMap } = facade.createLookups(graph);
    const sim = facade.toSimulationNode({ ...graph.nodes[0], fx_hint: 5, fy_hint: -5 }, clusterMap);
    expect(sim.hintX).toBe(-5);
    expect(sim.hintY).toBe(-25);
    expect(sim.x).toBe(-5);
  });
});
