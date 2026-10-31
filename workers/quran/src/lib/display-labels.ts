// Labels for the tafsīr / iʿrāb display-block values (block type, madhab, era, review
// status, iʿrāb section). The analysis panels and display blocks render the `*_label`
// fields these add — the app keeps no label maps of its own. English first, Arabic
// beside it for the RTL panels.

type Pair = { en: string; ar: string };

const TAFSIR_BLOCK_TYPE: Record<string, Pair & { order: number }> = {
  tafsir_card:        { en: 'Tafsīr cards',          ar: 'بطاقات التفسير',   order: 1 },
  paragraph_section:  { en: 'Long paragraphs',       ar: 'فقرات مطوّلة',     order: 2 },
  isnad:              { en: 'Chains (isnād)',        ar: 'سلاسل الإسناد',    order: 3 },
  voice_marker:       { en: 'Speaker markers',       ar: 'علامات الكلام',    order: 4 },
  poetry_quote:       { en: 'Poetry witnesses',      ar: 'الشواهد الشعرية',  order: 5 },
  verse_anchor:       { en: 'Āyah anchors',          ar: 'مراسي الآيات',     order: 6 },
  paradigm_chip:      { en: 'Theological schools',   ar: 'مدارس كلامية',     order: 7 },
  scholar_response:   { en: 'Scholar responses',     ar: 'ردود علمائية',     order: 8 },
  hadith_source_chip: { en: 'Ḥadīth sources',        ar: 'مصادر الحديث',     order: 9 },
  quran_ref_chip:     { en: 'Qurʾān references',     ar: 'إحالات قرآنية',    order: 10 },
};

const MADHAB: Record<string, Pair> = {
  sunni: { en: 'Sunnī', ar: 'سني' }, maliki: { en: 'Mālikī', ar: 'مالكي' },
  shafii: { en: 'Shāfiʿī', ar: 'شافعي' }, hanbali: { en: 'Ḥanbalī', ar: 'حنبلي' },
  hanafi: { en: 'Ḥanafī', ar: 'حنفي' }, mutazili: { en: 'Muʿtazilī', ar: 'معتزلي' },
  ashari: { en: 'Ashʿarī', ar: 'أشعري' }, athari: { en: 'Atharī', ar: 'أثري' },
};

const ERA: Record<string, Pair> = {
  classical: { en: 'Classical', ar: 'كلاسيكي' }, modern: { en: 'Modern', ar: 'حديث' },
};

const REVIEW_STATUS: Record<string, Pair> = {
  approved:     { en: 'Verified',         ar: 'موثّق' },
  needs_review: { en: 'Awaiting review',  ar: 'بانتظار المراجعة' },
  ai_candidate: { en: 'Machine proposal', ar: 'مقترح آلي' },
  rejected:     { en: 'Rejected',         ar: 'مرفوض' },
};
const REVIEW_OTHER: Pair = { en: 'Archived', ar: 'مؤرشف' };

const IRAAB_SECTION: Record<string, Pair & { order: number }> = {
  irab:      { en: 'Iʿrāb',                ar: 'الإعراب',          order: 0 },
  sarf:      { en: 'Ṣarf',                 ar: 'الصرف',            order: 1 },
  balagha:   { en: 'Balāgha',              ar: 'البلاغة',          order: 2 },
  fawaid:    { en: 'Fawāʾid (Insights)',   ar: 'الفوائد',          order: 3 },
  language:  { en: 'Language & Etymology', ar: 'اللغة',            order: 4 },
  dep_graph: { en: 'Dependency Tree',      ar: 'الشجرة الإعرابية', order: 9 },
};
const IRAAB_SECTION_OF: Record<string, string> = {
  irab_card: 'irab', dependency_graph: 'dep_graph', sarf_note: 'sarf',
  balagha_note: 'balagha', key_insight: 'fawaid', language_note: 'language',
};

const str = (v: unknown) => (typeof v === 'string' && v ? v : null);

function reviewLabels(status: unknown) {
  const p = REVIEW_STATUS[str(status) ?? ''] ?? REVIEW_OTHER;
  return { review_status_label: p.en, review_status_label_ar: p.ar };
}

/** A tafsīr display block with its type, madhab, era and review status labelled. */
export function withTafsirBlockLabels<T extends Record<string, unknown>>(b: T) {
  const type = str(b.block_type), madhab = str(b.madhab), era = str(b.era);
  const t = type ? TAFSIR_BLOCK_TYPE[type] : undefined;
  const m = madhab ? MADHAB[madhab] : undefined;
  const e = era ? ERA[era] : undefined;
  return {
    ...b,
    block_type_label: t?.en ?? type, block_type_label_ar: t?.ar ?? type, block_type_order: t?.order ?? null,
    madhab_label: m?.en ?? madhab, madhab_label_ar: m?.ar ?? madhab,
    era_label: e?.en ?? era, era_label_ar: e?.ar ?? era,
    ...reviewLabels(b.review_status),
  };
}

/** An iʿrāb display block with its section (iʿrāb, ṣarf, balāgha …) and review status labelled.
 *  A heading or note of an unknown kind keeps its subtype as its section (unlabelled, ordered last). */
export function withIraabBlockLabels<T extends Record<string, unknown>>(b: T) {
  const type = str(b.block_type) ?? '';
  const key = (type !== 'heading' ? IRAAB_SECTION_OF[type] : undefined) ?? str(b.block_subtype) ?? IRAAB_SECTION_OF[type] ?? 'irab';
  const s = IRAAB_SECTION[key];
  return {
    ...b,
    section_key: key,
    section_label: s?.en ?? null, section_label_ar: s?.ar ?? null, section_order: s?.order ?? 99,
    ...reviewLabels(b.review_status),
  };
}
