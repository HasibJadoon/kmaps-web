import type { Router } from '../../../shared/src/router';
import { ok, badRequest, internalError } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import { parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import { buildFeats, rangeOf, waznOf, type MorphFeat } from '../lib/morph-card';

interface JoinedRow {
  surah: number;
  ayah: number;
  word_index: number;
  word_text: string;
  root: string | null;
  lemma: string | null;
  pos: string | null;
  morphology_tag_json: string | null;

  d_lemma_ar: string | null;
  d_root_display: string | null;
  d_group: string | null;
  d_pos_en: string | null;
  d_gloss_en: string | null;
  d_derived_type_en: string | null;
  d_derived_type_ar: string | null;
  d_wazn_ar: string | null;
  d_form_ar: string | null;
  d_form_roman: string | null;
  d_quran_meanings_json: string | null;
  d_root_meaning_en: string | null;
  d_is_anchor: number | null;
  d_sense_arc_en: string | null;
  d_sense_range_en: string | null;
  d_verb_form_ar: string | null;
  f_name_ar: string | null;
  f_roman: string | null;
  l_wazn_ar: string | null;
}

type PosBucket = 'noun' | 'verb';

interface QuranMeaning { ar: string; en: string }

interface MorphWord {
  surah: number;
  ayah: number;
  word_index: number;
  ref: string;
  surface_ar: string;
  lemma_ar: string | null;
  root_ar: string | null;
  root_display: string | null;
  group: PosBucket;
  pos_en: string;
  gloss_en: string | null;
  derived_type_en: string | null;
  derived_type_ar: string | null;
  wazn_ar: string | null;
  form_ar: string | null;
  form_roman: string | null;
  quran_meanings: QuranMeaning[] | null;
  root_meaning_en: string | null;
  is_anchor: boolean;
  feats: MorphFeat[];
  sense_arc_en: string | null;
  sense_range_en: string | null;
}

interface StemProjection { pos?: string | null; flags?: string[] | null }

function readStem(json: string | null): StemProjection | null {
  if (!json) return null;
  try {
    return (JSON.parse(json) as { stem?: StemProjection })?.stem ?? null;
  } catch {
    return null;
  }
}

function classifyPos(tag: string | null | undefined): { bucket: PosBucket; label: string } | null {
  if (!tag) return null;
  const t = tag.toUpperCase();
  if (t === 'V') return { bucket: 'verb', label: 'Verb' };
  if (t === 'PN') return { bucket: 'noun', label: 'Proper Noun' };
  if (t === 'N' || t === 'IMPN' || t === 'ADJ') return { bucket: 'noun', label: 'Noun' };
  return null;
}

function deriveType(pos: string, flags: string[]): { en: string; ar: string } | null {
  const isPcpl = flags.includes('PCPL');
  if (isPcpl && flags.includes('ACT')) return { en: 'active participle', ar: 'اسم فاعل' };
  if (isPcpl && flags.includes('PASS')) return { en: 'passive participle', ar: 'اسم مفعول' };
  if (pos === 'ADJ') return { en: 'adjective', ar: 'صفة' };
  return null;
}

function spaceRoot(root: string | null): string | null {
  if (!root) return null;
  return Array.from(root.trim()).filter((c) => c.trim()).join(' ');
}

function parseMeanings(json: string | null): QuranMeaning[] | null {
  if (!json) return null;
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return null;
    const out = arr
      .map((m) => ({ ar: String(m?.ar ?? ''), en: String(m?.en ?? '') }))
      .filter((m) => m.ar || m.en);
    return out.length ? out : null;
  } catch {
    return null;
  }
}

const clean = (s: string | null | undefined): string | null => {
  const v = typeof s === 'string' ? s.trim() : '';
  return v.length ? v : null;
};

export function morphologyRoutes(router: Router<QuranEnv>) {

  router.get('/qr/surahs/:id/morphology', async (req, env, { id }) => {
    const surahId = parseIntParam(id);
    if (!surahId || surahId < 1 || surahId > 114) {
      return badRequest('Surah ID must be 1–114');
    }

    const url       = new URL(req.url);
    const fromParam = url.searchParams.get('ayah_from');
    const toParam   = url.searchParams.get('ayah_to');
    const ayahFrom  = fromParam ? (parseInt(fromParam, 10) || null) : null;
    const ayahTo    = toParam   ? (parseInt(toParam,   10) || null) : null;

    if (ayahFrom !== null && ayahTo !== null && ayahTo < ayahFrom) {
      return badRequest('ayah_to must be >= ayah_from');
    }

    try {
      const conditions: string[] = ['w.surah = ?'];
      const params: unknown[]    = [surahId];
      if (ayahFrom !== null) { conditions.push('w.ayah >= ?'); params.push(ayahFrom); }
      if (ayahTo   !== null) { conditions.push('w.ayah <= ?'); params.push(ayahTo); }

      const rows = await query<JoinedRow>(
        env.DB_QR,
        `SELECT
            w.surah, w.ayah, w.word_index, w.word_text, w.root, w.lemma, w.pos, w.morphology_tag_json,
            d.lemma_ar            AS d_lemma_ar,
            d.root_display        AS d_root_display,
            d.word_group          AS d_group,
            d.pos_en              AS d_pos_en,
            COALESCE(dl.gloss_en, d.gloss_en)                 AS d_gloss_en,
            COALESCE(dl.derived_type_en, d.derived_type_en)   AS d_derived_type_en,
            COALESCE(dl.derived_type_ar, d.derived_type_ar)   AS d_derived_type_ar,
            COALESCE(dl.wazn_ar, d.wazn_ar)                   AS d_wazn_ar,
            COALESCE(f.arabic_name, dl.form_ar, d.form_ar)    AS d_form_ar,
            COALESCE(f.roman, dl.form_roman, d.form_roman)    AS d_form_roman,
            d.quran_meanings_json AS d_quran_meanings_json,
            d.root_meaning_en     AS d_root_meaning_en,
            d.is_anchor           AS d_is_anchor,
            d.sense_arc_en        AS d_sense_arc_en,
            d.sense_range_en      AS d_sense_range_en,
            COALESCE(f.example_ar, dl.verb_form_ar, d.verb_form_ar) AS d_verb_form_ar,
            f.arabic_name         AS f_name_ar,
            f.roman               AS f_roman,
            ql.wazn_ar            AS l_wazn_ar
          FROM qr_word_occurrence w
          LEFT JOIN qr_morph_display_word d
            ON d.surah_no = w.surah
           AND d.ayah_no  = w.ayah
           AND d.word_index = w.word_index
           AND d.status = 'live'
          LEFT JOIN qr_morph_display_lemma dl ON dl.id = d.lemma_ref AND dl.status = 'live'
          LEFT JOIN qr_morph_form_family f ON f.id = dl.form_family_id AND f.status = 'live'
          LEFT JOIN qr_lemma ql ON ql.lemma_text = w.lemma
          WHERE ${conditions.join(' AND ')}
          ORDER BY w.ayah, w.word_index`,
        params,
      );

      const words: MorphWord[] = [];
      const count = { all: 0, noun: 0, verb: 0 };

      for (const row of rows) {
        const stem = readStem(row.morphology_tag_json);
        const tag  = stem?.pos ?? row.pos;
        const kind = classifyPos(tag);
        if (!kind) continue;

        const flags = stem?.flags ?? [];
        const qacType = deriveType((tag ?? '').toUpperCase(), flags);

        const derivedTypeEn = clean(row.d_derived_type_en) ?? qacType?.en ?? null;
        const derivedTypeAr = clean(row.d_derived_type_ar) ?? qacType?.ar ?? null;
        const meanings      = parseMeanings(row.d_quran_meanings_json);

        words.push({
          surah:           row.surah,
          ayah:            row.ayah,
          word_index:      row.word_index,
          ref:             `${row.surah}:${row.ayah}`,
          surface_ar:      row.word_text,
          lemma_ar:        clean(row.d_lemma_ar) ?? clean(row.lemma),
          root_ar:         clean(row.root),
          root_display:    clean(row.d_root_display) ?? spaceRoot(row.root),
          group:           kind.bucket,
          pos_en:          clean(row.d_pos_en) ?? kind.label,
          gloss_en:        clean(row.d_gloss_en),
          derived_type_en: derivedTypeEn,
          derived_type_ar: derivedTypeAr,
          wazn_ar:         waznOf(row.d_wazn_ar ?? row.l_wazn_ar, row.morphology_tag_json, clean(row.d_lemma_ar) ?? clean(row.lemma), clean(row.root), kind.bucket),
          form_ar:         clean(row.d_form_ar),
          form_roman:      clean(row.d_form_roman),
          quran_meanings:  meanings,
          root_meaning_en: clean(row.d_root_meaning_en),
          is_anchor:       !!row.d_is_anchor,
          feats:           buildFeats(kind.bucket, row.morphology_tag_json, derivedTypeAr, derivedTypeEn, clean(row.d_verb_form_ar), clean(row.f_name_ar), clean(row.f_roman)),
          sense_arc_en:    clean(row.d_sense_arc_en),
          sense_range_en:  rangeOf(clean(row.d_sense_range_en), meanings),
        });
        count.all += 1;
        count[kind.bucket] += 1;
      }

      const scopeFrom = ayahFrom ?? (rows[0]?.ayah ?? 1);
      const scopeTo   = ayahTo   ?? (rows[rows.length - 1]?.ayah ?? scopeFrom);

      return ok({
        surah_id: surahId,
        scope:    { ayah_from: scopeFrom, ayah_to: scopeTo },
        count,
        words,
      });

    } catch (err) {
      console.error('[qr/morphology]', err);
      return internalError('Failed to load surah morphology');
    }
  });
}
