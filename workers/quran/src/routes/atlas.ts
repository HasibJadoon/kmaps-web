import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import { parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import { StudyRepo } from '../repositories/study.repo';
import { labels, byKey, card, type Label } from '../lib/labels';
import { atlasUnits, mixedPassage, curatedRows, coversSurah, bookNames } from './atlas-layers';
import { roomDestination } from './atlas-intro';

// ── The Qurʾān as an atlas ────────────────────────────────────────────────────
// Laid out as the Arabic side is: rooms → surahs, grouped as series → passages as
// units → each passage's layers. One slice per screen, each small and kept (the
// 'books' and 'rest' versions move them), so the app loads only what it shows.
//
// A layer is either **built** — authored study rows exist for it (sentence
// structure, a translation's build-up, a reading) — or **source**: the books cover
// it (the iʿrāb books, the eight tafsīrs, the lexicons, the translations), not yet
// worked into study. The app shows which, so a learner knows what is curated.

const RECITER = 7;   // Mishary Rashid al-ʿAfāsī (qr_recitation)

type Depth = 'built' | 'source' | null;

/// A passage's layers, from its study flags: built where authored rows exist, source
/// where the step serves what the books give (every step does now — study-derived.ts),
/// left out where there is nothing yet. `has` here is the grid's `built`, so a layer is
/// never called built while its step holds no authored rows.
function layersFor(L: Label[] | undefined, has: Record<string, number>): Array<ReturnType<typeof card> & {
  depth: Depth; step: string | null; lenses: string[] | null; hide: string[] | null }> {
  const depth: Record<string, Depth> = {
    reading: has.reading ? 'built' : 'source',
    translation: has.passage_structure ? 'built' : 'source',
    // الصرف is its own authored rows (qr_sarf_word): shown where the passage has them, else left out
    sarf: has.sarf ? 'built' : null,
    // grammar and rhetoric are one screen: the sentence, its parse and its figures together
    nahw: has.sentence_structure ? 'built' : 'source',
    structure: has.passage_structure ? 'built' : 'source',
    tafsir: has.tafsir ? 'built' : 'source',
  };
  return (L ?? [])
    // a layer is a screen: its step, and the part of that step it shows (only these lenses, or all but these)
    .map((l) => ({ ...card(l), depth: depth[l.key] ?? null, step: (l.extra?.step as string | undefined) ?? null,
                   lenses: (l.extra?.lenses as string[] | undefined) ?? null, hide: (l.extra?.hide as string[] | undefined) ?? null }))
    .filter((l) => l.depth);
}

type GridUnit = NonNullable<Awaited<ReturnType<StudyRepo['grid']>>>['units'][number];

/// What is authored for a curated unit, as layersFor reads it: the grid's `built` flags
/// (reading and words are the corpus itself).
function builtOf(u: GridUnit): Record<string, number> {
  return {
    reading: u.reading.has, vocabulary: u.vocabulary.has, sentence_structure: u.sentence_structure.built,
    passage_structure: u.passage_structure.built, tafsir: u.tafsir.built,
  };
}

export function atlasRoutes(router: Router<QuranEnv>) {
  // The home: its rooms, and how far the study reaches.
  router.get('/qr/atlas/home', async (_req, env) => {
    const [L, reach] = await Promise.all([
      labels(env),
      queryOne<{ surahs: number; passages: number; built_surahs: number; ss_ayat: number }>(env.DB_QR,
        `SELECT (SELECT COUNT(*) FROM qr_surah) AS surahs,
                (SELECT COUNT(*) FROM qr_surah_study_passage WHERE status = 'live') AS passages,
                (SELECT COUNT(DISTINCT surah) FROM qr_surah_study_passage WHERE status = 'live') AS built_surahs,
                (SELECT COUNT(DISTINCT surah || ':' || ayah_from) FROM qr_ss_occ_sentence) AS ss_ayat`),
    ]);
    return ok({
      // each room with where it leads (qr_study_label extra_json.destination — atlas-intro.ts)
      rooms: (L.room ?? []).map((r) => ({ ...card(r), destination: roomDestination(r, L.skill) })),
      steps: (L.step ?? []).map(card),
      reach,
    });
  });

  // The Surahs room (/qr/atlas/surahs?group=<scheme>) is served by atlas-groups.ts: every scheme, overlaps listed honestly.

  // A surah's room: who and where, its recording, its passages as units, and each
  // passage's layers.
  router.get('/qr/atlas/surah/:surahId', async (_req, env, { surahId }) => {
    const s = parseIntParam(surahId);
    if (!s || s < 1 || s > 114) return badRequest('Invalid surahId');
    const [L, head, rec, tags, preface, grid] = await Promise.all([
      labels(env),
      queryOne<{ id: number; name_ar: string; name_en: string; translit: string | null; ayahs: number; revelation: string;
                 order_revelation: number | null; juz_start: number | null; page_start: number | null }>(env.DB_QR,
        `SELECT id, name_ar, name_en, name_transliteration AS translit, ayah_count AS ayahs, revelation_type AS revelation,
                order_revelation, juz_start, page_start FROM qr_surah WHERE id = ?`, [s]),
      queryOne<{ reciter: string; audio_url: string }>(env.DB_QR,
        `SELECT reciter, audio_url FROM qr_recitation WHERE reciter_id = ? AND surah = ?`, [RECITER, s]),
      query<{ id: string; slug: string; name_en: string; name_ar: string | null; name_translit: string | null; source_slug: string | null; group_basis: string }>(env.DB_QR,
        `SELECT g.id, g.slug, g.name_en, g.name_ar, g.name_translit, g.source_slug, g.group_basis FROM qr_nazm_group g
           JOIN qr_nazm_group_member m ON m.group_id = g.id WHERE m.surah = ? ORDER BY g.group_basis, g.surah_from`, [s]),
      queryOne<{ has_aghrad: number; has_revelation_place: number; excerpt: string }>(env.DB_QR,
        `SELECT has_aghrad, has_revelation_place, substr(text_ar, 1, 600) AS excerpt
           FROM qr_tafsir_sura_preface WHERE surah_no = ? AND status <> 'rejected' ORDER BY id LIMIT 1`, [s]),
      new StudyRepo(env.DB_QR).grid(s),
    ]);
    if (!head) return notFound(`surah ${s}`);
    const curated = (grid?.units ?? []).map((u) => {
      const has = builtOf(u);
      const layers = layersFor(L.layer, has);
      return {
        no: u.passage_no, from: u.ayah_from, to: u.ayah_to, title: u.label, theme: u.theme,
        words: u.vocabulary.total, built: layers.filter((l) => l.depth === 'built').length,
        layers: layers.map((l) => ({ id: l.id, depth: l.depth })),
      };
    });
    // what the curated passages leave uncovered (all of it, for a surah no one has cut) is filled with the
    // passages the books agree on (qr_surah_passage_proposal), marked derived; a wholly curated surah is as it was
    const covered = coversSurah(curated, head.ayahs);
    const units = covered ? curated : await atlasUnits(env, s, head.ayahs, curated, (has) => layersFor(L.layer, has));
    return ok({
      surah: { ...head, translit: head.translit },
      recitation: rec ? { reciter: rec.reciter, url: rec.audio_url } : null,
      tags: tags.map((t) => ({ id: t.id, slug: t.slug, title: t.name_en, translit: t.name_translit, titleAr: t.name_ar, basis: t.group_basis, source: t.source_slug })),
      preface: preface ? { source: 'Ibn ʿĀshūr, al-Taḥrīr wa-l-tanwīr', excerpt: preface.excerpt,
                           hasAims: !!preface.has_aghrad, hasPlace: !!preface.has_revelation_place } : null,
      layers: (L.layer ?? []).map(card),
      steps: (L.step ?? []).map(card),
      units,
      // a surah not yet cut into passages is studied whole, from the books
      divided: units.length > 0,
      passageSource: covered ? 'curated' : curated.length ? 'mixed' : units.length ? 'derived' : null,
      ...(covered ? {} : { books: await bookNames(env, units.flatMap((u) => ('basis' in u ? [...(u.basis?.opening?.agree ?? []), ...(u.basis?.opening?.corroborate ?? []),
                                                                  ...(u.basis?.opening?.dissent ?? []).map((x: string) => x.split(' ')[0])] : [])), L) }),
      // the surah's own layers: /qr/atlas/surah/:s/{id}
      surahLayers: (L.surah_layer ?? []).map(card),
    });
  });

  // A passage: its āyāt, each with its words, translation and place in the
  // recording, and the passage's layers (each fetched on its own when opened).
  router.get('/qr/atlas/passage/:surahId/:passageNo', async (_req, env, { surahId, passageNo }) => {
    // :passageNo is the unit's number in /qr/atlas/surah/:s's list, or its key "from-to"
    const range = /^(\d+)-(\d+)$/.exec(passageNo);
    const s = parseIntParam(surahId), p = range ? null : parseIntParam(passageNo);
    if (!s || (!p && !range)) return badRequest('Invalid surah or passage');
    const [rows, head] = await Promise.all([
      curatedRows(env, s),
      queryOne<{ ayahs: number }>(env.DB_QR, `SELECT ayah_count AS ayahs FROM qr_surah WHERE id = ?`, [s]),
    ]);
    if (!head) return notFound(`surah ${s}`);
    if (!coversSurah(rows.map((r) => ({ from: r.ayah_from, to: r.ayah_to })), head.ayahs)) {
      // not wholly curated: the unit at that place in the combined list, curated or derived
      const u = await mixedPassage(env, s, head.ayahs, rows, range ? { from: +range[1], to: +range[2] } : { no: p! });
      if (!u) return notFound(`passage ${s}/${passageNo}`);
      if (u.kind === 'derived') {
        return ok(await passageSlice(env, s, u.from, u.to, {
          no: u.no, title: u.title, titleAr: u.titleAr ?? null, theme: null, summary: null, derived: true, basis: u.basis,
        }));
      }
      const c = await queryOne<{ title_en: string | null; title_ar: string | null; theme: string | null; summary_md: string | null }>(env.DB_QR,
        `SELECT title_en, title_ar, theme, summary_md FROM qr_surah_study_passage WHERE surah = ? AND passage_no = ?`, [s, u.curatedNo]);
      return ok(await passageSlice(env, s, u.from, u.to, {
        no: u.no, title: c?.title_en ?? null, titleAr: c?.title_ar ?? null, theme: c?.theme ?? null, summary: c?.summary_md ?? null,
        ...(u.curatedNo !== u.no ? { curatedNo: u.curatedNo } : {}),
      }));
    }
    const byRange = range ? rows.find((r) => r.ayah_from === +range[1] && r.ayah_to === +range[2]) : null;
    if (range && !byRange) return notFound(`passage ${s}/${passageNo}`);
    const passage = await queryOne<{ id: string; ayah_from: number; ayah_to: number; title_en: string | null; title_ar: string | null;
                                     theme: string | null; summary_md: string | null }>(env.DB_QR,
      `SELECT id, ayah_from, ayah_to, title_en, title_ar, theme, summary_md FROM qr_surah_study_passage
        WHERE surah = ? AND passage_no = ? AND status = 'live'`, [s, byRange ? byRange.passage_no : p]);
    if (!passage) return notFound(`passage ${s}/${passageNo}`);
    return ok(await passageSlice(env, s, passage.ayah_from, passage.ayah_to, {
      no: byRange ? byRange.passage_no : p!, title: passage.title_en, titleAr: passage.title_ar, theme: passage.theme, summary: passage.summary_md,
    }));
  });

  // A stretch of āyāt read whole (a surah not yet cut into passages): ?from&to, at most 20.
  router.get('/qr/atlas/ayat/:surahId', async (req, env, { surahId }) => {
    const s = parseIntParam(surahId);
    const u = new URL(req.url);
    const from = Number(u.searchParams.get('from') ?? 1), to = Number(u.searchParams.get('to') ?? from + 9);
    if (!s || !(from >= 1) || !(to >= from) || to - from >= 20) return badRequest('from/to: at most 20 āyāt');
    return ok(await passageSlice(env, s, from, to, null));
  });
}

async function passageSlice(env: QuranEnv, s: number, from: number, to: number,
                            meta: { no: number; title: string | null; titleAr: string | null; theme: string | null; summary: string | null;
                                    derived?: boolean; basis?: unknown; curatedNo?: number } | null) {
  const [L, ayat, words, tr, rec, grid] = await Promise.all([
    labels(env),
    query<{ ayah: number; text: string }>(env.DB_QR,
      `SELECT ayah, text_uthmani AS text FROM qr_ayah WHERE surah = ? AND ayah BETWEEN ? AND ? ORDER BY ayah`, [s, from, to]),
    query<{ ayah: number; i: number; t: string; root: string | null; lemma: string | null; pos: string | null }>(env.DB_QR,
      `SELECT ayah, word_index AS i, word_text AS t, root, lemma, pos FROM qr_word_occurrence
        WHERE surah = ? AND ayah BETWEEN ? AND ? ORDER BY ayah, word_index`, [s, from, to]),
    query<{ ayah: number; text: string }>(env.DB_QR,
      `SELECT t.ayah, t.translation_text AS text FROM qr_translation t
         JOIN qr_translation_source src ON src.id = t.source_id AND src.is_default = 1
        WHERE t.surah = ? AND t.ayah BETWEEN ? AND ?`, [s, from, to]),
    query<{ ayah: number; start_ms: number; end_ms: number; segments_json: string | null; audio_url: string }>(env.DB_QR,
      `SELECT a.ayah, a.start_ms, a.end_ms, a.segments_json, r.audio_url FROM qr_recitation_ayah a
         JOIN qr_recitation r ON r.reciter_id = a.reciter_id AND r.surah = a.surah
        WHERE a.reciter_id = ? AND a.surah = ? AND a.ayah BETWEEN ? AND ?`, [RECITER, s, from, to]),
    meta ? new StudyRepo(env.DB_QR).grid(s) : Promise.resolve(null),
  ]);
  const en = new Map(tr.map((r) => [r.ayah, r.text]));
  const au = new Map(rec.map((r) => [r.ayah, r]));
  const wordsOf = new Map<number, typeof words>();
  for (const w of words) wordsOf.set(w.ayah, [...(wordsOf.get(w.ayah) ?? []), w]);
  const unit = meta && !meta.derived ? grid?.units.find((x) => x.passage_no === (meta.curatedNo ?? meta.no)) : null;
  const has: Record<string, number> = unit ? builtOf(unit) : {};
  has.sarf = (await queryOne<{ n: number }>(env.DB_QR,
    `SELECT COUNT(*) AS n FROM qr_sarf_word WHERE surah = ? AND ayah BETWEEN ? AND ?`, [s, from, to]).catch(() => null))?.n ?? 0;
  return {
    surah: s, from, to, passage: meta,
    ayat: ayat.map((a) => {
      const r = au.get(a.ayah);
      const segs: number[][] = r?.segments_json ? JSON.parse(r.segments_json) : [];
      const ws = wordsOf.get(a.ayah) ?? [];
      // each word with its time in the recording — only where the recitation numbers the
      // āyah's words as the corpus does (97% of āyāt); a word the reciter repeats keeps its first time
      const at = new Map<number, number[]>();
      for (const x of segs) if (!at.has(x[0])) at.set(x[0], x);
      const aligned = ws.length > 0 && at.size === ws.length && ws.every((w) => at.has(w.i));
      if (!aligned) at.clear();
      return {
        ayah: a.ayah, text: a.text, en: en.get(a.ayah) ?? null,
        audio: r ? { url: r.audio_url, start: r.start_ms / 1000, end: r.end_ms / 1000 } : null,
        words: ws.map((w) => {
          const t = at.get(w.i);
          return { i: w.i, t: w.t, root: w.root, lemma: w.lemma, pos: w.pos,
                   s: t ? t[1] / 1000 : null, e: t ? t[2] / 1000 : null };
        }),
      };
    }),
    layers: layersFor(L.layer, has),
    // the passage's doors (the class) are worded by the step labels, as the surah's are
    steps: (L.step ?? []).map(card),
  };
}
