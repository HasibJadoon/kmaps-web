import type { Router } from '../../../shared/src/router';
import { badRequest, notFound, ok } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { SprintBacklog, SprintPage } from '../../../shared/src/contracts/sprint';
import type { QuranEnv } from '../env';
import { parseIntParam } from '../../../shared/src/validate';

/// The Qurʾān's side of the sprint contract (shared/src/contracts/sprint.ts): a sūra's study passages as the backlog,
/// a passage as its page — its āyāt in the muṣḥaf's face, the default English, and each āyah's place in the recitation.

const RECITER = 7;   // Mishary Rashid al-ʿAfāsī (qr_recitation), as the atlas

export function sprintRoutes(router: Router<QuranEnv>) {
  // The Qurʾān stream's queue: the sūras cut into study passages, each holding its passages.
  router.get('/qr/sprint/backlog/surahs', async (_req, env) => {
    const rows = await query<{ id: number; name_en: string; name_ar: string; name_transliteration: string | null; n: number }>(env.DB_QR,
      `SELECT s.id, s.name_en, s.name_ar, s.name_transliteration, COUNT(p.id) AS n FROM qr_surah s
         JOIN qr_surah_study_passage p ON p.surah = s.id AND p.status != 'deleted'
        GROUP BY s.id ORDER BY s.id`);
    const body: SprintBacklog = {
      title: 'Sūra backlog', subtitle: `${rows.length} sūras cut into passages`,
      items: rows.map((r) => ({
        unit: `QR:S:${r.id}`, label: String(r.id), title: r.name_transliteration ?? r.name_en, title_ar: r.name_ar,
        short: r.name_transliteration ?? r.name_en, ref: `${r.n} passages`, page: null,
        down: { module: 'qr', path: `sprint/backlog/${r.id}` },
      })),
    };
    return ok(body);
  });

  router.get('/qr/sprint/backlog/:surahId', async (_req, env, { surahId }) => {
    const s = parseIntParam(surahId);
    if (!s) return badRequest('Invalid surah');
    const [head, rows] = await Promise.all([
      queryOne<{ name_en: string; name_transliteration: string | null }>(env.DB_QR,
        `SELECT name_en, name_transliteration FROM qr_surah WHERE id = ?`, [s]),
      query<{ id: string; passage_no: number; ayah_from: number; ayah_to: number; title_en: string | null;
              title_ar: string | null; title_short: string | null }>(env.DB_QR,
        `SELECT id, passage_no, ayah_from, ayah_to, title_en, title_ar, title_short FROM qr_surah_study_passage
          WHERE surah = ? AND status != 'deleted' ORDER BY passage_no`, [s]),
    ]);
    if (!head) return notFound(`surah ${s}`);
    const body: SprintBacklog = {
      title: 'Passage backlog',
      subtitle: head.name_transliteration ?? head.name_en,
      items: rows.map((r) => ({
        unit: r.id,
        label: `P${String(r.passage_no).padStart(2, '0')}`,
        title: r.title_en, title_ar: r.title_ar, short: r.title_short,
        ref: `${s}:${r.ayah_from}–${r.ayah_to}`,
        page: { module: 'qr', path: `sprint/page/${s}/${r.passage_no}` },
      })),
      up: [{ label: 'Sūras', source: { module: 'qr', path: 'sprint/backlog/surahs' } }],
    };
    return ok(body);
  });

  router.get('/qr/sprint/page/:surahId/:passageNo', async (_req, env, { surahId, passageNo }) => {
    const s = parseIntParam(surahId), p = parseIntParam(passageNo);
    if (!s || !p) return badRequest('Invalid surah or passage');
    const head = await queryOne<{ ayah_from: number; ayah_to: number; title_en: string | null; title_ar: string | null; summary_md: string | null }>(env.DB_QR,
      `SELECT ayah_from, ayah_to, title_en, title_ar, summary_md FROM qr_surah_study_passage
        WHERE surah = ? AND passage_no = ? AND status != 'deleted'`, [s, p]);
    if (!head) return notFound(`passage ${s}/${p}`);
    const [ayat, tr, rec] = await Promise.all([
      query<{ ayah: number; text: string }>(env.DB_QR,
        `SELECT ayah, text_uthmani AS text FROM qr_ayah WHERE surah = ? AND ayah BETWEEN ? AND ? ORDER BY ayah`, [s, head.ayah_from, head.ayah_to]),
      query<{ ayah: number; text: string }>(env.DB_QR,
        `SELECT t.ayah, t.translation_text AS text FROM qr_translation t
           JOIN qr_translation_source src ON src.id = t.source_id AND src.is_default = 1
          WHERE t.surah = ? AND t.ayah BETWEEN ? AND ?`, [s, head.ayah_from, head.ayah_to]),
      query<{ ayah: number; start_ms: number; end_ms: number; audio_url: string; reciter: string | null }>(env.DB_QR,
        `SELECT a.ayah, a.start_ms, a.end_ms, r.audio_url, r.reciter FROM qr_recitation_ayah a
           JOIN qr_recitation r ON r.reciter_id = a.reciter_id AND r.surah = a.surah
          WHERE a.reciter_id = ? AND a.surah = ? AND a.ayah BETWEEN ? AND ?`, [RECITER, s, head.ayah_from, head.ayah_to]),
    ]);
    const en = new Map(tr.map((r) => [r.ayah, r.text]));
    const au = new Map(rec.map((r) => [r.ayah, r]));
    const heard = ayat.some((a) => au.has(a.ayah));
    const body: SprintPage = {
      kicker: `PASSAGE ${p} · ${s}:${head.ayah_from}–${head.ayah_to}`,
      title: head.title_en, title_ar: head.title_ar, summary: head.summary_md,
      face: 'mushaf',
      listen: heard ? { label: 'Listen to the passage', detail: [rec[0]?.reciter, `${ayat.length} āyāt`].filter(Boolean).join(' · ') } : null,
      lines: ayat.map((a) => {
        const r = au.get(a.ayah);
        return { mark: `﴿${arabicDigits(a.ayah)}﴾`, ar: a.text, en: en.get(a.ayah) ?? null,
                 audio: r ? { url: r.audio_url, start: r.start_ms / 1000, end: r.end_ms / 1000 } : null };
      }),
      study: { label: 'Passage study', open: { type: 'qr_passage', ref: `${s}:${p}:${head.ayah_from}-${head.ayah_to}` } },
    };
    return ok(body);
  });
}

function arabicDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)));
}
