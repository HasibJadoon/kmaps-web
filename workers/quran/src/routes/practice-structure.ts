import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import type { Label } from '../lib/labels';
import { withCard, shuffle, uniq, parseJson, rangeOf, type Drill, type Scope } from './practice-kit';

// ── A passage's structure (QR skill 'structure'; the class's step 5) ─────────────────────────────
// Drawn from the naẓm sections the passage studies hold (qr_passage_section): how a passage stands
// to another (nazm_relation), its partner in the sūra's ring (nazm_ring), the movement it belongs to
// and that movement's shape (nazm_arc). Every relation, shape and ring side is a registry term
// (AL 0122: GT:nazm_relation:*, GT:nazm_arc:*, GT:ring_side:*), offered by its Arabic name; a
// passage is offered by its range and title. Never who said it (Rule 0): the sections' own notes
// rise only after the answer.
//
// Each is asked as its kind (qr_068 kind rows st_*, which word the instruction):
//   relation   which relation joins this passage to the other           (choose, GT names)
//   ring       which passage it answers across the sūra; or, unpaired / at the centre, where it stands
//   arc        which movement of the sūra it belongs to                  (choose, movement titles)
//   arc_shape  the shape of that movement                                (choose, GT names)
//   arc_order  the movement's passages, in order                         (order_units)
//   place      the passage among its neighbours                          (order_units)

type Passage = { id: string; surah: number; passage_no: number; ayah_from: number; ayah_to: number; title_en: string | null; title_ar: string | null };
type Section = { passage_id: string; renderer: string; data_json: string };
type Term = { id: string; category_key: string; term_key: string; name_ar: string };

const RENDERERS = ['nazm_relation', 'nazm_ring', 'nazm_arc'];

const named = (p: Passage) => `${rangeOf(p.surah, p.ayah_from, p.ayah_to)} · ${p.title_en ?? p.title_ar ?? ''}`.trim();
/** A passage as an option: its āyāt and its Arabic title — never a transliterated one. */
const shortName = (p: Passage) => `${rangeOf(p.surah, p.ayah_from, p.ayah_to)}${p.title_ar ? ` · ${p.title_ar}` : ''}`;
/** Whether an evidence side ("40:3 غافر الذنب …") cites an āyah of the passage. */
const inPassage = (side: string, p: Passage) => {
  const m = side.match(/(\d+):(\d+)/);
  return !!m && Number(m[1]) === p.surah && Number(m[2]) >= p.ayah_from && Number(m[2]) <= p.ayah_to;
};

/// Up to `k` others besides `answer`, drawn from `pool`.
function choices(answer: string, pool: string[], k = 3): string[] {
  return shuffle([answer, ...shuffle(uniq(pool.filter((x) => x && x !== answer))).slice(0, k)]);
}

export async function structureDrills(env: QuranEnv, n: number, scope: Scope, _lv: Record<string, unknown>,
                                      _L: Record<string, Label[]>): Promise<Drill[]> {
  // a sūra's whole structure is the ground every question stands on: without one, pick one that has it
  const surah = scope.surah ?? (await query<{ surah: number }>(env.DB_QR,
    `SELECT surah FROM qr_passage_section WHERE renderer = 'nazm_ring' GROUP BY surah ORDER BY RANDOM() LIMIT 1`))[0]?.surah;
  if (!surah) return [];
  const [passages, sections, terms] = await Promise.all([
    query<Passage>(env.DB_QR,
      `SELECT id, surah, passage_no, ayah_from, ayah_to, title_en, title_ar FROM qr_surah_study_passage
        WHERE surah = ? AND status = 'live' ORDER BY passage_no`, [surah]),
    query<Section>(env.DB_QR,
      `SELECT passage_id, renderer, data_json FROM qr_passage_section
        WHERE surah = ? AND renderer IN (${RENDERERS.map(() => '?').join(',')}) AND COALESCE(status, 'live') <> 'draft'
        ORDER BY passage_id, sort_order`, [surah, ...RENDERERS]),
    query<Term>(env.DB_QR,
      `SELECT id, category_key, term_key, name_ar FROM ar_ling_gram_term
        WHERE category_key IN ('nazm_relation', 'nazm_arc', 'ring_side') AND status = 'live' ORDER BY category_key, term_order`),
  ]);
  if (!passages.length) return [];
  const byId = new Map(passages.map((p) => [p.id, p]));
  const term = (cat: string, key: unknown) => terms.find((t) => t.category_key === cat && t.term_key === String(key ?? ''));
  const termNames = (cat: string) => terms.filter((t) => t.category_key === cat).map((t) => t.name_ar);
  const inScope = passages.filter((p) => !scope.from || !scope.to || (p.ayah_from <= scope.to && p.ayah_to >= scope.from));

  // every movement of the sūra: its passages in order, its title, its shape
  type Arc = { key: string; label: string; labelAr: string | null; type: string | null; members: Passage[] };
  const arcs = new Map<string, Arc>();
  for (const s of sections.filter((x) => x.renderer === 'nazm_arc')) {
    const a = parseJson<{ arc?: { no?: number; key?: string; label_en?: string; label_ar?: string; type?: string } }>(s.data_json, {}).arc;
    const p = byId.get(s.passage_id);
    if (!a?.key || !p) continue;
    const arc = arcs.get(a.key) ?? { key: a.key, label: a.label_en ?? a.key, labelAr: a.label_ar ?? null, type: a.type ?? null, members: [] };
    if (!arc.members.some((m) => m.id === p.id)) arc.members.push(p);
    arcs.set(a.key, arc);
  }
  for (const a of arcs.values()) a.members.sort((x, y) => x.passage_no - y.passage_no);
  const arcTitles = [...arcs.values()].map((a) => a.label);

  const out: Drill[] = [];
  const card = (base: Drill, p: Passage, ask: string, ref: string, front: string, back: string) =>
    out.push(withCard({ ...base, ask }, { ref: `QR:structure:${ref}`, type: 'passage', kind: 'structure', front, back,
                                          surah: p.surah, ayah: p.ayah_from, series: 'structure' }));
  const head = (p: Passage) => ({ kind: 'structure', interaction: 'choose', script: 'quran',
                                  source: { workId: `QR:SURAH:${p.surah}`, title: named(p), level: null } });

  for (const p of inScope) {
    const mine = sections.filter((s) => s.passage_id === p.id);

    // how it stands to another passage
    for (const s of mine.filter((x) => x.renderer === 'nazm_relation')) {
      const r = parseJson<{ relation?: { no?: number; type?: string; partner?: string; evidence_ar?: string; note?: string } }>(s.data_json, {}).relation;
      const t = term('nazm_relation', r?.type);
      const other = r?.partner ? byId.get(r.partner) : undefined;
      if (!t || !other) continue;
      card({ ...head(p), id: `structure:relation:${p.id}:${other.id}`, term: t.id,
             prompt: r?.evidence_ar ?? null, promptEn: `${named(p)}  ⟷  ${named(other)}`,
             options: choices(t.name_ar, termNames('nazm_relation')), answer: t.name_ar,
             explanation: r?.note ?? null },
           p, 'st_relation', `relation:${p.id}:${other.id}`, `${named(p)} ⟷ ${named(other)}`, t.name_ar);
    }

    // its partner in the sūra's ring, or where it stands in it
    for (const s of mine.filter((x) => x.renderer === 'nazm_ring')) {
      const d = parseJson<{ ring?: { pair?: string; side?: string; partner?: string }; evidence?: string }>(s.data_json, {});
      const side = term('ring_side', d.ring?.side);
      if (!side) continue;
      const partner = d.ring?.partner ? byId.get(d.ring.partner) : undefined;
      if (partner) {
        // the prompt holds only this passage's side of the pairing; the other side is the answer, shown after
        const sides = String(d.evidence ?? '').split('↔').map((x) => x.trim()).filter(Boolean);
        const mine = sides.find((x) => inPassage(x, p)) ?? null;
        const answer = shortName(partner);
        card({ ...head(p), id: `structure:ring:${p.id}`, term: side.id, prompt: mine, promptEn: 'Which passage answers this one, across the chapter?',
               options: choices(answer, passages.filter((x) => x.id !== p.id).map(shortName)), answer, script: 'arabic',
               explanation: d.evidence ? `The two ends of the ring:\n${sides.join('\n')}` : null },
             p, 'st_ring', `ring:${p.id}`, named(p), answer);
      } else {
        card({ ...head(p), id: `structure:ring_side:${p.id}`, term: side.id, prompt: d.evidence ?? null, promptEn: named(p),
               options: choices(side.name_ar, termNames('ring_side')), answer: side.name_ar },
             p, 'st_ring_side', `ring_side:${p.id}`, named(p), side.name_ar);
      }
    }

    // the movements it belongs to: which, their shape, their order
    for (const a of [...arcs.values()].filter((x) => x.members.some((m) => m.id === p.id))) {
      if (arcTitles.length >= 2) {
        card({ ...head(p), id: `structure:arc:${p.id}:${a.key}`, prompt: a.labelAr, promptEn: named(p),
               options: choices(a.label, arcTitles), answer: a.label, script: 'english',
               ...(a.type ? { term: `GT:nazm_arc:${a.type}` } : {}) },
             p, 'st_arc', `arc:${p.id}:${a.key}`, named(p), a.label);
      }
      const shape = term('nazm_arc', a.type);
      if (shape) {
        card({ ...head(p), id: `structure:arc_shape:${a.key}`, term: shape.id, prompt: a.labelAr, promptEn: a.label,
               options: choices(shape.name_ar, termNames('nazm_arc')), answer: shape.name_ar },
             p, 'st_arc_shape', `arc_shape:${surah}:${a.key}`, a.label, shape.name_ar);
      }
      if (a.members.length >= 3) {
        card({ ...head(p), id: `structure:arc_order:${a.key}`, interaction: 'order_units', prompt: a.label, script: 'english',
               units: a.members.map(named), ...(shape ? { term: shape.id } : {}) },
             p, 'st_arc_order', `arc_order:${surah}:${a.key}`, a.label, a.members.map(named).join(' → '));
      }
    }

    // where it stands among its neighbours
    const i = passages.findIndex((x) => x.id === p.id);
    const near = passages.slice(Math.max(0, i - 1), i + 2);
    if (near.length >= 3) {
      card({ ...head(p), id: `structure:place:${p.id}`, interaction: 'order_units', prompt: named(p), script: 'english',
             units: near.map(named) },
           p, 'st_place', `place:${p.id}`, named(p), near.map(named).join(' → '));
    }
  }

  // one drill per id (an arc's shape and order are met from each of its passages in scope)
  const seen = new Set<string>();
  return shuffle(out.filter((d) => !seen.has(String(d.id)) && !!seen.add(String(d.id)))).slice(0, n);
}

/// How many structure sections there are to drill (the practice home's count).
export async function structureCount(env: QuranEnv): Promise<number> {
  const r = await query<{ n: number }>(env.DB_QR,
    `SELECT COUNT(*) AS n FROM qr_passage_section WHERE renderer IN (${RENDERERS.map(() => '?').join(',')})`, RENDERERS);
  return r[0]?.n ?? 0;
}
