import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { queryOne } from '../../../shared/src/db';
import { parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import type { Label } from '../lib/labels';

// ── A surah's introduction, and where each atlas room leads ───────────────────
//
//   GET /qr/atlas/surah/:s/intro   Maududi's introduction to the surah (qr_surah_info), every section
//                                  whole — the themes layer carries only a short excerpt of each and
//                                  points here. Registered before atlas-layers.ts's /:layer route.
//
// A room's destination is data: qr_study_label (scope 'room') extra_json.destination —
//   {kind:'surahs'} | {kind:'lexicon'} | {kind:'tafsir', skills?} | {kind:'practice', skills, prefixes?}
// — its skills checked against the skill labels, and every skill whose key starts with one of its
// prefixes added (the grammar room's 'gt_' family), so a new skill joins its room by its key alone.

export type RoomDestination = { kind: string; skills?: string[] };

export function roomDestination(room: Label, skills: Label[] | undefined): RoomDestination | null {
  const d = room.extra?.destination as { kind?: string; skills?: string[]; prefixes?: string[] } | undefined;
  if (!d?.kind) return null;
  const keys = (skills ?? []).map((s) => s.key);
  const want = [...(d.skills ?? []).filter((k) => keys.includes(k)),
                ...keys.filter((k) => (d.prefixes ?? []).some((p) => k.startsWith(p)))];
  const list = [...new Set(want)];
  return list.length || d.skills ? { kind: d.kind, skills: list } : { kind: d.kind };
}

const strip = (t: string) => t.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*/gi, '\n').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();

export function atlasIntroRoutes(router: Router<QuranEnv>) {
  router.get('/qr/atlas/surah/:surahId/intro', async (_req, env, { surahId }) => {
    const s = parseIntParam(surahId);
    if (!s || s < 1 || s > 114) return badRequest('Invalid surahId');
    const [head, row] = await Promise.all([
      queryOne<{ id: number; name_ar: string; name_en: string; translit: string | null; ayahs: number; revelation: string }>(env.DB_QR,
        `SELECT id, name_ar, name_en, name_transliteration AS translit, ayah_count AS ayahs, revelation_type AS revelation
           FROM qr_surah WHERE id = ?`, [s]),
      queryOne<{ source: string; short_text: string | null; sections_json: string }>(env.DB_QR,
        `SELECT source, short_text, sections_json FROM qr_surah_info WHERE surah = ? ORDER BY source LIMIT 1`, [s]),
    ]);
    if (!head) return notFound(`surah ${s}`);
    if (!row) return notFound(`no introduction for surah ${s}`);
    let secs: Array<{ heading?: string; text?: string }> = [];
    try { secs = JSON.parse(row.sections_json) ?? []; } catch { secs = []; }
    // "Sayyid Abul Ala Maududi - Tafhim al-Qur'an - The Meaning of the Quran": author, then the work
    const [author, ...work] = row.source.split(' - ');
    return ok({
      surah: head,
      source: { slug: 'maududi', name: row.source, author: author.trim(), title: work.join(' — ').trim() || null },
      short: row.short_text ? strip(row.short_text) : null,
      sections: secs.filter((x) => (x.text ?? '').trim()).map((x, i) => {
        const text = strip(x.text ?? '');
        return { no: i + 1, heading: (x.heading ?? '').trim() || null, text, paragraphs: text.split('\n').filter(Boolean) };
      }),
    });
  });
}
