import {
  ChangeDetectionStrategy, Component, computed, ElementRef,
  EventEmitter, Input, Output, signal, ViewChild, ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { hierarchy, tree as d3Tree, HierarchyPointNode } from 'd3-hierarchy';
import type {
  SsStepData, SsSentenceVm, SsClauseNodeVm, SsClauseWordVm, SsConstituencyNodeVm,
  SsScopeLayersVm, SsReadingVm, SsFoldStepVm, SsTermVm,
} from '../../../../../../../shared/services/quran/quran-surah.service';

import { PressableDirective } from '../../../../../../../shared/directives/pressable.directive';
type LayoutKind = 'sentence' | 'clause' | 'word';

interface LayoutNode {
  kind:      LayoutKind;
  id:        string;
  title:     string;
  subtitle?: string;
  chip?:     string;
  color:     string;
  clause?:   SsClauseNodeVm;
  word?:     SsClauseWordVm;
  children:  LayoutNode[];
}

interface PlacedNode { node: LayoutNode; x: number; y: number; }
interface PlacedEdge { x1: number; y1: number; x2: number; y2: number; }

const NODE_W = 188;
const NODE_H = 96;
const H_GAP  = 30;
const V_GAP  = 86;
const GOLD    = '#c9a84c';
const NEUTRAL = '#6b7280';

@Component({
  selector:        'km-sentence-structure-miro',
  standalone:      true,
  imports:         [PressableDirective, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation:   ViewEncapsulation.None,
  templateUrl:     './sentence-structure-miro.component.html',
  styleUrl:        './sentence-structure-miro.component.scss',
})
export class SentenceStructureMiroComponent {

  @Input({ required: true }) set data(value: SsStepData | null) {
    this._data.set(value);
    this.activeIdx.set(0);
    this.selected.set(null);
    queueMicrotask(() => this.fitToScreen());
  }

  @Output() openLexicon = new EventEmitter<{ root: string; word: string }>();

  @ViewChild('viewport') viewport?: ElementRef<HTMLDivElement>;

  private readonly _data = signal<SsStepData | null>(null);
  readonly activeIdx = signal(0);
  readonly selected  = signal<LayoutNode | null>(null);

  readonly zoom = signal(1);
  readonly panX = signal(0);
  readonly panY = signal(0);

  readonly sentences = computed<SsSentenceVm[]>(() => this._data()?.sentences ?? []);
  readonly terms     = computed(() => this._data()?.terms ?? []);
  readonly current   = computed<SsSentenceVm | null>(() => this.sentences()[this.activeIdx()] ?? null);

  private readonly termColors = computed<Record<string, string>>(() => this._data()?.termColors ?? {});

  private readonly layers = computed<Record<string, SsScopeLayersVm>>(
    () => this._data()?.layersByScope ?? {});

  readonly termIndex = computed<Record<string, SsTermVm>>(() => {
    const out: Record<string, SsTermVm> = {};
    for (const t of this.terms()) {
      if (t.key) out[t.key] = t;
      const ref = (t as unknown as { ref?: string }).ref;
      if (ref) out[ref] = t;
    }
    return out;
  });

  layersFor(scopeId: string | null | undefined): SsScopeLayersVm | null {
    if (!scopeId) return null;
    const l = this.layers()[scopeId];
    if (!l) return null;
    const empty = !l.irab?.length && !l.nahw?.length && !l.balagha?.length;
    return empty ? null : l;
  }

  termLabel(ref: string | null | undefined): string {
    if (!ref) return '';
    return this.termIndex()[ref]?.labelAr ?? ref;
  }

  readonly readingGroups = computed<{ question: string; rows: SsReadingVm[] }[]>(() => {
    const s = this.current();
    const rows = (this._data()?.readings ?? []).filter(
      (r) => !s || r.scopeId === s.id || r.scopeType === 'word');
    const by = new Map<string, SsReadingVm[]>();
    for (const r of rows) {
      const q = r.question ?? '—';
      by.set(q, [...(by.get(q) ?? []), r]);
    }
    return [...by.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([question, rows]) => ({ question, rows }));
  });

  questionAr(key: string): string {
    return ({
      irab: 'الإعراب', synthesis: 'الخلاصة', balagha: 'البلاغة', sarf: 'الصرف',
      qiraah: 'القراءة', tafsir: 'التفسير', dalala: 'الدلالة', tarjama: 'الترجمة',
    } as Record<string, string>)[key] ?? key;
  }

  weight(r: SsReadingVm): string {
    const n = r.witnesses ?? r.sources?.length ?? 0;
    return r.isMinority ? `${n} · minority` : `${n}`;
  }

  readonly foldSteps = computed<SsFoldStepVm[]>(() => {
    const s = this.current();
    return (this._data()?.fold ?? []).filter((f) => !s || !f.scopeId || f.scopeId === s.id);
  });

  diverges(f: SsFoldStepVm): boolean {
    return !!f.structural && !!f.fluentEn && f.structural !== f.fluentEn;
  }

  readonly finding = computed<string | null>(
    () => this.foldSteps().find((f) => !!f.synthesis)?.synthesis ?? null);

  readonly openReadings = signal<Set<string>>(new Set());
  toggleReading(id: string): void {
    const next = new Set(this.openReadings());
    next.has(id) ? next.delete(id) : next.add(id);
    this.openReadings.set(next);
  }

  private readonly layoutRoot = computed<HierarchyPointNode<LayoutNode> | null>(() => {
    const s = this.current();
    if (!s) return null;
    const root = this.buildLayout(s);
    const h = hierarchy<LayoutNode>(root, (n) => n.children);
    d3Tree<LayoutNode>().nodeSize([NODE_W + H_GAP, NODE_H + V_GAP])(h);
    return h as HierarchyPointNode<LayoutNode>;
  });

  readonly placedNodes = computed<PlacedNode[]>(() => {
    const root = this.layoutRoot();
    if (!root) return [];
    const minX = Math.min(...root.descendants().map((d) => d.x));
    return root.descendants().map((d) => ({ node: d.data, x: d.x - minX, y: d.depth * (NODE_H + V_GAP) }));
  });

  readonly placedEdges = computed<PlacedEdge[]>(() => {
    const root = this.layoutRoot();
    if (!root) return [];
    const minX = Math.min(...root.descendants().map((d) => d.x));
    return root.links().map((l) => ({
      x1: l.source.x - minX + NODE_W / 2, y1: l.source.depth * (NODE_H + V_GAP) + NODE_H,
      x2: l.target.x - minX + NODE_W / 2, y2: l.target.depth * (NODE_H + V_GAP),
    }));
  });

  readonly canvasW = computed(() => Math.max(...this.placedNodes().map((p) => p.x + NODE_W), 600) + 80);
  readonly canvasH = computed(() => Math.max(...this.placedNodes().map((p) => p.y + NODE_H), 400) + 80);

  private buildLayout(s: SsSentenceVm): LayoutNode {

    if (s.tree) {
      return this.constituencyLayout(s.tree, true);
    }
    return {
      kind: 'sentence', id: s.id,
      title: this.kindLabel(s.kind),
      subtitle: `${s.ayah}${s.ayahTo !== s.ayah ? '–' + s.ayahTo : ''}`,
      chip: s.mode ?? undefined,
      color: GOLD,
      children: (s.clauseTree ?? []).map((c) => this.clauseLayout(c)),
    };
  }

  private constituencyLayout(n: SsConstituencyNodeVm, isRoot = false): LayoutNode {
    const hasChildren = !!(n.children && n.children.length);
    return {
      kind: isRoot ? 'sentence' : (hasChildren ? 'clause' : 'word'),
      id: n.id,
      title: n.name,
      subtitle: n.label_ar ?? undefined,
      color: (n.term_id && this.termColors()[n.term_id]) || GOLD,
      children: (n.children ?? []).map((k) => this.constituencyLayout(k)),
    };
  }

  private clauseLayout(c: SsClauseNodeVm): LayoutNode {
    const node: LayoutNode = {
      kind: 'clause', id: c.id,
      title: this.clauseLabel(c),
      subtitle: c.type ?? undefined,
      chip: c.particle ?? undefined,
      color: GOLD,
      clause: c,
      children: [],
    };

    node.children = [
      ...(c.children ?? []).map((k) => this.clauseLayout(k)),
      ...(c.words ?? []).map((w) => this.wordLayout(w)),
    ];
    return node;
  }

  private wordLayout(w: SsClauseWordVm): LayoutNode {
    return {
      kind: 'word', id: w.wordId,
      title: w.text,
      subtitle: w.role ?? undefined,
      color: (w.role && this.termColors()[w.role]) || NEUTRAL,
      word: w,
      children: [],
    };
  }

  kindLabel(kind: string | null): string {
    switch (kind) {
      case 'nominal':  return 'جملة اسمية';
      case 'verbal':   return 'جملة فعلية';
      default:         return kind ? `جملة (${kind})` : 'جملة';
    }
  }
  private clauseLabel(c: SsClauseNodeVm): string {
    return c.particle || c.function || c.type || 'جملة';
  }
  termColor(role: string | null | undefined): string {
    return (role && this.termColors()[role]) || NEUTRAL;
  }

  selectSentence(i: number): void {
    if (i < 0 || i >= this.sentences().length) return;
    this.activeIdx.set(i);
    this.selected.set(null);
    queueMicrotask(() => this.fitToScreen());
  }
  pick(node: LayoutNode): void {
    this.selected.set(this.selected()?.id === node.id ? null : node);
  }
  closeInspector(): void { this.selected.set(null); }

  emitLexicon(w: SsClauseWordVm): void {
    if (w.root) this.openLexicon.emit({ root: w.root, word: w.text });
  }

  private dragging = false;
  private startX = 0; private startY = 0; private baseX = 0; private baseY = 0;

  onPointerDown(e: PointerEvent): void {
    if ((e.target as HTMLElement).closest('.ssm-node')) return;
    this.dragging = true;
    this.startX = e.clientX; this.startY = e.clientY;
    this.baseX = this.panX(); this.baseY = this.panY();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  onPointerMove(e: PointerEvent): void {
    if (!this.dragging) return;
    this.panX.set(this.baseX + (e.clientX - this.startX));
    this.panY.set(this.baseY + (e.clientY - this.startY));
  }
  onPointerUp(): void { this.dragging = false; }

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.zoom.set(Math.min(2.2, Math.max(0.3, this.zoom() * factor)));
  }
  zoomIn():  void { this.zoom.set(Math.min(2.2, this.zoom() * 1.15)); }
  zoomOut(): void { this.zoom.set(Math.max(0.3, this.zoom() / 1.15)); }

  fitToScreen(): void {
    const vp = this.viewport?.nativeElement;
    if (!vp) return;
    const w = this.canvasW(), h = this.canvasH();
    const z = Math.min(vp.clientWidth / w, vp.clientHeight / h, 1) * 0.96;
    this.zoom.set(Math.max(0.3, z));
    this.panX.set((vp.clientWidth - w * z) / 2);
    this.panY.set(24);
  }
}
