import type { ArLinguisticsEnv } from '../env';

// ── Lexicon drills: what each classical lexicon itself says about a root ─────────────────
// Read from the FACTS layer (ar_ling_lexicon_fact, through ar_ling_root_lexicon_fact_v so a
// root filed under another key — Lane's رب for ربب — is found), Mir's verbal idioms, Sinai's key
// terms and the per-lexicon profiles (ar_ling_lexicon_profile). AL shapes the question, its
// options and the lexicon's own sentence (with the answer blanked where it stands in it); the
// Qurʾān worker adds the āyah, its recitation and the review card.
//
// Types, by the level they belong to (the caller passes them; the levels live in its labels):
//   core        what the root points to, in Ibn Fāris's thesis (Maqāyīs: «أصلٌ يدلّ على …»)
//   sense       which meaning Lane gives a headword (his labelled senses)
//   digest      which gloss al-Khalīl gives (ʿAyn's «headword: gloss»)
//   dalala      what a word signifies, in the book's own formula (يدل على، معناه، يقال … إذا …)
//   plural      the plural a lexicon gives (Lane «pl.», Qāmūs «ج:», «والجمع»)
//   synonym     the synonym it gives (Lane «syn.», «بمعنى»)
//   idiom       a verb and its particle in its āyah (Mir), with the root's other idioms
//   which_lexicon  a remark (ḍidd, lugha, muʿarrab, majāz, mathal, qawluhum) → which lexicon says it
//   antonym     the contrary a lexicon gives (Lane «contr.», «ضدّ X», «نقيض»)
//   bab         the model verb of the bāb (كنصر / من باب ضرب / Lane's aor. on the perfect)
//   masdar      the verbal noun Lane gives («inf. n.»)
//   plural_pattern  the broken-plural pattern (فُعُول، أَفْعَال …) of a plural a lexicon gives
//   keyterm     Sinai's gloss of a Qurʾānic key term
//   particle    which particle the verb takes for the sense Mir gives
//   asl         which of Ibn Fāris's uṣūl a derivative returns to (his branches «فالأول … والثاني …»)
//   tropical    proper or tropical — Lane's ‡ (asserted) and † (his own view)
//   order       Lane's senses of a headword, in his order
//   quran_sense under which of his senses Lane cites an āyah (his Flügel numbers moved to Ḥafṣ)
//   style       a verbatim excerpt → which lexicon (its telling formulae, from the profile)
//   disagree    a plural only one lexicon gives → which lexicon
//   scholars    a construction as Sinai reads it, against Mir's reading
// and, for the caller's lemma-family drills, `glosses`: each root's Lane headwords with a gloss.

type Fact = { root_norm: string; found_under: string; key_rank: number; id: string; source_slug: string; block_id: string | null;
              headword_ar: string | null; fact_kind: string; value_ar: string | null; value_en: string | null; quote_ar: string | null;
              surah: number | null; ayah: number | null; marker: string | null; method: string; confidence: string; seq: number | null;
              data_json: string | null };
export type LexItem = {
  id: string; type: string; root: string; source: string | null; sourceTitle: string | null; head: string | null;
  prompt: string; promptAr?: string | null; answer: string; options: string[]; arabicOptions?: boolean;
  sentence: { text: string; source: string | null } | null; ayah: { surah: number; ayah: number; mark: string | null } | null;
  explanation: string | null; note: { en: string; ar: string } | null; steps?: Array<{ ar: string; en: string }>; ref: string;
};

export const TITLES: Record<string, { en: string; ar: string }> = {
  lane_lexicon: { en: 'Lane, Arabic–English Lexicon', ar: 'معجم لين' },
  zabidi_taj_arus: { en: 'al-Zabīdī, Tāj al-ʿArūs', ar: 'تاج العروس' },
  ibn_manzur_lisan_arab: { en: 'Ibn Manẓūr, Lisān al-ʿArab', ar: 'لسان العرب' },
  maqayis_lugha: { en: 'Ibn Fāris, Maqāyīs al-Lugha', ar: 'مقاييس اللغة' },
  jawhari_sihah: { en: 'al-Jawharī, al-Ṣiḥāḥ', ar: 'الصحاح' },
  raghib_mufradat: { en: 'al-Rāghib, al-Mufradāt', ar: 'المفردات' },
  khalil_kitab_ayn: { en: 'al-Khalīl, Kitāb al-ʿAyn', ar: 'كتاب العين' },
  qamus_muhit: { en: 'al-Fīrūzābādī, al-Qāmūs al-Muḥīṭ', ar: 'القاموس المحيط' },
  fayyumi_misbah_munir: { en: 'al-Fayyūmī, al-Miṣbāḥ al-Munīr', ar: 'المصباح المنير' },
  ubab_zakhir: { en: 'al-Ṣaghānī, al-ʿUbāb al-Zākhir', ar: 'العباب الزاخر' },
  sinai_key_terms: { en: 'Sinai, Key Terms of the Qurʾān', ar: 'المفاتيح الدلالية' },
  mir_verbal_idioms: { en: 'Mir, Verbal Idioms of the Qurʾān', ar: 'التعبيرات الفعلية' },
};
const title = (s: string | null | undefined) => (s ? TITLES[s]?.en ?? s : null);
const short = (s: string) => (TITLES[s]?.en ?? s).replace(/^.*?, /, '');

const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
export const bare = (s: string | null | undefined) => (s ?? '').replace(MARKS, '');
export const fold = (s: string | null | undefined) => bare(s).replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ء/g, '').replace(/[^ء-ي ]/g, '').trim();
const shuffle = <T>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const spaced = (r: string) => [...bare(r)].join(' ');
const json = (s: string | null) => { try { return s ? JSON.parse(s) : {}; } catch { return {}; } };
const clip = (s: string | null | undefined, n = 260) => { const t = (s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

/// the lexicon's sentence with the answer blanked where it stands (matched on its letters, marks aside)
export function blankIn(text: string | null, answer: string | null): string | null {
  if (!text) return null;
  if (!answer) return clip(text, 320);
  const k = text.indexOf(answer);
  if (k >= 0) return clip(text.slice(0, k) + '＿＿＿' + text.slice(k + answer.length), 320);
  // letters only: walk the text keeping a map from folded offsets back to the text
  const map: number[] = []; let f = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (/[ؐ-ًؚ-ٰٟۖ-ۭـ]/.test(c)) continue;
    f += ({ 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي', 'ة': 'ه' } as Record<string, string>)[c] ?? c; map.push(i);
  }
  const fa = bare(answer).replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim();
  const j = fa ? f.indexOf(fa) : -1;
  if (j < 0) return clip(text, 320);
  const a = map[j], b = (map[j + fa.length - 1] ?? text.length - 1) + 1;
  let e = b; while (e < text.length && /[ً-ٰٟ]/.test(text[e])) e++;
  return clip(text.slice(0, a) + '＿＿＿' + text.slice(e), 320);
}

/// options: the answer and up to `k` others, none the same word as the answer or as anything in `not`
function choose(answer: string, pool: Array<string | null | undefined>, k = 3, not: string[] = [], arabic = true) {
  const key = (s: string) => (arabic ? fold(s) : s.toLowerCase().replace(/[^a-z ]/g, '').trim());
  const bad = new Set([key(answer), ...not.map(key)]);
  const out: string[] = [];
  for (const p of pool) {
    if (!p) continue;
    const kk = key(p);
    if (!kk || bad.has(kk)) continue;
    bad.add(kk); out.push(p);
    if (out.length >= k) break;
  }
  return out.length >= Math.min(k, 2) ? shuffle([answer, ...out]) : null;
}

async function facts(env: ArLinguisticsEnv, roots: string[], kinds: string[], extra = '', args: unknown[] = []) {
  if (!roots.length || !kinds.length) return [] as Fact[];
  return ((await env.DB_AL.prepare(
    `SELECT root_norm, found_under, key_rank, id, source_slug, block_id, headword_ar, fact_kind, value_ar, value_en, quote_ar,
            surah, ayah, marker, method, confidence, seq, data_json
       FROM ar_ling_root_lexicon_fact_v
      WHERE root_norm IN (${roots.map(() => '?').join(',')}) AND fact_kind IN (${kinds.map(() => '?').join(',')}) ${extra}`)
    .bind(...roots, ...kinds, ...args).all<Fact>()).results ?? []);
}

async function pool(env: ArLinguisticsEnv, kind: string, where = '', args: unknown[] = [], n = 80) {
  return ((await env.DB_AL.prepare(
    `SELECT root_norm, source_slug, headword_ar, value_ar, value_en, marker, data_json FROM ar_ling_lexicon_fact
      WHERE fact_kind = ? AND confidence = 'high' ${where} ORDER BY random() LIMIT ?`).bind(kind, ...args, n)
    .all<{ root_norm: string; source_slug: string; headword_ar: string | null; value_ar: string | null; value_en: string | null;
           marker: string | null; data_json: string | null }>()).results ?? []);
}

async function profileLine(env: ArLinguisticsEnv, source: string, features: string[]) {
  if (!features.length) return null;
  const rows = ((await env.DB_AL.prepare(
    `SELECT feature, label, share FROM ar_ling_lexicon_profile WHERE source_slug = ? AND feature IN (${features.map(() => '?').join(',')})
      ORDER BY share DESC`).bind(source, ...features).all<{ feature: string; label: string; share: number | null }>()).results ?? []);
  const r = rows.find((x) => x.share != null && x.share >= 0.05);
  return r ? `${short(source)} uses «${r.label}» in ${Math.round((r.share ?? 0) * 100)}% of its Qurʾānic-root entries.` : null;
}

/// Lane's gloss as a choice reads: without «This last also means», his ‡ / † marks, trailing «syn.»
export const cleanGloss = (g: string | null | undefined) => (g ?? '')
  .replace(/^(?:(?:this|the)\s+(?:last|former|latter|same|word)\s+)?(?:also\s+)?(?:means|signifies|signfies)\s*,?\s*/i, '')
  .replace(/^[‡†\s]+/, '').replace(/[,;:]?\s*(?:so|as) in the Ḳur\b.*$/i, '').replace(/\s*\(?\bḲur\b[^)]*\)?/g, '')
  .replace(/[,;:\s]+(?:syn|q\. v|i\. e)\.?$/i, '').trim();
const glossOk = (g: string) => /^[A-Z(]/.test(g) && g.length >= 6 && g.length <= 150 && !/[‡†]|\b(?:means|signifies)\b/.test(g);

const one = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const byRoot = <T extends { root_norm: string }>(xs: T[]) => { const m = new Map<string, T[]>(); for (const x of xs) m.set(x.root_norm, [...(m.get(x.root_norm) ?? []), x]); return m; };

const KIND_PROFILE: Record<string, string[]> = {
  didd: ['contrast:didd', 'contrast:addad', 'lane:contr'], dialect: ['dialect:lugha', 'dialect:lugha_fi', 'lane:dial'],
  muarrab: ['muarrab:muarrab', 'muarrab:farisi', 'lane:arabicized'], majaz: ['majaz:majaz', 'majaz:istiara', 'majaz:kinaya', 'lane:dagger2'],
  mathal: ['mathal:mathal', 'lane:prov'], qawluhum: ['qawluhum:qawluhum'], plural: ['plural:jim_colon', 'plural:al_jam', 'plural:jamuhu', 'lane:pl'],
};
const REMARK: Record<string, string> = {
  didd: 'says the word carries opposite meanings (ḍidd)', dialect: 'records it as a dialect form (lugha)', muarrab: 'calls it a loanword (muʿarrab)',
  majaz: 'marks this as a figurative use (majāz)', mathal: 'quotes this proverb (mathal)', qawluhum: 'quotes this saying of the Arabs (qawluhum)',
};
const BAB: Record<string, { ar: string; en: string }> = {
  'نصر': { ar: 'نَصَرَ يَنْصُرُ', en: 'a–u' }, 'ضرب': { ar: 'ضَرَبَ يَضْرِبُ', en: 'a–i' }, 'فتح': { ar: 'فَتَحَ يَفْتَحُ', en: 'a–a' },
  'منع': { ar: 'فَتَحَ يَفْتَحُ', en: 'a–a' }, 'نفع': { ar: 'فَتَحَ يَفْتَحُ', en: 'a–a' }, 'ذهب': { ar: 'فَتَحَ يَفْتَحُ', en: 'a–a' },
  'فرح': { ar: 'فَرِحَ يَفْرَحُ', en: 'i–a' }, 'علم': { ar: 'فَرِحَ يَفْرَحُ', en: 'i–a' }, 'سمع': { ar: 'فَرِحَ يَفْرَحُ', en: 'i–a' },
  'تعب': { ar: 'فَرِحَ يَفْرَحُ', en: 'i–a' }, 'كرم': { ar: 'كَرُمَ يَكْرُمُ', en: 'u–u' }, 'شرف': { ar: 'كَرُمَ يَكْرُمُ', en: 'u–u' },
  'ظرف': { ar: 'كَرُمَ يَكْرُمُ', en: 'u–u' }, 'قرب': { ar: 'كَرُمَ يَكْرُمُ', en: 'u–u' }, 'حسب': { ar: 'حَسِبَ يَحْسِبُ', en: 'i–i' },
  'ورث': { ar: 'حَسِبَ يَحْسِبُ', en: 'i–i' }, 'قتل': { ar: 'نَصَرَ يَنْصُرُ', en: 'a–u' }, 'كتب': { ar: 'نَصَرَ يَنْصُرُ', en: 'a–u' },
  'دخل': { ar: 'نَصَرَ يَنْصُرُ', en: 'a–u' }, 'قعد': { ar: 'نَصَرَ يَنْصُرُ', en: 'a–u' }, 'خرج': { ar: 'نَصَرَ يَنْصُرُ', en: 'a–u' },
  'جلس': { ar: 'ضَرَبَ يَضْرِبُ', en: 'a–i' },
};
const BAB_OPTIONS = ['نَصَرَ يَنْصُرُ (a–u)', 'ضَرَبَ يَضْرِبُ (a–i)', 'فَتَحَ يَفْتَحُ (a–a)', 'فَرِحَ يَفْرَحُ (i–a)', 'كَرُمَ يَكْرُمُ (u–u)', 'حَسِبَ يَحْسِبُ (i–i)'];
const PL_PATTERNS = ['فُعُول', 'أَفْعَال', 'فِعَال', 'فُعُل', 'فُعَل', 'فِعَل', 'أَفْعُل', 'أَفْعِلَة', 'فِعْلَة', 'فُعَلَاء', 'أَفْعِلَاء', 'فَوَاعِل',
                     'فَعَائِل', 'مَفَاعِل', 'مَفَاعِيل', 'فُعْلَان', 'فِعْلَان', 'فَعَالَى', 'فُعَالَى', 'فَعْلَى', 'فُعَّل', 'فُعَّال', 'فَعَلَة', 'فُعْل',
                     'فَعَالِي', 'أَفَاعِل', 'أَفَاعِيل', 'فَعَالِل', 'فَعَالِيل', 'فَعِيل', 'فِعَالَة', 'فُعُولَة'];
/// a pattern compared with its vowels (fold would make فَعَالَى and فُعَالَى one): no sukūn, tanwīn or final case vowel
const vkey = (w: string) => w.replace(/[\u064B-\u064D\u0652]/g, '').replace(/[\u064E-\u0650]$/, '').replace(/[أإآ]/g, 'ا').trim();

/// the pattern (wazn) of a vocalised word on its root: radicals → ف ع ل, everything else kept
export function wazn(word: string, root: string): string | null {
  const rs = [...fold(root).replace(/ /g, '')];
  if (rs.length !== 3) return null;
  const out: string[] = []; let i = 0;
  const F = ['ف', 'ع', 'ل'];
  const norm = (c: string) => ({ 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي', 'ئ': 'ي', 'ؤ': 'و', 'ء': 'ا' } as Record<string, string>)[c] ?? c;
  const w = word.replace(/^(ال|اَل|ٱل)/, '');
  for (const c of w) {
    if (i < 3 && norm(c) === norm(rs[i])) { out.push(F[i]); i++; } else out.push(c);
  }
  if (i < 3) return null;
  return out.join('').replace(/[ٌٍ]/g, '').replace(/ً(ا)?$/, '').replace(/ُ$/, '').trim();
}

// ── the builders, one per type ──────────────────────────────────────────────

type Ctx = { env: ArLinguisticsEnv; roots: string[]; source: string | null; n: number };

/// a thesis that states the meaning (not «أصلٌ واحد مخالفٌ للباب الذي قبله», not a restatement of «أصل …»)
const coreOk = (v: string | null) => !!v && bare(v).length >= 3 && bare(v).length <= 70 && !/^(ال)?[اأ]صل|باب|قبله|مضاد|كلمة|كلمات/.test(bare(v));

async function coreItems({ env, roots }: Ctx): Promise<LexItem[]> {
  const fs = (await facts(env, roots, ['asl'], `AND source_slug = 'maqayis_lugha' AND method = 'maqayis:thesis' AND confidence = 'high'`))
    .filter((f) => f.marker?.endsWith('/1') && coreOk(f.value_ar));
  const others = (await pool(env, 'asl', `AND source_slug = 'maqayis_lugha' AND marker LIKE '%/1'`)).map((p) => p.value_ar).filter(coreOk);
  return fs.map((f) => {
    const opts = choose(f.value_ar!, others);
    if (!opts) return null;
    return { id: `core:${f.id}`, type: 'core', root: f.root_norm, source: f.source_slug, sourceTitle: title(f.source_slug), head: null,
      prompt: `What does the root ${spaced(f.root_norm)} point to, in Ibn Fāris's own words?`, promptAr: spaced(f.root_norm),
      answer: f.value_ar!, options: opts, arabicOptions: true,
      sentence: { text: blankIn(f.quote_ar, f.value_ar)!, source: title(f.source_slug) }, ayah: null,
      explanation: `${f.quote_ar} — Ibn Fāris, Maqāyīs`, note: { en: 'aṣl — the root\'s core', ar: 'الأصل' }, ref: `LEX:core:${f.root_norm}` } as LexItem;
  }).filter((x): x is LexItem => !!x);
}

async function senseItems({ env, roots }: Ctx, type: 'sense' | 'tropical'): Promise<LexItem[]> {
  const fs = await facts(env, roots, ['sense'], `AND source_slug = 'lane_lexicon' AND confidence = 'high'`);
  const qs = await facts(env, roots, ['quran'], `AND source_slug = 'lane_lexicon' AND confidence IN ('high','medium')`);
  const qOf = new Map(qs.map((q) => [q.block_id, q]));
  const others = (await pool(env, 'sense', `AND source_slug = 'lane_lexicon'`, [], 120));
  const out: LexItem[] = [];
  for (const f of shuffle(fs)) {
    const d = json(f.data_json);
    const gloss = cleanGloss(f.value_en);
    if (!glossOk(gloss)) continue;
    if (type === 'sense') {
      const sameHead = fs.filter((x) => x.headword_ar === f.headword_ar).map((x) => cleanGloss(x.value_en));
      const opts = choose(gloss, others.filter((o) => !!json(o.data_json).itype === !!d.itype).map((o) => cleanGloss(o.value_en)).filter(glossOk), 3, sameHead, false);
      if (!opts) continue;
      // an āyah only when Lane's quotation there carries the headword itself
      const q0 = qOf.get(f.block_id);
      const qq = q0 ? String(json(q0.data_json).quoted ?? '') : '';
      const q = q0 && f.headword_ar && fold(qq).replace(/[اوي ]/g, '').includes(fold(f.headword_ar).replace(/^ال/, '').replace(/[اوي ]/g, '').slice(0, 3)) ? q0 : null;
      out.push({ id: `sense:${f.id}`, type, root: f.root_norm, source: f.source_slug, sourceTitle: title(f.source_slug), head: f.headword_ar,
        prompt: `Which meaning does Lane give for ${f.headword_ar} (${f.marker})?`, promptAr: f.headword_ar, answer: gloss, options: opts,
        sentence: { text: arabicOf(f.quote_ar) ?? f.headword_ar ?? '', source: 'Lane' }, ayah: q?.surah ? { surah: q.surah, ayah: q.ayah!, mark: f.headword_ar } : null,
        explanation: clip(f.quote_ar, 420), note: { en: `Lane ${f.marker}${d.tropical ? ' · tropical' : ''}`, ar: f.headword_ar ?? '' }, ref: `LEX:sense:${f.id}` });
    } else {
      const trop = d.tropical as string | undefined;
      if (!trop && !(f.marker === 'A1' && d.sense_kind === 'primary')) continue;
      const answer = trop === 'asserted' || trop === 'doubly' ? 'Tropical — asserted by the lexicographers (‡)' : trop === 'supposed' ? 'Tropical — in Lane\'s own judgement (†)' : 'Proper (ḥaqīqa) — the primary sense';
      out.push({ id: `tropical:${f.id}`, type, root: f.root_norm, source: f.source_slug, sourceTitle: title(f.source_slug), head: f.headword_ar,
        prompt: `${f.headword_ar} — “${gloss}”: proper or tropical, in Lane?`, promptAr: f.headword_ar, answer,
        options: ['Proper (ḥaqīqa) — the primary sense', 'Tropical — asserted by the lexicographers (‡)', 'Tropical — in Lane\'s own judgement (†)'],
        sentence: { text: arabicOf(f.quote_ar) ?? f.headword_ar ?? '', source: 'Lane' }, ayah: null,
        explanation: `${clip(f.quote_ar, 380)} — Lane marks with ‡ what the lexicographers (generally the Asās) affirm to be tropical, and with † what he himself regards as tropical.`,
        note: { en: trop ? 'majāz' : 'ḥaqīqa', ar: trop ? 'مَجاز' : 'حَقيقة' }, ref: `LEX:tropical:${f.id}` });
    }
  }
  return out;
}

/// the Arabic Lane quotes in a sense (its example), as a sentence to show
function arabicOf(q: string | null): string | null {
  const runs = (q ?? '').match(/[ء-يً-ْٰٱـ][ء-يً-ْٰٱـ ]{4,}/g) ?? [];
  const best = runs.map((r) => r.trim()).sort((a, b) => b.split(' ').length - a.split(' ').length)[0];
  return best && best.split(' ').length >= 1 ? best : null;
}

async function simpleItems(c: Ctx, type: string): Promise<LexItem[]> {
  const { env, roots } = c;
  const spec: Record<string, { kind: string; where: string; prompt: (f: Fact) => string; ans: (f: Fact) => string | null; ar: boolean; note: { en: string; ar: string } }> = {
    digest: { kind: 'digest', where: `AND source_slug = 'khalil_kitab_ayn'`, ar: true, note: { en: 'al-Khalīl\'s gloss', ar: 'العين' },
              prompt: (f) => `How does al-Khalīl gloss ${f.headword_ar}?`, ans: (f) => f.value_ar },
    dalala: { kind: 'dalala', where: `AND source_slug NOT IN ('lane_lexicon','maqayis_lugha') AND marker IN ('maanahu','idha','yutlaq','yaqa','yurad')`, ar: true,
              note: { en: 'dalāla — what it signifies', ar: 'الدلالة' }, prompt: (f) => `What does ${f.headword_ar ?? spaced(f.root_norm)} signify, in ${short(f.source_slug)}?`, ans: (f) => clip(f.value_ar, 90) },
    plural: { kind: 'plural', where: `AND source_slug IN ('lane_lexicon','qamus_muhit','zabidi_taj_arus','jawhari_sihah','fayyumi_misbah_munir','ibn_manzur_lisan_arab')`, ar: true,
              note: { en: 'plural (jamʿ)', ar: 'الجمع' }, prompt: (f) => `What plural does ${short(f.source_slug)} give for ${f.headword_ar}?`, ans: (f) => f.value_ar },
    synonym: { kind: 'synonym', where: ``, ar: true, note: { en: 'synonym (murādif)', ar: 'المرادف' },
               prompt: (f) => `Which word does ${short(f.source_slug)} give as a synonym of ${f.headword_ar}${f.value_en && f.source_slug === 'lane_lexicon' ? ` (“${clip(f.value_en, 60)}”)` : ''}?`, ans: (f) => f.value_ar },
    antonym: { kind: 'didd', where: `AND marker = 'antonym'`, ar: true, note: { en: 'contrary (ḍidd / naqīḍ)', ar: 'الضد' },
               prompt: (f) => `What is the contrary of ${f.headword_ar}, as ${short(f.source_slug)} gives it?`, ans: (f) => f.value_ar },
    masdar: { kind: 'masdar', where: `AND source_slug = 'lane_lexicon'`, ar: true, note: { en: 'verbal noun (maṣdar)', ar: 'المصدر' },
              prompt: (f) => `Which verbal noun (inf. n.) does Lane give for ${f.headword_ar}?`, ans: (f) => f.value_ar },
    keyterm: { kind: 'keyterm', where: `AND source_slug = 'sinai_key_terms'`, ar: false, note: { en: 'Sinai, Key Terms', ar: 'مفتاح' },
               prompt: (f) => `How does Sinai gloss the Qurʾānic key term ${f.value_ar}?`, ans: (f) => f.value_en },
  };
  const s = spec[type];
  const fs = (await facts(c.env, roots, [s.kind], `AND confidence = 'high' ${s.where}`))
    .filter((f) => f.headword_ar || type === 'keyterm')
    .filter((f) => !(f.headword_ar ?? '').includes('،') && !/\sأي$/.test(f.headword_ar ?? ''))
    .filter((f) => type !== 'dalala' || ((f.value_ar ?? '').length <= 70 && !/^(ذلك|ذَلِكَ|هذا|هَذَا|قوله|قَوْلُهُ|قولُه|قول)/.test(bare(f.value_ar))));
  const others = await pool(env, s.kind, s.where, [], 120);
  const out: LexItem[] = [];
  const seen = new Set<string>();
  for (const f of shuffle(fs)) {
    const answer = s.ans(f);
    if (!answer || fold(answer).length < 2 && s.ar) continue;
    const key = `${f.root_norm}|${f.headword_ar}|${type}`;
    if (seen.has(key)) continue;
    // anything the same book gives for the same headword is also right: keep it out of the options
    const same = fs.filter((x) => x.headword_ar === f.headword_ar && x.source_slug === f.source_slug).map((x) => s.ans(x) ?? '');
    const d = json(f.data_json);
    const also: string[] = Array.isArray(d.also) ? d.also : [];
    const cand = type === 'plural' || type === 'masdar'
      ? [...fs.filter((x) => x.headword_ar !== f.headword_ar).map((x) => s.ans(x)), ...others.map((o) => o.value_ar)]
      : others.map((o) => (s.ar ? (type === 'dalala' ? clip(o.value_ar, 90) : o.value_ar) : o.value_en));
    const opts = choose(answer, shuffle(cand), 3, [...same, ...also], s.ar);
    if (!opts) continue;
    seen.add(key);
    out.push({ id: `${type}:${f.id}`, type, root: f.root_norm, source: f.source_slug, sourceTitle: title(f.source_slug), head: f.headword_ar ?? f.value_ar,
      prompt: s.prompt(f), promptAr: f.headword_ar ?? f.value_ar, answer, options: opts, arabicOptions: s.ar,
      sentence: f.quote_ar ? { text: blankIn(f.quote_ar, s.ar ? answer : null)!, source: title(f.source_slug) } : null,
      ayah: f.surah && f.ayah ? { surah: f.surah, ayah: f.ayah, mark: f.headword_ar } : null,
      explanation: [clip(f.quote_ar, 360), title(f.source_slug)].filter(Boolean).join(' — '), note: s.note, ref: `LEX:${type}:${f.id}` });
  }
  return out;
}

async function whichLexiconItems({ env, roots }: Ctx): Promise<LexItem[]> {
  const kinds = ['didd', 'dialect', 'muarrab', 'majaz', 'mathal', 'qawluhum'];
  const fs = (await facts(env, roots, kinds, `AND confidence = 'high' AND source_slug <> 'lane_lexicon'`))
    .filter((f) => f.fact_kind !== 'didd' || f.marker === 'addad');
  const present = ((await env.DB_AL.prepare(
    `SELECT DISTINCT root_norm, source_slug FROM ar_ling_root_lexicon_entry_v WHERE root_norm IN (${roots.map(() => '?').join(',')})`)
    .bind(...roots).all<{ root_norm: string; source_slug: string }>()).results ?? []);
  const has = byRoot(present);
  const allSources = Object.keys(TITLES).filter((s) => !['sinai_key_terms', 'mir_verbal_idioms'].includes(s));
  const out: LexItem[] = [];
  for (const f of shuffle(fs)) {
    if (!f.quote_ar || bare(f.quote_ar).length < 12) continue;
    // a book that also says it of this root is right too: only books silent on it are distractors
    const alsoSay = new Set(fs.filter((x) => x.fact_kind === f.fact_kind && fold(x.headword_ar) === fold(f.headword_ar)).map((x) => x.source_slug));
    const withEntry = (has.get(f.root_norm) ?? []).map((x) => x.source_slug).filter((s) => !alsoSay.has(s) && TITLES[s]);
    const wrong = shuffle([...new Set([...shuffle(withEntry), ...shuffle(allSources)])]).filter((s) => !alsoSay.has(s)).slice(0, 3);
    if (wrong.length < 3) continue;
    const why = await profileLine(env, f.source_slug, KIND_PROFILE[f.fact_kind] ?? []);
    out.push({ id: `which:${f.id}`, type: 'which_lexicon', root: f.root_norm, source: f.source_slug, sourceTitle: title(f.source_slug), head: f.headword_ar,
      prompt: `Which lexicon ${REMARK[f.fact_kind]} in these words?`, answer: title(f.source_slug)!, options: shuffle([title(f.source_slug)!, ...wrong.map((w) => title(w)!)]),
      sentence: { text: clip(f.quote_ar, 320), source: null }, ayah: null,
      explanation: [why, `${f.value_en ?? ''}`].filter(Boolean).join(' '), note: { en: f.value_en ?? f.fact_kind, ar: TITLES[f.source_slug]?.ar ?? '' },
      ref: `LEX:which:${f.id}` });
    if (out.length >= 12) break;
  }
  return out;
}

async function babItems({ env, roots }: Ctx): Promise<LexItem[]> {
  const fs = await facts(env, roots, ['bab'], `AND confidence = 'high' AND source_slug IN ('qamus_muhit','zabidi_taj_arus','fayyumi_misbah_munir','lane_lexicon')`);
  return shuffle(fs).map((f) => {
    const m = BAB[f.marker ?? ''];
    if (!m || !f.headword_ar) return null;
    const answer = `${m.ar} (${m.en})`;
    const opts = shuffle([answer, ...shuffle(BAB_OPTIONS.filter((o) => o !== answer)).slice(0, 3)]);
    const model = f.source_slug === 'lane_lexicon' ? null : (f.quote_ar ?? '').match(/ك[ء-يً-ْ]+|بَ?ا?بِ?\s+[ء-يً-ْ]+/)?.[0] ?? null;
    return { id: `bab:${f.id}`, type: 'bab', root: f.root_norm, source: f.source_slug, sourceTitle: title(f.source_slug), head: f.headword_ar,
      prompt: `${f.headword_ar} — which bāb does ${short(f.source_slug)} put it in?`, promptAr: f.headword_ar, answer, options: opts, arabicOptions: true,
      sentence: { text: blankIn(f.quote_ar, model)!, source: title(f.source_slug) }, ayah: null,
      explanation: `${f.value_en}. ${clip(f.quote_ar, 300)} — ${title(f.source_slug)}`, note: { en: 'bāb — the conjugation class', ar: 'الباب' },
      ref: `LEX:bab:${f.root_norm}:${fold(f.headword_ar).replace(/ /g, '')}:${f.source_slug}` } as LexItem;
  }).filter((x): x is LexItem => !!x);
}

async function pluralPatternItems({ env, roots }: Ctx): Promise<LexItem[]> {
  const fs = await facts(env, roots, ['plural'], `AND confidence = 'high'`);
  const out: LexItem[] = [];
  for (const f of shuffle(fs)) {
    if (!f.value_ar || (f.value_ar.match(/[ً-ْ]/g) ?? []).length < 2) continue;
    const w = wazn(f.value_ar, f.root_norm.length === 3 ? f.root_norm : f.found_under);
    const answer = w ? PL_PATTERNS.find((p) => vkey(p) === vkey(w)) : undefined;
    if (!answer) continue;
    const opts = shuffle([answer, ...shuffle(PL_PATTERNS.filter((p) => fold(p) !== fold(answer))).slice(0, 3)]);
    const kind = f.marker === 'pauc' ? ' — a plural of paucity' : f.marker === 'mult' ? ' — a plural of multitude' : '';
    out.push({ id: `plpat:${f.id}`, type: 'plural_pattern', root: f.root_norm, source: f.source_slug, sourceTitle: title(f.source_slug), head: f.headword_ar,
      prompt: `${f.value_ar}, the plural of ${f.headword_ar ?? '…'} — on which pattern?`, promptAr: f.value_ar, answer, options: opts, arabicOptions: true,
      sentence: { text: clip(f.quote_ar, 320), source: title(f.source_slug) }, ayah: null,
      explanation: `${f.value_ar} is ${answer}${kind}. ${title(f.source_slug)}.`, note: { en: 'broken plural (jamʿ taksīr)', ar: 'جمع التكسير' }, ref: `LEX:plpat:${f.id}` });
  }
  return out;
}

async function aslItems({ env, roots }: Ctx): Promise<LexItem[]> {
  const fs = await facts(env, roots, ['asl'], `AND source_slug = 'maqayis_lugha'`);
  const out: LexItem[] = [];
  for (const [root, xs] of byRoot(fs)) {
    const thesis = xs.filter((x) => x.method === 'maqayis:thesis' && x.confidence === 'high').sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    if (thesis.length < 2 || thesis.some((t) => !fold(t.quote_ar).includes(fold(t.value_ar).slice(0, 12)))) continue;
    for (const br of xs.filter((x) => x.method === 'maqayis:branch')) {
      const d = json(br.data_json);
      const ders: string[] = d.derivatives ?? [];
      const der = ders.find((w) => bare(w).length >= 3);
      const i = (d.asl_no ?? br.seq ?? 0) - 1;
      if (!der || !thesis[i]) continue;
      out.push({ id: `asl:${br.id}`, type: 'asl', root, source: 'maqayis_lugha', sourceTitle: title('maqayis_lugha'), head: der,
        prompt: `${der} — to which of the aṣls of ${spaced(root)} does Ibn Fāris return it?`, promptAr: der,
        answer: thesis[i].value_ar!, options: shuffle(thesis.map((t) => t.value_ar!)), arabicOptions: true,
        sentence: { text: clip(br.quote_ar, 320), source: title('maqayis_lugha') }, ayah: null,
        explanation: `${thesis[0].quote_ar} — his branch: ${clip(br.quote_ar, 220)}`, note: { en: `aṣl ${i + 1} of ${thesis.length}`, ar: 'الأصل' },
        ref: `LEX:asl:${root}:${fold(der).replace(/ /g, '')}` });
    }
  }
  return out;
}

async function orderItems({ env, roots }: Ctx): Promise<LexItem[]> {
  const fs = await facts(env, roots, ['sense'], `AND source_slug = 'lane_lexicon' AND confidence = 'high'`);
  const out: LexItem[] = [];
  const byHead = new Map<string, Fact[]>();
  for (const f of fs) { const k = `${f.root_norm}|${f.block_id?.slice(0, 0)}${f.headword_ar}`; byHead.set(k, [...(byHead.get(k) ?? []), f]); }
  for (const [, xs] of byHead) {
    const steps = xs.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)).filter((x) => glossOk(cleanGloss(x.value_en))).filter((x, i, a) => a.findIndex((y) => y.value_en === x.value_en) === i).slice(0, 5);
    if (steps.length < 3) continue;
    const f = steps[0];
    out.push({ id: `order:${f.id}`, type: 'order', root: f.root_norm, source: 'lane_lexicon', sourceTitle: title('lane_lexicon'), head: f.headword_ar,
      prompt: `${f.headword_ar} — Lane's senses, in his order`, answer: steps.map((s) => s.marker).join(' → '), options: [],
      steps: steps.map((s) => ({ ar: arabicOf(s.quote_ar) ?? f.headword_ar ?? '', en: `${s.marker}. ${cleanGloss(s.value_en)}` })),
      sentence: { text: arabicOf(f.quote_ar) ?? f.headword_ar ?? '', source: 'Lane' }, ayah: null,
      explanation: steps.map((s) => `${s.marker} ${cleanGloss(s.value_en)}`).join(' → '), note: null, ref: `LEX:order:${f.root_norm}:${fold(f.headword_ar).replace(/ /g, '')}` });
  }
  return out;
}

async function quranSenseItems({ env, roots }: Ctx): Promise<LexItem[]> {
  const qs = (await facts(env, roots, ['quran'], `AND source_slug = 'lane_lexicon' AND confidence IN ('high','medium') AND value_en IS NOT NULL`));
  if (!qs.length) return [];
  const ss = await facts(env, roots, ['sense'], `AND source_slug = 'lane_lexicon' AND confidence = 'high'`);
  const out: LexItem[] = [];
  for (const q of shuffle(qs)) {
    const sibs = ss.filter((s) => s.headword_ar === q.headword_ar && s.root_norm === q.root_norm).map((s) => `${s.marker}. ${cleanGloss(s.value_en)}`);
    const answer = `${q.marker}. ${cleanGloss(q.value_en)}`;
    const opts = choose(answer, shuffle(sibs), 3, [], false);
    if (!opts || opts.length < 3) continue;
    const d = json(q.data_json);
    out.push({ id: `qsense:${q.id}`, type: 'quran_sense', root: q.root_norm, source: 'lane_lexicon', sourceTitle: title('lane_lexicon'), head: q.headword_ar,
      prompt: `Under which of his senses of ${q.headword_ar} does Lane cite this āyah?`, promptAr: q.headword_ar, answer, options: opts,
      sentence: null, ayah: { surah: q.surah!, ayah: q.ayah!, mark: d.quoted ?? q.headword_ar },
      explanation: `${clip(q.quote_ar, 300)} — Lane cites it as Ḳur ${d.flugel} (Flügel's numbering), Ḥafṣ ${q.surah}:${q.ayah}.`,
      note: { en: `Lane ${q.marker}`, ar: q.headword_ar ?? '' }, ref: `LEX:qsense:${q.id}` });
  }
  return out;
}

async function styleItems({ env, roots }: Ctx): Promise<LexItem[]> {
  // a formula the profile finds telling (common in one book, rare elsewhere) and an excerpt of this root that shows it
  const prof = ((await env.DB_AL.prepare(
    `SELECT source_slug, feature, label, share FROM ar_ling_lexicon_profile WHERE family IN ('ngram','authority','dalala','plural','bab','majaz','asl','branch')
       AND share >= 0.08`).all<{ source_slug: string; feature: string; label: string; share: number }>()).results ?? []);
  const shareOf = new Map<string, Map<string, number>>();
  for (const p of prof) { const m = shareOf.get(p.label) ?? new Map(); m.set(p.source_slug, p.share); shareOf.set(p.label, m); }
  const telling = prof.filter((p) => { const m = shareOf.get(p.label)!; return [...m.entries()].every(([s, v]) => s === p.source_slug || v < p.share / 3); })
    .filter((p) => p.source_slug !== 'lane_lexicon' && fold(p.label).replace(/ /g, '').length >= 4);
  if (!telling.length) return [];
  const blocks = ((await env.DB_AL.prepare(
    `SELECT root_norm, source_slug, text_plain FROM ar_ling_root_lexicon_block_v WHERE root_norm IN (${roots.map(() => '?').join(',')})
       AND block_type = 'definition' AND key_rank = 0 AND length(text_plain) BETWEEN 60 AND 900`).bind(...roots)
    .all<{ root_norm: string; source_slug: string; text_plain: string }>()).results ?? []);
  const out: LexItem[] = [];
  const all = Object.keys(TITLES).filter((s) => !['sinai_key_terms', 'mir_verbal_idioms', 'lane_lexicon'].includes(s));
  for (const b of shuffle(blocks)) {
    const fb = fold(b.text_plain);
    const t = telling.find((p) => p.source_slug === b.source_slug && fb.includes(fold(p.label)));
    if (!t) continue;
    const k = fb.indexOf(fold(t.label));
    const excerpt = clip(b.text_plain.slice(Math.max(0, Math.floor(k * b.text_plain.length / Math.max(1, fb.length)) - 80)), 260);
    out.push({ id: `style:${b.source_slug}:${b.root_norm}:${t.feature}`, type: 'style', root: b.root_norm, source: b.source_slug, sourceTitle: title(b.source_slug), head: null,
      prompt: 'Which lexicon writes this way?', answer: title(b.source_slug)!, options: shuffle([title(b.source_slug)!, ...shuffle(all.filter((s) => s !== b.source_slug)).slice(0, 3).map((s) => title(s)!)]),
      sentence: { text: excerpt, source: null }, ayah: null,
      explanation: `«${t.label}» — ${short(b.source_slug)} writes it in ${Math.round(t.share * 100)}% of its Qurʾānic-root entries; no other lexicon comes near.`,
      note: { en: TITLES[b.source_slug]?.en ?? b.source_slug, ar: TITLES[b.source_slug]?.ar ?? '' }, ref: `LEX:style:${b.source_slug}:${t.feature}` });
    if (out.length >= 8) break;
  }
  return out;
}

async function disagreeItems({ env, roots }: Ctx): Promise<LexItem[]> {
  const fs = await facts(env, roots, ['plural'], `AND confidence = 'high'`);
  const out: LexItem[] = [];
  const byHead = new Map<string, Fact[]>();
  for (const f of fs) { const k = `${f.root_norm}|${fold(f.headword_ar)}`; if (f.headword_ar) byHead.set(k, [...(byHead.get(k) ?? []), f]); }
  for (const [, xs] of byHead) {
    const srcs = [...new Set(xs.map((x) => x.source_slug))];
    if (srcs.length < 2) continue;
    for (const f of xs) {
      const givers = new Set(xs.filter((x) => fold(x.value_ar) === fold(f.value_ar)).map((x) => x.source_slug));
      if (givers.size !== 1) continue;
      const others = srcs.filter((s) => !givers.has(s));
      const pad = shuffle(Object.keys(TITLES).filter((s) => !srcs.includes(s) && !['sinai_key_terms', 'mir_verbal_idioms'].includes(s)));
      const wrong = [...others, ...pad].slice(0, 3);
      out.push({ id: `disagree:${f.id}`, type: 'disagree', root: f.root_norm, source: f.source_slug, sourceTitle: title(f.source_slug), head: f.headword_ar,
        prompt: `${f.value_ar} as the plural of ${f.headword_ar} — which lexicon gives it (the others give ${[...new Set(xs.filter((x) => !givers.has(x.source_slug)).map((x) => x.value_ar))].slice(0, 3).join('، ')})?`,
        promptAr: f.value_ar, answer: title(f.source_slug)!, options: shuffle([title(f.source_slug)!, ...wrong.map((w) => title(w)!)]),
        sentence: { text: blankIn(f.quote_ar, f.value_ar)!, source: null }, ayah: null,
        explanation: xs.map((x) => `${short(x.source_slug)}: ${x.value_ar}`).join(' · '), note: { en: 'the lexicons disagree', ar: 'اختلاف المعاجم' },
        ref: `LEX:disagree:${f.id}` });
    }
  }
  return out;
}

type Tabir = { id: string; root_ar: string; expression_ar: string; surface_ar: string | null; preposition_ar: string | null; expression_en: string;
               construction_en: string | null; explanation_en: string | null; surah: number; ayah: number };
const CLEAN = `status = 'live' AND expression_type_id = 'arl-et-09' AND surah IS NOT NULL AND expression_en IS NOT NULL AND length(expression_en) >= 8
  AND expression_en NOT LIKE '%[…]%' AND expression_en NOT LIKE '%[...]%' AND expression_en NOT LIKE 'as a verb%' AND expression_en NOT LIKE 'as verb%'`;

async function idiomItems({ env, roots }: Ctx, type: 'idiom' | 'particle' | 'scholars'): Promise<LexItem[]> {
  const rs = roots.map(fold).map((r) => r.replace(/ /g, ''));
  const tab = ((await env.DB_AL.prepare(`SELECT id, root_ar, expression_ar, surface_ar, preposition_ar, expression_en, construction_en, explanation_en, surah, ayah
      FROM ar_ling_root_lemma_tabir WHERE ${CLEAN}`).all<Tabir>()).results ?? []);
  const rootOf = (t: Tabir) => fold(t.root_ar).replace(/ /g, '');
  const mine = tab.filter((t) => rs.includes(rootOf(t)));
  const sinai = type === 'scholars' || type === 'idiom' ? await facts(env, roots, ['verbal_idiom'], `AND source_slug = 'sinai_key_terms'`) : [];
  const lane = type === 'idiom' ? await facts(env, roots, ['sense'], `AND source_slug = 'lane_lexicon' AND confidence = 'high' AND marker = 'A1'`) : [];
  const out: LexItem[] = [];
  const PARTS = ['عَلَى', 'بِـ', 'لِـ', 'عَنْ', 'إِلَى', 'فِي', 'مِنْ', 'مَعَ'];
  for (const t of shuffle(mine)) {
    const r = rootOf(t);
    const range = mine.filter((x) => rootOf(x) === r && x.expression_en.trim().toLowerCase() !== t.expression_en.trim().toLowerCase()).map((x) => x.expression_en.trim());
    const sin = sinai.filter((s) => fold(s.root_norm).replace(/ /g, '') === r && (!t.preposition_ar || fold(s.marker) === fold(t.preposition_ar)));
    const context = { lane: lane.filter((l) => fold(l.root_norm).replace(/ /g, '') === r).slice(0, 4).map((l) => `${l.headword_ar}: ${l.value_en}`),
                      sinai: sin.map((s) => clip(s.value_en, 300)) };
    if (type === 'idiom') {
      const opts = choose(t.expression_en.trim(), [...shuffle(range), ...shuffle(tab).slice(0, 40).map((x) => x.expression_en.trim())], 3, [], false);
      if (!opts) continue;
      out.push({ id: `idiom:${t.id}`, type, root: t.root_ar, source: 'mir_verbal_idioms', sourceTitle: title('mir_verbal_idioms'), head: t.surface_ar,
        prompt: t.expression_ar, promptAr: t.expression_ar, answer: t.expression_en.trim(), options: opts, sentence: null,
        ayah: { surah: t.surah, ayah: t.ayah, mark: t.surface_ar }, explanation: t.explanation_en ?? t.construction_en ?? 'Mustansir Mir, Verbal Idioms of the Qurʾān',
        note: t.construction_en ? { en: t.construction_en, ar: t.expression_ar } : null, ref: `LEX:idiom:${t.id}`,
        ...({ context } as object) } as LexItem);
    } else if (type === 'particle') {
      if (!t.preposition_ar) continue;
      const p = PARTS.find((x) => fold(x) === fold(t.preposition_ar)) ?? t.preposition_ar;
      out.push({ id: `particle:${t.id}`, type, root: t.root_ar, source: 'mir_verbal_idioms', sourceTitle: title('mir_verbal_idioms'), head: t.surface_ar,
        prompt: `To mean “${t.expression_en.trim()}”, which particle does the verb take here?`, promptAr: t.surface_ar, answer: p,
        options: shuffle([p, ...shuffle(PARTS.filter((x) => fold(x) !== fold(p))).slice(0, 3)]), arabicOptions: true, sentence: null,
        ayah: { surah: t.surah, ayah: t.ayah, mark: t.surface_ar }, explanation: `${t.expression_ar} — ${t.expression_en.trim()}${t.construction_en ? ` (${t.construction_en})` : ''}. Mir.`,
        note: { en: 'verb + particle (taʿdiya)', ar: 'التعدية بالحرف' }, ref: `LEX:particle:${t.id}` });
    } else if (sin.length) {
      const s = sin[0];
      const others = sinai.filter((x) => x.id !== s.id).map((x) => clip(x.value_en, 160));
      const pad = (await pool(env, 'verbal_idiom', `AND source_slug = 'sinai_key_terms'`, [], 20)).map((x) => clip(x.value_en, 160));
      const answer = clip(s.value_en, 160);
      const opts = choose(answer, [...others, ...pad], 3, [], false);
      if (!opts) continue;
      out.push({ id: `scholars:${t.id}:${s.id}`, type, root: t.root_ar, source: 'sinai_key_terms', sourceTitle: title('sinai_key_terms'), head: t.surface_ar,
        prompt: `Mir reads ${t.expression_ar} as “${t.expression_en.trim()}”. Which is Sinai's reading of ${s.value_ar}?`, promptAr: t.expression_ar,
        answer, options: opts, sentence: null, ayah: { surah: t.surah, ayah: t.ayah, mark: t.surface_ar },
        explanation: `Mir: ${t.expression_en.trim()}. Sinai: ${clip(s.value_en, 400)}${context.lane.length ? ` Lane: ${context.lane[0]}` : ''}`,
        note: { en: 'two scholars, one construction', ar: s.value_ar ?? '' }, ref: `LEX:scholars:${t.id}` });
    }
  }
  return out;
}

/// for the caller's lemma-family drills: each root's Lane headwords, with Lane's first gloss and form
export async function glosses(env: ArLinguisticsEnv, roots: string[]) {
  const fs = await facts(env, roots, ['sense', 'form'], `AND source_slug = 'lane_lexicon' AND confidence = 'high' AND (fact_kind = 'form' OR marker = 'A1')`);
  const out: Record<string, Array<{ head: string; gloss: string | null; form: string | null }>> = {};
  for (const f of fs) {
    if (!f.headword_ar) continue;
    const xs = (out[f.root_norm] ??= []);
    let x = xs.find((y) => fold(y.head) === fold(f.headword_ar));
    if (!x) { x = { head: f.headword_ar, gloss: null, form: null }; xs.push(x); }
    if (f.fact_kind === 'sense') x.gloss ??= f.value_en;
    else x.form ??= f.value_en;
  }
  return out;
}

const BUILDERS: Record<string, (c: Ctx) => Promise<LexItem[]>> = {
  core: coreItems, sense: (c) => senseItems(c, 'sense'), tropical: (c) => senseItems(c, 'tropical'),
  digest: (c) => simpleItems(c, 'digest'), dalala: (c) => simpleItems(c, 'dalala'), plural: (c) => simpleItems(c, 'plural'),
  synonym: (c) => simpleItems(c, 'synonym'), antonym: (c) => simpleItems(c, 'antonym'), masdar: (c) => simpleItems(c, 'masdar'),
  keyterm: (c) => simpleItems(c, 'keyterm'), which_lexicon: whichLexiconItems, bab: babItems, plural_pattern: pluralPatternItems,
  asl: aslItems, order: orderItems, quran_sense: quranSenseItems, style: styleItems, disagree: disagreeItems,
  idiom: (c) => idiomItems(c, 'idiom'), particle: (c) => idiomItems(c, 'particle'), scholars: (c) => idiomItems(c, 'scholars'),
};
export const LEX_TYPES = Object.keys(BUILDERS);

/// Items of the asked types for the given roots, spread across types and roots.
export async function lexiconItems(env: ArLinguisticsEnv, roots: string[], types: string[], n: number, source: string | null) {
  const want = types.filter((t) => BUILDERS[t]);
  const ctx: Ctx = { env, roots, source, n };
  const got = await Promise.all(want.map((t) => BUILDERS[t](ctx).catch(() => [] as LexItem[])));
  let lists = got.map((xs) => shuffle(source ? xs.filter((x) => x.source === source) : xs));
  // round-robin across types, one root at a time
  const out: LexItem[] = []; const usedRoot = new Map<string, number>();
  while (out.length < n && lists.some((l) => l.length)) {
    for (const l of lists) {
      const i = l.findIndex((x) => (usedRoot.get(x.root) ?? 0) < 2);
      if (i < 0) { l.length = 0; continue; }
      const [x] = l.splice(i, 1);
      usedRoot.set(x.root, (usedRoot.get(x.root) ?? 0) + 1);
      out.push(x);
      if (out.length >= n) break;
    }
    lists = lists.filter((l) => l.length);
  }
  const counts: Record<string, number> = {};
  want.forEach((t, i) => { counts[t] = got[i].length; });
  return { items: out, pool: counts };
}
