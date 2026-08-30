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
