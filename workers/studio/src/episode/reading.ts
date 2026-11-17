/// The selected text of an episode: a Qurʾān passage ("40/4-5", from QR over the service binding) or a Worldview
/// unit cut to the episode's passages (meta `read_passages`, from WV). Null when it cannot be read — the screens
/// then show the plan's own note of what to read.

import type { StudioEnv } from '../env';
import type { Reading } from './context';

const GREEK = /[\u0370-\u03FF\u1F00-\u1FFF]/;

export async function loadReading(env: StudioEnv, meta: Record<string, unknown>): Promise<Reading | null> {
  const unit = typeof meta['read_unit'] === 'string' ? meta['read_unit'] : null;
  if (!unit) return null;
  const qr = unit.match(/^(\d+)\/(\d+)(?:-(\d+))?$/);
  if (qr) {
    const surah = Number(qr[1]), from = Number(qr[2]), to = Number(qr[3] ?? qr[2]);
    const res = await env.QR.fetch(`https://km-quran/qr/ayah-range/${surah}/${from}/${to}`).catch(() => null);
    type Range = { surahEn?: string | null; ayat?: Array<{ ayah: number; ar: string | null; en: string | null }> };
    const body = res && res.ok ? await res.json<{ data?: Range }>().catch(() => null) : null;
    const ayat = body?.data?.ayat ?? [];
    if (!ayat.length) return null;
    return { kind: 'qr', surah, surah_name: body?.data?.surahEn ?? null, from, to, translation: null,
      ayahs: ayat.map((a) => ({ ayah: a.ayah, text: a.ar ?? '', en: a.en ?? null })) };
  }
  if (!env.WV) return null;
  const res = await env.WV.fetch(`https://km-worldview/wv/corpus/units/${encodeURIComponent(unit)}?lean=1`).catch(() => null);
  type Passage = { id: string; kind?: string; cite?: string | null; lines?: Array<{ t?: string }> | null; en?: string | null };
  const body = res && res.ok
    ? await res.json<{ data?: { title?: string; work?: string; passages?: Passage[] } }>().catch(() => null) : null;
  const u = body?.data;
  if (!u?.passages) return null;
  const only = Array.isArray(meta['read_passages'])
    ? new Set((meta['read_passages'] as unknown[]).filter((x): x is string => typeof x === 'string')) : null;
  const passages = u.passages
    .filter((p) => (p.kind ?? 'passage') === 'passage' && (!only || only.has(p.id)))
    .map((p) => ({ id: p.id, cite: p.cite ?? null, en: p.en ?? null, text: (p.lines ?? []).map((l) => l.t ?? '').filter(Boolean).join('\n') }))
    // a Greek passage (the Greek Arc's Plato and Aristotle) is read in its English (owner 2026-11-17: "I need all English")
    .map((p) => (GREEK.test(p.text) && p.en ? { ...p, text: p.en, en: null } : p))
    .filter((p) => p.text);
  if (!passages.length) return null;
  return { kind: 'wv', title: [u.work, u.title].filter(Boolean).join(' — ') || null, passages };
}
