import { parseQacMorphology } from './qac-morph';

export type FeatCat = 'status' | 'state' | 'number' | 'gender' | 'type' | 'tense' | 'voice' | 'form';
export interface MorphFeat { cat: FeatCat; ar: string; en: string | null }

export interface RegistryFeat {
  cat: string;
  ar: string;
  en: string | null;
  ur: string | null;
  ref: string | null;
}

export function registryFeats(
  featuresJson: unknown,
  extra: RegistryFeat[] = [],
): RegistryFeat[] | null {
  const raw = typeof featuresJson === 'string'
    ? (() => { try { return JSON.parse(featuresJson); } catch { return null; } })()
    : featuresJson;
  if (!Array.isArray(raw)) return null;

  const feats: RegistryFeat[] = [];
  const seen = new Set<string>();
  for (const r of [...raw, ...extra]) {
    if (!r || typeof r !== 'object') continue;
    const f = r as Record<string, unknown>;
    const ar = typeof f.ar === 'string' ? f.ar : '';
    if (!ar) continue;

    const key = typeof f.ref === 'string' && f.ref ? f.ref : `${String(f.cat)}:${ar}`;
    if (seen.has(key)) continue;
    seen.add(key);
    feats.push({
      cat: typeof f.cat === 'string' ? f.cat : 'unknown',
      ar,
      en: typeof f.en === 'string' ? f.en : null,
      ur: typeof f.ur === 'string' ? f.ur : null,
      ref: typeof f.ref === 'string' ? f.ref : null,
    });
  }
  return feats.length ? feats : null;
}

type Bucket = 'noun' | 'verb';

const FORM_MODEL_AR: Record<string, string> = {
  II: 'فَعَّلَ', III: 'فَاعَلَ', IV: 'أَفْعَلَ', V: 'تَفَعَّلَ', VI: 'تَفَاعَلَ',
  VII: 'اِنْفَعَلَ', VIII: 'اِفْتَعَلَ', IX: 'اِفْعَلَّ', X: 'اِسْتَفْعَلَ',
};

export function buildFeats(
  bucket: Bucket,
  tagJson: unknown,
  typeAr: string | null,
  typeEn: string | null,
  verbFormAr: string | null = null,
  familyAr: string | null = null,
  familyRoman: string | null = null,
): MorphFeat[] {
  const m = parseQacMorphology(tagJson);
  const out: MorphFeat[] = [];
  const push = (cat: FeatCat, ar: string | null, en: string | null): void => {
    if (ar) out.push({ cat, ar, en: en ?? null });
  };

  if (bucket === 'verb') {
    push('tense', m.aspect_ar, m.aspect);

    const voiceAr = m.voice === 'passive' ? 'مجهول' : (m.voice_ar ?? (m.aspect_ar ? 'معلوم' : null));
    push('voice', voiceAr, m.voice ?? (m.aspect_ar ? 'active' : null));

    const formAr = verbFormAr ?? (m.form && m.form !== 'I' ? (FORM_MODEL_AR[m.form] ?? null) : null) ?? familyAr;
    push('form', formAr, m.form ?? familyRoman);
    return out;
  }

  push('status', m.case_ar, m.case);

  const definite =
    m.pos === 'PN' ||
    m.prefixes.some((p) => (p.tag ?? '').toUpperCase() === 'DET') ||
    m.suffixes.some((sf) => (sf.tag ?? '').toUpperCase() === 'PRON');
  const stateAr = m.state_ar ?? (definite ? 'معرفة' : null);
  const stateEn = m.state ?? (definite ? 'definite' : null);
  push('state', stateAr, stateEn);
  push('number', m.number_ar ?? (m.gender_ar ? 'مفرد' : null), m.number ?? (m.gender_ar ? 'singular' : null));
  push('gender', m.gender_ar, m.gender);
  push('type', typeAr, typeEn);

  push('form', familyAr, familyRoman ?? m.form ?? null);
  return out;
}

const HARAKAT = new Set([...'ًٌٍَُِّْٰـ']);
const isHarakah = (c: string): boolean => HARAKAT.has(c);
const MIZAN = ['ف', 'ع', 'ل', 'ل', 'ل'];

function normLetter(c: string): string {
  if ('أإآاٱءؤئ'.includes(c)) return 'ء';
  if (c === 'ى') return 'ي';
  if (c === 'ة') return 'ت';
  return c;
}

function rootLetters(root: string | null | undefined): string[] {
  return Array.from((root ?? '').replace(/[ـ\s]/g, '')).filter((c) => !isHarakah(c));
}

export function deriveNounWazn(lemma: string | null | undefined, root: string | null | undefined): string | null {
  const R = rootLetters(root);
  if (R.length < 3 || R.length > 4) return null;
  let ri = 0;
  let out = '';
  let dbl = false;
  for (const c of Array.from(lemma ?? '')) {
    if (isHarakah(c)) {

      if (c === 'ّ' && dbl) { out += 'ْ' + MIZAN[ri]; ri++; dbl = false; }
      else out += c;
      continue;
    }
    if (ri < R.length && normLetter(c) === normLetter(R[ri])) {
      out += MIZAN[ri];
      dbl = ri + 1 < R.length && normLetter(R[ri]) === normLetter(R[ri + 1]);
      ri++;
    } else { out += c; dbl = false; }
  }
  return ri === R.length ? out : null;
}

const MASDAR_AR: Record<string, string> = {
  II: 'تَفْعِيل', IV: 'إِفْعَال', V: 'تَفَعُّل', VI: 'تَفَاعُل',
  VII: 'اِنْفِعَال', VIII: 'اِفْتِعَال', IX: 'اِفْعِلَال', X: 'اِسْتِفْعَال',
};

export function waznOf(
  curated: string | null | undefined,
  tagJson: unknown,
  lemma: string | null = null,
  root: string | null = null,
  bucket: Bucket = 'noun',
): string | null {
  const c = typeof curated === 'string' ? curated.trim() : '';
  if (c) return c;
  const m = parseQacMorphology(tagJson);
  if (m.wazn_ar && m.wazn_ar.trim()) return m.wazn_ar.trim();

  if (m.derived === 'verbal_noun' && m.form && MASDAR_AR[m.form]) return MASDAR_AR[m.form];
  if (bucket === 'noun') {

    return deriveNounWazn(lemma, root) ?? deriveNounWazn(m.lemma_ar, root);
  }
  return null;
}

export function rangeOf(
  senseRange: string | null,
  meanings: Array<{ en?: string | null }> | null,
): string | null {
  if (senseRange && senseRange.trim()) return senseRange.trim();
  const joined = (meanings ?? []).map((m) => (m?.en ?? '').trim()).filter(Boolean).join(' · ');
  return joined || null;
}

// ── every stored grammatical fact of a word, as card chips ─────────────────

/** A word card chip: a registry feat, optionally carrying the scholarly note
 *  behind it. `rank` marks one of several readings (presentation order only). */
export interface CardFeat {
  cat: string;
  ar: string;
  en: string | null;
  ur: string | null;
  ref: string | null;
  note_ar?: string | null;
  note_en?: string | null;
  rank?: number;
  /** On the readings chip: how many readings the word has. */
  count?: number;
}

export interface TermLabel { name_ar: string; name_en: string | null; name_ur: string | null }

/** The qr_word_occurrence gt_* columns, in the order a card lists them. */
export const GT_CATS = [
  'case', 'definiteness', 'number', 'gender', 'person',
  'voice', 'tense', 'mood', 'jumud', 'derivation_type', 'form_family',
] as const;
export type GtRow = { [K in (typeof GT_CATS)[number] as `gt_${K}`]: string | null } & {
  gt_readings_json: string | null;
};

/** buildFeats' fallback categories, named as the registry names them. */
const CAT_ALIAS: Record<string, string> = { status: 'case', state: 'definiteness', type: 'derivation_type', form: 'form_family' };

interface Reading {
  rank?: number; gt?: string; label_ar?: string;
  note_ar?: string; note_en?: string; authority_ar?: string;
}

export function readingsOf(json: string | null): Reading[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((r): r is Reading => !!r && typeof r === 'object') : [];
  } catch { return []; }
}

/** Every GT id a row names — its scalar facts and its readings — for one label lookup. */
export function gtIdsOf(row: GtRow): string[] {
  const ids: string[] = [];
  for (const c of GT_CATS) { const v = row[`gt_${c}`]; if (v) ids.push(v); }
  for (const r of readingsOf(row.gt_readings_json)) if (r.gt) ids.push(r.gt);
  return ids;
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const arNum = (n: number) => String(n).replace(/\d/g, d => AR_DIGITS[Number(d)]!);
const catOf = (gt: string | undefined) => (gt ?? '').split(':')[1] ?? '';

/**
 * The card's chips: the stored feats, every gt_* fact they lack (labelled from
 * the registry, never shown as a raw id), then the readings.
 *
 * gt_readings_json is authoritative (AGR:QUR:001). With more than one reading,
 * a category the readings dispute shows no scalar chip — the readings are the
 * answer, each with its note — and a count chip says the word is contested.
 * With one reading, its note rides on the matching chip.
 */
export function cardFeats(base: RegistryFeat[] | MorphFeat[] | null, row: GtRow | null,
                          terms: Record<string, TermLabel>): CardFeat[] {
  const feats: CardFeat[] = (base ?? []).map(f => ({
    cat: CAT_ALIAS[f.cat] ?? f.cat, ar: f.ar, en: f.en ?? null,
    ur: 'ur' in f ? f.ur : null, ref: 'ref' in f ? f.ref : null,
  }));
  if (!row) return feats;

  const readings = readingsOf(row.gt_readings_json);
  const contested = readings.length > 1
    ? new Set(readings.map(r => catOf(r.gt)).filter(Boolean)) : new Set<string>();
  const label = (id: string | null | undefined) => (id ? terms[id] : undefined);

  let out = feats.filter(f => !contested.has(f.cat));
  const have = new Set(out.map(f => f.cat));
  for (const c of GT_CATS) {
    const id = row[`gt_${c}`];
    const t = label(id);
    if (!id || !t || have.has(c) || contested.has(c)) continue;
    out.push({ cat: c, ar: t.name_ar, en: t.name_en, ur: t.name_ur, ref: id });
    have.add(c);
  }
  const order = (cat: string) => { const i = (GT_CATS as readonly string[]).indexOf(cat); return i < 0 ? GT_CATS.length : i; };
  out = out.map((f, i) => ({ f, i })).sort((a, b) => order(a.f.cat) - order(b.f.cat) || a.i - b.i).map(x => x.f);

  const noteOf = (r: Reading) => {
    const n = r.note_ar?.trim();
    const a = r.authority_ar?.trim();
    return n ? (a ? `${n} — ${a}` : n) : (a ?? null);
  };

  if (readings.length === 1) {
    const r = readings[0]!;
    const hit = out.find(f => f.ref && f.ref === r.gt);
    if (hit) { hit.note_ar = noteOf(r); hit.note_en = r.note_en ?? null; }
    else if (r.gt && (r.label_ar || label(r.gt))) {
      const t = label(r.gt);
      out.push({ cat: catOf(r.gt), ar: r.label_ar ?? t!.name_ar, en: t?.name_en ?? null, ur: t?.name_ur ?? null,
                 ref: r.gt, note_ar: noteOf(r), note_en: r.note_en ?? null });
    }
    return out;
  }

  if (readings.length > 1) {
    const n = readings.length;
    // The count chip's note lists every reading together, in presentation order.
    const all = readings.map((r, i) => {
      const head = r.label_ar ?? label(r.gt)?.name_ar ?? '';
      const note = noteOf(r);
      return `${arNum(i + 1)}. ${head}${note ? `: ${note}` : ''}`;
    }).join('\n');
    // The count travels as a number beside the label; the card sets it small and raised.
    out.push({ cat: 'readings', ar: 'أوجه', en: 'readings', ur: 'وجوہ', ref: null, count: n,
               note_ar: all, note_en: readings.map((r, i) => `${i + 1}. ${r.note_en ?? ''}`).join('\n') });
    readings.forEach((r, i) => {
      const t = label(r.gt);
      const ar = r.label_ar ?? t?.name_ar;
      if (!ar) return;
      out.push({ cat: catOf(r.gt) || 'reading', ar, en: t?.name_en ?? null, ur: t?.name_ur ?? null,
                 ref: r.gt ?? null, note_ar: noteOf(r), note_en: r.note_en ?? null, rank: r.rank ?? i + 1 });
    });
  }
  return out;
}

// ── the readings array, whole ──────────────────────────────────────────────

export interface SourceLabel { title_ar: string | null; author_name_ar: string | null; death_year_hijri: number | null }

interface StoredReading extends Reading {
  sources?: Array<{ slug?: string; cite?: string }>;
  [k: string]: unknown;
}

/** Every slug the readings cite, for one source-title lookup. */
export function readingSourceSlugs(json: string | null): string[] {
  return (readingsOf(json) as StoredReading[])
    .flatMap(r => (Array.isArray(r.sources) ? r.sources : []).map(s => s?.slug))
    .filter((s): s is string => !!s);
}

/** gt_readings_json as stored — every entry and every field (short_ar and
 *  rank_ar included, which are authored in the data), in stored order —
 *  with each GT id and each source slug given its name. `rank` is
 *  presentation order, not preference (AGR:QUR:001). */
export function shapeReadings(json: string | null, terms: Record<string, TermLabel>,
                              sources: Record<string, SourceLabel>): Array<Record<string, unknown>> {
  return (readingsOf(json) as StoredReading[]).map((r, i) => {
    const t = r.gt ? terms[r.gt] : undefined;
    return {
      ...r,
      rank: r.rank ?? i + 1,
      category: catOf(r.gt) || null,
      term_ar: t?.name_ar ?? null,
      term_en: t?.name_en ?? null,
      authority_line_ar: r.authority_ar ? `القائل: ${r.authority_ar}` : null,
      sources: (Array.isArray(r.sources) ? r.sources : []).map(s => {
        const src = s?.slug ? sources[s.slug] : undefined;
        const title = src?.title_ar ?? s?.slug ?? '';
        const died = src?.death_year_hijri != null ? ` (ت ${arNum(src.death_year_hijri)}هـ)` : '';
        const display_ar = [
          s?.cite ? `${title} ${s.cite.replace(/\d/g, d => AR_DIGITS[Number(d)]!)}` : title,
          src?.author_name_ar ? `${src.author_name_ar}${died}` : null,
        ].filter(Boolean).join(' · ');
        return { ...s, title_ar: src?.title_ar ?? null, author_ar: src?.author_name_ar ?? null,
                 death_year_hijri: src?.death_year_hijri ?? null, display_ar };
      }),
    };
  });
}
