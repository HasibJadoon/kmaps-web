import { Injectable, signal, computed } from '@angular/core';
import {
  SceneLayer,
  SceneState,
  ConstellationLayer,
  AtlasGraphData,
  AtlasCluster,
  SimulationNode,
  HistoricalWaypoint,
  HistoricalEra,
} from './atlas.models';

const AUTO_TOUR_HOPS: string[] = [
  'scriptures',
  'prophets',
  'quranic_events',
  'scriptures',
  'prophetic_attributes',
  'hadith_companions',
  'scriptures',
  'biblical_events',
  'prophets',
  'scholars_books',
  'scriptures',
  'enlightenment',
  'quranic_events',
  'prophets',
  'hadith_companions',
  'scriptures',
  'scholars_books',
  'prophets',
  'scriptures',
  'scriptures',
];

@Injectable({ providedIn: 'root' })
export class AtlasSceneController {

  readonly state = signal<SceneState>({ layer: 'sky' });

  readonly layer = computed(() => this.state().layer);
  readonly activeConstellationId = computed(() => this.state().constellationId);
  readonly activeClusterId = computed(() => this.state().clusterId);
  readonly activeNodeId = computed(() => this.state().nodeId);
  readonly activeEraId = computed(() => this.state().eraId);
  readonly isInSky = computed(() => this.state().layer === 'sky');
  readonly isInConstellation = computed(() => this.state().layer === 'constellation');
  readonly isInNode = computed(() => this.state().layer === 'node');
  readonly isInHistory = computed(() => this.state().layer === 'history');

  private constellations: ConstellationLayer[] = [];
  private graphData: AtlasGraphData | null = null;
  private waypoints: HistoricalWaypoint[] = [];
  private eras: HistoricalEra[] = [];

  readonly activeWaypoints = computed<HistoricalWaypoint[]>(() => {
    const nodeId = this.state().nodeId;
    if (!nodeId) return [];
    return this.waypoints
      .filter((w) => w.node_id === nodeId)
      .sort((a, b) => a.time_start - b.time_start);
  });

  readonly activeEras = computed<HistoricalEra[]>(() => {
    const used = new Set(this.activeWaypoints().map((w) => w.era_id));
    return this.eras
      .filter((e) => used.has(e.era_id))
      .sort((a, b) => a.era_order - b.era_order);
  });

  registerConstellations(layers: ConstellationLayer[]): void {
    this.constellations = layers;
  }

  registerGraphData(data: AtlasGraphData): void {
    this.graphData = data;
  }

  registerHistory(waypoints: HistoricalWaypoint[], eras: HistoricalEra[]): void {
    this.waypoints = waypoints;
    this.eras = eras;
  }

  goToSky(): void {
    this.state.set({ layer: 'sky', transitionDir: 'out' });
  }

  goToConstellation(constellationId: string): void {
    const constellation = this.constellations.find((c) => c.id === constellationId);
    if (!constellation) return;

    const anchorStar = constellation.camera_anchor_star_id
      ? constellation.stars.find((s) => s.id === constellation.camera_anchor_star_id)
      : constellation.stars.find((s) => s.role === 'anchor');

    this.state.set({
      layer: 'constellation',
      constellationId,
      clusterId: constellation.linked_cluster_id,
      cameraTarget: anchorStar
        ? { x: anchorStar.x, y: anchorStar.y, k: 2.4 }
        : undefined,
      transitionDir: 'in',
    });
  }

  goToNode(nodeId: string, clusterId: string): void {
    const cluster = this.graphData?.clusters.find((c) => c.id === clusterId);
    this.state.set({
      layer: 'node',
      constellationId: this.state().constellationId,
      clusterId,
      nodeId,
      cameraTarget: cluster
        ? { x: cluster.world_x, y: cluster.world_y, k: 3.2 }
        : undefined,
      transitionDir: 'in',
    });
  }

  goToHistory(nodeId: string): void {
    const hasHistory = this.waypoints.some((w) => w.node_id === nodeId);
    if (!hasHistory) return;

    this.state.set({
      layer: 'history',
      constellationId: this.state().constellationId,
      clusterId: this.state().clusterId,
      nodeId,
      transitionDir: 'in',
    });
  }

  goToEra(eraId: string): void {
    this.state.update((s) => ({ ...s, eraId, transitionDir: 'in' }));
  }

  stepBack(): void {
    const current = this.state();
    switch (current.layer) {
      case 'history':
        this.state.set({
          layer: 'node',
          constellationId: current.constellationId,
          clusterId: current.clusterId,
          nodeId: current.nodeId,
          transitionDir: 'out',
        });
        break;
      case 'node':
        this.state.set({
          layer: 'constellation',
          constellationId: current.constellationId,
          clusterId: current.clusterId,
          transitionDir: 'out',
        });
        break;
      case 'constellation':
        this.goToSky();
        break;
      default:
        break;
    }
  }

  getConstellation(id: string): ConstellationLayer | undefined {
    return this.constellations.find((c) => c.id === id);
  }

  getConstellationsSorted(): ConstellationLayer[] {
    return [...this.constellations].sort((a, b) => a.quran_centrality - b.quran_centrality);
  }

  getActiveCluster(): AtlasCluster | undefined {
    const id = this.state().clusterId;
    if (!id || !this.graphData) return undefined;
    return this.graphData.clusters.find((c) => c.id === id);
  }

  getActiveClusterNodes(): SimulationNode[] {
    const clusterId = this.state().clusterId;
    if (!clusterId || !this.graphData) return [];
    return this.graphData.nodes
      .filter((n) => n.cluster_id === clusterId)
      .sort((a, b) => b.importance - a.importance)
      .map((n) => ({
        ...n,
        hintX: 0,
        hintY: 0,
        homeX: 0,
        homeY: 0,
        phase: (n.time_start ?? 0) / 120,
      })) as SimulationNode[];
  }

  nodeHasHistory(nodeId: string): boolean {
    return this.waypoints.some((w) => w.node_id === nodeId);
  }

  startAutoTour(dwellMs = 2800, returnMs = 900): () => void {
    let cancelled = false;
    const sequence = this.getAutoTourSequence();
    let index = 0;

    const step = (): void => {
      if (cancelled || sequence.length === 0) return;

      const constellation = sequence[index];
      this.goToConstellation(constellation.id);

      const dwellTimer = window.setTimeout(() => {
        this.forgetTimer(dwellTimer);
        if (cancelled) return;
        this.goToSky();

        const isLoopBoundary = index === sequence.length - 1;
        const skyPause = isLoopBoundary ? returnMs + 450 : returnMs;
        const returnTimer = window.setTimeout(() => {
          this.forgetTimer(returnTimer);
          if (cancelled) return;
          index = (index + 1) % sequence.length;
          step();
        }, skyPause);

        this.rememberTimer(returnTimer);
      }, dwellMs);

      this.rememberTimer(dwellTimer);
    };

    step();

    return () => {
      cancelled = true;
      this._tourTimers.forEach((id) => window.clearTimeout(id));
      this._tourTimers = [];
      this.goToSky();
    };
  }

  private _tourTimers: number[] = [];

  private rememberTimer(id: number): void {
    this._tourTimers.push(id);
  }

  private forgetTimer(id: number): void {
    this._tourTimers = this._tourTimers.filter((timerId) => timerId !== id);
  }

  stopAutoTour(): void {
    this._tourTimers.forEach((id) => window.clearTimeout(id));
    this._tourTimers = [];
  }

  reset(): void {
    this.stopAutoTour();
    this.state.set({ layer: 'sky' });
    this.constellations = [];
    this.graphData = null;
    this.waypoints = [];
    this.eras = [];
  }

  private getAutoTourSequence(): ConstellationLayer[] {
    const byId = new Map(this.constellations.map((constellation) => [constellation.id, constellation]));
    const curated = AUTO_TOUR_HOPS
      .map((id) => byId.get(id))
      .filter((constellation): constellation is ConstellationLayer => Boolean(constellation));

    return curated.length ? curated : this.getConstellationsSorted();
  }

  getBreadcrumb(): string[] {
    const s = this.state();
    const crumbs: string[] = ['Sky'];
    if (s.constellationId) {
      const c = this.getConstellation(s.constellationId);
      if (c) crumbs.push(c.label);
    }
    if (s.nodeId && this.graphData) {
      const n = this.graphData.nodes.find((x) => x.id === s.nodeId);
      if (n) crumbs.push(n.label);
    }
    if (s.layer === 'history') crumbs.push('History');
    return crumbs;
  }
}
