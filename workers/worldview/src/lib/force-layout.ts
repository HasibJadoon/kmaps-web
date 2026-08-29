// ─── A small, deterministic force layout ──────────────────────────────────────
//
// Enough of d3-force to place a few hundred nodes sensibly: repulsion between
// every pair, springs along the edges, a weak pull to the centre, and a
// collision pass so labels have room. Barnes–Hut is not worth it at this size —
// the largest island here is 136 nodes, so the O(n²) charge pass is ~9k pair
// calculations per tick and the whole run finishes in milliseconds.
//
// Deterministic on purpose. Initial positions come from a hash of the node id,
// never from Math.random, so recomputing an unchanged graph reproduces the same
// picture. A layout that reshuffles on every regeneration cannot be annotated,
// cited, or recognised on the second look.

export interface LayoutNode { id: string; degree: number }
export interface LayoutEdge { source: string; target: string }
export interface Placed { id: string; x: number; y: number }

/** FNV-1a, used to turn a node id into a stable starting angle and radius. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Radius grows with degree, so a hub reads as a hub and gets more elbow room. */
function radiusOf(degree: number): number {
  return Math.min(20, 9 + Math.sqrt(Math.max(degree, 1)) * 2.2);
}

export function forceLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  opts: { iterations?: number; width?: number; linkDistance?: number } = {},
): Placed[] {
  const n = nodes.length;
  if (n === 0) return [];

  const iterations = opts.iterations ?? 320;
  const width = opts.width ?? 1400;
  const linkDistance = opts.linkDistance ?? 90;

  const index = new Map<string, number>();
  nodes.forEach((node, i) => index.set(node.id, i));

  // Seeded start: every node on a spiral, its place fixed by its own id.
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const vx = new Float64Array(n);
  const vy = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const h = hash(nodes[i].id);
    const angle = ((h % 3600) / 3600) * Math.PI * 2;
    const radius = 40 + (((h >>> 12) % 1000) / 1000) * width * 0.35;
    x[i] = Math.cos(angle) * radius;
    y[i] = Math.sin(angle) * radius * 0.82;   // squashed: pages are wider than tall
  }

  const links = edges
    .map(e => ({ s: index.get(e.source), t: index.get(e.target) }))
    .filter((l): l is { s: number; t: number } => l.s !== undefined && l.t !== undefined);

  for (let step = 0; step < iterations; step++) {
    // Cooling: big moves early, small corrections late.
    const alpha = 1 - step / iterations;

    // Repulsion. Every pair once — the inner loop starts at i+1 and applies the
    // force to both, which halves the work.
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = x[j] - x[i];
        let dy = y[j] - y[i];
        let d2 = dx * dx + dy * dy;
        if (d2 === 0) {
          // Two nodes exactly on top of each other have no direction to push
          // apart in. Nudge them by something derived from their indices, so
          // even this stays deterministic.
          dx = ((i % 7) - 3) * 0.01;
          dy = ((j % 7) - 3) * 0.01;
          d2 = dx * dx + dy * dy || 1e-6;
        }
        // Floor the squared distance. Without it a dense graph collapses two
        // nodes onto nearly the same point, d2 approaches zero, the repulsion
        // term explodes to Infinity, and one NaN coordinate poisons the whole
        // run — which is exactly how the 199-edge Arjana graph produced a 500
        // while the sparser 136-node al-Rūm one laid out fine.
        const strength = (360 + (nodes[i].degree + nodes[j].degree) * 14) / Math.max(d2, 4);
        const fx = dx * strength;
        const fy = dy * strength;
        vx[i] -= fx; vy[i] -= fy;
        vx[j] += fx; vy[j] += fy;
      }
    }

    // Springs along the edges.
    for (const { s, t } of links) {
      const dx = x[t] - x[s];
      const dy = y[t] - y[s];
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = ((d - linkDistance) / d) * 0.35;
      const fx = dx * f;
      const fy = dy * f;
      vx[s] += fx; vy[s] += fy;
      vx[t] -= fx; vy[t] -= fy;
    }

    // A weak pull home, so disconnected nodes do not drift off the page. This
    // matters more here than in most graphs: 82 of al-Rūm's 136 nodes have no
    // edge at all, and without it they would be flung to the margins.
    for (let i = 0; i < n; i++) {
      vx[i] -= x[i] * 0.012;
      vy[i] -= y[i] * 0.012;
    }

    // Integrate, with heavy damping and a speed limit. The clamp is the second
    // half of the same guard: it keeps one bad tick from throwing a node so far
    // that nothing recovers.
    const maxStep = 60;
    for (let i = 0; i < n; i++) {
      vx[i] *= 0.82; vy[i] *= 0.82;
      const speed = Math.hypot(vx[i], vy[i]);
      if (speed > maxStep) { vx[i] = (vx[i] / speed) * maxStep; vy[i] = (vy[i] / speed) * maxStep; }
      x[i] += vx[i] * alpha;
      y[i] += vy[i] * alpha;
    }

    // Collision, in the last third only: resolving overlaps early fights the
    // springs and the graph never settles.
    if (step > iterations * 0.66) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = x[j] - x[i];
          const dy = y[j] - y[i];
          const min = radiusOf(nodes[i].degree) + radiusOf(nodes[j].degree) + 22;
          const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          if (d < min) {
            const push = ((min - d) / d) * 0.5;
            x[i] -= dx * push; y[i] -= dy * push;
            x[j] += dx * push; y[j] += dy * push;
          }
        }
      }
    }
  }

  // Normalise to a stable frame, so a client needs no knowledge of the solver's
  // scale: the origin is the centre and the longest side spans `width`.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    if (x[i] < minX) minX = x[i];
    if (x[i] > maxX) maxX = x[i];
    if (y[i] < minY) minY = y[i];
    if (y[i] > maxY) maxY = y[i];
  }
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = width / Math.max(spanX, spanY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return nodes.map((node, i) => {
    const px = (x[i] - cx) * scale;
    const py = (y[i] - cy) * scale;
    // Last line of defence. A non-finite coordinate here would be written to
    // the database and break every later read, so it falls back to the node's
    // seeded position — which is deterministic and, at worst, unhelpful.
    const safe = (v: number, fallback: number) =>
      Number.isFinite(v) ? Math.round(v * 100) / 100 : fallback;
    const h = hash(node.id);
    return {
      id: node.id,
      x: safe(px, Math.cos((h % 3600) / 3600 * Math.PI * 2) * 200),
      y: safe(py, Math.sin((h % 3600) / 3600 * Math.PI * 2) * 200),
    };
  });
}
