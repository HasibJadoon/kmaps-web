import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AtlasLandingFacade } from './atlas-landing.facade';
import { AtlasSceneController } from './atlas-scene-controller.service';
import { AtlasStarfieldRenderer } from './atlas-starfield-renderer.service';
import { AtlasGraphRenderer } from './atlas-graph-renderer.service';
import { AtlasMotionService } from './atlas-motion.service';
import { AtlasDataAdapter } from './atlas-data-adapter.service';
import { SACRED_ATLAS_SCENE } from './atlas.data';
import {
  AtlasFocusCard,
  AtlasGraphData,
  ConstellationLayer,
  FocusState,
  SceneLayer,
  SceneState,
  SimulationNode,
  SacredAtlasScene,
} from './atlas.models';

interface ModuleShortcut {
  id: string;
  label: string;
  route: string;
  meta: string;
}

const MODULE_SHORTCUTS: ModuleShortcut[] = [
  { id: 'start', label: 'Start', route: '/home', meta: 'Home' },
];

@Component({
  selector: 'km-atlas-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './atlas-landing.component.html',
  styleUrl: './atlas-landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtlasLandingComponent implements AfterViewInit, OnDestroy {

  @ViewChild('host',           { static: true }) private hostRef!:           ElementRef<HTMLElement>;
  @ViewChild('starHost',       { static: true }) private starHostRef!:       ElementRef<HTMLElement>;
  @ViewChild('svgRoot',        { static: true }) private svgRef!:            ElementRef<SVGSVGElement>;
  @ViewChild('modeLabelEl',    { static: true }) private modeLabelRef!:      ElementRef<HTMLElement>;
  @ViewChild('focusCardEl',    { static: false }) private focusCardRef?:     ElementRef<HTMLElement>;

  private readonly facade      = inject(AtlasLandingFacade);
  private readonly scene       = inject(AtlasSceneController);
  private readonly starfield   = inject(AtlasStarfieldRenderer);
  private readonly graph       = inject(AtlasGraphRenderer);
  private readonly motion      = inject(AtlasMotionService);
  private readonly adapter     = inject(AtlasDataAdapter);
  private readonly ngZone      = inject(NgZone);
  private readonly router      = inject(Router);

  readonly moduleShortcuts = MODULE_SHORTCUTS;
  readonly sacredScene: SacredAtlasScene = SACRED_ATLAS_SCENE;

  readonly currentLayer   = computed(() => this.scene.layer());
  readonly breadcrumb     = computed(() => this.scene.getBreadcrumb());
  readonly modeLabel      = computed(() => AtlasMotionService.layerLabel(this.scene.layer()));
  readonly canGoBack      = computed(() => this.scene.layer() !== 'sky');
  readonly historyWaypoints = computed(() => this.scene.activeWaypoints());
  readonly historyEras      = computed(() => this.scene.activeEras());

  readonly focusCard = signal<AtlasFocusCard | null>(null);
  readonly activeConstellationId = this.scene.activeConstellationId;

  private graphData: AtlasGraphData | null = null;
  private resizeObserver?: ResizeObserver;
  private quranBreathTween?: gsap.core.Tween;
  private cancelAutoTour?: () => void;
  private focusCardRevealTimerId: number | null = null;
  private initialised = false;

  constructor() {

    effect(() => {
      const state = this.scene.state();
      if (!this.initialised) return;
      this.onSceneChange(state);
    });
  }

  async ngAfterViewInit(): Promise<void> {
    this.ngZone.runOutsideAngular(() => {
      this.starfield.init(this.starHostRef.nativeElement);
      this.starfield.setSceneLayer('sky');
    });

    this.graphData = await this.facade.loadGraphData();
    const lookups = this.facade.createLookups(this.graphData);

    this.scene.registerGraphData(this.graphData);
    this.scene.registerConstellations(this.adapter.getSkyConstellations());

    const host = this.hostRef.nativeElement;
    this.ngZone.runOutsideAngular(() => {
      this.graph.init(this.svgRef.nativeElement, host.clientWidth, host.clientHeight);
      this.graph.loadGraph(this.graphData!);
      this.graph.resetZoom();
    });

    this.graph.onNodeClickHandler((node) => this.ngZone.run(() => this.onNodeClick(node)));
    this.graph.onBackgroundClickHandler(() => this.ngZone.run(() => this.onBackgroundClick()));

    this.resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      this.ngZone.runOutsideAngular(() => {
        this.starfield.resize(width, height);
        this.graph.resize(width, height);
      });
    });
    this.resizeObserver.observe(host);

    const entryTl = this.motion.entrySequence(
      this.starHostRef.nativeElement,
      this.modeLabelRef.nativeElement,
    );

    entryTl.eventCallback('onComplete', () => {
      this.ngZone.run(() => this.beginAutoTour());
    });

    const shortcuts = host.querySelectorAll<HTMLElement>('.atlas__shortcut');
    if (shortcuts.length) this.motion.revealModuleShortcuts(shortcuts);

    const legacyFocus = this.adapter.toLegacyFocusState(this.scene.state());
    this.graph.renderScene(this.scene.state(), legacyFocus);

    this.initialised = true;
  }

  ngOnDestroy(): void {
    this.initialised = false;
    if (this.focusCardRevealTimerId !== null) {
      window.clearTimeout(this.focusCardRevealTimerId);
      this.focusCardRevealTimerId = null;
    }
    this.resizeObserver?.disconnect();
    this.quranBreathTween?.kill();
    this.cancelAutoTour?.();
    this.motion.dispose();
    this.graph.dispose();
    this.starfield.dispose();
    this.scene.reset();
    this.graphData = null;
  }

  private onSceneChange(state: SceneState): void {
    this.starfield.setSceneLayer(state.layer);

    const legacyFocus = this.adapter.toLegacyFocusState(state);
    this.graph.setFocusAttr(legacyFocus);
    this.graph.renderScene(state, legacyFocus);

    this.motion.transitionModeLabel(
      this.modeLabelRef.nativeElement,
      AtlasMotionService.layerLabel(state.layer),
    );

    switch (state.layer) {
      case 'sky':
        this.focusCard.set(null);
        break;

      case 'constellation':
        this.motion.skyToConstellation(
          this.svgRef.nativeElement,
          this.modeLabelRef.nativeElement,
        );
        break;

      case 'node': {
        const nodeEl = state.nodeId
          ? this.svgRef.nativeElement.querySelector<SVGCircleElement>(`[data-id="${state.nodeId}"]`)
          : null;
        this.motion.constellationToNode(null, nodeEl ? [nodeEl] : []);
        if (state.nodeId) {
          this.showFocusCard(state.nodeId);
        }
        break;
      }

      case 'history': {
        if (state.nodeId && this.graphData) {
          const waypoints = this.adapter.getHistoricalWaypoints(state.nodeId, this.graphData);
          const eras = this.adapter.getHistoricalEras(waypoints);
          this.scene.registerHistory(waypoints, eras);

          const nodeEl = this.svgRef.nativeElement.querySelector<SVGCircleElement>(`[data-id="${state.nodeId}"]`);
          this.motion.nodeToHistory(nodeEl ?? null, null);

          this.graph.renderHistoryArc(
            state.nodeId,
            waypoints,
            eras,
            this.hostRef.nativeElement.clientWidth,
            this.hostRef.nativeElement.clientHeight,
          );
        }
        break;
      }
    }
  }

  private beginAutoTour(): void {

    const warmup = window.setTimeout(() => {
      this.cancelAutoTour = this.scene.startAutoTour(4000, 1250);
    }, 600);

    const origCancel = this.cancelAutoTour;
    this.cancelAutoTour = () => {
      window.clearTimeout(warmup);
      origCancel?.();
    };
  }

  private stopTour(): void {
    this.cancelAutoTour?.();
    this.cancelAutoTour = undefined;
  }

  private onNodeClick(node: SimulationNode): void {
    this.stopTour();
    const layer = this.scene.layer();

    if (layer === 'sky' || layer === 'constellation') {
      this.scene.goToNode(node.id, node.cluster_id);
    } else if (layer === 'node') {
      const hasHistory = this.graphData
        ? this.adapter.nodeHasHistory(node.id, this.graphData)
        : false;
      if (hasHistory) {
        this.scene.goToHistory(node.id);
      } else {
        this.scene.goToNode(node.id, node.cluster_id);
      }
    }

    const nodeEl = this.svgRef.nativeElement.querySelector<SVGCircleElement>(`[data-id="${node.id}"]`);
    if (nodeEl) this.motion.pulseNode(nodeEl);
  }

  private onBackgroundClick(): void {
    this.stopTour();
    if (this.scene.layer() !== 'sky') {
      this.focusCard.set(null);
    }
  }

  onConstellationClick(constellationId: string): void {
    this.stopTour();
    this.scene.goToConstellation(constellationId);
  }

  stepBack(): void {
    this.stopTour();
    const layer = this.scene.layer();
    if (layer === 'history') {
      this.graph.removeHistoryArc();
    }
    this.motion.stepBack(this.modeLabelRef.nativeElement, () => {
      this.scene.stepBack();
    });
  }

  zoomIn():    void { this.stopTour(); this.graph.zoomIn(); }
  zoomOut():   void { this.stopTour(); this.graph.zoomOut(); }
  resetView(): void { this.stopTour(); this.graph.resetZoom(); }

  navigateTo(route: string): void {
    this.stopTour();
    this.motion.exitToApp(this.hostRef.nativeElement, () => {
      this.router.navigate([route]);
    });
  }

  private showFocusCard(nodeId: string): void {
    const node = this.graphData?.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const sacred = this.sacredScene.nodes.find((sn) => sn.linked_cluster_id === node.cluster_id);
    this.focusCard.set({
      id: nodeId,
      title: node.label,
      subtitle: node.label_ar ?? '',
      summary: sacred?.meaning_summary ?? '',
      polarity: sacred?.polarity ?? 'guidance',
      relationToCenter: sacred?.relation_to_center ?? '',
      relationToQuran: sacred?.relation_to_quran ?? '',
      relationToHumanResponse: sacred?.relation_to_human_response ?? '',
    });

    if (this.focusCardRevealTimerId !== null) {
      window.clearTimeout(this.focusCardRevealTimerId);
    }
    this.focusCardRevealTimerId = window.setTimeout(() => {
      const cardEl = this.focusCardRef?.nativeElement;
      if (cardEl) this.motion.revealCard(cardEl);
      this.focusCardRevealTimerId = null;
    });
  }

  dismissFocusCard(): void {
    const cardEl = this.focusCardRef?.nativeElement;
    if (cardEl) {
      this.motion.dismissCard(cardEl, () => this.focusCard.set(null));
    } else {
      this.focusCard.set(null);
    }
  }

  get constellations(): ConstellationLayer[] {
    return this.adapter.getSkyConstellations();
  }

  get isHistoryMode(): boolean {
    return this.scene.isInHistory();
  }
}
