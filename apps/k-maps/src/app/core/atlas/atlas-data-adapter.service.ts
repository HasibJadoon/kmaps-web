import { Injectable } from '@angular/core';
import {
  AtlasGraphData,
  AtlasNode,
  AtlasConstellationLayer,
  ConstellationLayer,
  ConstellationStar,
  ConstellationLine,
  HistoricalWaypoint,
  HistoricalEra,
  SceneState,
  FocusState,
  FocusKind,
} from './atlas.models';

@Injectable({ providedIn: 'root' })
export class AtlasDataAdapter {

  // The served layers and eras (GET /wv/landing-atlas), set once the atlas loads.
  private layers: AtlasConstellationLayer[] = [];
  private eras: HistoricalEra[] = [];

  register(layers: AtlasConstellationLayer[], eras: HistoricalEra[]): void {
    this.layers = layers;
    this.eras = [...eras].sort((a, b) => a.era_order - b.era_order);
    this._mappedLayers = null;
  }

  private bridge(legacy: AtlasConstellationLayer): ConstellationLayer {
    const meta = legacy.sky;

    const stars: ConstellationStar[] = (legacy.bodies ?? []).map((b) => ({
      id: b.id,
      label: b.label,
      x: b.x,
      y: b.y,
      r: b.r,
      luminosity: b.glow ?? 0.5,
      role: (b.kind ?? 'secondary') as ConstellationStar['role'],
    }));

    const lines: ConstellationLine[] = (legacy.rays ?? []).map((r) => ({
      source: r.source,
      target: r.target,
      weight: r.opacity ?? 0.5,
    }));

    return {
      id: legacy.id,
      label: legacy.label,
      ...meta,
      color: legacy.color,
      stars,
      lines,
    };
  }

  private _mappedLayers: ConstellationLayer[] | null = null;
  private getMappedLayers(): ConstellationLayer[] {
    if (!this._mappedLayers) {
      this._mappedLayers = this.layers.map((l) => this.bridge(l));
    }
    return this._mappedLayers;
  }

  getSkyConstellations(): ConstellationLayer[] {
    return [...this.getMappedLayers()].sort((a, b) => a.quran_centrality - b.quran_centrality);
  }

  getConstellationVisualTier(id: string): number {
    return this.layers.find((l) => l.id === id)?.sky.visual_tier ?? 3;
  }

  getConstellation(id: string): ConstellationLayer | undefined {
    return this.getMappedLayers().find((c) => c.id === id);
  }

  getConstellationNodes(
    constellationId: string,
    graphData: AtlasGraphData,
  ): AtlasNode[] {
    const constellation = this.getConstellation(constellationId);
    if (!constellation?.linked_cluster_id) return [];

    const clusterId = constellation.linked_cluster_id;
    return graphData.nodes
      .filter((n) => n.cluster_id === clusterId)
      .sort((a, b) => {

        const wa = (a.sacred_weight ?? 0) * 2 + a.importance;
        const wb = (b.sacred_weight ?? 0) * 2 + b.importance;
        return wb - wa;
      });
  }

  getClusterNodes(clusterId: string, graphData: AtlasGraphData): AtlasNode[] {
    return graphData.nodes
      .filter((n) => n.cluster_id === clusterId)
      .sort((a, b) => b.importance - a.importance);
  }

  getClusterEdges(clusterId: string, graphData: AtlasGraphData) {
    const ids = new Set(
      graphData.nodes.filter((n) => n.cluster_id === clusterId).map((n) => n.id),
    );
    return graphData.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }

  getHistoricalWaypoints(
    nodeId: string,
    graphData: AtlasGraphData,
  ): HistoricalWaypoint[] {

    const linkedIds = new Set<string>();
    for (const e of graphData.edges) {
      if (e.source === nodeId) linkedIds.add(e.target);
      if (e.target === nodeId) linkedIds.add(e.source);
    }

    return graphData.nodes
      .filter(
        (n) =>
          linkedIds.has(n.id) &&
          n.time_start != null &&
          (n.evidence_type === 'historical' || n.kind === 'evidence'),
      )
      .sort((a, b) => (a.time_start ?? 0) - (b.time_start ?? 0))
      .map((n) => this.nodeToWaypoint(n, nodeId));
  }

  getHistoricalEras(waypoints: HistoricalWaypoint[]): HistoricalEra[] {
    const eraIds = new Set(waypoints.map((w) => w.era_id));
    return this.eras.filter((e) => eraIds.has(e.era_id));
  }

  nodeHasHistory(nodeId: string, graphData: AtlasGraphData): boolean {
    return this.getHistoricalWaypoints(nodeId, graphData).length > 0;
  }

  toLegacyFocusState(state: SceneState): FocusState {
    switch (state.layer) {
      case 'sky':
        return { kind: 'world' };
      case 'constellation':
        return {
          kind: 'cluster' as FocusKind,
          clusterId: state.clusterId,
        };
      case 'node':
        return {
          kind: (state.nodeId ? 'concept' : 'cluster') as FocusKind,
          clusterId: state.clusterId,
          nodeId: state.nodeId,
        };
      case 'history':
        return {
          kind: 'evidence' as FocusKind,
          clusterId: state.clusterId,
          nodeId: state.nodeId,
        };
    }
  }

  private nodeToWaypoint(node: AtlasNode, parentNodeId: string): HistoricalWaypoint {
    const era = this.resolveEra(node.time_start ?? 0);
    return {
      id: node.id,
      node_id: parentNodeId,
      era_id: era.era_id,
      label: node.label,
      label_ar: node.label_ar,
      time_start: node.time_start ?? 0,
      time_end: node.time_end,
      historical_role: node.evidence_type ?? 'evidence',
      source_type: 'text',
      display_group: era.era_label,
      detail: undefined,
    };
  }

  private resolveEra(year: number): HistoricalEra {
    for (const era of this.eras) {
      if (year >= era.time_start && year <= era.time_end) return era;
    }
    return this.eras[0] ?? { era_id: 'unknown', era_label: '', era_order: 0, time_start: year, time_end: year };
  }
}
