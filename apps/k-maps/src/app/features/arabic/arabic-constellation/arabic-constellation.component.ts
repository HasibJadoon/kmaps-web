import {
  Component, OnInit, OnDestroy, inject, signal, ElementRef, ViewChild,
  ChangeDetectionStrategy, NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import * as THREE from 'three';
import { environment } from '../../../../environments/environment';

interface Item {
  id: string; text_ar: string; lemma_ar: string | null; root_ar: string | null;
  al_root_ref: string | null; gloss_en: string | null; seenInPhotos: number | null;
}
interface Envelope<T> { ok: boolean; data?: T; }

interface Node { root: string; words: string[]; gloss: string | null; seen: number }

/// Every word you have actually met, arranged by the root under it. A list
/// sorted by root shows the same facts and hides the one that matters: a
/// handful of roots carry most of what you have read, and the rest are singles.
/// Size is that count, so the shape of your vocabulary is the first thing seen.
///
/// Drawn as one Points object rather than a mesh per root — 500 draw calls for
/// 500 dots is how this gets slow.
@Component({
  selector: 'km-arabic-constellation',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './arabic-constellation.component.html',
  styleUrl: './arabic-constellation.component.scss',
})
export class ArabicConstellationComponent implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private router = inject(Router);
  private http = inject(HttpClient);
  private zone = inject(NgZone);
  private base = environment.apiBase;

  readonly loading = signal(true);
  readonly nodes = signal<Node[]>([]);
  readonly active = signal<Node | null>(null);

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private points?: THREE.Points;
  private frame = 0;
  private spin = true;
  private ro?: ResizeObserver;

  ngOnInit(): void {
    this.http.get<Envelope<{ items: Item[] }>>(`${this.base}/ar/acq/items?resolved=1&limit=500`)
      .subscribe({
        next: (r) => {
          this.nodes.set(this.fold(r?.data?.items ?? []));
          this.loading.set(false);
          this.zone.runOutsideAngular(() => this.build());
        },
        error: () => this.loading.set(false),
      });
  }

  /// One node per root, carrying the words that reached it.
  private fold(items: Item[]): Node[] {
    const by = new Map<string, Node>();
    for (const it of items) {
      const root = (it.root_ar ?? '').replace(/\s+/g, '');
      if (!root) continue;
      const n = by.get(root) ?? { root, words: [], gloss: null, seen: 0 };
      if (it.text_ar && !n.words.includes(it.text_ar)) n.words.push(it.text_ar);
      n.gloss ??= it.gloss_en;
      n.seen += it.seenInPhotos ?? 1;
      by.set(root, n);
    }
    return [...by.values()].sort((a, b) => b.words.length - a.words.length);
  }

  private build(): void {
    const canvas = this.canvasRef.nativeElement;
    const host = canvas.parentElement!;
    let nodes = this.nodes();
    if (!nodes.length) return;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
    this.camera.position.set(0, 0, 46);

    /// A Fibonacci sphere: even spacing without clumping at the poles, which is
    /// what random placement on a sphere actually gives you.
    /// Nodes arrive sorted by size, and a Fibonacci sphere walks pole to pole —
    /// so placing them in order stacks every big root at the top. Deal them
    /// round-robin instead, which spreads the weight without randomness.
    const dealt: Node[] = [];
    for (let k = 0; k < 5; k++) for (let i = k; i < nodes.length; i += 5) dealt.push(nodes[i]);
    nodes = dealt;

    const N = nodes.length;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const siz = new Float32Array(N);
    const gold = new THREE.Color(0xc9a84c);
    const dim = new THREE.Color(0x6d6a5e);
    const golden = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < N; i++) {
      const y = 1 - (i / Math.max(1, N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = golden * i;
      const R = 11 + (nodes[i].words.length > 1 ? 0 : 2.5);
      pos[i * 3] = Math.cos(th) * r * R;
      pos[i * 3 + 1] = y * R;
      pos[i * 3 + 2] = Math.sin(th) * r * R;

      const w = Math.min(1, (nodes[i].words.length - 1) / 4);
      const c = dim.clone().lerp(gold, w);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      siz[i] = 6 + nodes[i].words.length * 3.4;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(siz, 1));

    /// A round sprite drawn in the shader — no texture to load, and the size
    /// attenuates with distance so depth reads without lighting.
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float size; varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (60.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          gl_FragColor = vec4(vColor, smoothstep(0.5, 0.12, d));
        }`,
      vertexColors: true,
    });

    this.points = new THREE.Points(geo, mat);
    this.scene.add(this.points);

    const ray = new THREE.Raycaster();
    ray.params.Points = { threshold: 1.1 };
    const mouse = new THREE.Vector2(2, 2);

    canvas.addEventListener('pointermove', (e) => {
      const b = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - b.left) / b.width) * 2 - 1;
      mouse.y = -((e.clientY - b.top) / b.height) * 2 + 1;
    });
    canvas.addEventListener('pointerleave', () => { mouse.set(2, 2); });
    canvas.addEventListener('pointerdown', () => { this.spin = !this.spin; });

    const size = () => {
      const w = host.clientWidth, h = host.clientHeight;
      this.renderer!.setSize(w, h, false);
      this.camera!.aspect = w / Math.max(1, h);
      this.camera!.updateProjectionMatrix();
    };
    size();
    this.ro = new ResizeObserver(size);
    this.ro.observe(host);

    let hit = -1;
    const tick = () => {
      this.frame = requestAnimationFrame(tick);
      if (this.spin) this.points!.rotation.y += 0.0016;
      this.points!.rotation.x = Math.sin(performance.now() * 0.00012) * 0.16;

      ray.setFromCamera(mouse, this.camera!);
      const hits = ray.intersectObject(this.points!);
      const idx = hits.length ? (hits[0].index ?? -1) : -1;
      if (idx !== hit) {
        hit = idx;
        /// Only the hover crosses back into Angular, and only when it changes.
        this.zone.run(() => this.active.set(idx >= 0 ? nodes[idx] : null));
      }
      this.renderer!.render(this.scene!, this.camera!);
    };
    tick();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
    this.ro?.disconnect();
    this.points?.geometry.dispose();
    (this.points?.material as THREE.Material | undefined)?.dispose();
    this.renderer?.dispose();
  }

  back(): void { this.router.navigate(['/arabic/read']); }
}
