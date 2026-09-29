import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import { callService } from '../../../shared/src/service-client';
import type { ArabicEnv } from '../env';
import { bare } from '../lib/levels';

// ── My words ─────────────────────────────────────────────────────────────────
// The words read off the reader's photographs and matched to the lexicon
// (ar_acq_item), made useful: each one heard in real speech — the lines of the
// series, podcasts and stories where it is actually said, found through the
// segment index (ar_acq_audio_fts) and timed to the word — the line of the photo
// it was read from, its root's meaning and pattern from the lexicon, and the
// other words of its root. The worker finds and shapes all of it; the app plays
// and shows.

interface Item {
  id: string; text_ar: string; vocalised_ar: string | null; lemma_ar: string | null; root_ar: string | null;
  al_lemma_ref: string | null; gloss_en: string | null; capture_id: string | null; meta_json: string;
  srs_state: string | null;
}
interface Meta { pos?: string; frequency_quran?: number; n_images?: number; freq_in_photos?: number; surface_norm?: string }

const meta = (i: Item): Meta => { try { return JSON.parse(i.meta_json || '{}'); } catch { return {}; } };

/// Arabic folded for matching: no vowels or punctuation, one alef, one yā, hā for tā marbūṭa.
export const fold = (t: string) => bare(t).replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

/// The shapes a word takes in running speech: itself, with a conjunction or
/// preposition before it, with or without the article.
function shapes(surface: string) {
  const b = fold(surface);
  const noAl = b.startsWith('ال') ? b.slice(2) : b;
  const set = new Set<string>([b, ...['و', 'ف', 'ب', 'ل', 'ك'].map((p) => p + b)]);
  for (const p of ['ال', 'وال', 'بال', 'فال', 'كال', 'لل']) set.add(p + noAl);
  if (b !== noAl) set.add(noAl);
  return set;
}

/// The FTS query for a word: every shape, as the index may hold it.
function ftsQuery(surface: string) {
  const raw = bare(surface);
  const words = new Set<string>([...shapes(surface), raw]);
  return [...words].filter((w) => w.length >= 2).map((w) => `"${w.replace(/"/g, '')}"`).join(' OR ');
}

interface SegHit { id: string; text_ar: string; start_sec: number; end_sec: number; meta_json: string; object_key: string;
                   title: string | null; level: string | null; work_id: string | null }

/// The lines where the word is spoken, with the word's own clip where the timing allows.
async function heard(env: ArabicEnv, surface: string, limit = 10) {
  const q = ftsQuery(surface);
  if (!q) return [];
  let rows: SegHit[] = [];
  try {
    rows = await query<SegHit>(env.DB_AR,
      `SELECT s.id, s.text_ar, s.start_sec, s.end_sec, s.meta_json, a.object_key,
              COALESCE(r.title_ar, r.title_en, a.title_ar) AS title, r.level, r.id AS work_id
         FROM ar_acq_audio_fts f
         JOIN ar_acq_audio_segment s ON s.rowid = f.rowid
         JOIN ar_acq_audio a ON a.id = s.audio_id AND a.status = 'live' AND a.object_key NOT LIKE 'youtube:%'
         LEFT JOIN ar_acquisition_ref r ON r.id = a.acq_ref_id
        WHERE ar_acq_audio_fts MATCH ?
        LIMIT 120`, [q]);
  } catch { return []; }
  const want = shapes(surface);
  const perWork = new Map<string, number>();
  const out = [];
  for (const r of rows) {
    const tokens = r.text_ar.trim().split(/\s+/);
    const i = tokens.findIndex((t) => want.has(fold(t)));
    if (i < 0 || tokens.length < 3 || tokens.length > 18) continue;
    const k = r.work_id ?? r.object_key;
    if ((perWork.get(k) ?? 0) >= 2) continue;
    let w: Array<[number, number]> = [];
    try { w = JSON.parse(r.meta_json || '{}').w ?? []; } catch { w = []; }
    const timed = w.length === tokens.length;
    const url = `/api/ar/audio/${encodeURI(r.object_key)}`;
    out.push({
      id: r.id, title: r.title, level: r.level, workId: r.work_id,
      line: { url, start: r.start_sec, end: r.end_sec },
      word: timed ? { url, start: Math.max(r.start_sec, w[i][0] - 0.04), end: Math.min(r.end_sec, w[i][1] + 0.06) } : null,
      index: i,
      words: tokens.map((t, j) => ({ t, s: timed ? w[j][0] : r.start_sec, e: timed ? w[j][1] : r.end_sec })),
    });
    perWork.set(k, (perWork.get(k) ?? 0) + 1);
    if (out.length >= limit) break;
  }
  // timed ones first: they can play the word on its own
  return out.sort((a, b) => Number(!!b.word) - Number(!!a.word));
}

const POS: Record<string, string> = { noun: 'noun (ism)', verb: 'verb (fiʿl)', particle: 'particle (ḥarf)', adjective: 'adjective (ṣifa)' };

function card(i: Item) {
  const m = meta(i);
  return {
    id: i.id, text: i.vocalised_ar ?? i.text_ar, lemma: i.lemma_ar, root: i.root_ar, pos: m.pos ?? null,
    posLabel: m.pos ? POS[m.pos] ?? m.pos : null, quran: m.frequency_quran ?? 0, photos: m.n_images ?? 1,
    gloss: i.gloss_en,
  };
}

async function items(env: ArabicEnv) {
  return query<Item>(env.DB_AR,
    `SELECT id, text_ar, vocalised_ar, lemma_ar, root_ar, al_lemma_ref, gloss_en, capture_id, meta_json, srs_state
       FROM ar_acq_item WHERE status = 'live' AND root_ar IS NOT NULL AND capture_id IS NOT NULL`);
}

export function wordRoutes(router: Router<ArabicEnv>) {
  // Every word, by root (most words first), with what is known of each.
  router.get('/ar/acq/words', async (_req, env) => {
    const all = await items(env);
    const roots = new Map<string, Item[]>();
    for (const i of all) roots.set(i.root_ar!, [...(roots.get(i.root_ar!) ?? []), i]);
    const grouped = [...roots.entries()]
      .map(([root, ws]) => ({ root, bare: root.replace(/\s+/g, ''), count: ws.length,
                              words: ws.map(card).sort((a, b) => b.photos - a.photos || b.quran - a.quran) }))
      .sort((a, b) => b.count - a.count || a.bare.localeCompare(b.bare, 'ar'));
    return ok({
      stats: { words: all.length, roots: roots.size,
               quran: all.filter((i) => (meta(i).frequency_quran ?? 0) > 0).length },
      roots: grouped,
    });
  });

  // One word, made useful: heard, seen, its root, its family.
  router.get('/ar/acq/words/:id', async (_req, env, { id }) => {
    const item = await queryOne<Item>(env.DB_AR,
      `SELECT id, text_ar, vocalised_ar, lemma_ar, root_ar, al_lemma_ref, gloss_en, capture_id, meta_json, srs_state
         FROM ar_acq_item WHERE id = ?`, [id]);
    if (!item) return notFound(`word ${id}`);
    const m = meta(item);
    const surface = m.surface_norm ?? item.text_ar;

    const [lines, capture, family, lexicon] = await Promise.all([
      heard(env, surface),
      item.capture_id ? queryOne<{ raw_text: string | null; media_ref: string | null }>(env.DB_AR,
        `SELECT raw_text, media_ref FROM ar_acq_capture WHERE id = ?`, [item.capture_id]) : Promise.resolve(null),
      item.root_ar ? query<Item>(env.DB_AR,
        `SELECT id, text_ar, vocalised_ar, lemma_ar, root_ar, al_lemma_ref, gloss_en, capture_id, meta_json, srs_state
           FROM ar_acq_item WHERE status = 'live' AND root_ar = ? AND id != ? AND capture_id IS NOT NULL`, [item.root_ar, id])
        : Promise.resolve([] as Item[]),
      item.al_lemma_ref
        ? callService<{ data: Record<string, { root?: { meaning_core_ar?: string | null; meaning_core_en?: string | null; root_text?: string | null } | null;
                                                  form?: { wazn?: string | null; name_en?: string | null; name_ar?: string | null } | null;
                                                  senses?: Array<{ gloss_en: string | null; gloss_ar: string | null }> }> }>(
            env.AR_LINGUISTICS, `/al/lemmas/resolve?ids=${encodeURIComponent(item.al_lemma_ref)}`).catch(() => null)
        : Promise.resolve(null),
    ]);

    // the line of the photo the word was read from
    const want = fold(surface);
    const photoLines = (capture?.raw_text ?? '').split(/\n+/).map((l) => l.trim())
      .filter((l) => l && fold(l).includes(want.startsWith('ال') ? want.slice(2) : want)).slice(0, 2);

    const lex = lexicon?.data?.[item.al_lemma_ref ?? ''];
    const senses = (lex?.senses ?? []).map((s) => s.gloss_en).filter(Boolean) as string[];
    return ok({
      word: { ...card(item), inReview: item.srs_state === 'active' },
      meaning: {
        gloss: item.gloss_en ?? senses[0] ?? null,
        senses: senses.slice(0, 4),
        rootCore: lex?.root?.meaning_core_en ?? null,
        rootCoreAr: lex?.root?.meaning_core_ar ?? null,
        pattern: lex?.form?.wazn ?? null,
        patternName: lex?.form?.name_en ?? null,
      },
      heard: lines,
      seen: { lines: photoLines, photos: m.n_images ?? 1 },
      family: family.map(card).sort((a, b) => b.photos - a.photos),
    });
  });
}

/// A "my words" drill: one of the reader's own words, as it was spoken in a
/// real line — which of four of their words was it? (practice.ts, skill 'mine')
export async function mineDrills(env: ArabicEnv, n: number) {
  const all = (await items(env)).filter((i) => (meta(i).pos ?? 'noun') !== 'particle');
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  const out: unknown[] = [];
  for (const i of shuffled) {
    if (out.length >= n) break;
    const surface = meta(i).surface_norm ?? i.text_ar;
    const lines = (await heard(env, surface, 3)).filter((l) => l.word);
    if (!lines.length) continue;
    const l = lines[Math.floor(Math.random() * lines.length)];
    // offered as the reader captured them (the dictionary form), not as spoken
    // with a clitic on — the clitic would give the answer away
    const answer = i.vocalised_ar ?? i.text_ar;
    const others = shuffled.filter((x) => x.id !== i.id && fold(x.text_ar) !== fold(i.text_ar)).slice(0, 12)
      .sort(() => Math.random() - 0.5).slice(0, 3).map((x) => x.vocalised_ar ?? x.text_ar);
    out.push({
      id: `mine:${i.id}:${l.id}`, kind: 'hear', audio: l.word, line: l.line, words: l.words, target: l.index,
      answer, options: [answer, ...others].sort(() => Math.random() - 0.5),
      source: { workId: l.workId, title: l.title, level: l.level },
    });
  }
  return out;
}
