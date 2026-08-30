export interface QacSegment {
  kind: string;
  form_ar: string | null;
  tag: string | null;
  label_ar: string | null;
  role: 'prefix' | 'stem' | 'suffix';
}

export interface QacMorphology {
  pos: string | null;
  pos_ar: string | null;
  pos_en: string | null;
  case: string | null;
  case_ar: string | null;
  state: string | null;
  state_ar: string | null;
  gender: string | null;
  gender_ar: string | null;
  number: string | null;
  number_ar: string | null;
  person: string | null;
  aspect: string | null;
  aspect_ar: string | null;
  voice: string | null;
  voice_ar: string | null;
  derived: string | null;
  derived_ar: string | null;
  derived_en: string | null;
  wazn_ar: string | null;
  form: string | null;
  lemma_ar: string | null;
  root_ar: string | null;
  prefixes: QacSegment[];
  stem: QacSegment | null;
  suffixes: QacSegment[];
  raw: string | null;
}

type Rec = Record<string, unknown>;

function asObj(v: unknown): Rec | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return p && typeof p === 'object' && !Array.isArray(p) ? p as Rec : null; }
    catch { return null; }
  }
  return typeof v === 'object' && !Array.isArray(v) ? v as Rec : null;
}
function asStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}
function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

const POS_AR: Record<string, string> = {
  N: 'اسم', PN: 'اسم علم', ADJ: 'صفة', IMPN: 'اسم مبني', V: 'فعل', PRON: 'ضمير',
  DEM: 'اسم إشارة', REL: 'اسم موصول', T: 'ظرف زمان', LOC: 'ظرف مكان', P: 'حرف جر',
  CONJ: 'حرف عطف', SUB: 'حرف مصدري', ACC: 'حرف نصب', COND: 'أداة شرط', NEG: 'حرف نفي',
  INTG: 'أداة استفهام', DET: 'أداة تعريف', CERT: 'حرف تحقيق', RES: 'أداة حصر',
  EXP: 'حرف تفسير', INC: 'حرف ابتداء', SUR: 'حرف فجاءة', VOC: 'حرف نداء',
  EMPH: 'لام التوكيد', PRP: 'لام التعليل', FUT: 'حرف استقبال', INL: 'حروف مقطعة',
};
const POS_EN: Record<string, string> = {
  N: 'noun', PN: 'proper noun', ADJ: 'adjective', IMPN: 'indeclinable noun', V: 'verb',
  PRON: 'pronoun', DEM: 'demonstrative', REL: 'relative', T: 'time adverb', LOC: 'place adverb',
  P: 'preposition', CONJ: 'conjunction', SUB: 'subordinator', ACC: 'accusative particle',
  COND: 'conditional', NEG: 'negation', INTG: 'interrogative', DET: 'determiner',
  CERT: 'particle of certainty', RES: 'restriction', EXP: 'explanation', INC: 'inceptive',
  SUR: 'surprise', VOC: 'vocative', EMPH: 'emphatic lām', PRP: 'purpose lām',
  FUT: 'future particle', INL: 'disconnected letters',
};

const CASE_AR: Record<string, string> = { NOM: 'مرفوع', ACC: 'منصوب', GEN: 'مجرور' };
const CASE_EN: Record<string, string> = { NOM: 'nom', ACC: 'acc', GEN: 'gen' };
const ASPECT_AR: Record<string, string> = { PERF: 'ماضٍ', IMPF: 'مضارع', IMPV: 'أمر' };
const ASPECT_EN: Record<string, string> = { PERF: 'perfect', IMPF: 'imperfect', IMPV: 'imperative' };
const SEG_ROLE_AR: Record<string, string> = {
  DET: 'أل التعريف', P: 'حرف جر', CONJ: 'حرف عطف', EMPH: 'لام التوكيد', PRP: 'لام التعليل',
  FUT: 'حرف استقبال', PRON: 'ضمير متّصل', SUB: 'حرف مصدري', NEG: 'حرف نفي', VOC: 'حرف نداء',
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const WAZN_ACT_PCPL: Record<string, string> = {
  I: 'فَاعِل', II: 'مُفَعِّل', III: 'مُفَاعِل', IV: 'مُفْعِل', V: 'مُتَفَعِّل',
  VI: 'مُتَفَاعِل', VII: 'مُنْفَعِل', VIII: 'مُفْتَعِل', IX: 'مُفْعَلّ', X: 'مُسْتَفْعِل',
};
const WAZN_PASS_PCPL: Record<string, string> = {
  I: 'مَفْعُول', II: 'مُفَعَّل', III: 'مُفَاعَل', IV: 'مُفْعَل', V: 'مُتَفَعَّل',
  VI: 'مُتَفَاعَل', VII: 'مُنْفَعَل', VIII: 'مُفْتَعَل', X: 'مُسْتَفْعَل',
};
const WAZN_VERB: Record<string, string> = {
  I: 'فَعَلَ', II: 'فَعَّلَ', III: 'فَاعَلَ', IV: 'أَفْعَلَ', V: 'تَفَعَّلَ',
  VI: 'تَفَاعَلَ', VII: 'اِنْفَعَلَ', VIII: 'اِفْتَعَلَ', IX: 'اِفْعَلَّ', X: 'اِسْتَفْعَلَ',
};

function readFlags(flags: string[]): Partial<QacMorphology> {
  const out: Partial<QacMorphology> = {};
  for (const raw of flags) {
    const f = raw.toUpperCase();

    if (f === 'NOM' || f === 'ACC' || f === 'GEN') { out.case = CASE_EN[f]; out.case_ar = CASE_AR[f]; continue; }
    if (f === 'DEF') { out.state = 'definite'; out.state_ar = 'معرفة'; continue; }
    if (f === 'INDEF') { out.state = 'indefinite'; out.state_ar = 'نكرة'; continue; }
    if (f === 'PERF' || f === 'IMPF' || f === 'IMPV') { out.aspect = ASPECT_EN[f]; out.aspect_ar = ASPECT_AR[f]; continue; }
    if (f === 'PASS') { out.voice = 'passive'; out.voice_ar = 'مبني للمجهول'; continue; }
    if (f === 'ACT') { out.voice = 'active'; out.voice_ar = 'معلوم'; continue; }
    if (f === 'PCPL') { out.derived = 'participle'; continue; }
    if (f === 'VN') { out.derived = 'verbal_noun'; continue; }

    const form = /^\(([IVX]+)\)$/.exec(f);
    if (form) { out.form = form[1]; continue; }

    if (/^[MF]?[SDP]$/.test(f) || f === 'M' || f === 'F') {
      if (f.includes('M')) { out.gender = 'm'; out.gender_ar = 'مذكّر'; }
      if (f.includes('F')) { out.gender = 'f'; out.gender_ar = 'مؤنّث'; }
      if (f.includes('S')) { out.number = 'singular'; out.number_ar = 'مفرد'; }
      if (f.includes('D')) { out.number = 'dual'; out.number_ar = 'مثنّى'; }
      if (f.includes('P')) { out.number = 'plural'; out.number_ar = 'جمع'; }
      continue;
    }

    const pgn = /^([123])(M|F)?(S|D|P)?$/.exec(f);
    if (pgn) {
      out.person = pgn[1];
      if (pgn[2] === 'M') { out.gender = 'm'; out.gender_ar = 'مذكّر'; }
      if (pgn[2] === 'F') { out.gender = 'f'; out.gender_ar = 'مؤنّث'; }
      if (pgn[3] === 'S') { out.number = 'singular'; out.number_ar = 'مفرد'; }
      if (pgn[3] === 'D') { out.number = 'dual'; out.number_ar = 'مثنّى'; }
      if (pgn[3] === 'P') { out.number = 'plural'; out.number_ar = 'جمع'; }
      continue;
    }
  }
  return out;
}

function readSegment(seg: Rec): QacSegment {
  const kind = (asStr(seg['kind']) ?? 'STEM').toUpperCase();
  const tag = asStr(seg['tag']);
  const role: QacSegment['role'] = kind === 'PREFIX' ? 'prefix' : kind === 'SUFFIX' ? 'suffix' : 'stem';
  const label_ar = tag ? (SEG_ROLE_AR[tag] ?? POS_AR[tag] ?? null) : null;
  return { kind, form_ar: asStr(seg['form_ar']), tag, label_ar, role };
}

const EMPTY: QacMorphology = {
  pos: null, pos_ar: null, pos_en: null, case: null, case_ar: null, state: null, state_ar: null,
  gender: null, gender_ar: null, number: null, number_ar: null, person: null,
  aspect: null, aspect_ar: null, voice: null, voice_ar: null,
  derived: null, derived_ar: null, derived_en: null, wazn_ar: null, form: null,
  lemma_ar: null, root_ar: null, prefixes: [], stem: null, suffixes: [], raw: null,
};

function finishDerivation(feats: Partial<QacMorphology>): void {
  const form = feats.form ?? 'I';
  if (feats.derived === 'participle') {
    const passive = feats.voice === 'passive';
    feats.derived = passive ? 'passive_participle' : 'active_participle';
    feats.derived_ar = passive ? 'اسم مفعول' : 'اسم فاعل';
    feats.derived_en = passive ? 'passive participle' : 'active participle';
    feats.wazn_ar = (passive ? WAZN_PASS_PCPL : WAZN_ACT_PCPL)[form] ?? null;
    feats.voice = null; feats.voice_ar = null;
    return;
  }
  if (feats.derived === 'verbal_noun') {
    feats.derived_ar = 'مصدر';
    feats.derived_en = 'verbal noun';
    return;
  }
  if (feats.aspect && feats.form) feats.wazn_ar = WAZN_VERB[feats.form] ?? null;
}

export function parseQacMorphology(json: unknown): QacMorphology {
  const obj = asObj(json);
  if (!obj) return { ...EMPTY };

  const stem = asObj(obj['stem']) ?? {};
  const flags = asArr(stem['flags']).filter((x): x is string => typeof x === 'string');
  const feats = readFlags(flags);
  finishDerivation(feats);
  const pos = asStr(stem['pos']) ?? asStr(stem['tag']);

  const segRecs = asArr(obj['segments']).map(asObj).filter((s): s is Rec => !!s).map(readSegment);
  const prefixes = segRecs.filter(s => s.role === 'prefix');
  const suffixes = segRecs.filter(s => s.role === 'suffix');
  const stemSeg = segRecs.find(s => s.role === 'stem') ?? (stem ? readSegment(stem) : null);

  return {
    ...EMPTY,
    ...feats,
    pos,
    pos_ar: pos ? (POS_AR[pos] ?? null) : null,
    pos_en: pos ? (POS_EN[pos] ?? null) : null,
    form: feats.form ? formLabel(feats.form) : null,
    lemma_ar: asStr(stem['lemma_ar']),
    root_ar: asStr(stem['root_ar']),
    prefixes,
    stem: stemSeg,
    suffixes,
    raw: asStr(obj['raw']),
  };
}

function formLabel(form: string): string {
  const idx = ROMAN.indexOf(form.toUpperCase());
  return idx >= 0 ? form.toUpperCase() : form;
}

export function posGroup(pos: string | null | undefined): 'verb' | 'noun' | 'other' {
  if (!pos) return 'other';
  const t = pos.toUpperCase();
  if (t === 'V' || t === 'VERB') return 'verb';
  if (t === 'N' || t === 'PN' || t === 'ADJ' || t === 'IMPN' || t === 'NOUN') return 'noun';
  return 'other';
}
